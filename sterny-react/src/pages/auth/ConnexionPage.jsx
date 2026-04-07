import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './ConnexionPage.css'

export default function ConnexionPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
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

  const handleGoogleLogin = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard/locataire'
      }
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const showError = (text) => {
      setMessage({ type: 'error', text })
      shakeButton()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
    if (!email.trim()) { showError('Entre ton adresse email'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Adresse email invalide'); return }
    if (!password) { showError('Entre ton mot de passe'); return }
    setLoading(true)

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('type_user, is_admin')
        .eq('id', data.user.id)
        .single()

      if (userError) throw userError

      setMessage({ type: 'success', text: 'Connexion réussie ! Redirection...' })

      setTimeout(() => {
        if (userData.is_admin) {
          navigate('/dashboard/admin')
        } else if (userData.type_user === 'proprietaire') {
          navigate('/dashboard/proprietaire')
        } else if (userData.type_user === 'hote') {
          navigate('/dashboard/hote')
        } else {
          navigate('/dashboard/locataire')
        }
      }, 1000)
    } catch (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : error.message
      setMessage({ type: 'error', text: msg })
      shakeButton()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      setLoading(false)
    }
  }

  return (
    <div className="cx-page">
      <div className="cx-card">
        <h2 className="cx-title">CONNEXION</h2>
        {message.type === 'success' && <p className={`cx-msg ${message.type}`}>{message.text}</p>}

        <form onSubmit={handleSubmit}>
          <div className="cx-field cx-stagger" style={{ animationDelay: '0.08s' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton.email@exemple.com"
            />
          </div>

          <div className="cx-field cx-stagger" style={{ animationDelay: '0.16s' }}>
            <label>Mot de passe</label>
            <div className="cx-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ton mot de passe"
              />
              <button
                type="button"
                className="cx-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="cx-forgot cx-stagger" style={{ animationDelay: '0.24s' }}>
            <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </div>

          <button ref={btnRef} type="submit" className="cx-submit cx-stagger" style={{ animationDelay: '0.32s' }} disabled={loading}>
            {loading ? (
              <svg className="cx-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : 'Se connecter'}
          </button>
        </form>

        <div className="cx-separator cx-stagger" style={{ animationDelay: '0.4s' }}>
          <span>ou</span>
        </div>

        <button type="button" className="cx-google cx-stagger" style={{ animationDelay: '0.48s' }} onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        <p className="cx-back cx-stagger" style={{ animationDelay: '0.56s' }}>
          {message.type === 'error' ? (
            <span style={{ color: '#EF4444', fontWeight: 600 }}>{message.text}</span>
          ) : (
            <>Pas encore de compte ? <Link to="/inscription">Inscris-toi</Link></>
          )}
        </p>
      </div>
    </div>
  )
}
