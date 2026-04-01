import { useState, useCallback } from 'react'

// SHA-256 hash of the password — the actual password never appears in the code
const PASSWORD_HASH = 'c1906591530e943691eed9fc5d1b4709047a228dba671b68a4bc090364362e01'

async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('sterny_access') === PASSWORD_HASH
    } catch { return false }
  })
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const hash = await sha256(input)
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem('sterny_access', PASSWORD_HASH)
      setUnlocked(true)
    } else {
      setError('Mot de passe incorrect')
      setShake(true)
      setInput('')
      setTimeout(() => { setShake(false); setError('') }, 2000)
    }
    setLoading(false)
  }, [input, loading])

  if (unlocked) return children

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1E293B',
      padding: '20px',
      fontFamily: "'DM Sans', -apple-system, sans-serif"
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px 36px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: shake ? 'shakeGate 0.4s ease' : 'none'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: '#FDF0EB',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>
          STERNY
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          Site en cours de développement.<br />Accès restreint.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mot de passe"
          autoFocus
          autoComplete="off"
          style={{
            width: '100%',
            padding: '12px 16px',
            border: `1.5px solid ${error ? '#EF4444' : '#E8EAF0'}`,
            borderRadius: '12px',
            fontSize: '15px',
            fontFamily: 'inherit',
            color: '#1E293B',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '12px',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => { if (!error) e.target.style.borderColor = '#E8622A' }}
          onBlur={(e) => { if (!error) e.target.style.borderColor = '#E8EAF0' }}
        />
        <button type="submit" disabled={loading} style={{
          width: '100%',
          padding: '12px',
          background: loading ? '#94A3B8' : '#E8622A',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.2s'
        }}>
          {loading ? 'Vérification...' : 'Accéder'}
        </button>
        {error && <p style={{ fontSize: '13px', color: '#EF4444', margin: '12px 0 0' }}>{error}</p>}
      </form>
      <style>{`
        @keyframes shakeGate {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}
