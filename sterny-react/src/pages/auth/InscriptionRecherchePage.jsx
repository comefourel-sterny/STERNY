import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

function CustomSelect({ value, onChange, options, placeholder, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const selected = options.find(o => o.value === value)

  const updateOpen = (val) => {
    setOpen(val)
    if (onOpenChange) onOpenChange(val)
  }

  const handleSelect = (val) => {
    onChange(val)
    updateOpen(false)
  }

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  const handleToggle = () => {
    if (!open) updatePos()
    updateOpen(!open)
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) updateOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    window.addEventListener('scroll', updatePos, true)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClickOutside); window.removeEventListener('scroll', updatePos, true) }
  }, [open])

  return (
    <div className="ir-select" ref={triggerRef}>
      <div className={`ir-select-trigger${!selected ? ' placeholder' : ''}`} onClick={handleToggle}>
        <span>{selected ? selected.label : placeholder}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1l5 5 5-5" stroke="#64748B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && createPortal(
        <div className="ir-select-dropdown" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999, background: 'white', borderRadius: '12px', border: '1px solid #E8EAF0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: '180px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {options.map(o => (
            <div
              key={o.value}
              className={`ir-select-option${o.value === value ? ' selected' : ''}`}
              onMouseDown={() => handleSelect(o.value)}
            >
              {o.label.includes('(') ? (
                <><span className="ir-option-main">{o.label.split('(')[0].trim()}</span> <span className="ir-option-hint">({o.label.split('(')[1]}</span></>
              ) : (
                <span className="ir-option-main">{o.label}</span>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
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
    <div className="ir-ville-wrapper" style={{ position: 'relative', zIndex: 1 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <div className="ir-ville-dropdown">
          {suggestions[0] === '__unavailable__' ? (
            <div className="ir-ville-unavailable">
              STERNY arrive bientôt dans ta ville !
            </div>
          ) : (
            suggestions.map((v) => (
              <div
                key={v}
                className="ir-ville-item"
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
  const location = useLocation()
  const isLesDeux = location.state?.type === 'les_deux'
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
  const [typeSelectOpen, setTypeSelectOpen] = useState(false)
  const [monRythme, setMonRythme] = useState('')
  const [rythmeSelectOpen, setRythmeSelectOpen] = useState(false)
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
  const btnRefs = useRef({})

  const handleGoogleSignup = async () => {
    sessionStorage.setItem('signup_type', 'locataire')
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard/locataire'
      }
    })
    if (error) showError(error.message)
  }

  const stepTitles = {
    1: 'Que recherches-tu ?',
    2: 'Tes informations',
    3: 'Ton alternance',
    4: 'Mot de passe'
  }

  const shakeButton = useCallback((step) => {
    const btn = btnRefs.current[step]
    if (!btn) return
    btn.style.transition = 'translate 0.06s ease'
    btn.style.translate = '-1.5px 0'
    setTimeout(() => { btn.style.translate = '1.5px 0' }, 60)
    setTimeout(() => { btn.style.translate = '-0.5px 0' }, 120)
    setTimeout(() => { btn.style.translate = '0' }, 180)
  }, [])

  const showError = useCallback((msg) => {
    setErrorMsg(msg)
    shakeButton(currentStep)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    errorTimeoutRef.current = setTimeout(() => setErrorMsg(''), 3000)
  }, [currentStep, shakeButton])

  const validateStep = (step) => {
    if (step === 1) {
      if (!intent) return 'Merci de remplir toutes les informations'
    }
    if (step === 2) {
      if (!nom.trim() || !prenom.trim() || !email.trim() || !telephone.trim())
        return 'Merci de remplir toutes les informations'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Adresse email incomplète'
    }
    if (step === 3) {
      if (!typeAlternance) return 'Merci de remplir toutes les informations'
      if ((typeAlternance === 'symmetric' || typeAlternance === 'asymmetric') && !monRythme)
        return 'Rythme non renseigné'
      if (typeAlternance === 'custom' && !rythmeCustom.trim())
        return 'Rythme non renseigné'
      if (intent === 'les-deux') {
        if (!villeEcoleSelectionnee || !villeEntrepriseSelectionnee) return 'Ville non renseignée'
      } else {
        if (!villeSelectionnee) return 'Ville non renseignée'
      }
    }
    if (step === 4) {
      if (!password) return 'Merci de remplir toutes les informations'
      if (password.length < 6) return '6 caractères minimum'
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
        type_user: isLesDeux ? 'les_deux' : 'locataire',
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
      <section className="page-inscription-recherche">
        <div className="ir-card">
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
    <section className="page-inscription-recherche">
      <div className="ir-card" style={{ minHeight: '536px' }}>
        <h2 className="ir-title ir-stagger">INSCRIPTION</h2>

        <div className="ir-progress-bar ir-stagger" style={{ animationDelay: '0.08s' }}>
          <div className="ir-progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
        </div>

        {/* Step 1: Intent */}
        <div className={`step${currentStep === 1 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="intent-options">
              <label className={`intent-card ir-stagger${intent === 'recherche' ? ' selected' : ''}`} style={{ animationDelay: '0.16s' }}>
                <input type="radio" name="intent" value="recherche" checked={intent === 'recherche'} onChange={() => setIntent('recherche')} />
                <div className="intent-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>
                </div>
                <div className="intent-title">Je recherche un ou des logements</div>
                <div className="intent-check">{'\u2713'}</div>
              </label>

              <label className={`intent-card ir-stagger${intent === 'partage' ? ' selected' : ''}`} style={{ animationDelay: '0.24s' }}>
                <input type="radio" name="intent" value="partage" checked={intent === 'partage'} onChange={() => setIntent('partage')} />
                <div className="intent-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z" /></svg>
                </div>
                <div className="intent-title">Je propose d'alterner mon logement</div>
                <div className="intent-check">{'\u2713'}</div>
              </label>

              <label className={`intent-card ir-stagger${intent === 'les-deux' ? ' selected' : ''}`} style={{ animationDelay: '0.32s' }}>
                <input type="radio" name="intent" value="les-deux" checked={intent === 'les-deux'} onChange={() => setIntent('les-deux')} />
                <div className="intent-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280"><path d="M280-160 80-360l200-200 56 57-103 103h287v80H233l103 103-56 57Zm400-240-56-57 103-103H440v-80h287L624-743l56-57 200 200-200 200Z" /></svg>
                </div>
                <div className="intent-title">Les deux</div>
                <div className="intent-check">{'\u2713'}</div>
              </label>
            </div>
          </div>

          <div className="ir-bottom">
            <button type="button" ref={el => btnRefs.current[1] = el} className="ir-btn ir-stagger" style={{ animationDelay: '0.40s' }} disabled={!intent} onClick={() => handleNext(1)}>Continuer</button>
            <p className="ir-back ir-stagger" style={{ animationDelay: '0.48s' }}>
              {errorMsg ? <span className="ir-error">{errorMsg}</span> : (<><Link to="/inscription">Retour</Link> · Déjà un compte ? <Link to="/connexion">Se connecter</Link></>)}
            </p>
          </div>
        </div>

        {/* Step 2: Personal info */}
        <div className={`step${currentStep === 2 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="form-row ir-stagger" style={{ animationDelay: '0.16s' }}>
              <div className="form-group">
                <label>Nom</label>
                <input type="text" value={nom} onChange={(e) => setNom(capitalizeWords(e.target.value))} placeholder="Dupont" />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input type="text" value={prenom} onChange={(e) => setPrenom(capitalizeWords(e.target.value))} placeholder="Marie" />
              </div>
            </div>
            <div className="form-group ir-stagger" style={{ animationDelay: '0.24s' }}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marie@email.com" />
            </div>
            <div className="form-group ir-stagger" style={{ animationDelay: '0.32s' }}>
              <label>Téléphone</label>
              <input type="tel" value={telephone} onChange={(e) => setTelephone(formatPhone(e.target.value))} placeholder="06 12 34 56 78" />
            </div>
          </div>
          <div className="ir-bottom">
            <button type="button" ref={el => btnRefs.current[2] = el} className="ir-btn ir-stagger" style={{ animationDelay: '0.40s' }} onClick={() => handleNext(2)}>Continuer</button>
            <div className="ir-separator ir-stagger" style={{ animationDelay: '0.48s' }}><span>ou</span></div>
            <button type="button" className="ir-google ir-stagger" style={{ animationDelay: '0.56s' }} onClick={handleGoogleSignup}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              S'inscrire avec Google
            </button>
            <p className="ir-back ir-stagger" style={{ animationDelay: '0.64s' }}>
              {errorMsg ? <span className="ir-error">{errorMsg}</span> : (
                <><a href="#" onClick={(e) => { e.preventDefault(); handlePrev(2) }}>Retour</a> · Déjà un compte ? <Link to="/connexion">Se connecter</Link></>
              )}
            </p>
          </div>
        </div>

        {/* Step 3: Alternance + City */}
        <div className={`step${currentStep === 3 ? ' active' : ''}`}>
          <div className="step-content">
            <div className="form-group ir-stagger" style={{ animationDelay: '0.16s', position: 'relative', zIndex: typeSelectOpen ? 400 : 200 }}>
              <label>Type d'alternance</label>
              <CustomSelect
                value={typeAlternance}
                onChange={(val) => { setTypeAlternance(val); setMonRythme('') }}
                placeholder="Sélectionner"
                options={[
                  { value: 'symmetric', label: 'Symétrique (même durée)' },
                  { value: 'asymmetric', label: 'Asymétrique (durées différentes)' },
                  { value: 'custom', label: 'Personnalisé' }
                ]}
                onOpenChange={setTypeSelectOpen}
              />
            </div>

            {(typeAlternance === 'symmetric' || typeAlternance === 'asymmetric') && (
              <div className="form-group" style={{ position: 'relative', zIndex: rythmeSelectOpen ? 300 : 100 }}>
                <label>Mon rythme</label>
                <CustomSelect
                  value={monRythme}
                  onChange={setMonRythme}
                  placeholder="Sélectionner"
                  options={getRythmeOptions()}
                  onOpenChange={setRythmeSelectOpen}
                />
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
              <div className="form-group" style={{ position: 'relative', zIndex: 1 }}>
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
              <div className="form-row" style={{ position: 'relative', zIndex: 1 }}>
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
          <div className="ir-bottom" style={{ position: 'relative', zIndex: 1 }}>
            <button type="button" ref={el => btnRefs.current[3] = el} className="ir-btn ir-stagger" style={{ animationDelay: '0.24s' }} onClick={() => handleNext(3)}>Continuer</button>
            <p className="ir-back ir-stagger" style={{ animationDelay: '0.32s' }}>
              {errorMsg ? <span className="ir-error">{errorMsg}</span> : <a href="#" onClick={(e) => { e.preventDefault(); handlePrev(3) }}>Retour</a>}
            </p>
          </div>
        </div>

        {/* Step 4: Password */}
        <div className={`step${currentStep === 4 ? ' active' : ''}`}>
          <div className="step-content ir-step-spacious">
            <div className="form-group ir-stagger" style={{ animationDelay: '0.16s' }}>
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
            </div>
            <div className="form-group ir-stagger" style={{ animationDelay: '0.24s' }}>
              <label>Confirmer</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retape ton mot de passe" />
            </div>
          </div>
          <div className="ir-bottom">
            <button type="button" ref={el => btnRefs.current[4] = el} className="ir-btn ir-stagger" style={{ animationDelay: '0.32s' }} disabled={creating} onClick={createAccount}>
              {creating ? 'Création en cours...' : 'Créer mon compte'}
            </button>
            <p className="ir-back ir-stagger" style={{ animationDelay: '0.40s' }}>
              {errorMsg ? <span className="ir-error">{errorMsg}</span> : <a href="#" onClick={(e) => { e.preventDefault(); handlePrev(4) }}>Retour</a>}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
