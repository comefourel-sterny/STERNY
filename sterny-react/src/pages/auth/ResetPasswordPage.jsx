import { useState, useEffect } from 'react'
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

  // Password strength
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }

    if (password !== passwordConfirm) {
      setMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabaseClient.auth.updateUser({ password })

      if (error) throw error

      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès ! Redirection...' })
      setFieldsDisabled(true)

      setTimeout(() => {
        navigate('/connexion')
      }, 2000)
    } catch (error) {
      let msg = 'Une erreur est survenue.'
      if (error.message && error.message.includes('same password')) {
        msg = "Le nouveau mot de passe doit être différent de l'ancien."
      }
      setMessage({ type: 'error', text: msg })
      setLoading(false)
    }
  }

  if (showError) {
    return (
      <div className="page-connexion">
        <div className="connexion-card">
          <div className="error-state">
            <h2>Lien expiré</h2>
            <p>Ce lien de réinitialisation n'est plus valide ou a déjà été utilisé.</p>
            <Link to="/mot-de-passe-oublie" className="btn-retry">
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-connexion">
      <div className="connexion-card">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="connexion-header">
            <h2>Nouveau mot de passe</h2>
            <p>Choisis un nouveau mot de passe pour ton compte.</p>
          </div>

          {message.text && (
            <div className={`error-box ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength="8"
                  disabled={fieldsDisabled}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              {password.length > 0 && (
                <div className="password-strength">
                  <div className="bar">
                    <div
                      className="bar-fill"
                      style={{ width: strength.width, background: strength.color }}
                    />
                  </div>
                  <span style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirmer le mot de passe</label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Retape ton mot de passe"
                  required
                  minLength="8"
                  disabled={fieldsDisabled}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading || fieldsDisabled}>
              {loading ? 'Modification en cours...' : 'Changer mon mot de passe'}
            </button>
          </form>

          <div className="back-link">
            <Link to="/connexion">Retour</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
