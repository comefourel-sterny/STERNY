import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './InscriptionPartagerPage.css'

const VILLES_DISPONIBLES = {
  'Rennes': 'rennes',
  'Nantes': 'nantes',
  'Brest': 'brest',
  'Quimper': 'quimper',
  'Lorient': 'lorient',
  'Vannes': 'vannes',
  'Saint-Malo': 'saint-malo',
  'Saint-Brieuc': 'saint-brieuc',
  'Fougères': 'fougeres',
  'Vitré': 'vitre'
}

const SYMMETRIC_OPTIONS = [
  { value: '1-1', text: '1 sem. / 1 sem.' },
  { value: '2-2', text: '2 sem. / 2 sem.' },
  { value: '3-3', text: '3 sem. / 3 sem.' },
  { value: '4-4', text: '4 sem. / 4 sem.' },
  { value: '5-5', text: '5 sem. / 5 sem.' },
  { value: '6-6', text: '6 sem. / 6 sem.' },
  { value: '8-8', text: '8 sem. / 8 sem.' },
]

const ASYMMETRIC_OPTIONS = [
  { value: '2-1', text: '2 sem. entreprise / 1 sem. école' },
  { value: '1-2', text: '1 sem. entreprise / 2 sem. école' },
  { value: '3-1', text: '3 sem. entreprise / 1 sem. école' },
  { value: '1-3', text: '1 sem. entreprise / 3 sem. école' },
  { value: '4-2', text: '4 sem. entreprise / 2 sem. école' },
  { value: '2-4', text: '2 sem. entreprise / 4 sem. école' },
  { value: '3-2', text: '3 sem. entreprise / 2 sem. école' },
  { value: '2-3', text: '2 sem. entreprise / 3 sem. école' },
]

function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-Z\u00C0-\u00FF])/g, (m) => m.toUpperCase())
}

function formatPhone(val) {
  if (val.startsWith('+')) {
    let digits = val.slice(1).replace(/\D/g, '')
    if (digits.length > 18) digits = digits.substring(0, 18)
    const groups = digits.match(/.{1,3}/g)
    return '+' + (groups ? groups.join(' ') : '')
  }
  let digits = val.replace(/\D/g, '').slice(0, 10)
  const groups = digits.match(/.{1,2}/g)
  return groups ? groups.join(' ') : ''
}

export default function InscriptionPartagerPage() {
  const navigate = useNavigate()
  const totalSteps = 3
  const [currentStep, setCurrentStep] = useState(1)
  const [errorMsg, setErrorMsg] = useState('')
  const errorTimeoutRef = useRef(null)

  // Step 1
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')

  // Step 2
  const [villeInput, setVilleInput] = useState('')
  const [villeSelectionnee, setVilleSelectionnee] = useState('')
  const [villeSuggestions, setVilleSuggestions] = useState([])
  const [rythme, setRythme] = useState('')
  const [rythmeDetail, setRythmeDetail] = useState('')

  // Step 3
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const showError = (msg) => {
    setErrorMsg(msg)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    errorTimeoutRef.current = setTimeout(() => setErrorMsg(''), 5000)
  }

  const hideError = () => setErrorMsg('')

  const validateStep = (step) => {
    if (step === 1) {
      if (!nom.trim()) { showError('Veuillez renseigner votre nom'); return false }
      if (!prenom.trim()) { showError('Veuillez renseigner votre prénom'); return false }
      if (!email.trim()) { showError('Veuillez renseigner votre email'); return false }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Veuillez entrer une adresse email valide'); return false }
      if (!telephone.trim()) { showError('Veuillez renseigner votre téléphone'); return false }
      const digits = telephone.replace(/\D/g, '')
      if (telephone.startsWith('+')) {
        if (digits.length < 8) { showError('Numéro étranger trop court'); return false }
      } else {
        if (digits.length !== 10) { showError('Le numéro doit contenir 10 chiffres'); return false }
      }
      return true
    }
    if (step === 2) {
      if (!villeSelectionnee) { showError('Veuillez sélectionner une ville disponible'); return false }
      if (!rythme) { showError("Veuillez sélectionner votre type d'alternance"); return false }
      if (rythme !== 'custom' && !rythmeDetail) { showError('Veuillez sélectionner votre rythme'); return false }
      return true
    }
    if (step === 3) {
      if (!password) { showError('Veuillez renseigner votre mot de passe'); return false }
      if (password.length < 6) { showError('Le mot de passe doit contenir au moins 6 caractères'); return false }
      if (password !== confirmPassword) { showError('Les mots de passe ne correspondent pas'); return false }
      return true
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) return
    hideError()
    setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep === 1) {
      navigate('/inscription')
      return
    }
    hideError()
    setCurrentStep(currentStep - 1)
  }

  const handleVilleInput = (val) => {
    const capitalized = capitalizeWords(val)
    setVilleInput(capitalized)
    setVilleSelectionnee('')

    const query = capitalized.trim().toLowerCase()
    if (!query) {
      setVilleSuggestions([])
      return
    }

    const matches = Object.keys(VILLES_DISPONIBLES).filter((v) =>
      v.toLowerCase().startsWith(query)
    )

    if (matches.length > 0) {
      setVilleSuggestions(matches)
    } else if (query.length >= 2) {
      setVilleSuggestions(['__unavailable__'])
    } else {
      setVilleSuggestions([])
    }
  }

  const selectVille = (label) => {
    setVilleInput(label)
    setVilleSelectionnee(VILLES_DISPONIBLES[label])
    setVilleSuggestions([])
  }

  const getRythmeOptions = () => {
    if (rythme === 'symmetric') return SYMMETRIC_OPTIONS
    if (rythme === 'asymmetric') return ASYMMETRIC_OPTIONS
    return []
  }

  const createAccount = async () => {
    if (!validateStep(3)) return
    hideError()

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password
      })

      if (authError) throw authError

      const { error: profileError } = await supabaseClient
        .from('users')
        .insert([{
          id: authData.user.id,
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
          type_user: 'hote',
          rythme_alternance: rythmeDetail || rythme,
          ville: villeSelectionnee,
          a_logement: true
        }])

      if (profileError) throw profileError

      navigate('/dashboard/locataire')
    } catch (error) {
      const msg = error.message
      let msgFr = msg
      if (msg === 'User already registered') msgFr = 'Un compte existe déjà avec cet email.'
      else if (msg.includes('only request this after')) msgFr = 'Veuillez patienter quelques secondes avant de réessayer'
      else if (msg.includes('rate limit')) msgFr = 'Trop de tentatives, veuillez réessayer dans un instant'
      else if (msg.includes('invalid email')) msgFr = 'Adresse email invalide'
      else if (msg.includes('password')) msgFr = 'Le mot de passe doit contenir au moins 6 caractères'
      showError(msgFr)
      setLoading(false)
    }
  }

  return (
    <section className="page-inscription">
      <div className="inscription-card">
        <div className="step-indicator">
          Étape <span>{currentStep}</span> sur {totalSteps}
        </div>

        {errorMsg && (
          <div className="error-box show" dangerouslySetInnerHTML={{ __html: errorMsg }} />
        )}

        {/* Step 1: Personal info */}
        <div className={`form-section${currentStep === 1 ? ' active' : ''}`}>
          <div className="inscription-header">
            <h2>Crée ton compte</h2>
            <p>Tes informations personnelles</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nom</label>
              <input type="text" value={nom} onChange={(e) => setNom(capitalizeWords(e.target.value))} placeholder="Ton nom" />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input type="text" value={prenom} onChange={(e) => setPrenom(capitalizeWords(e.target.value))} placeholder="Ton prénom" />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton.email@exemple.com" />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input type="tel" value={telephone} onChange={(e) => setTelephone(formatPhone(e.target.value))} placeholder="06 12 34 56 78" />
          </div>

          <button className="submit-btn" style={{ marginTop: '20px' }} onClick={nextStep}>Continuer</button>
        </div>

        {/* Step 2: Alternance */}
        <div className={`form-section${currentStep === 2 ? ' active' : ''}`}>
          <div className="inscription-header">
            <h2>Ton alternance</h2>
            <p>Parle-nous de ta situation</p>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>Ville de ton logement</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={villeInput}
                onChange={(e) => handleVilleInput(e.target.value)}
                onBlur={() => setTimeout(() => setVilleSuggestions([]), 200)}
                placeholder="Ex: Rennes, Nantes..."
                autoComplete="off"
              />
            </div>
            {villeSuggestions.length > 0 && (
              <div className="ville-suggestions" style={{ display: 'block' }}>
                {villeSuggestions[0] === '__unavailable__' ? (
                  <div style={{ padding: '12px 16px', color: '#E8622A', fontWeight: 600, fontSize: '14px', cursor: 'default' }}>
                    STERNY arrive bientôt dans ta ville !
                  </div>
                ) : (
                  villeSuggestions.map((v) => (
                    <div key={v} className="ville-suggestion-item" onMouseDown={() => selectVille(v)}>{v}</div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Type d'alternance</label>
            <select value={rythme} onChange={(e) => { setRythme(e.target.value); setRythmeDetail('') }}>
              <option value="" disabled>Type d'alternance</option>
              <option value="symmetric">Symétrique (même durée)</option>
              <option value="asymmetric">Asymétrique (durées différentes)</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>

          {(rythme === 'symmetric' || rythme === 'asymmetric') && (
            <div className="form-group">
              <label>Mon rythme</label>
              <select value={rythmeDetail} onChange={(e) => setRythmeDetail(e.target.value)}>
                <option value="" disabled>Mon rythme</option>
                {getRythmeOptions().map((o) => (
                  <option key={o.value} value={o.value}>{o.text}</option>
                ))}
              </select>
            </div>
          )}

          <div className="btn-row" style={{ marginTop: '24px' }}>
            <button className="btn-submit" onClick={nextStep} style={{ width: '100%' }}>Continuer</button>
          </div>
          <div className="back-link" style={{ textAlign: 'center', marginTop: '8px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); prevStep() }} style={{ color: '#9CA3AF', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>Retour</a>
          </div>
        </div>

        {/* Step 3: Password */}
        <div className={`form-section${currentStep === 3 ? ' active' : ''}`}>
          <div className="inscription-header">
            <h2>Sécurise ton compte</h2>
            <p>Choisis un mot de passe</p>
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme ton mot de passe"
              />
              <button type="button" className="toggle-password" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                {showConfirmPw ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: '24px' }}>
            <button className="btn-submit" disabled={loading} onClick={createAccount} style={{ width: '100%' }}>
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </div>
          <div className="back-link" style={{ textAlign: 'center', marginTop: '8px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); prevStep() }} style={{ color: '#9CA3AF', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>Retour</a>
          </div>
        </div>

        <div className="back-link">
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </div>
      </div>
    </section>
  )
}
