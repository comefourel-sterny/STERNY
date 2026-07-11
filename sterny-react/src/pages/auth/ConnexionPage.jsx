import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { traduireErreurAuth } from '../../utils/traduireErreurAuth'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import TextInput from '../../components/auth-wizard/TextInput'
import PrimaryButton from '../../components/auth-wizard/PrimaryButton'
import GoogleSignInButton from '../../components/auth-wizard/GoogleSignInButton'
import AppleSignInButton from '../../components/auth-wizard/AppleSignInButton'
import OrSeparator from '../../components/auth-wizard/OrSeparator'
import './ConnexionPage.css'

export default function ConnexionPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        redirectTo: window.location.origin + '/dashboard'
      }
    })
    if (error) {
      setMessage({ type: 'error', text: traduireErreurAuth(error) })
    }
  }

  const handleAppleLogin = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    })
    if (error) {
      setMessage({ type: 'error', text: traduireErreurAuth(error) })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const showError = (text) => {
      setMessage({ type: 'error', text })
      shakeButton()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
    if (!email.trim() && !password) { showError('Remplis ton email et ton mot de passe'); return }
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
          navigate('/dashboard')
        } else {
          navigate('/dashboard')
        }
      }, 1000)
    } catch (error) {
      setMessage({ type: 'error', text: traduireErreurAuth(error) })
      shakeButton()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      setLoading(false)
    }
  }

  return (
    <AuthScreenContainer>
      <h1 className="aw-screen-title cx-stagger" style={{ animationDelay: '0.08s' }}>CONNEXION</h1>
      {message.type === 'success' && <p className="cx-msg success">{message.text}</p>}

      <form onSubmit={handleSubmit} className="cx-form">
        <div className="cx-stagger" style={{ animationDelay: '0.16s' }}>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton.email@exemple.com"
            autoComplete="email"
          />
        </div>
        <div className="cx-stagger" style={{ animationDelay: '0.24s' }}>
          <TextInput
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ton mot de passe"
            autoComplete="current-password"
          />
        </div>
        <div className="cx-forgot cx-stagger" style={{ animationDelay: '0.32s' }}>
          <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        </div>
        <div className="cx-stagger" style={{ animationDelay: '0.40s' }}>
          <PrimaryButton ref={btnRef} type="submit" loading={loading}>
            Se connecter
          </PrimaryButton>
        </div>
      </form>

      <OrSeparator className="cx-stagger" style={{ animationDelay: '0.48s' }} />

      <div className="cx-oauth-row cx-stagger" style={{ animationDelay: '0.56s' }}>
        <GoogleSignInButton onClick={handleGoogleLogin} label="Google" />
        <AppleSignInButton onClick={handleAppleLogin} label="Apple" />
      </div>

      <p className="cx-back cx-stagger" style={{ animationDelay: '0.64s' }}>
        {message.type === 'error' ? (
          <span style={{ color: '#EF4444', fontWeight: 600 }}>{message.text}</span>
        ) : (
          <>Pas encore de compte ? <Link to="/inscription">Inscris-toi</Link></>
        )}
      </p>
    </AuthScreenContainer>
  )
}
