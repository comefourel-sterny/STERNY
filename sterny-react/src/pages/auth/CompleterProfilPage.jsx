import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './CompleterProfilPage.css'

// === DATA: Ecoles, Annees, Filieres ===
const SIGLES_ECOLES = {
  'ENSAB': 'Ecole nationale superieure d\'architecture de Bretagne Rennes',
  'INSA': 'Institut national des sciences appliquees Rennes',
  'ENSAI': 'Ecole nationale de la statistique et de l\'analyse de l\'information Rennes',
  'ESIR': 'Ecole superieure d\'ingenieurs de Rennes',
  'EESAB': 'Ecole europeenne superieure d\'art de Bretagne Rennes',
  'RSB': 'Rennes School of Business',
  'IGR': 'Institut de gestion de Rennes',
  'ECAM': 'ECAM ecole d\'ingenieurs Rennes',
  'EPITECH': 'Epitech ecole informatique Rennes',
  'ENS': 'Ecole normale superieure Rennes',
  'ASKORIA': 'Askoria formation travail social Rennes',
  'ICAM': 'Institut catholique d\'arts et metiers Bretagne',
  'ICR': 'Institut Catholique de Rennes',
  'ESUP': 'ESUP ecole superieure de commerce et management Rennes',
  'ENSA': 'Ecole nationale superieure d\'architecture Nantes',
  'CENTRALE': 'Ecole Centrale Nantes',
  'AUDENCIA': 'Audencia Business School Nantes',
  'IMT': 'Institut Mines-Telecom Atlantique Nantes',
  'POLYTECH': 'Polytech ecole d\'ingenieurs Nantes',
  'YNOV': 'Ynov campus numerique Nantes',
  'ENIB': 'Ecole nationale d\'ingenieurs de Brest',
  'ISEN': 'Institut superieur de l\'electronique et du numerique Brest',
  'UBO': 'Universite de Bretagne Occidentale Brest',
  'IUT': 'Institut universitaire de technologie',
  'BTS': 'Brevet de technicien superieur',
  'CFA': 'Centre de formation d\'apprentis',
  'CNAM': 'Conservatoire national des arts et metiers',
  'UBS': 'Universite Bretagne Sud',
  'ESC': 'Ecole superieure de commerce',
}

const VILLES_LANCEMENT = ['rennes', 'nantes', 'brest', 'quimper', 'lorient', 'vannes', 'saint-malo', 'saint-brieuc', 'fougeres', 'vitre']

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

const ECOLES_POPULAIRES = [
  { name: 'Universite de Rennes', city: 'Rennes', aliases: ['rennes 1', 'univ rennes', 'ur1', 'universite'] },
  { name: 'Universite Rennes 2', city: 'Rennes', aliases: ['rennes 2', 'ur2', 'lettres', 'langues'] },
  { name: 'INSA Rennes', city: 'Rennes', aliases: ['insa', 'ingenieur'] },
  { name: 'ENSAB', city: 'Rennes', aliases: ['ensab', 'archi', 'architecture'] },
  { name: 'Sciences Po Rennes', city: 'Rennes', aliases: ['sciences po', 'iep', 'politique'] },
  { name: 'Rennes School of Business', city: 'Rennes', aliases: ['rsb', 'business', 'commerce', 'esc'] },
  { name: 'IGR-IAE Rennes', city: 'Rennes', aliases: ['igr', 'iae', 'gestion', 'management'] },
  { name: 'ESIR', city: 'Rennes', aliases: ['esir', 'ingenieur', 'informatique'] },
  { name: 'EESAB Rennes', city: 'Rennes', aliases: ['eesab', 'beaux-arts', 'art'] },
  { name: 'IUT de Rennes', city: 'Rennes', aliases: ['iut', 'iut rennes', 'but'] },
  { name: 'EPITECH Rennes', city: 'Rennes', aliases: ['epitech', 'info', 'code'] },
  { name: 'ENS Rennes', city: 'Rennes', aliases: ['ens', 'normale sup'] },
  { name: 'ENSAI', city: 'Rennes', aliases: ['ensai', 'statistique', 'data'] },
  { name: 'Askoria', city: 'Rennes', aliases: ['askoria', 'social', 'educateur'] },
  { name: 'ECAM Rennes', city: 'Rennes', aliases: ['ecam', 'ingenieur'] },
  { name: 'CFA de la CCI Bretagne', city: 'Rennes', aliases: ['cfa', 'cci', 'apprentissage'] },
  { name: 'Nantes Universite', city: 'Nantes', aliases: ['nantes', 'univ nantes', 'universite'] },
  { name: 'Centrale Nantes', city: 'Nantes', aliases: ['centrale', 'ingenieur'] },
  { name: 'Audencia', city: 'Nantes', aliases: ['audencia', 'business', 'commerce'] },
  { name: 'ENSA Nantes', city: 'Nantes', aliases: ['ensa nantes', 'architecture', 'archi'] },
  { name: 'IMT Atlantique', city: 'Nantes', aliases: ['imt', 'mines', 'telecom', 'ingenieur'] },
  { name: 'Polytech Nantes', city: 'Nantes', aliases: ['polytech', 'ingenieur'] },
  { name: 'IUT de Nantes', city: 'Nantes', aliases: ['iut nantes', 'but'] },
  { name: 'EPITECH Nantes', city: 'Nantes', aliases: ['epitech nantes', 'info'] },
  { name: 'Ynov Nantes', city: 'Nantes', aliases: ['ynov', 'digital', 'numerique'] },
  { name: 'Universite de Bretagne Occidentale', city: 'Brest', aliases: ['ubo', 'brest', 'universite'] },
  { name: 'ENIB', city: 'Brest', aliases: ['enib', 'ingenieur', 'brest'] },
  { name: 'IMT Atlantique Brest', city: 'Brest', aliases: ['imt brest', 'mines', 'telecom'] },
  { name: 'ISEN Brest', city: 'Brest', aliases: ['isen', 'electronique', 'numerique'] },
  { name: 'Ecole Navale', city: 'Brest', aliases: ['navale', 'marine', 'militaire'] },
  { name: 'IUT de Quimper', city: 'Quimper', aliases: ['iut quimper', 'but'] },
  { name: 'Universite Bretagne Sud', city: 'Lorient', aliases: ['ubs', 'lorient', 'universite'] },
  { name: 'IUT de Lorient', city: 'Lorient', aliases: ['iut lorient', 'but'] },
  { name: 'IUT de Saint-Malo', city: 'Saint-Malo', aliases: ['iut saint-malo', 'but', 'tourisme'] },
  { name: 'IUT de Saint-Brieuc', city: 'Saint-Brieuc', aliases: ['iut saint-brieuc', 'but', 'agroalimentaire'] },
]

const ANNEES_ETUDES = [
  { value: 'Bac+1', label: 'Bac+1 — L1 / BUT1 / BTS1 / PASS', aliases: ['l1', 'licence 1', 'bac+1', 'but1', 'bts1', 'pass'] },
  { value: 'Bac+2', label: 'Bac+2 — L2 / BUT2 / BTS2 / Prepa', aliases: ['l2', 'licence 2', 'bac+2', 'but2', 'bts2', 'dut', 'prepa'] },
  { value: 'Bac+3', label: 'Bac+3 — L3 / BUT3 / Licence / Bachelor', aliases: ['l3', 'licence 3', 'bac+3', 'but3', 'bachelor', 'licence pro'] },
  { value: 'Bac+4', label: 'Bac+4 — M1 / Master 1', aliases: ['m1', 'master 1', 'bac+4', 'mba'] },
  { value: 'Bac+5', label: 'Bac+5 — M2 / Master 2 / Ingenieur', aliases: ['m2', 'master 2', 'bac+5', 'ingenieur'] },
  { value: 'Bac+6', label: 'Bac+6 — Mastere / MS / Post-master', aliases: ['bac+6', 'mastere', 'ms', 'doctorat'] },
  { value: 'Bac+7', label: 'Bac+7 — Doctorat / These / Internat', aliases: ['bac+7', 'doctorat', 'these', 'phd', 'internat'] },
  { value: 'Bac+8', label: 'Bac+8 — Doctorat / Internat', aliases: ['bac+8', 'doctorat', 'internat'] },
]

const FILIERES = [
  { value: 'Informatique', aliases: ['info', 'dev', 'developpement', 'code', 'software'] },
  { value: 'Commerce', aliases: ['business', 'vente', 'commercial'] },
  { value: 'Marketing', aliases: ['market', 'publicite', 'digital'] },
  { value: 'Finance', aliases: ['banque', 'comptabilite', 'audit'] },
  { value: 'Comptabilite / Gestion', aliases: ['compta', 'dcg', 'dscg', 'gestion'] },
  { value: 'Droit', aliases: ['juridique', 'avocat', 'notaire', 'juriste'] },
  { value: 'Ressources humaines', aliases: ['rh', 'recrutement', 'personnel'] },
  { value: 'Communication', aliases: ['com', 'media', 'journalisme'] },
  { value: 'Architecture', aliases: ['archi', 'urbanisme', 'batiment'] },
  { value: 'Design', aliases: ['graphisme', 'ux', 'ui', 'web design'] },
  { value: 'Genie civil', aliases: ['btp', 'travaux publics', 'construction'] },
  { value: 'Genie mecanique', aliases: ['mecanique', 'conception', 'cao'] },
  { value: 'Genie electrique', aliases: ['electricite', 'electronique', 'automatisme'] },
  { value: 'Biologie', aliases: ['bio', 'biotechnologie', 'sciences de la vie'] },
  { value: 'Medecine', aliases: ['medical', 'sante', 'docteur', 'pass'] },
  { value: 'Psychologie', aliases: ['psycho', 'psychologue'] },
  { value: 'Sciences politiques', aliases: ['sciences po', 'politique', 'iep'] },
  { value: 'Economie', aliases: ['eco', 'economiste'] },
  { value: 'Environnement', aliases: ['ecologie', 'developpement durable', 'climat'] },
  { value: 'Travail social', aliases: ['social', 'educateur', 'assistant social'] },
  { value: 'Immobilier', aliases: ['immo', 'transaction', 'gestion locative'] },
  { value: 'Sport / STAPS', aliases: ['sport', 'staps', 'coaching'] },
  { value: 'Arts / Beaux-Arts', aliases: ['art', 'beaux-arts', 'peinture'] },
  { value: 'Langues / LEA', aliases: ['lea', 'langues', 'traduction'] },
  { value: 'Lettres / Litterature', aliases: ['lettres', 'litterature', 'francais'] },
  { value: 'Histoire', aliases: ['historien', 'patrimoine', 'archeologie'] },
  { value: 'Mathematiques', aliases: ['maths', 'statistiques', 'calcul'] },
  { value: 'Physique', aliases: ['physique', 'optique'] },
  { value: 'Data / Intelligence artificielle', aliases: ['data', 'ia', 'machine learning', 'big data'] },
  { value: 'Cybersecurite', aliases: ['cyber', 'securite informatique'] },
  { value: 'Reseaux / Telecoms', aliases: ['reseau', 'telecom', 'infrastructure'] },
  { value: 'Veterinaire', aliases: ['veto', 'animaux'] },
]

function normalizeStr(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function capitalizeWords(str) {
  return str.replace(/(?:^|[\s-])([a-zA-Z\u00C0-\u00FF])/g, (match) => match.toUpperCase())
}

function isVilleLancement(city) {
  if (!city) return false
  const cityNorm = normalizeStr(city).replace(/[-\s]/g, '')
  return VILLES_LANCEMENT.some(v => {
    const vNorm = v.replace(/[-\s]/g, '')
    return cityNorm.includes(vNorm) || vNorm.includes(cityNorm)
  })
}

function CpSelect({ value, onChange, options, placeholder, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const selected = options.find(o => o.value === value)

  const updateOpen = (val) => {
    setOpen(val)
    if (onOpenChange) onOpenChange(val)
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
    <div className="cp-select" ref={triggerRef}>
      <div className={`cp-select-trigger${!selected ? ' cp-placeholder' : ''}`} onClick={handleToggle}>
        <span>{selected ? selected.label : placeholder}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1l5 5 5-5" stroke="#6B7280" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && createPortal(
        <div className="cp-select-dropdown" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999, background: 'white', borderRadius: '12px', border: '1px solid #E8EAF0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: '180px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {options.map(o => (
            <div key={o.value} className={`cp-select-option${o.value === value ? ' selected' : ''}`} onMouseDown={() => { onChange(o.value); updateOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function CompleterProfilPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [userType, setUserType] = useState('locataire')
  const totalSteps = userType === 'proprietaire' ? 1 : 4

  // Form fields — Step 1: Identité
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [dateNaissanceISO, setDateNaissanceISO] = useState('')
  const [sexe, setSexe] = useState('')

  // Step 2: Alternance
  const [typeSelectOpen, setTypeSelectOpen] = useState(false)
  const [rythmeSelectOpen, setRythmeSelectOpen] = useState(false)
  const [typeAlternance, setTypeAlternance] = useState('')
  const [monRythme, setMonRythme] = useState('')
  const [rythmeCustom, setRythmeCustom] = useState('')
  const [villeInput, setVilleInput] = useState('')
  const [villeSelectionnee, setVilleSelectionnee] = useState('')

  // Step 3: Études
  const [ecole, setEcole] = useState('')
  const [anneeEtudes, setAnneeEtudes] = useState('')
  const [filiere, setFiliere] = useState('')

  // Step 4: Photo + Bio
  const [bio, setBio] = useState('')

  // Photo
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const photoInputRef = useRef(null)

  // Crop state
  const [showCrop, setShowCrop] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const cropImageRef = useRef(null)
  const cropAreaRef = useRef(null)
  const cropStateRef = useRef({ imgX: 0, imgY: 0, scale: 1, dragging: false, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })
  const [cropZoom, setCropZoom] = useState(100)
  const [cropZoomMin, setCropZoomMin] = useState(100)
  const [cropZoomMax, setCropZoomMax] = useState(300)

  // Autocomplete states
  const [schoolSuggestions, setSchoolSuggestions] = useState([])
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false)
  const [anneeSuggestions, setAnneeSuggestions] = useState([])
  const [showAnneeSuggestions, setShowAnneeSuggestions] = useState(false)
  const [filiereSuggestions, setFiliereSuggestions] = useState([])
  const [showFiliereSuggestions, setShowFiliereSuggestions] = useState(false)
  const [villeSuggestions, setVilleSuggestions] = useState([])

  const schoolSearchTimeout = useRef(null)
  const errorTimeout = useRef(null)

  const stepTitles = { 1: 'Complete ton profil', 2: 'Ton alternance', 3: 'Tes etudes', 4: 'A propos de toi' }

  // Auth check + pre-fill (skip redirects in dev preview)
  const isDev = import.meta.env.DEV
  useEffect(() => {
    if (!user) return
    async function loadData() {
      const { data: userData } = await supabaseClient.from('users').select('*').eq('id', user.id).single()
      if (!userData) return
      if (!isDev && userData.type_user === 'proprietaire') {
        navigate('/profil/modifier')
        return
      }
      setUserType(userData.type_user || 'locataire')
      if (userData.prenom) setPrenom(userData.prenom)
      if (userData.nom) setNom(userData.nom)
      if (userData.sexe) setSexe(userData.sexe)
      if (userData.date_naissance) {
        const d = new Date(userData.date_naissance)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        setDateNaissance(`${day}/${month}/${year}`)
        setDateNaissanceISO(userData.date_naissance)
      }
      if (userData.photo_profil_url) setPhotoPreviewUrl(userData.photo_profil_url)
      if (userData.type_alternance) setTypeAlternance(userData.type_alternance)
      if (userData.rythme_alternance) setMonRythme(userData.rythme_alternance)
      if (userData.ville) { setVilleInput(userData.ville); setVilleSelectionnee(userData.ville) }
      if (userData.ecole) setEcole(userData.ecole)
      if (userData.annee_etudes) setAnneeEtudes(userData.annee_etudes)
      if (userData.filiere) setFiliere(userData.filiere)
      if (userData.bio) setBio(userData.bio)
      if (!isDev && userData.profil_complet) {
        navigate('/dashboard/locataire')
      }
    }
    loadData()
  }, [user, navigate, isDev])

  // Error display
  const showError = useCallback((msg) => {
    setError(msg)
    if (errorTimeout.current) clearTimeout(errorTimeout.current)
    errorTimeout.current = setTimeout(() => setError(''), 3000)
  }, [])

  // Validation (disabled in dev for design work)
  function validateStep(step) {
    if (isDev) return null
    if (step === 1) {
      if (!prenom.trim()) return 'Merci de renseigner ton prenom'
      if (!nom.trim()) return 'Merci de renseigner ton nom'
      if (!dateNaissance || dateNaissance.length !== 10) return 'Date de naissance incomplete (JJ/MM/AAAA)'
      if (!dateNaissanceISO) return 'Date de naissance invalide'
      if (!sexe) return 'Merci de selectionner ton sexe'
      const birthDate = new Date(dateNaissanceISO)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
      if (age < 18) return 'Tu dois avoir au moins 18 ans'
    }
    if (step === 2) {
      if (!typeAlternance) return "Sélectionne ton type d'alternance"
      if ((typeAlternance === 'symmetric' || typeAlternance === 'asymmetric') && !monRythme) return 'Précise ton rythme'
      if (typeAlternance === 'custom' && !rythmeCustom.trim()) return 'Décris ton rythme'
      if (!villeSelectionnee) return 'Sélectionne une ville'
    }
    if (step === 3) {
      if (!ecole.trim()) return 'Merci de renseigner ton ecole'
      if (!anneeEtudes.trim()) return 'Merci de renseigner ton annee d\'etudes'
      if (!filiere.trim()) return 'Merci de renseigner ta filiere'
    }
    return null
  }

  function nextStep(current) {
    const err = validateStep(current)
    if (err) { showError(err); return }
    if (userType === 'proprietaire' || current >= totalSteps) {
      enregistrerProfil()
      return
    }
    setCurrentStep(current + 1)
    setError('')
  }

  function prevStep(current) {
    setCurrentStep(current - 1)
    setError('')
  }

  // Date formatting
  function handleDateInput(e) {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 8) value = value.slice(0, 8)
    let formatted = ''
    if (value.length > 0) formatted = value.slice(0, 2)
    if (value.length > 2) formatted += '/' + value.slice(2, 4)
    if (value.length > 4) formatted += '/' + value.slice(4, 8)
    setDateNaissance(formatted)
    if (value.length === 8) {
      const day = value.slice(0, 2)
      const month = value.slice(2, 4)
      const year = value.slice(4, 8)
      setDateNaissanceISO(`${year}-${month}-${day}`)
    } else {
      setDateNaissanceISO('')
    }
  }

  function handleDateKeyDown(e) {
    if (e.key === 'Backspace' && dateNaissance.endsWith('/')) {
      e.preventDefault()
      const newVal = dateNaissance.slice(0, -1)
      setDateNaissance(newVal)
    }
  }

  // Photo cropper
  function handlePhotoSelect(e) {
    if (e.target.files.length > 0) openCropper(e.target.files[0])
  }

  function openCropper(file) {
    if (!file.type.match('image.*')) { showError('Le fichier doit etre une image (JPG, PNG, WEBP)'); return }
    if (file.size > 5 * 1024 * 1024) { showError('La photo ne doit pas depasser 5 MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropImageSrc(ev.target.result)
      setShowCrop(true)
    }
    reader.readAsDataURL(file)
  }

  function handleCropImageLoad() {
    const img = cropImageRef.current
    if (!img) return
    const areaSize = 220
    const ratio = Math.max(areaSize / img.naturalWidth, areaSize / img.naturalHeight)
    cropStateRef.current.scale = ratio
    const minZoom = Math.round(ratio * 100)
    setCropZoomMin(minZoom)
    setCropZoomMax(minZoom * 3)
    setCropZoom(minZoom)
    const w = img.naturalWidth * ratio
    const h = img.naturalHeight * ratio
    cropStateRef.current.imgX = (areaSize - w) / 2
    cropStateRef.current.imgY = (areaSize - h) / 2
    applyCropTransform()
  }

  function applyCropTransform() {
    const img = cropImageRef.current
    const s = cropStateRef.current
    if (!img) return
    const w = img.naturalWidth * s.scale
    const h = img.naturalHeight * s.scale
    img.style.width = w + 'px'
    img.style.height = h + 'px'
    img.style.left = s.imgX + 'px'
    img.style.top = s.imgY + 'px'
  }

  function clampCropPosition() {
    const img = cropImageRef.current
    const s = cropStateRef.current
    if (!img) return
    const areaSize = 220
    const w = img.naturalWidth * s.scale
    const h = img.naturalHeight * s.scale
    if (s.imgX > 0) s.imgX = 0
    if (s.imgY > 0) s.imgY = 0
    if (s.imgX < areaSize - w) s.imgX = areaSize - w
    if (s.imgY < areaSize - h) s.imgY = areaSize - h
    applyCropTransform()
  }

  function handleCropZoom(e) {
    const newZoom = parseInt(e.target.value)
    setCropZoom(newZoom)
    const s = cropStateRef.current
    const img = cropImageRef.current
    if (!img) return
    const oldScale = s.scale
    s.scale = newZoom / 100
    const areaSize = 220
    const cx = areaSize / 2
    const cy = areaSize / 2
    const relX = (cx - s.imgX) / (img.naturalWidth * oldScale)
    const relY = (cy - s.imgY) / (img.naturalHeight * oldScale)
    s.imgX = cx - relX * img.naturalWidth * s.scale
    s.imgY = cy - relY * img.naturalHeight * s.scale
    clampCropPosition()
  }

  function handleCropMouseDown(e) {
    e.preventDefault()
    const s = cropStateRef.current
    s.dragging = true
    s.startX = e.clientX
    s.startY = e.clientY
    s.imgStartX = s.imgX
    s.imgStartY = s.imgY
  }

  useEffect(() => {
    function handleMouseMove(e) {
      const s = cropStateRef.current
      if (!s.dragging) return
      s.imgX = s.imgStartX + (e.clientX - s.startX)
      s.imgY = s.imgStartY + (e.clientY - s.startY)
      clampCropPosition()
    }
    function handleMouseUp() { cropStateRef.current.dragging = false }
    function handleTouchMove(e) {
      const s = cropStateRef.current
      if (!s.dragging || e.touches.length !== 1) return
      s.imgX = s.imgStartX + (e.touches[0].clientX - s.startX)
      s.imgY = s.imgStartY + (e.touches[0].clientY - s.startY)
      clampCropPosition()
    }
    function handleTouchEnd() { cropStateRef.current.dragging = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  function handleCropTouchStart(e) {
    if (e.touches.length === 1) {
      const s = cropStateRef.current
      s.dragging = true
      s.startX = e.touches[0].clientX
      s.startY = e.touches[0].clientY
      s.imgStartX = s.imgX
      s.imgStartY = s.imgY
    }
  }

  function cancelCrop() {
    setShowCrop(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function confirmCrop() {
    const img = cropImageRef.current
    const s = cropStateRef.current
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const areaSize = 220
    const sourceX = -s.imgX / s.scale
    const sourceY = -s.imgY / s.scale
    const sourceSize = areaSize / s.scale
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
    canvas.toBlob((blob) => {
      const file = new File([blob], 'photo-profil.jpg', { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreviewUrl(URL.createObjectURL(blob))
      setShowCrop(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }, 'image/jpeg', 0.9)
  }

  // School search
  function filterLocalSchools(query) {
    if (!query) return ECOLES_POPULAIRES
    const q = normalizeStr(query)
    return ECOLES_POPULAIRES.filter(e => {
      if (normalizeStr(e.name).includes(q)) return true
      if (normalizeStr(e.city || '').includes(q)) return true
      return e.aliases.some(a => a.includes(q))
    })
  }

  async function searchSchoolAPI(query) {
    try {
      const seen = new Map()
      const localMatches = filterLocalSchools(query)
      localMatches.forEach(e => {
        const key = (e.name + '|' + (e.city || '')).toLowerCase()
        seen.set(key, { name: e.name, city: e.city || '' })
      })

      const queryUpper = query.trim().toUpperCase()
      const expandedName = SIGLES_ECOLES[queryUpper] || null
      const searchQueries = [query]
      if (expandedName) searchQueries.push(expandedName)

      if (!window._mbxSession) window._mbxSession = crypto.randomUUID()
      const mbxToken = import.meta.env.VITE_MAPBOX_TOKEN
      const allPromises = []
      const promiseLabels = []

      for (const q of searchQueries) {
        const eq = encodeURIComponent(q)
        if (mbxToken) {
          allPromises.push(fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?q=${eq}&language=fr&country=fr&types=poi&limit=5&session_token=${window._mbxSession}&access_token=${mbxToken}`).then(r => r.ok ? r.json() : { suggestions: [] }).catch(() => ({ suggestions: [] })))
          promiseLabels.push('mapbox')
        }
        allPromises.push(fetch(`https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/records?where=search(g_ea_lib_vx%2C%22${eq}%22)&limit=10&select=g_ea_lib_vx%2Cville_etab`).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] })))
        promiseLabels.push('parcoursup')
      }

      const allResults = await Promise.all(allPromises)
      function normalKey(name, city) {
        const norm = s => normalizeStr(s).replace(/\s+/g, ' ').trim()
        return norm(name) + '|' + norm(city || '')
      }

      const allRetrievePromises = []
      for (let i = 0; i < allResults.length; i++) {
        const data = allResults[i]
        const label = promiseLabels[i]
        if (label === 'mapbox' && data.suggestions) {
          data.suggestions.filter(s => s.mapbox_id && s.name).slice(0, 3).forEach(s => {
            allRetrievePromises.push(fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${s.mapbox_id}?session_token=${window._mbxSession}&access_token=${mbxToken}`).then(r => r.ok ? r.json() : null).catch(() => null))
          })
        } else if (label === 'parcoursup' && data.results) {
          data.results.forEach(r => {
            if (!isVilleLancement(r.ville_etab)) return
            const key = normalKey(r.g_ea_lib_vx, r.ville_etab)
            if (!seen.has(key)) seen.set(key, { name: r.g_ea_lib_vx, city: r.ville_etab || '' })
          })
        }
      }

      const eduKeywords = ['ecole', 'universite', 'institut', 'campus', 'formation', 'polytech', 'business school']
      const retrieveResults = await Promise.all(allRetrievePromises)
      retrieveResults.forEach(rData => {
        if (rData?.features?.[0]) {
          const props = rData.features[0].properties || {}
          const name = props.name || ''
          const city = props.context?.place?.name || props.context?.locality?.name || ''
          if (!isVilleLancement(city)) return
          const nameLower = name.toLowerCase()
          const isSchool = eduKeywords.some(kw => nameLower.includes(kw))
          if (!isSchool) return
          const key = normalKey(name, city)
          if (name && !seen.has(key)) seen.set(key, { name, city })
        }
      })

      return Array.from(seen.values()).slice(0, 7)
    } catch (e) {
      console.error('Erreur recherche ecole:', e)
      return filterLocalSchools(query)
    }
  }

  function handleEcoleInput(value) {
    setEcole(value)
    clearTimeout(schoolSearchTimeout.current)
    const localMatches = filterLocalSchools(value)
    if (localMatches.length > 0 || !value.trim()) {
      setSchoolSuggestions(localMatches.length > 0 ? localMatches : ECOLES_POPULAIRES)
      setShowSchoolSuggestions(true)
    }
    if (value.trim().length >= 2) {
      schoolSearchTimeout.current = setTimeout(async () => {
        const results = await searchSchoolAPI(value)
        if (results.length > 0) {
          setSchoolSuggestions(results.map(r => ({ name: r.name, city: r.city, aliases: [] })))
          setShowSchoolSuggestions(true)
        }
      }, 300)
    }
  }

  // Annee search
  function filterAnnees(query) {
    if (!query) return ANNEES_ETUDES
    const q = normalizeStr(query)
    const scored = []
    ANNEES_ETUDES.forEach(a => {
      const labelLower = normalizeStr(a.label)
      const valueLower = a.value.toLowerCase()
      let score = 0
      if (valueLower.startsWith(q) || labelLower.startsWith(q)) score = 100
      else if (labelLower.includes(q)) score = 80
      else { for (const alias of a.aliases) { const an = normalizeStr(alias); if (an === q) score = Math.max(score, 70); else if (an.startsWith(q)) score = Math.max(score, 50); else if (an.includes(q)) score = Math.max(score, 30) } }
      if (score > 0) scored.push({ item: a, score })
    })
    scored.sort((a, b) => b.score - a.score)
    return scored.map(s => s.item)
  }

  // Filiere search
  function filterFilieres(query) {
    if (!query) return FILIERES
    const q = normalizeStr(query)
    const scored = []
    FILIERES.forEach(f => {
      const valueLower = normalizeStr(f.value)
      let score = 0
      if (valueLower.startsWith(q)) score = 100
      else if (valueLower.split(/[\s/]+/).some(w => w.startsWith(q))) score = 80
      else if (valueLower.includes(q)) score = 60
      else { for (const alias of f.aliases) { const an = normalizeStr(alias); if (an.startsWith(q)) score = Math.max(score, 40); else if (an.includes(q)) score = Math.max(score, 20) } }
      if (score > 0) scored.push({ item: f, score })
    })
    scored.sort((a, b) => b.score - a.score || a.item.value.localeCompare(b.item.value))
    return scored.map(s => s.item)
  }

  // Save profile
  async function enregistrerProfil() {
    setLoading(true)
    try {
      let photoUrl = null
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabaseClient.storage.from('profils').upload(fileName, photoFile, { cacheControl: '3600', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabaseClient.storage.from('profils').getPublicUrl(fileName)
          photoUrl = urlData.publicUrl
        }
      }

      const rythmeAlternance = typeAlternance === 'custom' ? rythmeCustom.trim() : monRythme

      const updateData = {
        prenom: prenom.trim(),
        nom: nom.trim(),
        sexe,
        date_naissance: dateNaissanceISO,
        type_alternance: typeAlternance || null,
        rythme_alternance: rythmeAlternance || null,
        ville: villeSelectionnee || null,
        ecole: ecole.trim(),
        annee_etudes: anneeEtudes.trim(),
        filiere: filiere.trim(),
        bio: bio.trim() || null,
        profil_complet: true
      }
      if (photoUrl) updateData.photo_profil_url = photoUrl

      const { error: saveError } = await supabaseClient.from('users').update(updateData).eq('id', user.id)
      if (saveError) throw saveError

      setShowConfirmation(true)

      const { data: userData } = await supabaseClient.from('users').select('type_user').eq('id', user.id).single()
      setTimeout(() => {
        if (userData?.type_user === 'proprietaire') navigate('/dashboard/proprietaire')
        else navigate('/dashboard/locataire')
      }, 2000)
    } catch (err) {
      console.error('Erreur enregistrement profil:', err)
      setLoading(false)
      showError(err.message || 'Une erreur est survenue')
    }
  }

  if (authLoading) return (
    <section className="cp-page">
      <div className="cp-card" style={{ minHeight: '536px', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cp-confirm-bar" style={{ width: '80px' }}>
          <div className="cp-confirm-bar-fill" style={{ animation: 'cpBarFill 1.5s ease infinite' }} />
        </div>
      </div>
    </section>
  )

  if (!user && !isDev) return null

  return (
    <>
      {/* Crop Modal */}
      <div className={`cp-crop-overlay${showCrop ? ' active' : ''}`} role="dialog" aria-modal="true" aria-label="Recadrer la photo">
        <div className="cp-crop-modal">
          <div className="cp-crop-header">
            <span className="cp-crop-title">RECADRER</span>
            <button className="cp-crop-close" onClick={cancelCrop}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="cp-crop-area" ref={cropAreaRef} onMouseDown={handleCropMouseDown} onTouchStart={handleCropTouchStart}>
            {cropImageSrc && <img ref={cropImageRef} src={cropImageSrc} alt="Photo a recadrer" onLoad={handleCropImageLoad} />}
          </div>
          <div className="cp-crop-zoom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
            <input type="range" min={cropZoomMin} max={cropZoomMax} value={cropZoom} onChange={handleCropZoom} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M11 8v6M8 11h6"/></svg>
          </div>
          <button className="cp-crop-confirm" onClick={confirmCrop}>Appliquer</button>
        </div>
      </div>

      {/* Page */}
      <section className="cp-page">
        <div className="cp-card" style={{ minHeight: '536px' }}>
          {!showConfirmation && (
            <>
              <h2 className="cp-title cp-stagger">{stepTitles[currentStep]}</h2>
              {/* subtitle removed */}
              <div className="cp-progress-bar cp-stagger" style={{ animationDelay: '0.08s' }}>
                <div className="cp-progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
              </div>
            </>
          )}

          {/* Step 1 */}
          {currentStep === 1 && !showConfirmation && (
            <div className="cp-step">
              <div className="cp-row cp-stagger" style={{ animationDelay: '0.12s' }}>
                <div className="cp-group">
                  <label>Prénom</label>
                  <input type="text" value={prenom} onChange={e => setPrenom(capitalizeWords(e.target.value))} placeholder="Prénom" />
                </div>
                <div className="cp-group">
                  <label>Nom</label>
                  <input type="text" value={nom} onChange={e => setNom(capitalizeWords(e.target.value))} placeholder="Nom" />
                </div>
              </div>
              <div className="cp-row cp-stagger" style={{ animationDelay: '0.20s' }}>
                <div className="cp-group">
                  <label>Date de naissance</label>
                  <input type="text" value={dateNaissance} onChange={handleDateInput} onKeyDown={handleDateKeyDown} placeholder="JJ/MM/AAAA" maxLength="10" autoComplete="off" inputMode="numeric" />
                </div>
                <div className="cp-group">
                  <label>Sexe</label>
                  <CpSelect
                    value={sexe}
                    onChange={setSexe}
                    placeholder="Sélectionner"
                    options={[
                      { value: 'homme', label: 'Homme' },
                      { value: 'femme', label: 'Femme' },
                      { value: 'autre', label: 'Autre' },
                      { value: 'non-precise', label: 'Non précisé' }
                    ]}
                  />
                </div>
              </div>
              <div className="cp-bottom">
                <button className={`cp-btn cp-stagger${loading ? ' loading' : ''}`} style={{ animationDelay: '0.28s' }} onClick={() => nextStep(1)} disabled={loading}>
                  {userType === 'proprietaire' ? 'Enregistrer' : 'Continuer'}
                </button>
                {error ? (
                  <p className="cp-error cp-error-bottom">{error}</p>
                ) : (
                  <p className="cp-back cp-stagger" style={{ animationDelay: '0.36s' }}>
                    <Link to="/dashboard/locataire">Retour</Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Alternance */}
          {currentStep === 2 && !showConfirmation && (
            <div className="cp-step" style={{ position: 'relative', overflow: 'visible' }}>
              <div className="cp-group" style={{ position: 'relative', zIndex: 1, marginTop: 0 }}>
                <label>Ville</label>
                <div className="cp-autocomplete">
                  <input
                    type="text"
                    value={villeInput}
                    onChange={(e) => {
                      const val = capitalizeWords(e.target.value)
                      setVilleInput(val)
                      setVilleSelectionnee('')
                      const query = val.trim().toLowerCase()
                      if (!query) { setVilleSuggestions([]); return }
                      const matches = VILLES_DISPONIBLES.filter(v => v.toLowerCase().startsWith(query))
                      if (matches.length > 0) {
                        setVilleSuggestions(matches)
                      } else if (query.length >= 2) {
                        setVilleSuggestions(['__unavailable__'])
                      } else {
                        setVilleSuggestions([])
                      }
                    }}
                    onBlur={() => setTimeout(() => setVilleSuggestions([]), 200)}
                    placeholder="Ex: Rennes, Nantes..."
                    autoComplete="off"
                  />
                  {villeSuggestions.length > 0 && (
                    <div className="cp-suggestions">
                      {villeSuggestions[0] === '__unavailable__' ? (
                        <div className="cp-suggestion-item" style={{ color: '#E8622A', cursor: 'default', fontWeight: 600 }}>
                          STERNY arrive bientôt dans ta ville !
                        </div>
                      ) : (
                        villeSuggestions.map(v => (
                          <div key={v} className="cp-suggestion-item" onMouseDown={() => {
                            setVilleInput(v)
                            setVilleSelectionnee(v)
                            setVilleSuggestions([])
                          }}>
                            {v}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="cp-group cp-stagger" style={{ animationDelay: '0.20s', position: 'relative', zIndex: typeSelectOpen ? 400 : 200 }}>
                <label>Type d'alternance</label>
                <CpSelect
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
                <div className="cp-group cp-stagger" style={{ animationDelay: '0.28s', position: 'relative', zIndex: rythmeSelectOpen ? 300 : 100 }}>
                  <label>Mon rythme</label>
                  <CpSelect
                    value={monRythme}
                    onChange={setMonRythme}
                    placeholder="Sélectionner"
                    options={typeAlternance === 'symmetric' ? SYMMETRIC_OPTIONS : ASYMMETRIC_OPTIONS}
                    onOpenChange={setRythmeSelectOpen}
                  />
                </div>
              )}

              {typeAlternance === 'custom' && (
                <div className="cp-group cp-stagger" style={{ animationDelay: '0.28s', position: 'relative', zIndex: 1 }}>
                  <label>Décris ton rythme</label>
                  <input
                    type="text"
                    value={rythmeCustom}
                    onChange={(e) => setRythmeCustom(e.target.value)}
                    placeholder="Ex : 3 jours école / 2 jours entreprise"
                  />
                </div>
              )}

              <div className="cp-bottom">
                <button className="cp-btn" onClick={() => nextStep(2)}>Continuer</button>
                {error ? (
                  <p className="cp-error cp-error-bottom">{error}</p>
                ) : (
                  <p className="cp-back">
                    <a href="#" onClick={e => { e.preventDefault(); prevStep(2) }}>Retour</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Études */}
          {currentStep === 3 && !showConfirmation && (
            <div className="cp-step">
              <div className="cp-group cp-stagger" style={{ animationDelay: '0.12s' }}>
                <label>École / Université</label>
                <div className="cp-autocomplete">
                  <input
                    type="text"
                    value={ecole}
                    onChange={e => handleEcoleInput(e.target.value)}
                    onFocus={() => { if (!ecole.trim()) { setSchoolSuggestions(ECOLES_POPULAIRES); setShowSchoolSuggestions(true) } }}
                    onBlur={() => setTimeout(() => setShowSchoolSuggestions(false), 200)}
                    placeholder="Recherche ton école, université, CFA..."
                    autoComplete="off"
                  />
                  {showSchoolSuggestions && schoolSuggestions.length > 0 && (
                    <div className="cp-suggestions">
                      {schoolSuggestions.map((s, i) => (
                        <div key={i} className="cp-suggestion-item" onMouseDown={() => { setEcole(s.name + (s.city ? ' — ' + s.city : '')); setShowSchoolSuggestions(false) }}>
                          <strong>{s.name}</strong>
                          {s.city && <small>{s.city}</small>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="cp-group cp-stagger" style={{ animationDelay: '0.20s' }}>
                <label>Année d'études</label>
                <div className="cp-autocomplete">
                  <input
                    type="text"
                    value={anneeEtudes}
                    onChange={e => { setAnneeEtudes(e.target.value); setAnneeSuggestions(filterAnnees(e.target.value)); setShowAnneeSuggestions(true) }}
                    onFocus={() => { setAnneeSuggestions(filterAnnees(anneeEtudes)); setShowAnneeSuggestions(true) }}
                    onBlur={() => setTimeout(() => setShowAnneeSuggestions(false), 200)}
                    placeholder="ex: L3, M1, Bac+5..."
                    autoComplete="off"
                  />
                  {showAnneeSuggestions && anneeSuggestions.length > 0 && (
                    <div className="cp-suggestions">
                      {anneeSuggestions.map((a, i) => (
                        <div key={i} className="cp-suggestion-item" onMouseDown={() => { setAnneeEtudes(a.value); setShowAnneeSuggestions(false) }}>
                          {a.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="cp-group cp-stagger" style={{ animationDelay: '0.28s' }}>
                <label>Filière / Domaine</label>
                <div className="cp-autocomplete">
                  <input
                    type="text"
                    value={filiere}
                    onChange={e => { setFiliere(e.target.value); setFiliereSuggestions(filterFilieres(e.target.value)); setShowFiliereSuggestions(true) }}
                    onFocus={() => { setFiliereSuggestions(filterFilieres(filiere)); setShowFiliereSuggestions(true) }}
                    onBlur={() => setTimeout(() => setShowFiliereSuggestions(false), 200)}
                    placeholder="ex: Informatique, Commerce..."
                    autoComplete="off"
                  />
                  {showFiliereSuggestions && filiereSuggestions.length > 0 && (
                    <div className="cp-suggestions">
                      {filiereSuggestions.map((f, i) => (
                        <div key={i} className="cp-suggestion-item" onMouseDown={() => { setFiliere(f.value); setShowFiliereSuggestions(false) }}>
                          {f.value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="cp-bottom">
                <button className="cp-btn" onClick={() => nextStep(3)}>Continuer</button>
                {error ? (
                  <p className="cp-error cp-error-bottom">{error}</p>
                ) : (
                  <p className="cp-back">
                    <a href="#" onClick={e => { e.preventDefault(); prevStep(3) }}>Retour</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && !showConfirmation && (
            <div className="cp-step">
              <input type="file" ref={photoInputRef} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              <div className="cp-photo-center cp-stagger" style={{ animationDelay: '0.12s' }} onClick={() => photoInputRef.current?.click()}>
                <div className="cp-photo-circle">
                  {photoPreviewUrl ? (
                    <img src={photoPreviewUrl} alt="" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
                <span className="cp-photo-action">{photoPreviewUrl ? 'Modifier' : 'Ajouter une photo'}</span>
              </div>
              <div className="cp-group cp-stagger" style={{ animationDelay: '0.20s' }}>
                <label>À propos de toi</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Parle de toi, tes centres d'intérêts, ce que tu aimes faire..." maxLength="300" rows="4" />
                <p className="cp-hint">Optionnel — Max 300 caractères</p>
              </div>
              <div className="cp-bottom">
                <button className={`cp-btn${loading ? ' loading' : ''}`} onClick={enregistrerProfil} disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                {error ? (
                  <p className="cp-error cp-error-bottom">{error}</p>
                ) : (
                  <p className="cp-back">
                    <a href="#" onClick={e => { e.preventDefault(); prevStep(4) }}>Retour</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Confirmation */}
          {showConfirmation && (
            <div className="cp-confirmation cp-stagger">
              <div className="cp-confirm-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
              </div>
              <div className="cp-confirm-title cp-stagger" style={{ animationDelay: '0.12s' }}>Profil complété !</div>
              <div className="cp-confirm-text cp-stagger" style={{ animationDelay: '0.20s' }}>Redirection vers ton espace...</div>
              <div className="cp-confirm-bar cp-stagger" style={{ animationDelay: '0.28s' }}>
                <div className="cp-confirm-bar-fill" />
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
