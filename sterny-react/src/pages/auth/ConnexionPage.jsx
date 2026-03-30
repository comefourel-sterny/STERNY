import { useState } from 'react'
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

  const handleSubmit = async (e) => {
    e.preventDefault()
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
        } else {
          navigate('/dashboard/locataire')
        }
      }, 1000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : error.message
      })
      setLoading(false)
    }
  }

  return (
    <div className="page-connexion">
      <div className="connexion-card">
        <div className="connexion-header">
          <h2>Connexion</h2>
          <p>Content de te revoir !</p>
        </div>

        {message.text && (
          <div className={`error-box ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton.email@exemple.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ton mot de passe"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="back-link">
          Pas encore de compte ? <Link to="/inscription">Inscris-toi</Link>
        </div>
      </div>
    </div>
  )
}
