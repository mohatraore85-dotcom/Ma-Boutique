import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { supabase } from './supabaseClient'
import { getOrCreateShop } from './db'
import { C, BigButton, Field, inputStyle, linkBtn } from './ui'

export function AuthScreen() {
  const [view, setView] = useState('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  return (
    <div style={{ padding: '40px 20px', maxWidth: 440, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 40 }}>🏪</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>Ma Boutique</div>
        <div style={{ fontSize: 13, color: C.faint }}>Gestion de stock pour boutiquiers</div>
      </div>

      {error && <div style={{ background: '#FDECE8', color: C.rust, fontSize: 13, fontWeight: 600, padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>{error}</div>}
      {notice && <div style={{ background: '#EAF3EA', color: C.green, fontSize: 13, fontWeight: 600, padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>{notice}</div>}

      {view === 'login' && (
        <LoginForm
          onError={setError}
          onGoSignup={() => { setError(''); setNotice(''); setView('signup') }}
          onGoForgot={() => { setError(''); setNotice(''); setView('forgot') }}
        />
      )}
      {view === 'signup' && (
        <SignupForm onError={setError} onGoLogin={() => { setError(''); setNotice(''); setView('login') }} />
      )}
      {view === 'forgot' && (
        <ForgotForm
          onError={setError}
          onSent={() => setNotice("Email envoyé ! Regarde ta boîte de réception (et les spams) pour le lien de réinitialisation.")}
          onGoLogin={() => { setError(''); setNotice(''); setView('login') }}
        />
      )}
    </div>
  )
}

function LoginForm({ onError, onGoSignup, onGoForgot }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    onError('')
    if (!email.trim() || !password) { onError('Renseigne ton email et ton mot de passe.'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) onError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
  }

  return (
    <div>
      <Field label="Email"><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@email.com" autoFocus /></Field>
      <Field label="Mot de passe"><input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
      <BigButton onClick={submit} disabled={busy} style={{ marginBottom: 10 }}><Check size={18} /> Se connecter</BigButton>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <button onClick={onGoForgot} style={linkBtn}>Mot de passe oublié ?</button>
        <button onClick={onGoSignup} style={linkBtn}>Créer un compte</button>
      </div>
    </div>
  )
}

function SignupForm({ onError, onGoLogin }) {
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    onError('')
    if (!shopName.trim()) { onError('Donne un nom à ta boutique.'); return }
    if (!email.trim()) { onError('Renseigne ton email.'); return }
    if (password.length < 6) { onError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (password !== confirm) { onError('Les mots de passe ne correspondent pas.'); return }

    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) { onError(error.message); return }
      if (!data.session) {
        onError("Compte créé. Si la confirmation par email est activée sur ton projet Supabase, vérifie ta boîte mail avant de te connecter.")
        return
      }
      await getOrCreateShop(data.user.id, shopName.trim(), phone.trim())
    } catch (err) {
      onError('Erreur : ' + (err.message || 'réessaie.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Field label="Nom de la boutique"><input style={inputStyle} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ex : Boutique Fatoumata" autoFocus /></Field>
      <Field label="Email"><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@email.com" /></Field>
      <Field label="Téléphone (optionnel, pour les rappels clients)"><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex : 7XXXXXXXX" inputMode="tel" /></Field>
      <Field label="Mot de passe"><input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
      <Field label="Confirmer le mot de passe"><input style={inputStyle} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></Field>
      <BigButton onClick={submit} disabled={busy} style={{ marginBottom: 10 }}><Check size={18} /> Créer mon compte</BigButton>
      <div style={{ textAlign: 'center' }}><button onClick={onGoLogin} style={linkBtn}>J'ai déjà un compte</button></div>
    </div>
  )
}

function ForgotForm({ onError, onSent, onGoLogin }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    onError('')
    if (!email.trim()) { onError('Renseigne ton email.'); return }
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (error) onError(error.message)
    else onSent()
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: C.faint, marginBottom: 14 }}>Entre l'email de ton compte. Tu recevras un vrai email avec un lien pour choisir un nouveau mot de passe.</div>
      <Field label="Email"><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@email.com" /></Field>
      <BigButton onClick={submit} disabled={busy} style={{ marginBottom: 10 }}>Recevoir le lien</BigButton>
      <div style={{ textAlign: 'center' }}><button onClick={onGoLogin} style={linkBtn}>Retour à la connexion</button></div>
    </div>
  )
}

export function UpdatePasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError('')
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 440, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.ink, marginBottom: 14, textAlign: 'center' }}>Choisis un nouveau mot de passe</div>
      {error && <div style={{ background: '#FDECE8', color: C.rust, fontSize: 13, fontWeight: 600, padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>{error}</div>}
      <Field label="Nouveau mot de passe"><input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
      <Field label="Confirmer"><input style={inputStyle} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></Field>
      <BigButton onClick={submit} disabled={busy}><Check size={18} /> Changer le mot de passe</BigButton>
    </div>
  )
}
