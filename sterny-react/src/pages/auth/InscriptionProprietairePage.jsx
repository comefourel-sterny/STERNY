import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import GoogleSignInButton from '../../components/auth-wizard/GoogleSignInButton'
import AppleSignInButton from '../../components/auth-wizard/AppleSignInButton'
import OrSeparator from '../../components/auth-wizard/OrSeparator'
import './InscriptionProprietairePage.css'

function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-ZÀ-ÿ])/g, (match) => match.toUpperCase())
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
  const btnRef = useRef(null)
  const [referrerName, setReferrerName] = useState('')
  const [showReferral, setShowReferral] = useState(false)
  const [parrainId, setParrainId] = useState(null)
  const oauthCheckedRef = useRef(false)

  // useEffect 1 — Décodage du token de parrainage ?r=<token>
  // (logique existante, juste nettoyée du fallback sessionStorage referrer_id
  // qui devient mort suite à T4-A — le handler ne set plus rien en sessionStorage).
  useEffect(() => {
    const token = searchParams.get('r')
    if (token) {
      supabaseClient
        .from('users')
        .select('id, prenom, nom')
        .eq('invitation_token', token)
        .single()
        .then(({ data }) => {
          if (data) {
            setParrainId(data.id)
            setReferrerName(`${data.prenom} ${data.nom}`)
            setShowReferral(true)
          }
        })
    }
  }, [searchParams])

  // useEffect 2 — Callback OAuth (Q5 + DETTE #55, fix timing conv 22)
  // Combo getSession() + onAuthStateChange() pour gérer 2 cas :
  // (a) session déjà active au mount (refresh page, reprise)
  // (b) session établie après le mount (callback OAuth Supabase async)
  // Sans ce combo, la session arrive après getSession() one-shot et le navigate
  // ne se déclenche jamais (bug observé conv 22).
  // Cf. UNIFICATION-INSCRIPTION § 4.10.2.
  useEffect(() => {
    const processOAuthSession = async (session) => {
      if (oauthCheckedRef.current) return
      if (!session) return

      try {
        // CHECK 1 : ligne users existe → redirect dashboard (peu importe le provider)
        // Couvre les sessions email ET OAuth dont le user a déjà sa ligne en BDD.
        const { data: existingUser } = await supabaseClient
          .from('users')
          .select('id, profil_complet')
          .eq('id', session.user.id)
          .maybeSingle()

        if (existingUser) {
          oauthCheckedRef.current = true
          // User déjà inscrit → redirect immédiat avec state pour afficher modal welcome dashboard
          navigate('/dashboard/proprietaire', { state: { showWelcomeModal: true } })
          return
        }

        // CHECK 2 : pas de ligne users → seuls les providers Google/Apple peuvent INSERT ici.
        // Méthode email : handleSubmit gère son propre signUp + INSERT (workaround DETTE #55).
        const provider = session.user.app_metadata?.provider
        if (provider !== 'google' && provider !== 'apple') return

        oauthCheckedRef.current = true

        // Résolution locale du parrainId depuis le token
        let resolvedParrainId = null
        const token = searchParams.get('r')
        if (token) {
          const { data: parrain } = await supabaseClient
            .from('users')
            .select('id')
            .eq('invitation_token', token)
            .maybeSingle()
          if (parrain) resolvedParrainId = parrain.id
        }

        // Extraction prenom/nom depuis user_metadata selon provider
        const metadata = session.user.user_metadata || {}
        let extractedPrenom = ''
        let extractedNom = ''

        if (provider === 'google') {
          const fullName = metadata.full_name || metadata.name || ''
          const parts = fullName.trim().split(/\s+/).filter(Boolean)
          extractedPrenom = parts[0] || ''
          extractedNom = parts.slice(1).join(' ') || ''
        } else if (provider === 'apple') {
          const nameField = metadata.name
          if (nameField && typeof nameField === 'object') {
            extractedPrenom = nameField.firstName || ''
            extractedNom = nameField.lastName || ''
          } else if (typeof nameField === 'string') {
            const parts = nameField.trim().split(/\s+/).filter(Boolean)
            extractedPrenom = parts[0] || ''
            extractedNom = parts.slice(1).join(' ') || ''
          }
        }

        // INSERT users
        const { error: insertError } = await supabaseClient
          .from('users')
          .insert([{
            id: session.user.id,
            email: session.user.email,
            prenom: extractedPrenom || '',
            nom: extractedNom || '',
            type_user: 'proprietaire',
            parrain_id: resolvedParrainId,
            profil_complet: false
          }])

        if (insertError) {
          console.warn('InscriptionProprietairePage OAuth INSERT error:', insertError.message)
          oauthCheckedRef.current = false // permettre une retry
          return
        }

        navigate('/dashboard/proprietaire')
      } catch (err) {
        console.warn('InscriptionProprietairePage OAuth callback:', err.message)
        oauthCheckedRef.current = false
      }
    }

    // Cas (a) — session déjà active au mount (refresh, reprise)
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) processOAuthSession(session)
    })

    // Cas (b) — session établie après le mount (callback OAuth Supabase async)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        processOAuthSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [searchParams, navigate])

  const shakeButton = () => {
    const btn = btnRef.current
    if (!btn) return
    btn.style.transition = 'translate 0.06s ease'
    btn.style.translate = '-1.5px 0'
    setTimeout(() => { btn.style.translate = '1.5px 0' }, 60)
    setTimeout(() => { btn.style.translate = '-0.5px 0' }, 120)
    setTimeout(() => { btn.style.translate = '0' }, 180)
  }

  const showError = (text) => {
    setMessage({ type: 'error', text })
    shakeButton()
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // handleGoogleSignup MODIFIÉ : suppression sessionStorage (Q5),
  // redirectTo /inscription/proprietaire?r=<token> au lieu de /dashboard/proprietaire.
  const handleGoogleSignup = async () => {
    const token = searchParams.get('r')
    const redirectPath = token
      ? `/inscription/proprietaire?r=${token}`
      : '/inscription/proprietaire'
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + redirectPath
      }
    })
    if (error) showError(error.message)
  }

  // handleAppleSignup NOUVEAU, symétrique de handleGoogleSignup
  // scopes 'email name' requis pour récupérer le nom à la 1ère connexion.
  const handleAppleSignup = async () => {
    const token = searchParams.get('r')
    const redirectPath = token
      ? `/inscription/proprietaire?r=${token}`
      : '/inscription/proprietaire'
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin + redirectPath,
        scopes: 'email name'
      }
    })
    if (error) showError(error.message)
  }

  // handleSubmit méthode email : INCHANGÉ (workaround DETTE #55).
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
        {message.type === 'success' && <p className={`ip-msg ${message.type}`}>{message.text}</p>}
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

          <button ref={btnRef} type="submit" className="ip-submit ip-stagger" style={{ animationDelay: '0.32s' }} disabled={loading}>
            {loading ? (
              <svg className="ip-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : 'Créer mon compte'}
          </button>
        </form>

        <div className="ip-stagger" style={{ animationDelay: '0.4s' }}>
          <OrSeparator />
        </div>

        <div className="ip-oauth-row ip-stagger" style={{ animationDelay: '0.48s' }}>
          <GoogleSignInButton
            onClick={handleGoogleSignup}
            label="Google"
          />
          <AppleSignInButton
            onClick={handleAppleSignup}
            label="Apple"
          />
        </div>

        <p className="ip-back ip-stagger" style={{ animationDelay: '0.56s' }}>
          {message.type === 'error' ? (
            <span className="ip-error">{message.text}</span>
          ) : (
            <><Link to="/inscription">Retour</Link> · Déjà inscrit ? <Link to="/connexion">Se connecter</Link></>
          )}
        </p>
      </div>
    </section>
  )
}
