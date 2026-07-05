import { supabase } from './supabaseClient'

// ---------- Mapping DB (snake_case) <-> JS (camelCase) ----------
export function rowToShop(row) {
  if (!row) return null
  return {
    id: row.id,
    shopName: row.shop_name,
    ownerPhone: row.owner_phone || '',
    logoEmoji: row.logo_emoji || '🏪',
    accentColor: row.accent_color || '#2B3A67',
    patronPin: row.patron_pin || '',
    subscriptionActive: !!row.subscription_active,
    subscriptionDate: row.subscription_date,
  }
}

export function rowToProduct(row) {
  return {
    id: row.id, name: row.name, buyPrice: Number(row.buy_price),
    sellPrice: Number(row.sell_price), qty: row.qty, threshold: row.threshold,
  }
}

export function rowToSale(row) {
  return {
    id: row.id, productId: row.product_id, productName: row.product_name,
    qty: row.qty, total: Number(row.total), profit: Number(row.profit),
    paidAmount: Number(row.paid_amount || 0), type: row.type,
    customerName: row.customer_name, phone: row.phone, provider: row.provider,
    date: row.created_at,
  }
}

export function rowToCustomer(row) {
  return { id: row.id, name: row.name, phone: row.phone || '', owed: Number(row.owed) }
}

// ---------- Shop ----------
export async function getOrCreateShop(userId, defaultName, ownerPhone) {
  const { data: existing, error: selErr } = await supabase
    .from('shops').select('*').eq('owner_id', userId).limit(1)
  if (selErr) throw selErr
  if (existing && existing.length > 0) return rowToShop(existing[0])

  const { data: created, error: insErr } = await supabase
    .from('shops')
    .insert({ owner_id: userId, shop_name: defaultName || 'Ma Boutique', owner_phone: ownerPhone || null })
    .select().single()
  if (insErr) throw insErr
  return rowToShop(created)
}

export async function updateShop(shopId, patch) {
  const dbPatch = {}
  if (patch.shopName !== undefined) dbPatch.shop_name = patch.shopName
  if (patch.logoEmoji !== undefined) dbPatch.logo_emoji = patch.logoEmoji
  if (patch.accentColor !== undefined) dbPatch.accent_color = patch.accentColor
  if (patch.patronPin !== undefined) dbPatch.patron_pin = patch.patronPin
  if (patch.subscriptionActive !== undefined) dbPatch.subscription_active = patch.subscriptionActive
  if (patch.subscriptionDate !== undefined) dbPatch.subscription_date = patch.subscriptionDate
  const { data, error } = await supabase.from('shops').update(dbPatch).eq('id', shopId).select().single()
  if (error) throw error
  return rowToShop(data)
}

// ---------- Products ----------
export async function fetchProducts(shopId) {
  const { data, error } = await supabase.from('products').select('*').eq('shop_id', shopId).order('created_at')
  if (error) throw error
  return (data || []).map(rowToProduct)
}

export async function insertProduct(shopId, p) {
  const { data, error } = await supabase.from('products').insert({
    shop_id: shopId, name: p.name, buy_price: p.buyPrice, sell_price: p.sellPrice, qty: p.qty, threshold: p.threshold,
  }).select().single()
  if (error) throw error
  return rowToProduct(data)
}

export async function updateProductRow(id, patch) {
  const dbPatch = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.buyPrice !== undefined) dbPatch.buy_price = patch.buyPrice
  if (patch.sellPrice !== undefined) dbPatch.sell_price = patch.sellPrice
  if (patch.qty !== undefined) dbPatch.qty = patch.qty
  if (patch.threshold !== undefined) dbPatch.threshold = patch.threshold
  const { data, error } = await supabase.from('products').update(dbPatch).eq('id', id).select().single()
  if (error) throw error
  return rowToProduct(data)
}

export async function deleteProductRow(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ---------- Sales & customers ----------
export async function fetchSales(shopId) {
  const { data, error } = await supabase.from('sales').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(rowToSale)
}

export async function fetchCustomers(shopId) {
  const { data, error } = await supabase.from('customers').select('*').eq('shop_id', shopId)
  if (error) throw error
  return (data || []).map(rowToCustomer)
}

export async function recordSaleRow(shopId, product, qty, type, extra) {
  const total = product.sellPrice * qty
  const profit = (product.sellPrice - product.buyPrice) * qty
  const paidAmount = type === 'credit' ? 0 : total

  const { data: saleRow, error: saleErr } = await supabase.from('sales').insert({
    shop_id: shopId, product_id: product.id, product_name: product.name, qty, total, profit,
    paid_amount: paidAmount, type, customer_name: extra?.customerName || null,
    provider: extra?.provider || null, phone: extra?.phone || null,
  }).select().single()
  if (saleErr) throw saleErr

  const { data: prodRow, error: prodErr } = await supabase.from('products')
    .update({ qty: Math.max(0, product.qty - qty) }).eq('id', product.id).select().single()
  if (prodErr) throw prodErr

  let customer = null
  if (type === 'credit' && extra?.customerName) {
    const { data: existing } = await supabase.from('customers').select('*')
      .eq('shop_id', shopId).ilike('name', extra.customerName).limit(1)
    if (existing && existing.length > 0) {
      const { data: updated, error: updErr } = await supabase.from('customers')
        .update({ owed: Number(existing[0].owed) + total, phone: existing[0].phone || extra.phone || '' })
        .eq('id', existing[0].id).select().single()
      if (updErr) throw updErr
      customer = rowToCustomer(updated)
    } else {
      const { data: created, error: insErr } = await supabase.from('customers')
        .insert({ shop_id: shopId, name: extra.customerName, owed: total, phone: extra.phone || '' })
        .select().single()
      if (insErr) throw insErr
      customer = rowToCustomer(created)
    }
  }

  return { sale: rowToSale(saleRow), product: rowToProduct(prodRow), customer }
}

export async function settleCreditRows(shopId, customer, amount) {
  const { data: unpaid, error } = await supabase.from('sales').select('*')
    .eq('shop_id', shopId).eq('type', 'credit').eq('customer_name', customer.name)
    .order('created_at', { ascending: true })
  if (error) throw error

  let remaining = amount
  for (const row of unpaid) {
    if (remaining <= 0) break
    const need = Number(row.total) - Number(row.paid_amount || 0)
    if (need <= 0.5) continue
    const pay = Math.min(need, remaining)
    const { error: updErr } = await supabase.from('sales')
      .update({ paid_amount: Number(row.paid_amount || 0) + pay }).eq('id', row.id)
    if (updErr) throw updErr
    remaining -= pay
  }

  const newOwed = Math.max(0, customer.owed - amount)
  if (newOwed <= 0.5) {
    await supabase.from('customers').delete().eq('id', customer.id)
    return null
  } else {
    const { data: updated, error: updErr } = await supabase.from('customers')
      .update({ owed: newOwed }).eq('id', customer.id).select().single()
    if (updErr) throw updErr
    return rowToCustomer(updated)
  }
}
