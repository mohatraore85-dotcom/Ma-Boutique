import React, { useState, useEffect } from 'react'
import {
  Home, Package, ShoppingCart, BookOpen, Plus, Minus, X, Search,
  AlertTriangle, TrendingUp, Trash2, Check, Banknote, HandCoins,
  Smartphone, Settings as SettingsIcon, Lock, Unlock, MessageCircle, Send,
  Palette, ShieldCheck, LogOut,
} from 'lucide-react'
import {
  fetchProducts, fetchSales, fetchCustomers, insertProduct, updateProductRow,
  deleteProductRow, recordSaleRow, settleCreditRows, updateShop,
} from './db'
import {
  C, ACCENTS, LOGO_EMOJIS, FCFA, BogolanStrip, GlobalStyle, BigButton, Modal,
  Field, inputStyle, Card, stepBtn, ghostBtn, textDangerBtn,
  productProfitSummary, allTimeProfitTotals,
} from './ui'

// ---------- Hook: charge toutes les données de la boutique ----------
function useShopData(shop) {
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [loaded, setLoaded] = useState(false)

  const reload = async () => {
    const [p, s, c] = await Promise.all([fetchProducts(shop.id), fetchSales(shop.id), fetchCustomers(shop.id)])
    setProducts(p); setSales(s); setCustomers(c); setLoaded(true)
  }

  useEffect(() => { reload() }, [shop.id])

  return { products, sales, customers, setProducts, setSales, setCustomers, reload, loaded }
}

// ---------- Paywall (Orange Money — simulation en attendant l'étape 7) ----------
export function PaywallScreen({ shop, onActivated, onLogout }) {
  const [phone, setPhone] = useState(shop.ownerPhone || '')
  const [step, setStep] = useState('form')

  const pay = () => {
    setStep('processing')
    setTimeout(() => {
      setStep('done')
      setTimeout(async () => {
        const updated = await updateShop(shop.id, { subscriptionActive: true, subscriptionDate: new Date().toISOString() })
        onActivated(updated)
      }, 900)
    }, 1600)
  }

  return (
    <div style={{ padding: '36px 20px', maxWidth: 440, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <ShieldCheck size={36} color={C.orange} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 8 }}>Débloquer {shop.shopName}</div>
        <div style={{ fontSize: 13, color: C.faint, marginTop: 4 }}>Un seul abonnement pour tout gérer : stock, ventes, crédit.</div>
      </div>
      <Card style={{ textAlign: 'center', background: '#FFF3E9', borderColor: C.orange }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, textTransform: 'uppercase' }}>Abonnement annuel</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>7 000 FCFA</div>
      </Card>
      {step === 'form' && (
        <>
          <Field label="Numéro Orange Money"><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex : 7X XX XX XX" inputMode="tel" /></Field>
          <BigButton color={C.orange} disabled={!phone.trim()} onClick={pay}><Smartphone size={18} /> Payer avec Orange Money</BigButton>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 10, textAlign: 'center' }}>
            Démonstration — sera remplacé par la vraie connexion à l'étape 7 (agrégateur de paiement).
          </div>
        </>
      )}
      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 15, color: C.ink, fontWeight: 700 }}>Demande envoyée à Orange Money…</div>
          <div style={{ fontSize: 13, color: C.faint, marginTop: 6 }}>Confirme sur ton téléphone (simulation)</div>
        </div>
      )}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Check size={36} color={C.green} />
          <div style={{ fontSize: 16, color: C.green, fontWeight: 800, marginTop: 6 }}>Paiement confirmé — accès débloqué</div>
        </div>
      )}
      <button onClick={onLogout} style={{ background: 'none', border: 'none', color: C.indigo, fontWeight: 700, cursor: 'pointer', display: 'block', margin: '20px auto 0', fontSize: 13 }}>Se déconnecter</button>
    </div>
  )
}

// ---------- Application principale ----------
export function ShopApp({ shop: initialShop, onLogout }) {
  const [shop, setShop] = useState(initialShop)
  const { products, sales, customers, setProducts, setSales, setCustomers, reload, loaded } = useShopData(shop)

  const [tab, setTab] = useState('dashboard')
  const [role, setRole] = useState('patron')
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [sellTarget, setSellTarget] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [creditDetail, setCreditDetail] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')

  if (!loaded) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint }}>Chargement de ta boutique…</div>
  }

  const today = new Date().toDateString()
  const todaySales = sales.filter((s) => new Date(s.date).toDateString() === today)
  const todayCash = todaySales.filter((s) => s.type === 'cash' || s.type === 'mobile').reduce((a, s) => a + s.total, 0)
  const todayCredit = todaySales.filter((s) => s.type === 'credit').reduce((a, s) => a + s.total, 0)
  const todayProfit = todaySales.reduce((a, s) => a + s.profit, 0)
  const lowStock = products.filter((p) => p.qty <= p.threshold)
  const totalOwed = customers.reduce((a, c) => a + c.owed, 0)
  const profitTotals = allTimeProfitTotals(sales)
  const accent = shop.accentColor || C.indigo

  const addProduct = async (p) => { setBusyMsg('Enregistrement…'); try { const row = await insertProduct(shop.id, p); setProducts((prev) => [...prev, row]) } finally { setBusyMsg('') } }
  const updateProduct = async (id, patch) => { setBusyMsg('Enregistrement…'); try { const row = await updateProductRow(id, patch); setProducts((prev) => prev.map((p) => (p.id === id ? row : p))) } finally { setBusyMsg('') } }
  const deleteProduct = async (id) => { setBusyMsg('Suppression…'); try { await deleteProductRow(id); setProducts((prev) => prev.filter((p) => p.id !== id)) } finally { setBusyMsg('') } }

  const recordSale = async (product, qty, type, extra) => {
    setBusyMsg('Enregistrement de la vente…')
    try {
      const { sale, product: updatedProduct, customer } = await recordSaleRow(shop.id, product, qty, type, extra)
      setSales((prev) => [sale, ...prev])
      setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
      if (customer) {
        setCustomers((prev) => {
          const exists = prev.some((c) => c.id === customer.id)
          return exists ? prev.map((c) => (c.id === customer.id ? customer : c)) : [...prev, customer]
        })
      }
      setSellTarget(null)
    } finally { setBusyMsg('') }
  }

  const settleCredit = async (customer, amount) => {
    setBusyMsg('Enregistrement du remboursement…')
    try {
      const updated = await settleCreditRows(shop.id, customer, amount)
      setCustomers((prev) => (updated ? prev.map((c) => (c.id === customer.id ? updated : c)) : prev.filter((c) => c.id !== customer.id)))
      await reload()
    } finally { setBusyMsg('') }
  }

  const saveSettings = async (patch) => { const updated = await updateShop(shop.id, patch); setShop(updated) }
  const lockToVendeur = () => { if (!shop.patronPin) { setSettingsOpen(true); return } setRole('vendeur') }
  const tryUnlock = (pin) => { if (pin === shop.patronPin) { setRole('patron'); setUnlockOpen(false); return true } return false }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 90 }}>
      <GlobalStyle />

      <div style={{ background: accent, padding: '22px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{shop.logoEmoji || '🏪'}</span>
            <div>
              <div style={{ color: '#D8DCEA', fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>{shop.shopName}</div>
              <div style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700 }}>
                {tab === 'dashboard' && "Aujourd'hui"}
                {tab === 'stock' && 'Mon stock'}
                {tab === 'sell' && 'Vendre'}
                {tab === 'credit' && 'Cahier de crédit'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {role === 'patron' ? (
              <>
                <button onClick={() => setCustomizeOpen(true)} title="Personnaliser ma boutique" style={iconBtnStyle}><Palette size={17} color="#fff" /></button>
                <button onClick={() => setSettingsOpen(true)} title="Paramètres" style={iconBtnStyle}><SettingsIcon size={17} color="#fff" /></button>
                <button onClick={lockToVendeur} title="Passer en mode vendeur" style={iconBtnStyle}><Lock size={17} color="#fff" /></button>
              </>
            ) : (
              <button onClick={() => setUnlockOpen(true)} title="Revenir en mode gérant" style={{ ...iconBtnStyle, background: 'rgba(255,255,255,0.18)' }}>
                <Unlock size={17} color="#fff" /><span style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginLeft: 6 }}>Vendeur</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <BogolanStrip />

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        {tab === 'dashboard' && (
          <Dashboard role={role} todayCash={todayCash} todayCredit={todayCredit} todayProfit={todayProfit} lowStock={lowStock} totalOwed={totalOwed} todaySales={todaySales} profitTotals={profitTotals} goStock={() => setTab('stock')} goCredit={() => setTab('credit')} />
        )}
        {tab === 'stock' && <StockTab role={role} products={products} sales={sales} onAdd={() => setAddProductOpen(true)} onEdit={(p) => setEditProduct(p)} />}
        {tab === 'sell' && <SellTab products={products} onPick={(p) => setSellTarget(p)} />}
        {tab === 'credit' && <CreditTab customers={customers} shopName={shop.shopName} onOpenCustomer={(name) => setCreditDetail(name)} />}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.line}`, display: 'flex', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
        <NavBtn icon={Home} label="Accueil" active={tab === 'dashboard'} onClick={() => setTab('dashboard')} accent={accent} />
        <NavBtn icon={Package} label="Stock" active={tab === 'stock'} badge={lowStock.length || null} onClick={() => setTab('stock')} accent={accent} />
        <NavBtn icon={ShoppingCart} label="Vendre" active={tab === 'sell'} onClick={() => setTab('sell')} highlight accent={accent} />
        <NavBtn icon={BookOpen} label="Ardoise" active={tab === 'credit'} onClick={() => setTab('credit')} accent={accent} />
      </div>

      {addProductOpen && role === 'patron' && <AddProductModal onClose={() => setAddProductOpen(false)} onSave={async (p) => { await addProduct(p); setAddProductOpen(false) }} />}
      {editProduct && role === 'patron' && (
        <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} onSave={async (patch) => { await updateProduct(editProduct.id, patch); setEditProduct(null) }} onDelete={async () => { await deleteProduct(editProduct.id); setEditProduct(null) }} />
      )}
      {sellTarget && <SellModal product={sellTarget} onClose={() => setSellTarget(null)} onConfirm={recordSale} />}
      {creditDetail && (
        <CreditDetailModal customer={customers.find((c) => c.name === creditDetail)} sales={sales.filter((s) => s.customerName === creditDetail)} shopName={shop.shopName} onClose={() => setCreditDetail(null)} onSettle={async (amount) => { const cust = customers.find((c) => c.name === creditDetail); if (cust) await settleCredit(cust, amount); setCreditDetail(null) }} />
      )}
      {settingsOpen && (
        <SettingsModal settings={shop} onClose={() => setSettingsOpen(false)} onSave={saveSettings} onLock={() => { setSettingsOpen(false); if (shop.patronPin) setRole('vendeur') }} onLogout={onLogout} />
      )}
      {customizeOpen && <CustomizeModal settings={shop} onClose={() => setCustomizeOpen(false)} onSave={async (patch) => { await saveSettings(patch); setCustomizeOpen(false) }} />}
      {unlockOpen && <UnlockModal onClose={() => setUnlockOpen(false)} onTry={tryUnlock} />}

      {busyMsg && (
        <div style={{ position: 'fixed', bottom: 74, right: 10, fontSize: 11, color: C.faint, background: C.bg, padding: '2px 8px', borderRadius: 8, opacity: 0.9 }}>{busyMsg}</div>
      )}
    </div>
  )
}

const iconBtnStyle = { background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0 8px' }

function NavBtn({ icon: Icon, label, active, onClick, badge, highlight, accent }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: 'none', border: 'none', padding: '10px 4px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? (highlight ? C.ochre : accent) : 'transparent' }}>
        <Icon size={20} color={active ? '#fff' : (highlight ? C.ochre : C.faint)} strokeWidth={active ? 2.4 : 2} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? C.ink : C.faint }}>{label}</span>
      {badge ? <span style={{ position: 'absolute', top: 4, right: '26%', background: C.rust, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{badge}</span> : null}
    </button>
  )
}

function Dashboard({ role, todayCash, todayCredit, todayProfit, lowStock, totalOwed, todaySales, profitTotals, goStock, goCredit }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Card style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.green, marginBottom: 6 }}><Banknote size={16} /> <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Encaissé</span></div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(todayCash)}</div>
        </Card>
        <Card style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.rust, marginBottom: 6 }}><HandCoins size={16} /> <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Crédit donné</span></div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(todayCredit)}</div>
        </Card>
      </div>
      {role === 'patron' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.indigo, marginBottom: 6 }}><TrendingUp size={16} /> <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Bénéfice du jour</span></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(todayProfit)}</div>
          <div style={{ fontSize: 13, color: C.faint, marginTop: 2 }}>{todaySales.length} vente{todaySales.length !== 1 ? 's' : ''} aujourd'hui</div>
        </Card>
      )}
      {role === 'patron' && (profitTotals.received > 0 || profitTotals.pending > 0) && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: 'uppercase', marginBottom: 10 }}>Bénéfices — depuis le début</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#EAF3EA', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase' }}>● Reçu</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.green, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(profitTotals.received)}</div>
            </div>
            <div style={{ background: '#FDECE8', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.rust, textTransform: 'uppercase' }}>● En attente</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.rust, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(profitTotals.pending)}</div>
            </div>
          </div>
        </Card>
      )}
      {lowStock.length > 0 && (
        <Card style={{ borderColor: C.mustard, background: '#FFF8E8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><AlertTriangle size={18} color={C.mustard} /><span style={{ fontWeight: 700, color: C.ink }}>Stock faible — {lowStock.length} article{lowStock.length !== 1 ? 's' : ''}</span></div>
          {lowStock.slice(0, 4).map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', color: C.ink }}><span>{p.name}</span><span style={{ fontWeight: 700 }}>{p.qty} restant{p.qty !== 1 ? 's' : ''}</span></div>
          ))}
          <button onClick={goStock} style={{ marginTop: 8, background: 'none', border: 'none', color: C.indigo, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>Voir tout le stock →</button>
        </Card>
      )}
      {totalOwed > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: 'uppercase' }}>Total dû par les clients</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.rust, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(totalOwed)}</div>
            </div>
            <button onClick={goCredit} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 12px', fontWeight: 700, color: C.ink, cursor: 'pointer', fontSize: 13 }}>Ouvrir le cahier</button>
          </div>
        </Card>
      )}
      {lowStock.length === 0 && totalOwed === 0 && todaySales.length === 0 && (
        <div style={{ textAlign: 'center', color: C.faint, marginTop: 40, fontSize: 14 }}>Aucune vente encore aujourd'hui.<br />Appuie sur <b>Vendre</b> pour commencer.</div>
      )}
    </div>
  )
}

function StockTab({ role, products, sales, onAdd, onEdit }) {
  const [q, setQ] = useState('')
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  const patron = role === 'patron'
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color={C.faint} style={{ position: 'absolute', left: 12, top: 14 }} />
          <input placeholder="Chercher un article…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
      </div>
      {patron && <BigButton onClick={onAdd} color={C.indigo} style={{ marginBottom: 16 }}><Plus size={20} /> Ajouter un article</BigButton>}
      {filtered.length === 0 && <div style={{ textAlign: 'center', color: C.faint, marginTop: 30, fontSize: 14 }}>{products.length === 0 ? 'Ton stock est vide. Ajoute ton premier article.' : 'Aucun article trouvé.'}</div>}
      {filtered.map((p) => {
        const low = p.qty <= p.threshold
        const { received, pending } = patron ? productProfitSummary(p.id, sales) : { received: 0, pending: 0 }
        return (
          <Card key={p.id} style={{ cursor: patron ? 'pointer' : 'default' }}>
            <div onClick={() => patron && onEdit(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>{p.name}</div>
                {patron && <div style={{ fontSize: 13, color: C.faint }}>Achat {FCFA(p.buyPrice)} · Vente {FCFA(p.sellPrice)}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: low ? C.rust : C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{p.qty}</div>
                <div style={{ fontSize: 11, color: low ? C.rust : C.faint, fontWeight: low ? 700 : 400 }}>{low ? 'à réapprovisionner' : 'en stock'}</div>
              </div>
            </div>
            {patron && (received > 0.5 || pending > 0.5) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {received > 0.5 && <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: '#EAF3EA', borderRadius: 999, padding: '3px 9px' }}>● {FCFA(received)} reçu</span>}
                {pending > 0.5 && <span style={{ fontSize: 11, fontWeight: 700, color: C.rust, background: '#FDECE8', borderRadius: 999, padding: '3px 9px' }}>● {FCFA(pending)} en attente</span>}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function SellTab({ products, onPick }) {
  const [q, setQ] = useState('')
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  if (products.length === 0) return <div style={{ textAlign: 'center', color: C.faint, marginTop: 40, fontSize: 14 }}>Ajoute d'abord des articles dans l'onglet <b>Stock</b> pour pouvoir vendre.</div>
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} color={C.faint} style={{ position: 'absolute', left: 12, top: 14 }} />
        <input placeholder="Chercher un article à vendre…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {filtered.map((p) => (
          <button key={p.id} onClick={() => p.qty > 0 && onPick(p)} disabled={p.qty <= 0} style={{ background: p.qty <= 0 ? C.line : C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, textAlign: 'left', cursor: p.qty <= 0 ? 'not-allowed' : 'pointer' }}>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.indigo, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(p.sellPrice)}</div>
            <div style={{ fontSize: 12, color: p.qty <= 0 ? C.rust : C.faint, marginTop: 2 }}>{p.qty <= 0 ? 'Épuisé' : `${p.qty} en stock`}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function buildLedgerText(shopName, customers) {
  const lines = customers.map((c) => `- ${c.name} : ${FCFA(c.owed)}`).join('\n')
  return `Cahier de crédit — ${shopName}\n\n${lines}\n\nMerci de régler dès que possible.`
}
function buildCustomerText(shopName, customer) {
  return `Bonjour ${customer.name}, ici ${shopName}. Petit rappel : vous devez actuellement ${FCFA(customer.owed)}. Merci de régler quand vous pourrez. Bonne journée !`
}
function waLink(text, phone) { const num = phone ? phone.replace(/[^0-9+]/g, '') : ''; return `https://wa.me/${num}?text=${encodeURIComponent(text)}` }
function smsLink(text, phone) { const num = phone ? phone.replace(/[^0-9+]/g, '') : ''; return `sms:${num}?body=${encodeURIComponent(text)}` }

function ExportButtons({ text, phone }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <a href={waLink(text, phone)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none' }}>
        <div style={{ background: '#25D366', color: '#fff', borderRadius: 10, padding: '10px 0', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><MessageCircle size={15} /> WhatsApp</div>
      </a>
      <a href={smsLink(text, phone)} style={{ flex: 1, textDecoration: 'none' }}>
        <div style={{ background: C.indigo, color: '#fff', borderRadius: 10, padding: '10px 0', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Send size={15} /> SMS</div>
      </a>
    </div>
  )
}

function CreditTab({ customers, shopName, onOpenCustomer }) {
  const sorted = [...customers].sort((a, b) => b.owed - a.owed)
  return (
    <div>
      {sorted.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Envoyer tout le cahier</div>
          <ExportButtons text={buildLedgerText(shopName, sorted)} phone="" />
        </Card>
      )}
      <div style={{ background: '#FFFDF6', borderRadius: 14, border: `1px solid ${C.line}`, padding: '18px 16px 18px 26px', position: 'relative', backgroundImage: `repeating-linear-gradient(180deg, transparent, transparent 33px, ${C.line} 34px)` }}>
        <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, background: C.rust, opacity: 0.5 }} />
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: C.rust, marginBottom: 10, fontWeight: 700 }}>Qui me doit de l'argent ?</div>
        {sorted.length === 0 && <div style={{ color: C.faint, fontSize: 14, paddingBottom: 10 }}>Personne ne te doit d'argent pour le moment.</div>}
        {sorted.map((c) => (
          <div key={c.id} onClick={() => onOpenCustomer(c.name)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', cursor: 'pointer' }}>
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: C.ink, fontWeight: 700 }}>{c.name}</span>
            <span style={{ fontWeight: 800, color: C.rust, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(c.owed)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddProductModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [qty, setQty] = useState('')
  const [threshold, setThreshold] = useState('5')
  const valid = name.trim() && buyPrice !== '' && sellPrice !== '' && qty !== ''
  return (
    <Modal title="Nouvel article" onClose={onClose}>
      <Field label="Nom de l'article"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Savon Jaba" autoFocus /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Prix d'achat (FCFA)"><input style={inputStyle} type="number" inputMode="numeric" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" /></Field>
        <Field label="Prix de vente (FCFA)"><input style={inputStyle} type="number" inputMode="numeric" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Quantité en stock"><input style={inputStyle} type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></Field>
        <Field label="Alerte si stock ≤"><input style={inputStyle} type="number" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="5" /></Field>
      </div>
      <BigButton disabled={!valid} color={C.indigo} onClick={() => onSave({ name: name.trim(), buyPrice: Number(buyPrice) || 0, sellPrice: Number(sellPrice) || 0, qty: Number(qty) || 0, threshold: Number(threshold) || 5 })}>
        <Check size={18} /> Enregistrer l'article
      </BigButton>
    </Modal>
  )
}

function EditProductModal({ product, onClose, onSave, onDelete }) {
  const [qty, setQty] = useState(String(product.qty))
  const [sellPrice, setSellPrice] = useState(String(product.sellPrice))
  const [buyPrice, setBuyPrice] = useState(String(product.buyPrice))
  const [threshold, setThreshold] = useState(String(product.threshold))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const margin = Number(sellPrice) - Number(buyPrice)
  return (
    <Modal title={product.name} onClose={onClose}>
      <Field label="Quantité en stock">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setQty((q) => String(Math.max(0, Number(q) - 1)))} style={stepBtn}><Minus size={18} /></button>
          <input style={{ ...inputStyle, textAlign: 'center' }} type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button onClick={() => setQty((q) => String(Number(q) + 1))} style={stepBtn}><Plus size={18} /></button>
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Prix d'achat"><input style={inputStyle} type="number" inputMode="numeric" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} /></Field>
        <Field label="Prix de vente"><input style={inputStyle} type="number" inputMode="numeric" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} /></Field>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: margin > 0 ? C.green : C.rust, display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: margin > 0 ? C.green : C.rust }}>Marge : {FCFA(margin)} par unité {margin > 0 ? '(bénéfice)' : '(perte ou nul)'}</span>
      </div>
      <Field label="Alerte si stock ≤"><input style={inputStyle} type="number" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field>
      <BigButton color={C.indigo} onClick={() => onSave({ qty: Number(qty) || 0, sellPrice: Number(sellPrice) || 0, buyPrice: Number(buyPrice) || 0, threshold: Number(threshold) || 5 })} style={{ marginBottom: 10 }}>
        <Check size={18} /> Enregistrer les changements
      </BigButton>
      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} style={textDangerBtn}><Trash2 size={15} /> Supprimer cet article</button>
      ) : (
        <div style={{ background: '#FDECE8', borderRadius: 10, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: C.ink, marginBottom: 8 }}>Supprimer définitivement « {product.name} » ?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDelete(false)} style={ghostBtn}>Annuler</button>
            <button onClick={onDelete} style={{ flex: 1, background: C.rust, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontWeight: 700, cursor: 'pointer' }}>Oui, supprimer</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const MOMO_PROVIDERS = [{ id: 'orange', label: 'Orange Money' }, { id: 'moov', label: 'Moov Money' }, { id: 'wave', label: 'Wave' }]

function SellModal({ product, onClose, onConfirm }) {
  const [qty, setQty] = useState(1)
  const [mode, setMode] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [provider, setProvider] = useState(MOMO_PROVIDERS[0].id)
  const [phone, setPhone] = useState('')
  const [momoStep, setMomoStep] = useState('form')
  const max = product.qty
  const total = product.sellPrice * qty

  const confirmCashOrCredit = () => onConfirm(product, qty, mode, { customerName: customerName.trim() })
  const runMomoFlow = () => {
    setMomoStep('processing')
    setTimeout(() => { setMomoStep('done'); setTimeout(() => onConfirm(product, qty, 'mobile', { provider, phone }), 900) }, 1400)
  }

  return (
    <Modal title={`Vendre — ${product.name}`} onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>Quantité</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 8 }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ ...stepBtn, width: 48, height: 48 }}><Minus size={22} /></button>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.ink, fontFamily: "'Space Grotesk', sans-serif", minWidth: 60, textAlign: 'center' }}>{qty}</div>
          <button onClick={() => setQty((q) => Math.min(max, q + 1))} style={{ ...stepBtn, width: 48, height: 48 }}><Plus size={22} /></button>
        </div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>{max} disponible{max !== 1 ? 's' : ''}</div>
      </div>
      <Card style={{ textAlign: 'center', background: C.bg }}>
        <div style={{ fontSize: 13, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>Total</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.indigo, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(total)}</div>
      </Card>
      <Field label="Mode de paiement">
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('cash')} style={payTabBtn(mode === 'cash', C.green)}><Banknote size={17} color={C.green} /> Cash</button>
          <button onClick={() => setMode('mobile')} style={payTabBtn(mode === 'mobile', C.momo)}><Smartphone size={17} color={C.momo} /> Mobile Money</button>
          <button onClick={() => setMode('credit')} style={payTabBtn(mode === 'credit', C.rust)}><HandCoins size={17} color={C.rust} /> Crédit</button>
        </div>
      </Field>
      {mode === 'credit' && (
        <>
          <Field label="Nom du client"><input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex : Fatoumata" /></Field>
          <BigButton color={C.rust} disabled={!customerName.trim()} onClick={confirmCashOrCredit}><Check size={18} /> Confirmer la vente à crédit</BigButton>
        </>
      )}
      {mode === 'cash' && <BigButton color={C.green} onClick={confirmCashOrCredit}><Check size={18} /> Confirmer la vente cash</BigButton>}
      {mode === 'mobile' && (
        <div>
          {momoStep === 'form' && (
            <>
              <Field label="Opérateur">
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOMO_PROVIDERS.map((p) => (
                    <button key={p.id} onClick={() => setProvider(p.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${provider === p.id ? C.momo : C.line}`, background: provider === p.id ? '#E7F3F0' : '#fff', fontWeight: 700, fontSize: 12, color: C.ink, cursor: 'pointer' }}>{p.label}</button>
                  ))}
                </div>
              </Field>
              <Field label="Numéro du client (optionnel)"><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex : 7X XX XX XX" inputMode="tel" /></Field>
              <BigButton color={C.momo} onClick={runMomoFlow}><Smartphone size={18} /> Envoyer la demande de paiement</BigButton>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 8, textAlign: 'center' }}>Démonstration — se branchera sur la vraie API à l'étape 7.</div>
            </>
          )}
          {momoStep === 'processing' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 15, color: C.ink, fontWeight: 700 }}>Envoi de la demande à {MOMO_PROVIDERS.find((p) => p.id === provider).label}…</div>
              <div style={{ fontSize: 13, color: C.faint, marginTop: 6 }}>En attente de confirmation du client</div>
            </div>
          )}
          {momoStep === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Check size={36} color={C.green} />
              <div style={{ fontSize: 16, color: C.green, fontWeight: 800, marginTop: 6 }}>Paiement reçu (simulation)</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function payTabBtn(active, color) {
  return { flex: 1, padding: '10px 0', borderRadius: 12, border: `2px solid ${active ? color : C.line}`, background: '#fff', fontWeight: 700, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12 }
}

function CreditDetailModal({ customer, sales, shopName, onClose, onSettle }) {
  const [amount, setAmount] = useState('')
  if (!customer) return null
  return (
    <Modal title={customer.name} onClose={onClose}>
      <Card style={{ textAlign: 'center', background: '#FDECE8' }}>
        <div style={{ fontSize: 13, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>Doit actuellement</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.rust, fontFamily: "'Space Grotesk', sans-serif" }}>{FCFA(customer.owed)}</div>
      </Card>
      <Field label="Envoyer un rappel"><ExportButtons text={buildCustomerText(shopName, customer)} phone={customer.phone} /></Field>
      <Field label="Historique">
        <div style={{ maxHeight: 140, overflowY: 'auto' }}>
          {sales.slice(0, 8).map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: `1px solid ${C.line}`, color: C.ink }}>
              <span>{s.productName} ×{s.qty}</span><span style={{ fontWeight: 700 }}>{FCFA(s.total)}</span>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Montant remboursé (FCFA)"><input style={inputStyle} type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <BigButton color={C.faint} style={{ flex: 1 }} onClick={() => setAmount(String(customer.owed))}>Tout payé</BigButton>
        <BigButton color={C.green} style={{ flex: 1 }} disabled={!amount || Number(amount) <= 0} onClick={() => onSettle(Math.min(Number(amount), customer.owed))}><Check size={18} /> Valider</BigButton>
      </div>
    </Modal>
  )
}

function SettingsModal({ settings, onClose, onSave, onLock, onLogout }) {
  const [pin, setPin] = useState(settings.patronPin || '')
  const [confirmPin, setConfirmPin] = useState('')
  const pinValid = pin.length === 4 && /^[0-9]{4}$/.test(pin)
  const pinsMatch = pin === confirmPin
  return (
    <Modal title="Paramètres" onClose={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: 14, marginBottom: 4 }}>Mode multi-utilisateur</div>
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>Définis un code à 4 chiffres pour reprendre la main après avoir prêté le téléphone à un vendeur.</div>
        <Field label="Code PIN gérant (4 chiffres)"><input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" /></Field>
        <Field label="Confirmer le code"><input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" /></Field>
        {pin && !pinValid && <div style={{ fontSize: 12, color: C.rust, marginBottom: 8 }}>Le code doit faire 4 chiffres.</div>}
        {pin && pinValid && !pinsMatch && confirmPin.length === 4 && <div style={{ fontSize: 12, color: C.rust, marginBottom: 8 }}>Les codes ne correspondent pas.</div>}
      </div>
      <BigButton color={C.indigo} style={{ marginBottom: 10 }} onClick={() => { onSave({ patronPin: pinValid && pinsMatch ? pin : settings.patronPin }); onClose() }}><Check size={18} /> Enregistrer</BigButton>
      {(pinValid && pinsMatch) || settings.patronPin ? (
        <BigButton color={C.ochre} style={{ marginBottom: 10 }} onClick={() => { onSave({ patronPin: pinValid && pinsMatch ? pin : settings.patronPin }); onLock() }}><Lock size={18} /> Enregistrer et passer en mode vendeur</BigButton>
      ) : null}
      <button onClick={onLogout} style={{ ...textDangerBtn, color: C.faint }}><LogOut size={15} /> Se déconnecter</button>
    </Modal>
  )
}

function CustomizeModal({ settings, onClose, onSave }) {
  const [shopName, setShopName] = useState(settings.shopName)
  const [logoEmoji, setLogoEmoji] = useState(settings.logoEmoji || '🏪')
  const [accentColor, setAccentColor] = useState(settings.accentColor || C.indigo)
  return (
    <Modal title="Personnaliser ma boutique" onClose={onClose}>
      <Field label="Nom de la boutique"><input style={inputStyle} value={shopName} onChange={(e) => setShopName(e.target.value)} /></Field>
      <Field label="Logo (emoji)">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LOGO_EMOJIS.map((emo) => (
            <button key={emo} onClick={() => setLogoEmoji(emo)} style={{ width: 44, height: 44, fontSize: 22, borderRadius: 10, border: `2px solid ${logoEmoji === emo ? C.indigo : C.line}`, background: '#fff', cursor: 'pointer' }}>{emo}</button>
          ))}
        </div>
      </Field>
      <Field label="Couleur de la boutique">
        <div style={{ display: 'flex', gap: 10 }}>
          {ACCENTS.map((a) => (
            <button key={a.id} onClick={() => setAccentColor(a.hex)} title={a.label} style={{ width: 40, height: 40, borderRadius: 999, background: a.hex, border: accentColor === a.hex ? `3px solid ${C.ink}` : '3px solid transparent', cursor: 'pointer' }} />
          ))}
        </div>
      </Field>
      <Card style={{ background: accentColor, textAlign: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif" }}>{logoEmoji} {shopName || 'Ma Boutique'}</div>
      </Card>
      <BigButton color={C.indigo} onClick={() => onSave({ shopName: shopName.trim() || settings.shopName, logoEmoji, accentColor })}><Check size={18} /> Enregistrer</BigButton>
    </Modal>
  )
}

function UnlockModal({ onClose, onTry }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  return (
    <Modal title="Revenir en mode gérant" onClose={onClose}>
      <Field label="Code PIN"><input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(false) }} placeholder="••••" autoFocus /></Field>
      {error && <div style={{ fontSize: 13, color: C.rust, marginBottom: 10 }}>Code incorrect, réessaie.</div>}
      <BigButton color={C.indigo} disabled={pin.length !== 4} onClick={() => { if (!onTry(pin)) setError(true) }}><Unlock size={18} /> Déverrouiller</BigButton>
    </Modal>
  )
}
