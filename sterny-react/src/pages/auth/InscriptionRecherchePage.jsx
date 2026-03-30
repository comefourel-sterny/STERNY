import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import './InscriptionRecherchePage.css'

const VILLES_DISPONIBLES = [
  'Rennes', 'Nantes', 'Brest', 'Quimper', 'Lorient',
  'Vannes', 'Saint-Malo', 'Saint-Brieuc', 'Fougères', 'Vitré'
]

const SYMMETRIC_OPTIONS = [
  { value: '1-1', label: '1 sem. / 1 sem.' },
  { value: '2-2', label: '2 sem. / 2 sem.' },
  { value: '3-3', label: '3 sem. / 3 sem.' },
  { value: '4-4', label: '4 sem. / 4 sem.' },
  { value: '5-5', label: '5 sem. / 5 sem.' },
  { value: '6-6', label: '6 sem. / 6 sem.' },
  { value: '8-8', label: '8 sem. / 8 sem.' },
]

const ASYMMETRIC_OPTIONS = [
  { value: '2-1', label: '2 sem. entreprise / 1 sem. école' },
  { value: '1-2', label: '1 sem. entreprise / 2 sem. école' },
  { value: '3-1', label: '3 sem. entreprise / 1 sem. école' },
  { value: '1-3', label: '1 sem. entreprise / 3 sem. école' },
  { value: '4-2', label: '4 sem. entreprise / 2 sem. école' },
  { value: '2-4', label: '2 sem. entreprise / 4 sem. école' },
  { value: '3-2', label: '3 sem. entreprise / 2 sem. école' },
  { value: '2-3', label: '2 sem. entreprise / 3 sem. école' },
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

function VilleAutocomplete({ value, onChange, onSelect, placeholder, suggestions, setSuggestions }) {
  const handleInput = (val) => {
    const capitalized = capitalizeWords(val)
    onChange(capitalized)
    onSelect('')

    const query = capitalized.trim().toLowerCase()
    if (!query) {
      setSuggestions([])
      return
    }

    const matches = VILLES_DISPONIBLES.filter((v) => v.toLowerCase().startsWith(query))
    if (matches.length > 0) {
      setSuggestions(matches)
    } else if (query.length >= 2) {
      setSuggestions(['__unavailable__'])
    } else {
      setSuggestions([])
    }
  }

  const handleBlur = () => {
    setTimeout(() => {
      setSuggestions([])
      if (value && !VILLES_DISPONIBLES.find((v) => v.toLowerCase() === value.trim().toLowerCase())) {
        const exact = VILLES_DISPONIBLES.find((v) => v.toLowerCase() === value.trim().toLowerCase())
        if (exact) {
          onChange(exact)
          onSelect(exact)
        }
      }
    }, 200)
  }

  return (
    <div className="ville-wrapper">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <div className="ville-suggestions show">
          {suggestions[0] === '__unavailable__' ? (
            <div style={{ padding: '14px 16px', textAlign: 'center', cursor: 'default' }}>
              <span style={{ fontSize: '13px', color: '#E8622A', fontWeight: 600 }}>
                STERNY arrive bientôt dans ta ville !
              </span>
            </div>
          ) : (
            suggestions.map((v) => (
              <div
                key={v}
                className="ville-suggestion"
                onMouseDown={() => {
                  onChange(v)
                  onSelect(v)
                  setSuggestions([])
                }}
              >
                {v}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function InscriptionRecherchePage() {
  const navigate = useNavigate()
  const totalSteps = 4
  const [currentStep, setCurrentStep] = useState(1)
  const [errorMsg, setErrorMsg] = useState('')
  const errorTimeoutRef = useRef(null)

  // Step 1
  const [intent, setIntent] = useState('')

  // Step 2
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')

  // Step 3
  const [typeAlternance, setTypeAlternance] = useState('')
  const [monRythme, setMonRythme] = useState('')
  const [rythmeCustom, setRythmeCustom] = useState('')
  const [villeInput, setVilleInput] = useState('')
  const [villeSelectionnee, setVilleSelectionnee] = useState('')
  const [villeSuggestions, setVilleSuggestions] = useState([])
  const [villeEcoleInput, setVilleEcoleInput] = useState('')
  const [villeEcoleSelectionnee, setVilleEcoleSelectionnee] = useState('')
  const [villeEcoleSuggestions, setVilleEcoleSuggestions] = useState([])
  const [villeEntrepriseInput, setVilleEntrepriseInput] = useState('')
  const [villeEntrepriseSelectionnee, setVilleEntrepriseSelectionnee] = useState('')
  const [villeEntrepriseSuggestions, setVilleEntrepriseSuggestions] = useState([])

  // Step 4
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [creating, setCreating] = useState(false)

  const stepTitles = {
    1: 'Que recherches-tu ?',
    2: 'Tes informations',
    3: 'Ton alternance',
    4: 'Mot de passe'
  }

  const showError = useCallback((msg) => {
    setErrorMsg(msg)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    errorTimeoutRef.current = setTimeout(() => setErrorMsg(''), 3000)
  }, [])

  const validateStep = (step) => {
    if (step === 1) {
      if (!intent) return "Merci d'indiquer ce que tu recherches pour continuer"
    }
    if (step === 2) {
      if (!nom.trim()) return 'Merci de renseigner ton nom'
      if (!prenom.trim()) return 'Merci de renseigner ton prénom'
      if (!email.trim()) return 'Une adresse email est nécessaire pour créer ton compte'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "L'adresse email saisie ne semble pas valide"
      if (!telephone.trim()) return 'Merci de renseigner ton numéro de téléphone'
    }
    if (step === 3) {
      if (!typeAlternance) return "Merci de sélectionner ton type d'alternance"
      if ((typeAlternance === 'symmetric' || typeAlternance === 'asymmetric') && !monRythme)
        return 'Merci de préciser ton rythme'
      if (typeAlternance === 'custom' && !rythmeCustom.trim())
        return "Merci de décrire ton rythme d'alternance"
      if (intent === 'les-deux') {
        if (!villeEcoleSelectionnee) return 'Merci de sélectionner la ville où tu proposes ton logement'
        if (!villeEntrepriseSelectionnee) return 'Merci de sélectionner la ville où tu cherches un logement'
      } else {
        if (!villeSelectionnee) return 'Merci de sélectionner une ville dans la liste'
      }
    }
    if (step === 4) {
      if (!password) return 'Merci de choisir un mot de passe'
      if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères'
      if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
    }
    return null
  }

  const handleNext = async (step) => {
    const err = validateStep(step)
    if (err) { showError(err); return }

    if (step === 2) {
      try {
        const { data } = await supabaseClient
          .from('users')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle()
        if (data) {
          showError('Un compte existe déjà avec cet email.')
          return
        }
      } catch { /* pass */ }
    }

    setCurrentStep(step + 1)
  }

  const handlePrev = (step) => {
    setErrorMsg('')
    setCurrentStep(step - 1)
  }

  const createAccount = async () => {
    const err = validateStep(4)
    if (err) { showError(err); return }

    setCreating(true)

    const rythmeAlternance = typeAlternance === 'custom'
      ? rythmeCustom.trim()
      : monRythme

    const isHote = intent === 'partage'

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password
      })

      if (authError) throw authError

      const userData = {
        id: authData.user.id,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        type_user: 'locataire',
        type_alternance: typeAlternance,
        rythme_alternance: rythmeAlternance,
        a_logement: isHote
      }

      if (intent === 'recherche') {
        userData.ville = villeSelectionnee
        userData.ville_ecole = villeSelectionnee
        userData.statut_ville_ecole = 'recherche'
      } else if (intent === 'partage') {
        userData.ville = villeSelectionnee
        userData.ville_ecole = villeSelectionnee
        userData.statut_ville_ecole = 'hote'
      } else if (intent === 'les-deux') {
        userData.ville_ecole = villeEcoleSelectionnee
        userData.statut_ville_ecole = 'hote'
        userData.ville_entreprise = villeEntrepriseSelectionnee
        userData.statut_ville_entreprise = 'recherche'
        userData.ville = villeEcoleSelectionnee
        userData.a_logement = true
      }

      const { error: profileError } = await supabaseClient
        .from('users')
        .insert([userData])

      if (profileError) throw profileError

      setShowConfirmation(true)

      setTimeout(() => {
        navigate('/dashboard/locataire')
      }, 2500)
    } catch (err) {
      setCreating(false)
      let msg = err.message
      if (msg.includes('already registered')) msg = 'Un compte est déjà associé à cet email. Essaie de te connecter.'
      showError(msg)
    }
  }

  const getRythmeOptions = () => {
    if (typeAlternance === 'symmetric') return SYMMETRIC_OPTIONS
    if (typeAlternance === 'asymmetric') return ASYMMETRIC_OPTIONS
    return []
  }

  if (showConfirmation) {
    return (
      <section className="page-inscription">
        <div className="inscription-container">
          <div className="confirmation-screen active">
            <div className="confirmation-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div className="confirmation-title">Bienvenue sur STERNY !</div>
            <div className="confirmation-text">
              Ton compte a bien été créé.<br />
              Redirection vers ton espace...
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-inscription">
      <div className="inscription-container">
        <div className="inscription-header">
          <h1>{stepTitles[currentStep]}</h1>
        </div>

        <div className="step-indicator">
          Étape <span>{currentStep}</span> sur {totalSteps}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
        </div>

        {errorMsg && (
          <div className="error-message show" dangerouslySetInnerHTML={{ __html: errorMsg }} />
        )}

        {/* Step 1: Intent */}
        <div className={`step${currentStep === 1 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="intent-options">
              <label className={`intent-card${intent === 'recherche' ? ' selected' : ''}`}>
                <input type="radio" name="intent" value="recherche" checked={intent === 'recherche'} onChange={() => setIntent('recherche')} />
                <div className="intent-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>
                </div>
                <div className="intent-title">Je recherche un ou des logements</div>
                <div className="intent-check">{'\u2713'}</div>
              </label>

              <label className={`intent-card${intent === 'partage' ? ' selected' : ''}`}>
                <input type="radio" name="intent" value="partage" checked={intent === 'partage'} onChange={() => setIntent('partage')} />
                <div className="intent-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z" /></svg>
                </div>
                <div className="intent-title">Je propose d'alterner mon logement</div>
                <div className="intent-check">{'\u2713'}</div>
              </label>

              <label className={`intent-card${intent === 'les-deux' ? ' selected' : ''}`}>
                <input type="radio" name="intent" value="les-deux" checked={intent === 'les-deux'} onChange={() => setIntent('les-deux')} />
                <div className="intent-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280"><path d="M280-160 80-360l200-200 56 57-103 103h287v80H233l103 103-56 57Zm400-240-56-57 103-103H440v-80h287L624-743l56-57 200 200-200 200Z" /></svg>
                </div>
                <div className="intent-title">Les deux</div>
                <div className="intent-check">{'\u2713'}</div>
              </label>
            </div>
          </div>

          <div className="buttons-row single">
            <button className="btn-next" disabled={!intent} onClick={() => handleNext(1)}>Continuer</button>
          </div>
          <div className="back-link">
            <Link to="/inscription">Retour</Link>
          </div>
        </div>

        {/* Step 2: Personal info */}
        <div className={`step${currentStep === 2 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="form-row">
              <div className="form-group">
                <label>Nom</label>
                <input type="text" value={nom} onChange={(e) => setNom(capitalizeWords(e.target.value))} placeholder="Dupont" />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input type="text" value={prenom} onChange={(e) => setPrenom(capitalizeWords(e.target.value))} placeholder="Marie" />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marie@email.com" />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input type="tel" value={telephone} onChange={(e) => setTelephone(formatPhone(e.target.value))} placeholder="06 12 34 56 78" />
            </div>
          </div>
          <div className="buttons-row single">
            <button className="btn-next" onClick={() => handleNext(2)}>Continuer</button>
          </div>
          <div className="back-link">
            <a href="#" onClick={(e) => { e.preventDefault(); handlePrev(2) }}>Retour</a>
          </div>
        </div>

        {/* Step 3: Alternance + City */}
        <div className={`step${currentStep === 3 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="form-group">
              <label>Type d'alternance</label>
              <select
                value={typeAlternance}
                onChange={(e) => { setTypeAlternance(e.target.value); setMonRythme('') }}
                className={!typeAlternance ? 'placeholder' : ''}
              >
                <option value="" disabled>Sélectionner</option>
                <option value="symmetric">Symétrique (même durée)</option>
                <option value="asymmetric">Asymétrique (durées différentes)</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            {(typeAlternance === 'symmetric' || typeAlternance === 'asymmetric') && (
              <div className="form-group">
                <label>Mon rythme</label>
                <select
                  value={monRythme}
                  onChange={(e) => setMonRythme(e.target.value)}
                  className={!monRythme ? 'placeholder' : ''}
                >
                  <option value="" disabled>Sélectionner</option>
                  {getRythmeOptions().map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {typeAlternance === 'custom' && (
              <div className="form-group">
                <label>Décris ton rythme</label>
                <input
                  type="text"
                  value={rythmeCustom}
                  onChange={(e) => setRythmeCustom(e.target.value)}
                  placeholder="Ex : 3 jours école / 2 jours entreprise"
                />
              </div>
            )}

            {intent !== 'les-deux' && (
              <div className="form-group">
                <label>{intent === 'partage' ? 'Ville de ton logement' : 'Ville où tu cherches'}</label>
                <VilleAutocomplete
                  value={villeInput}
                  onChange={setVilleInput}
                  onSelect={setVilleSelectionnee}
                  placeholder="Ex: Rennes, Nantes..."
                  suggestions={villeSuggestions}
                  setSuggestions={setVilleSuggestions}
                />
              </div>
            )}

            {intent === 'les-deux' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Ville où tu proposes</label>
                  <VilleAutocomplete
                    value={villeEcoleInput}
                    onChange={setVilleEcoleInput}
                    onSelect={setVilleEcoleSelectionnee}
                    placeholder="Rennes..."
                    suggestions={villeEcoleSuggestions}
                    setSuggestions={setVilleEcoleSuggestions}
                  />
                </div>
                <div className="form-group">
                  <label>Ville où tu cherches</label>
                  <VilleAutocomplete
                    value={villeEntrepriseInput}
                    onChange={setVilleEntrepriseInput}
                    onSelect={setVilleEntrepriseSelectionnee}
                    placeholder="Nantes..."
                    suggestions={villeEntrepriseSuggestions}
                    setSuggestions={setVilleEntrepriseSuggestions}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="buttons-row single">
            <button className="btn-next" onClick={() => handleNext(3)}>Continuer</button>
          </div>
          <div className="back-link">
            <a href="#" onClick={(e) => { e.preventDefault(); handlePrev(3) }}>Retour</a>
          </div>
        </div>

        {/* Step 4: Password */}
        <div className={`step${currentStep === 4 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
            </div>
            <div className="form-group">
              <label>Confirmer</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retape ton mot de passe" />
            </div>
          </div>
          <div className="buttons-row single">
            <button className="btn-next" disabled={creating} onClick={createAccount}>
              {creating ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </div>
          <div className="back-link">
            <a href="#" onClick={(e) => { e.preventDefault(); handlePrev(4) }}>Retour</a>
          </div>
        </div>
      </div>
    </section>
  )
}
