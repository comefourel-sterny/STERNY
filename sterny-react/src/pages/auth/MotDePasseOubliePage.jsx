import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './MotDePasseOubliePage.css'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailDisabled, setEmailDisabled] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const redirectUrl = window.location.origin + '/reset-password'

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Si un compte existe avec cet email, tu recevras un lien de réinitialisation dans quelques instants. Pense à vérifier tes spams.'
      })
      setEmailDisabled(true)
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Une erreur est survenue. Réessaie dans quelques instants.'
      })
      setLoading(false)
    }
  }

  return (
    <div className="page-connexion">
      <div className="connexion-card">
        <div className="connexion-header">
          <h2>Mot de passe oublié ?</h2>
          <p>Entre ton email, on t'envoie un lien de réinitialisation.</p>
        </div>

        {message.text && (
          <div className={`error-box ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton.email@exemple.com"
              required
              disabled={emailDisabled}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading || emailDisabled}>
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="back-link">
          <Link to="/connexion">&larr; Retour</Link>
        </div>
      </div>
    </div>
  )
}
