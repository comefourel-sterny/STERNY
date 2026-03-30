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
  const [codeParrainage, setCodeParrainage] = useState('')
  const [parrainData, setParrainData] = useState(null)
  const [parrainageStatus, setParrainageStatus] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [referrerName, setReferrerName] = useState('')
  const [showReferral, setShowReferral] = useState(false)

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
    }
  }, [searchParams])

  // Check referral code
  useEffect(() => {
    if (!codeParrainage || codeParrainage.length < 4) {
      setParrainageStatus({ type: '', text: '' })
      setParrainData(null)
      return
    }

    setParrainageStatus({ type: 'checking', text: 'Vérification...' })

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('id, prenom, nom')
          .eq('code_parrainage', codeParrainage)
          .single()

        if (error || !data) {
          setParrainageStatus({ type: 'invalid', text: 'Code non reconnu' })
          setParrainData(null)
        } else {
          setParrainageStatus({ type: 'valid', text: `Parrainé par ${data.prenom} ${data.nom}` })
          setParrainData(data)
        }
      } catch {
        setParrainageStatus({ type: 'invalid', text: 'Code non reconnu' })
        setParrainData(null)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [codeParrainage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let parrainId = null

      if (codeParrainage && !parrainData) {
        const { data } = await supabaseClient
          .from('users')
          .select('id, prenom, nom')
          .eq('code_parrainage', codeParrainage)
          .single()
        if (data) parrainId = data.id
      } else if (parrainData) {
        parrainId = parrainData.id
      }

      if (!parrainId) {
        const sessionParrainId = sessionStorage.getItem('referrer_id')
        if (sessionParrainId) parrainId = sessionParrainId
      }

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
          parrain_id: parrainId,
          code_parrainage: null
        }])

      if (insertError) throw insertError

      setMessage({ type: 'success', text: 'Compte créé avec succès ! Redirection...' })

      setTimeout(() => {
        navigate('/dashboard/proprietaire')
      }, 2000)
    } catch (error) {
      const msg = error.message === 'User already registered'
        ? 'Un compte existe déjà avec cet email.'
        : error.message
      setMessage({ type: 'error', text: msg })
      setLoading(false)
    }
  }

  return (
    <section className="page-inscription">
      <div className="inscription-container">
        <div className="inscription-header">
          <h2>Créer un compte</h2>
        </div>

        {showReferral && (
          <div className="referral-inline show">
            <span className="referrer-name">{referrerName}</span> vous recommande STERNY
          </div>
        )}

        {message.text && (
          <div className={`error-box ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Prénom <span className="required">*</span></label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(capitalizeWords(e.target.value))}
                placeholder="Jean"
                required
              />
            </div>
            <div className="form-group">
              <label>Nom <span className="required">*</span></label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(capitalizeWords(e.target.value))}
                placeholder="Dupont"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email <span className="required">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean.dupont@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe <span className="required">*</span></label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
                minLength="6"
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

          <div className="parrainage-group">
            <label>
              Code de parrainage
              <span className="optional-tag">Optionnel</span>
            </label>
            <input
              type="text"
              value={codeParrainage}
              onChange={(e) => setCodeParrainage(e.target.value.toUpperCase())}
              placeholder="Ex : THOMAS-2K7P"
              autoComplete="off"
            />
            {parrainageStatus.text && (
              <div className={`parrainage-status ${parrainageStatus.type}`}>
                {parrainageStatus.text}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="back-link">
          <Link to="/inscription">Retour</Link> · Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </div>
      </div>
    </section>
  )
}
