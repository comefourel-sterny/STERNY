import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './ResetPasswordPage.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [sessionReady, setSessionReady] = useState(false)
  const [showError, setShowError] = useState(false)
  const [fieldsDisabled, setFieldsDisabled] = useState(false)
  const btnRef = useRef(null)

  const shakeButton = () => {
    const btn = btnRef.current
    if (!btn) return
    btn.style.transition = 'translate 0.06s ease'
    btn.style.translate = '-1.5px 0'
    setTimeout(() => { btn.style.translate = '1.5px 0' }, 60)
    setTimeout(() => { btn.style.translate = '-0.5px 0' }, 120)
    setTimeout(() => { btn.style.translate = '0' }, 180)
  }

  const [strength, setStrength] = useState({ width: '0%', color: '#E8EAF0', label: '' })

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    const timer = setTimeout(() => {
      if (!sessionReady) {
        if (window.location.hash && window.location.hash.includes('access_token')) {
          setShowError(true)
        } else {
          navigate('/mot-de-passe-oublie')
        }
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [sessionReady, navigate])

  const checkStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    const levels = [
      { width: '0%', color: '#E8EAF0', label: '' },
      { width: '20%', color: '#EF4444', label: 'Très faible' },
      { width: '40%', color: '#F97316', label: 'Faible' },
      { width: '60%', color: '#EAB308', label: 'Moyen' },
      { width: '80%', color: '#22C55E', label: 'Fort' },
      { width: '100%', color: '#16A34A', label: 'Très fort' }
    ]

    setStrength(levels[score])
  }

  const handlePasswordChange = (val) => {
    setPassword(val)
    checkStrength(val)
  }

  const triggerError = (text) => {
    setMessage({ type: 'error', text })
    shakeButton()
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!password) { triggerError('Entre un mot de passe'); return }
    if (password.length < 8) { triggerError('8 caractères minimum'); return }
    if (password !== passwordConfirm) { triggerError('Les mots de passe ne correspondent pas'); return }

    setLoading(true)

    try {
      const { error } = await supabaseClient.auth.updateUser({ password })

      if (error) throw error

      setMessage({ type: 'success', text: 'Mot de passe modifié ! Redirection...' })
      setFieldsDisabled(true)

      setTimeout(() => {
        navigate('/connexion')
      }, 2000)
    } catch (error) {
      let msg = 'Une erreur est survenue'
      if (error.message && error.message.includes('same password')) {
        msg = 'Le nouveau mot de passe doit être différent'
      }
      triggerError(msg)
      setLoading(false)
    }
  }

  if (showError) {
    return (
      <div className="rp-page">
        <div className="rp-card" style={{ minHeight: '536px' }}>
          <h2 className="rp-title" style={{ marginTop: 'auto' }}>LIEN EXPIRÉ</h2>
          <p className="rp-subtitle">Ce lien n'est plus valide ou a déjà été utilisé.</p>
          <Link to="/mot-de-passe-oublie" className="rp-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Demander un nouveau lien
          </Link>
          <p className="rp-back">
            <Link to="/connexion">Retour</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rp-page">
      <div className="rp-card" style={{ minHeight: '536px' }}>
        <h2 className="rp-title rp-stagger">MOT DE PASSE</h2>
        <p className={`rp-subtitle rp-stagger${message.text ? ` rp-msg ${message.type}` : ''}`} style={{ animationDelay: '0.08s' }}>
          {message.text || 'Choisis un nouveau mot de passe'}
        </p>

        <form id="rp-form" onSubmit={handleSubmit}>
          <div className="rp-field rp-stagger" style={{ animationDelay: '0.16s' }}>
            <label>Nouveau mot de passe</label>
            <div className="rp-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="8 caractères minimum"
                disabled={fieldsDisabled}
              />
              <button type="button" className="rp-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            {password.length > 0 && (
              <div className="rp-strength">
                <div className="rp-strength-bar">
                  <div className="rp-strength-fill" style={{ width: strength.width, background: strength.color }} />
                </div>
                <span className="rp-strength-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className="rp-field rp-stagger" style={{ animationDelay: '0.24s' }}>
            <label>Confirmer</label>
            <div className="rp-password">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Retape ton mot de passe"
                disabled={fieldsDisabled}
              />
              <button type="button" className="rp-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

        </form>

        <div className="rp-bottom">
          <button ref={btnRef} type="submit" form="rp-form" className="rp-btn rp-stagger" style={{ animationDelay: '0.32s' }} disabled={loading || fieldsDisabled}>
            {loading ? (
              <svg className="rp-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : 'Changer mon mot de passe'}
          </button>
          <p className="rp-back rp-stagger" style={{ animationDelay: '0.4s' }}>
            <Link to="/connexion">Retour</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
