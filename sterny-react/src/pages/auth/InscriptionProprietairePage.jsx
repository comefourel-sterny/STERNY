import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './InscriptionProprietairePage.css'

function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-Z\u00C0-\u00FF])/g, (match) => match.toUpperCase())
}

export default function InscriptionProprietairePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [shakeBtn, setShakeBtn] = useState(false)
  const [referrerName, setReferrerName] = useState('')
  const [showReferral, setShowReferral] = useState(false)
  const [parrainId, setParrainId] = useState(null)
  const [codeParrainage, setCodeParrainage] = useState('')
  const [parrainageStatus, setParrainageStatus] = useState('')
  const [showParrainage, setShowParrainage] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    const parrain = searchParams.get('parrain')
    const codeFromUrl = searchParams.get('code')
    const referralCodeFromSession = sessionStorage.getItem('referral_code')

    if (parrain) {
      const formatted = parrain
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      setReferrerName(formatted)
      setShowReferral(true)
    }

    const code = codeFromUrl || referralCodeFromSession
    if (code) {
      setCodeParrainage(code.toUpperCase())
      setShowParrainage(true)
      supabaseClient
        .from('users')
        .select('id, prenom, nom')
        .eq('code_parrainage', code.toUpperCase())
        .single()
        .then(({ data }) => {
          if (data) setParrainId(data.id)
        })
    }

    const sessionParrainId = sessionStorage.getItem('referrer_id')
    if (sessionParrainId) setParrainId(sessionParrainId)
  }, [searchParams])

  // Vérifier le code parrainage en temps réel
  useEffect(() => {
    if (!codeParrainage || codeParrainage.length < 4) {
      setParrainageStatus('')
      if (!codeParrainage) setParrainId(null)
      return
    }
    setParrainageStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabaseClient
          .from('users')
          .select('id, prenom, nom')
          .eq('code_parrainage', codeParrainage)
          .single()
        if (data) {
          setParrainageStatus(`Parrainé par ${data.prenom} ${data.nom}`)
          setParrainId(data.id)
        } else {
          setParrainageStatus('invalid')
          setParrainId(null)
        }
      } catch {
        setParrainageStatus('invalid')
        setParrainId(null)
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [codeParrainage])

  const showError = (text) => {
    setMessage({ type: 'error', text })
    setShakeBtn(true)
    setTimeout(() => setShakeBtn(false), 500)
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const handleGoogleSignup = async () => {
    if (parrainId) {
      sessionStorage.setItem('referrer_id', parrainId)
    }
    if (codeParrainage) {
      sessionStorage.setItem('referral_code', codeParrainage)
    }
    sessionStorage.setItem('signup_type', 'proprietaire')
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard/proprietaire'
      }
    })
    if (error) showError(error.message)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prenom.trim() || !nom.trim() || !email.trim() || !password) {
      showError('Merci de remplir tous les champs')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Adresse email invalide')
      return
    }
    if (password.length < 6) {
      showError('6 caractères minimum')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password
      })

      if (authError) throw authError

      const { error: insertError } = await supabaseClient
        .from('users')
        .insert([{
          id: authData.user.id,
          prenom,
          nom,
          email,
          type_user: 'proprietaire',
          parrain_id: parrainId
        }])

      if (insertError) throw insertError

      setMessage({ type: 'success', text: 'Compte créé ! Redirection...' })

      setTimeout(() => {
        navigate('/dashboard/proprietaire')
      }, 2000)
    } catch (error) {
      const msg = error.message === 'User already registered'
        ? 'Un compte existe déjà avec cet email'
        : error.message
      showError(msg)
      setLoading(false)
    }
  }

  return (
    <section className="ip-page">
      <div className="ip-card" style={{ maxHeight: '536px' }}>
        <h2 className="ip-title ip-stagger">INSCRIPTION</h2>
        {message.text && <p className={`ip-msg ${message.type}`}>{message.text}</p>}
        {showReferral && !message.text && (
          <p className="ip-referral"><span className="ip-referrer">{referrerName}</span> vous recommande STERNY</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="ip-form-row ip-stagger" style={{ animationDelay: '0.08s' }}>
            <div className="ip-group">
              <label>Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(capitalizeWords(e.target.value))}
                placeholder="Jean"
              />
            </div>
            <div className="ip-group">
              <label>Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(capitalizeWords(e.target.value))}
                placeholder="Dupont"
              />
            </div>
          </div>

          <div className="ip-group ip-stagger" style={{ animationDelay: '0.16s' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean.dupont@email.com"
            />
          </div>

          <div className="ip-group ip-stagger" style={{ animationDelay: '0.24s' }}>
            <label>Mot de passe</label>
            <div className="ip-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
              />
              <button
                type="button"
                className="ip-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          {!showParrainage ? (
            <p className="ip-parr-toggle" onClick={() => setShowParrainage(true)}>
              Tu as un code parrainage ?
            </p>
          ) : (
            <div className="ip-parrainage">
              <input
                type="text"
                value={codeParrainage}
                onChange={(e) => setCodeParrainage(e.target.value.toUpperCase())}
                placeholder="Code parrainage"
                autoFocus
              />
              {parrainageStatus === 'checking' && <span className="ip-parr-status checking">...</span>}
              {parrainageStatus === 'invalid' && <span className="ip-parr-status invalid">Code non reconnu</span>}
              {parrainageStatus && parrainageStatus !== 'checking' && parrainageStatus !== 'invalid' && (
                <span className="ip-parr-status valid">{parrainageStatus}</span>
              )}
            </div>
          )}

          <button type="submit" className={`ip-submit ip-stagger${shakeBtn ? ' ip-shake' : ''}`} style={{ animationDelay: '0.32s' }} disabled={loading}>
            {loading ? (
              <svg className="ip-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : 'Créer mon compte'}
          </button>
        </form>

        <div className="ip-separator ip-stagger" style={{ animationDelay: '0.4s' }}>
          <span>ou</span>
        </div>

        <button type="button" className="ip-google ip-stagger" style={{ animationDelay: '0.48s' }} onClick={handleGoogleSignup}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          S'inscrire avec Google
        </button>

        <p className="ip-back ip-stagger" style={{ animationDelay: '0.56s' }}>
          <Link to="/inscription">Retour</Link> · Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </section>
  )
}
