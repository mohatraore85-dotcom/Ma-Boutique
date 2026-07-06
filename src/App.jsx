import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { getOrCreateShop } from './db'
import { AuthScreen, UpdatePasswordScreen } from './Auth'
import { ShopApp, PaywallScreen } from './Shop'
import { C } from './ui'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint, fontFamily: 'sans-serif' }}>Chargement…</div>
  }

  if (passwordRecovery) {
    return <UpdatePasswordScreen onDone={() => setPasswordRecovery(false)} />
  }

  if (!session) {
    return <AuthScreen />
  }

  return <ShopGate user={session.user} onLogout={() => supabase.auth.signOut()} />
}

function ShopGate({ user, onLogout }) {
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const s = await getOrCreateShop(user.id, 'Ma Boutique')
        setShop(s)
      } catch (err) {
        setError(err.message || 'Erreur de chargement de la boutique.')
      } finally {
        setLoading(false)
      }
    })()
  }, [user.id])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint }}>Chargement de ta boutique…</div>
  }
  if (error) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.rust, padding: 20, textAlign: 'center' }}>{error}</div>
  }
  if (!shop.subscriptionActive) {
    return <PaywallScreen shop={shop} onActivated={(updated) => setShop(updated)} onLogout={onLogout} />
  }
  return <ShopApp shop={shop} onLogout={onLogout} />
}
