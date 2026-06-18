import { useState, useCallback } from 'react'
import { Agentation } from 'agentation'
import { supabaseClient } from '../config/supabase'
import PasswordRevealButton from './PasswordRevealButton'

const PASSWORD_HASH = '2bdfc58e249f3f1a115f9182ff5a88bd6d4420a6ce1bd99ec06a71248b844b90'

async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem('sterny_access') === PASSWORD_HASH } catch { return false }
  })
  const [view, setView] = useState('landing') // 'landing' or 'login'
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const handleLogin = useCallback(async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const hash = await sha256(password)
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem('sterny_access', PASSWORD_HASH)
      setUnlocked(true)
    } else {
      setError('Mot de passe incorrect')
      setShake(true)
      setPassword('')
      setTimeout(() => { setShake(false); setError('') }, 2000)
    }
    setLoading(false)
  }, [password, loading])

  const handleEmail = useCallback(async (e) => {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailMsg('error:Merci de vérifier ton adresse email'); setTimeout(() => setEmailMsg(''), 3000); return }
    try {
      const { error } = await supabaseClient.from('alertes').insert({ email: email.trim(), ville: null, rythme: null })
      if (error) {
        if (error.message && error.message.includes('duplicate')) {
          setEmailMsg('success:Tu es déjà inscrit ! On te préviendra au lancement.')
        } else {
          throw error
        }
      } else {
        setEmailMsg('success:Merci ! Tu seras prévenu au lancement.')
        try {
          await supabaseClient.functions.invoke('send-alert-email', { body: { email: email.trim(), ville: null, rythme: null } })
        } catch (emailErr) {
          console.warn('Email de bienvenue non envoyé:', emailErr)
        }
      }
      setEmail('')
    } catch (err) {
      console.error('Erreur alerte landing:', err)
      setEmailMsg('error:Une erreur est survenue, réessaie plus tard')
    }
    setTimeout(() => setEmailMsg(''), 5000)
  }, [email])

  if (unlocked) return children

  const font = "'DM Sans', -apple-system, sans-serif"

  // === VUE LOGIN ===
  if (view === 'login') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', padding: '20px', fontFamily: font }}>
      <form onSubmit={handleLogin} style={{
        background: 'white', borderRadius: '20px', padding: '40px 36px', maxWidth: '380px', width: '100%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: shake ? 'shakeGate 0.4s ease' : 'none'
      }}>
        <img src="/Logo-Sterny-V1.svg" alt="STERNY" style={{ height: '32px', marginBottom: '24px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>Connexion</h2>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 24px' }}>Accès réservé à l&apos;équipe</p>
        <div className="pw-field" style={{ marginBottom: '12px' }}>
          <input
            type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe" autoFocus autoComplete="off"
            style={{
              width: '100%', padding: '12px 44px 12px 16px', border: `1.5px solid ${error ? '#EF4444' : '#E8EAF0'}`,
              borderRadius: '12px', fontSize: '15px', fontFamily: 'inherit', color: '#1E293B',
              outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
            }}
            onFocus={(e) => { if (!error) e.target.style.borderColor = '#E8622A' }}
            onBlur={(e) => { if (!error) e.target.style.borderColor = '#E8EAF0' }}
          />
          <PasswordRevealButton visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
        </div>
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', background: loading ? '#94A3B8' : '#E8622A', color: 'white',
          border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s'
        }}>{loading ? 'Vérification...' : 'Accéder'}</button>
        {error && <p style={{ fontSize: '13px', color: '#EF4444', margin: '12px 0 0' }}>{error}</p>}
        <button type="button" onClick={() => setView('landing')} style={{
          background: 'none', border: 'none', color: '#94A3B8', fontSize: '13px', marginTop: '20px',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.2s'
        }}>
          &larr; Retour
        </button>
      </form>
      <style>{`@keyframes shakeGate { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(2px)} }`}</style>
    </div>
  )

  // === VUE LANDING ===
  const msgType = emailMsg.startsWith('error:') ? 'error' : emailMsg.startsWith('success:') ? 'success' : ''
  const msgText = emailMsg.replace(/^(error:|success:)/, '')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#1E293B', padding: '40px 20px', fontFamily: font, position: 'relative'
    }}>
      {/* Logo en grand */}
      <img src="/Logo-Sterny-V1-white.svg" alt="STERNY" style={{ maxHeight: '180px', maxWidth: '85vw', height: 'auto', width: 'auto', marginBottom: '40px' }} />

      {/* Lancement */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <span style={{
          display: 'inline-block', padding: '6px 18px', background: 'rgba(232, 98, 42, 0.15)',
          border: '1px solid rgba(232, 98, 42, 0.3)', borderRadius: '50px',
          fontSize: '14px', fontWeight: 600, color: '#E8622A', letterSpacing: '0.3px', marginBottom: '14px'
        }}>Lancement prochainement</span>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
          La plateforme de mise en relation entre étudiants en alternance pour trouver leur logement à leur rythme.
        </p>
      </div>

      {/* Formulaire email inline */}
      <form onSubmit={handleEmail} noValidate style={{ display: 'flex', gap: '8px', maxWidth: '400px', width: '100%' }}>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          style={{
            flex: 1, padding: '13px 18px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '12px',
            fontSize: '14px', fontFamily: 'inherit', color: 'white', outline: 'none', background: 'rgba(255,255,255,0.08)',
            boxSizing: 'border-box', transition: 'border-color 0.2s', minWidth: 0
          }}
          onFocus={(e) => e.target.style.borderColor = '#E8622A'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
        />
        <button type="submit" style={{
          padding: '13px 24px', background: '#E8622A', color: 'white', border: 'none',
          borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 0.2s'
        }}>Me prévenir</button>
      </form>
      {msgText && (
        <p style={{
          fontSize: '13px', margin: '8px 0 0', fontWeight: 500, textAlign: 'center', maxWidth: '400px', width: '100%',
          color: msgType === 'error' ? '#EF4444' : 'rgba(16, 185, 129, 0.8)'
        }}>{msgText}</p>
      )}

      {/* Lien connexion tout en bas */}
      <button onClick={() => setView('login')} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: '12px',
        position: 'absolute', bottom: '24px', cursor: 'pointer', fontFamily: font, transition: 'color 0.2s',
        display: 'flex', alignItems: 'center'
      }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
      >
        Connexion
      </button>

      <style>{`input::placeholder { color: rgba(255,255,255,0.3) !important; }`}</style>
      <Agentation endpoint="http://localhost:4747" />
    </div>
  )
}
