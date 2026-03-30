import { useState, useEffect, useRef, useCallback } from 'react'
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

export default function CompleterProfilPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [userType, setUserType] = useState('locataire')
  const totalSteps = userType === 'proprietaire' ? 1 : 3

  // Form fields
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [dateNaissanceISO, setDateNaissanceISO] = useState('')
  const [sexe, setSexe] = useState('')
  const [ecole, setEcole] = useState('')
  const [anneeEtudes, setAnneeEtudes] = useState('')
  const [filiere, setFiliere] = useState('')
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

  const schoolSearchTimeout = useRef(null)
  const errorTimeout = useRef(null)

  const stepTitles = { 1: 'Complete ton profil', 2: 'Tes etudes', 3: 'A propos de toi' }

  // Auth check + pre-fill
  useEffect(() => {
    if (!user) return
    async function loadData() {
      const { data: userData } = await supabaseClient.from('users').select('*').eq('id', user.id).single()
      if (!userData) return
      if (userData.type_user === 'proprietaire') {
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
      if (userData.ecole) setEcole(userData.ecole)
      if (userData.annee_etudes) setAnneeEtudes(userData.annee_etudes)
      if (userData.filiere) setFiliere(userData.filiere)
      if (userData.bio) setBio(userData.bio)
      if (userData.profil_complet) {
        navigate('/dashboard/locataire')
      }
    }
    loadData()
  }, [user, navigate])

  // Error display
  const showError = useCallback((msg) => {
    setError(msg)
    if (errorTimeout.current) clearTimeout(errorTimeout.current)
    errorTimeout.current = setTimeout(() => setError(''), 3000)
  }, [])

  // Validation
  function validateStep(step) {
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
    const areaSize = 260
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
    const areaSize = 260
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
    const areaSize = 260
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
    const areaSize = 260
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

      const updateData = {
        prenom: prenom.trim(),
        nom: nom.trim(),
        sexe,
        date_naissance: dateNaissanceISO,
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

  if (!user) return null

  return (
    <>
      {/* Crop Modal */}
      <div className={`crop-overlay${showCrop ? ' active' : ''}`} role="dialog" aria-modal="true" aria-label="Recadrer la photo">
        <div className="crop-modal">
          <h3>Recadre ta photo</h3>
          <p className="crop-hint">Deplace et zoome pour ajuster</p>
          <div className="crop-area" ref={cropAreaRef} onMouseDown={handleCropMouseDown} onTouchStart={handleCropTouchStart}>
            <img ref={cropImageRef} src={cropImageSrc} alt="Photo a recadrer" onLoad={handleCropImageLoad} />
          </div>
          <div className="crop-zoom">
            <label>Zoom</label>
            <input type="range" min={cropZoomMin} max={cropZoomMax} value={cropZoom} onChange={handleCropZoom} />
          </div>
          <div className="crop-actions">
            <button className="crop-cancel" onClick={cancelCrop}>Annuler</button>
            <button className="crop-confirm" onClick={confirmCrop}>Valider</button>
          </div>
        </div>
      </div>

      {/* Page */}
      <section className="page-inscription">
        <div className="inscription-container">
          {!showConfirmation && (
            <>
              <div className="inscription-header">
                <h1>{stepTitles[currentStep] || ''}</h1>
              </div>
              <div className="step-indicator">Etape {currentStep} sur {totalSteps}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
              </div>
              {error && <div className="error-message show" role="alert">{error}</div>}
            </>
          )}

          {/* Step 1 */}
          {currentStep === 1 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                <input type="file" ref={photoInputRef} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoSelect} />
                <div className="photo-upload">
                  <div className="photo-circle" onClick={() => photoInputRef.current?.click()}>
                    {photoPreviewUrl ? (
                      <img src={photoPreviewUrl} alt="Photo de profil" />
                    ) : (
                      <div className="placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="photo-info">
                    <div className="photo-title">Ajoute ta photo</div>
                    <div className="photo-hint">Clique sur le cercle — JPG, PNG (max 5 MB)</div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Prenom <span className="required">*</span></label>
                    <input type="text" value={prenom} onChange={e => setPrenom(capitalizeWords(e.target.value))} placeholder="Prenom" />
                  </div>
                  <div className="form-group">
                    <label>Nom <span className="required">*</span></label>
                    <input type="text" value={nom} onChange={e => setNom(capitalizeWords(e.target.value))} placeholder="Nom" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date de naissance <span className="required">*</span></label>
                    <input type="text" value={dateNaissance} onChange={handleDateInput} onKeyDown={handleDateKeyDown} placeholder="JJ/MM/AAAA" maxLength="10" autoComplete="off" inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label>Sexe <span className="required">*</span></label>
                    <select value={sexe} onChange={e => setSexe(e.target.value)} className={!sexe ? 'placeholder' : ''}>
                      <option value="" disabled>Selectionner</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                      <option value="autre">Autre</option>
                      <option value="non-precise">Non precise</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="buttons-row single">
                <button className={`btn-next${loading ? ' loading' : ''}`} onClick={() => nextStep(1)} disabled={loading}>
                  {userType === 'proprietaire' ? 'Enregistrer' : 'Continuer'}
                </button>
              </div>
              <div className="back-link">
                <Link to="/dashboard/locataire">Retour</Link>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                <div className="form-group">
                  <label>Ecole / Universite <span className="required">*</span></label>
                  <div className="school-search-wrapper">
                    <span className="school-search-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <input
                      type="text"
                      value={ecole}
                      onChange={e => handleEcoleInput(e.target.value)}
                      onFocus={() => { if (!ecole.trim()) { setSchoolSuggestions(ECOLES_POPULAIRES); setShowSchoolSuggestions(true) } }}
                      onBlur={() => setTimeout(() => setShowSchoolSuggestions(false), 200)}
                      placeholder="Recherche ton ecole, universite, CFA..."
                      autoComplete="off"
                    />
                    {showSchoolSuggestions && schoolSuggestions.length > 0 && (
                      <div className="school-suggestions show">
                        {schoolSuggestions.map((s, i) => (
                          <div key={i} className="school-suggestion-item" onMouseDown={() => { setEcole(s.name + (s.city ? ' — ' + s.city : '')); setShowSchoolSuggestions(false) }}>
                            <strong>{s.name}</strong>
                            {s.city && <small>{s.city}</small>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Annee d'etudes <span className="required">*</span></label>
                  <div className="annee-search-wrapper">
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
                      <div className="annee-suggestions show">
                        {anneeSuggestions.map((a, i) => (
                          <div key={i} className="annee-suggestion-item" onMouseDown={() => { setAnneeEtudes(a.value); setShowAnneeSuggestions(false) }}>
                            {a.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Filiere / Domaine <span className="required">*</span></label>
                  <div className="filiere-search-wrapper">
                    <input
                      type="text"
                      value={filiere}
                      onChange={e => { setFiliere(e.target.value); setFiliereSuggestions(filterFilieres(e.target.value)); setShowFiliereSuggestions(true) }}
                      onFocus={() => { setFiliereSuggestions(filterFilieres(filiere)); setShowFiliereSuggestions(true) }}
                      onBlur={() => setTimeout(() => setShowFiliereSuggestions(false), 200)}
                      placeholder="ex: Informatique, Commerce, Architecture..."
                      autoComplete="off"
                    />
                    {showFiliereSuggestions && filiereSuggestions.length > 0 && (
                      <div className="filiere-suggestions show">
                        {filiereSuggestions.map((f, i) => (
                          <div key={i} className="filiere-suggestion-item" onMouseDown={() => { setFiliere(f.value); setShowFiliereSuggestions(false) }}>
                            {f.value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="buttons-row single">
                <button className="btn-next" onClick={() => nextStep(2)}>Continuer</button>
              </div>
              <div className="back-link">
                <a href="#" onClick={e => { e.preventDefault(); prevStep(2) }}>Retour</a>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                <div className="form-group">
                  <label>A propos de toi</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Parle de toi, tes centres d'interets, ce que tu aimes faire..." maxLength="300" rows="5" />
                  <p className="hint">Optionnel — Max 300 caracteres</p>
                </div>
              </div>
              <div className="buttons-row single">
                <button className={`btn-next${loading ? ' loading' : ''}`} onClick={enregistrerProfil} disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
              <div className="back-link">
                <a href="#" onClick={e => { e.preventDefault(); prevStep(3) }}>Retour</a>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {showConfirmation && (
            <div className="confirmation-screen active">
              <div className="confirmation-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
              </div>
              <div className="confirmation-title">Profil complete !</div>
              <div className="confirmation-text">Redirection vers ton espace...</div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
