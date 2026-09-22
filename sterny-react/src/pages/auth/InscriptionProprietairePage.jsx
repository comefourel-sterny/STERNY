import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer'
import TextInput from '../../components/auth-wizard/TextInput'
import PrimaryButton from '../../components/auth-wizard/PrimaryButton'
import GoogleSignInButton from '../../components/auth-wizard/GoogleSignInButton'
import AppleSignInButton from '../../components/auth-wizard/AppleSignInButton'
import OrSeparator from '../../components/auth-wizard/OrSeparator'
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks'
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
  const oauthCheckedRef = useRef(false)

  // useEffect 1 — Affichage du parrain à partir du token ?r=<token>.
  // Parrain retrouvé par la base (DETTE #171) : le jeton n'est plus lisible dans users.
  // Affichage seulement : le parrain est enregistré par la base, jamais par la page.
  useEffect(() => {
    const token = searchParams.get('r')
    if (token) {
      supabaseClient
        .rpc('parrain_par_jeton', { p_jeton: token })
        .then(({ data }) => {
          const parrain = Array.isArray(data) ? data[0] : data
          if (parrain) {
            setReferrerName(`${parrain.prenom} ${parrain.nom}`)
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
        // Méthode email : la ligne users est créée par la base au signUp (DETTE #171).
        const provider = session.user.app_metadata?.provider
        if (provider !== 'google' && provider !== 'apple') return

        oauthCheckedRef.current = true

        const token = searchParams.get('r')

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

        // INSERT users — sans parrain_id, que la base refuse depuis le navigateur (DETTE #171)
        const { error: insertError } = await supabaseClient
          .from('users')
          .insert([{
            id: session.user.id,
            email: session.user.email,
            prenom: extractedPrenom || '',
            nom: extractedNom || '',
            type_user: 'proprietaire',
            profil_complet: false
          }])

        if (insertError) {
          console.warn('InscriptionProprietairePage OAuth INSERT error:', insertError.message)
          oauthCheckedRef.current = false // permettre une retry
          return
        }

        // Parrain rattaché par la base à partir du jeton. N'agit que si aucun parrain
        // n'est enregistré ; un jeton invalide laisse le compte sans parrain.
        if (token) {
          const { error: rattachementError } = await supabaseClient
            .rpc('rattacher_parrain', { p_jeton: token })
          if (rattachementError) {
            console.warn('InscriptionProprietairePage rattacher_parrain:', rattachementError.message)
          }
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

  // handleSubmit méthode email : la ligne users est créée par la base à la naissance
  // du compte (DETTE #171), à partir des métadonnées transmises au signUp.
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
      const token = searchParams.get('r')
      const donneesInscription = {
        sterny_parcours: 'proprietaire',
        prenom: prenom.trim(),
        nom: nom.trim()
      }
      if (token) donneesInscription.jeton_invitation = token

      const { error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: donneesInscription }
      })

      if (authError) throw authError

      setMessage({ type: 'success', text: 'Compte créé ! Redirection...' })

      setTimeout(() => {
        navigate('/dashboard/proprietaire')
      }, 2000)
    } catch (error) {
      let msg = error.message
      if (error.message === 'User already registered') msg = 'Un compte existe déjà avec cet email'
      else if (error.message && error.message.includes('Database error saving new user')) msg = 'La création du compte a échoué, réessaie dans un instant'
      showError(msg)
      setLoading(false)
    }
  }

  return (
    <AuthScreenContainer>
      <h1 className="aw-screen-title ip-stagger">INSCRIPTION</h1>
      {message.type === 'success' && <p className={`ip-msg ${message.type}`}>{message.text}</p>}
      {showReferral && !message.text && (
        <p className="ip-referral"><span className="ip-referrer">{referrerName}</span> vous recommande STERNY</p>
      )}

      <form onSubmit={handleSubmit} className="ip-form">
        <div className="ip-form-row ip-stagger" style={{ animationDelay: '0.08s' }}>
          <TextInput
            label="Prénom"
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(capitalizeWords(e.target.value))}
            placeholder="Ton prénom"
          />
          <TextInput
            label="Nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(capitalizeWords(e.target.value))}
            placeholder="Ton nom"
          />
        </div>

        <div className="ip-stagger" style={{ animationDelay: '0.16s' }}>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ton adresse email"
            autoComplete="email"
          />
        </div>

        <div className="ip-stagger" style={{ animationDelay: '0.24s' }}>
          <TextInput
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 caractères minimum"
            autoComplete="new-password"
          />
        </div>

        <div className="ip-stagger" style={{ marginTop: 'auto', animationDelay: '0.32s' }}>
          <PrimaryButton ref={btnRef} type="submit" loading={loading}>
            Créer mon compte
          </PrimaryButton>
        </div>
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

      {message.type === 'error' ? (
        <p className="ip-back ip-stagger" style={{ animationDelay: '0.56s' }}>
          <span className="ip-error">{message.text}</span>
        </p>
      ) : (
        <BottomAuthLinks retourTo="/inscription" showSignInLink className="ip-stagger" style={{ animationDelay: '0.56s' }} />
      )}
    </AuthScreenContainer>
  )
}
