import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './MotDePasseOubliePage.css'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailDisabled, setEmailDisabled] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    const showError = (text) => {
      setMessage({ type: 'error', text })
      shakeButton()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }

    if (!email.trim()) { showError('Entre ton adresse email'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Adresse email invalide'); return }

    setLoading(true)

    try {
      const redirectUrl = window.location.origin + '/reset-password'

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Lien envoyé ! Vérifie ta boîte mail.'
      })
      setEmailDisabled(true)
    } catch (error) {
      setMessage({ type: 'error', text: 'Une erreur est survenue. Réessaie.' })
      shakeButton()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mdp-page">
      <div className="mdp-card">
        <h2 className="mdp-title mdp-stagger">MOT DE PASSE</h2>
        <p className={`mdp-subtitle mdp-stagger${message.type === 'success' ? ` mdp-msg ${message.type}` : ''}`} style={{ animationDelay: '0.08s' }}>
          {message.type === 'success' ? message.text : 'Entre ton email, on t\'envoie un lien.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mdp-field mdp-stagger" style={{ animationDelay: '0.16s' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton.email@exemple.com"
              disabled={emailDisabled}
            />
          </div>

          <div className="mdp-bottom">
            <button ref={btnRef} type="submit" className="mdp-btn mdp-stagger" style={{ animationDelay: '0.24s' }} disabled={loading || emailDisabled}>
              {loading ? (
                <svg className="mdp-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="10" />
                </svg>
              ) : (emailDisabled ? 'Lien envoyé' : 'Envoyer le lien')}
            </button>

            <p className="mdp-back mdp-stagger" style={{ animationDelay: '0.32s' }}>
              {message.type === 'error' ? (
                <span style={{ color: '#EF4444', fontWeight: 600 }}>{message.text}</span>
              ) : (
                <Link to="/connexion">Retour</Link>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
