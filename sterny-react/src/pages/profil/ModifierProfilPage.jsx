import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './ModifierProfilPage.css'

// === SHARED DATA (same as CompleterProfilPage) ===
const SIGLES_ECOLES = {
  'ENSAB': 'Ecole nationale superieure d\'architecture de Bretagne Rennes',
  'INSA': 'Institut national des sciences appliquees Rennes',
  'ENSAI': 'Ecole nationale de la statistique et de l\'analyse de l\'information Rennes',
  'ESIR': 'Ecole superieure d\'ingenieurs de Rennes',
  'RSB': 'Rennes School of Business',
  'CENTRALE': 'Ecole Centrale Nantes',
  'AUDENCIA': 'Audencia Business School Nantes',
  'ENIB': 'Ecole nationale d\'ingenieurs de Brest',
  'UBO': 'Universite de Bretagne Occidentale Brest',
  'IUT': 'Institut universitaire de technologie',
  'CFA': 'Centre de formation d\'apprentis',
  'UBS': 'Universite Bretagne Sud',
  'ESC': 'Ecole superieure de commerce',
}

const VILLES_LANCEMENT = ['rennes', 'nantes', 'brest', 'quimper', 'lorient', 'vannes', 'saint-malo', 'saint-brieuc', 'fougeres', 'vitre']
const VILLES_DISPONIBLES = ['Rennes', 'Nantes', 'Brest', 'Quimper', 'Lorient', 'Vannes', 'Saint-Malo', 'Saint-Brieuc', 'Fougeres', 'Vitre']

const ECOLES_POPULAIRES = [
  { name: 'Universite de Rennes', city: 'Rennes', aliases: ['rennes 1', 'univ rennes', 'ur1'] },
  { name: 'Universite Rennes 2', city: 'Rennes', aliases: ['rennes 2', 'ur2', 'lettres'] },
  { name: 'INSA Rennes', city: 'Rennes', aliases: ['insa', 'ingenieur'] },
  { name: 'Sciences Po Rennes', city: 'Rennes', aliases: ['sciences po', 'iep'] },
  { name: 'Rennes School of Business', city: 'Rennes', aliases: ['rsb', 'business', 'commerce'] },
  { name: 'IUT de Rennes', city: 'Rennes', aliases: ['iut', 'but'] },
  { name: 'EPITECH Rennes', city: 'Rennes', aliases: ['epitech', 'info'] },
  { name: 'ENS Rennes', city: 'Rennes', aliases: ['ens', 'normale sup'] },
  { name: 'Nantes Universite', city: 'Nantes', aliases: ['nantes', 'universite'] },
  { name: 'Centrale Nantes', city: 'Nantes', aliases: ['centrale', 'ingenieur'] },
  { name: 'Audencia', city: 'Nantes', aliases: ['audencia', 'business'] },
  { name: 'Universite de Bretagne Occidentale', city: 'Brest', aliases: ['ubo', 'brest'] },
  { name: 'ENIB', city: 'Brest', aliases: ['enib', 'ingenieur', 'brest'] },
  { name: 'Universite Bretagne Sud', city: 'Lorient', aliases: ['ubs', 'lorient'] },
]

const ANNEES_ETUDES = [
  { value: 'Bac+1', label: 'Bac+1 — L1 / BUT1 / BTS1 / PASS', aliases: ['l1', 'bac+1', 'but1', 'bts1', 'pass'] },
  { value: 'Bac+2', label: 'Bac+2 — L2 / BUT2 / BTS2 / Prepa', aliases: ['l2', 'bac+2', 'but2', 'bts2', 'prepa'] },
  { value: 'Bac+3', label: 'Bac+3 — L3 / BUT3 / Licence / Bachelor', aliases: ['l3', 'bac+3', 'but3', 'bachelor'] },
  { value: 'Bac+4', label: 'Bac+4 — M1 / Master 1', aliases: ['m1', 'bac+4', 'master 1'] },
  { value: 'Bac+5', label: 'Bac+5 — M2 / Master 2 / Ingenieur', aliases: ['m2', 'bac+5', 'ingenieur'] },
  { value: 'Bac+6', label: 'Bac+6 — Mastere / MS / Post-master', aliases: ['bac+6', 'mastere'] },
  { value: 'Bac+7', label: 'Bac+7 — Doctorat / These / Internat', aliases: ['bac+7', 'doctorat', 'these'] },
  { value: 'Bac+8', label: 'Bac+8 — Doctorat / Internat', aliases: ['bac+8', 'doctorat'] },
]

const FILIERES = [
  { value: 'Informatique', aliases: ['info', 'dev', 'code'] },
  { value: 'Commerce', aliases: ['business', 'vente', 'commercial'] },
  { value: 'Marketing', aliases: ['market', 'publicite', 'digital'] },
  { value: 'Finance', aliases: ['banque', 'comptabilite', 'audit'] },
  { value: 'Droit', aliases: ['juridique', 'avocat', 'juriste'] },
  { value: 'Communication', aliases: ['com', 'media', 'journalisme'] },
  { value: 'Architecture', aliases: ['archi', 'urbanisme'] },
  { value: 'Design', aliases: ['graphisme', 'ux', 'ui'] },
  { value: 'Medecine', aliases: ['medical', 'sante'] },
  { value: 'Sciences politiques', aliases: ['sciences po', 'iep'] },
  { value: 'Economie', aliases: ['eco', 'economiste'] },
  { value: 'Data / Intelligence artificielle', aliases: ['data', 'ia', 'machine learning'] },
  { value: 'Cybersecurite', aliases: ['cyber', 'securite informatique'] },
]

function normalizeStr(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function capitalizeWords(str) { return str.replace(/(?:^|[\s-])([a-zA-Z\u00C0-\u00FF])/g, m => m.toUpperCase()) }

export default function ModifierProfilPage() {
  const navigate = useNavigate()
  const { user, session } = useAuth()

  const totalSteps = 6
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userType, setUserType] = useState('locataire')
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard/locataire')

  // Step 1
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [dateNaissanceISO, setDateNaissanceISO] = useState('')
  const [sexe, setSexe] = useState('')
  const [telephone, setTelephone] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const photoInputRef = useRef(null)

  // Crop
  const [showCrop, setShowCrop] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const cropImageRef = useRef(null)
  const cropStateRef = useRef({ imgX: 0, imgY: 0, scale: 1, dragging: false, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })
  const [cropZoom, setCropZoom] = useState(100)
  const [cropZoomMin, setCropZoomMin] = useState(100)
  const [cropZoomMax, setCropZoomMax] = useState(300)

  // Step 2
  const [ecole, setEcole] = useState('')
  const [anneeEtudes, setAnneeEtudes] = useState('')
  const [filiere, setFiliere] = useState('')
  const [schoolSuggestions, setSchoolSuggestions] = useState([])
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false)
  const [anneeSuggestions, setAnneeSuggestions] = useState([])
  const [showAnneeSuggestions, setShowAnneeSuggestions] = useState(false)
  const [filiereSuggestions, setFiliereSuggestions] = useState([])
  const [showFiliereSuggestions, setShowFiliereSuggestions] = useState(false)
  const schoolSearchTimeout = useRef(null)

  // Step 3
  const [typeAlternance, setTypeAlternance] = useState('')
  const [monRythme, setMonRythme] = useState('')
  const [rythmeCustom, setRythmeCustom] = useState('')
  const [villeEcole, setVilleEcole] = useState('')
  const [villeEntreprise, setVilleEntreprise] = useState('')
  const [villeEcoleSuggestions, setVilleEcoleSuggestions] = useState([])
  const [showVilleEcoleSugg, setShowVilleEcoleSugg] = useState(false)
  const [villeEntrepriseSuggestions, setVilleEntrepriseSuggestions] = useState([])
  const [showVilleEntrepriseSugg, setShowVilleEntrepriseSugg] = useState(false)

  // Step 4
  const [bio, setBio] = useState('')

  // Step 5 - Docs
  const [docFiles, setDocFiles] = useState({ pieceId: null, scolarite: null, rib: null })
  const [docPreviews, setDocPreviews] = useState({ pieceId: '', scolarite: '', rib: '' })
  const [identiteVerifiee, setIdentiteVerifiee] = useState(false)
  const docInputRefs = { pieceId: useRef(null), scolarite: useRef(null), rib: useRef(null) }

  // Step 6 - Garant
  const [garantPrenom, setGarantPrenom] = useState('')
  const [garantNom, setGarantNom] = useState('')
  const [garantTelephone, setGarantTelephone] = useState('')
  const [garantEmail, setGarantEmail] = useState('')

  // Email prefs
  const [prefs, setPrefs] = useState({ alertes: true, messages: true, candidatures: true, paiements: true, baux: true, marketing: true })
  const [prefsSaved, setPrefsSaved] = useState(false)
  const prefsSaveTimeout = useRef(null)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' })

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  const errorTimeout = useRef(null)
  const stepTitles = { 1: 'Modifier mon profil', 2: 'Tes etudes', 3: 'Ton alternance', 4: 'A propos de toi', 5: 'Tes documents', 6: 'Ton garant' }

  // Auth + prefill
  useEffect(() => {
    if (!user) return
    async function loadData() {
      const { data: typeData } = await supabaseClient.from('users').select('type_user').eq('id', user.id).single()
      if (typeData?.type_user === 'proprietaire') { navigate('/profil/modifier-proprietaire'); return }
      if (typeData?.type_user === 'hote') { setUserType('hote'); setDashboardUrl('/dashboard/locataire') }
      else { setUserType('locataire'); setDashboardUrl('/dashboard/locataire') }

      const { data: userData } = await supabaseClient.from('users').select('*').eq('id', user.id).single()
      if (!userData) return
      setIsAdmin(userData.is_admin === true)
      if (userData.prenom) setPrenom(userData.prenom)
      if (userData.nom) setNom(userData.nom)
      if (userData.sexe) setSexe(userData.sexe)
      if (userData.telephone) setTelephone(userData.telephone)
      if (userData.date_naissance) {
        const d = new Date(userData.date_naissance)
        setDateNaissance(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)
        setDateNaissanceISO(userData.date_naissance)
      }
      if (userData.photo_profil_url) setPhotoPreviewUrl(userData.photo_profil_url)
      if (userData.ecole) setEcole(userData.ecole)
      if (userData.annee_etudes) setAnneeEtudes(userData.annee_etudes)
      if (userData.filiere) setFiliere(userData.filiere)
      if (userData.type_alternance) setTypeAlternance(userData.type_alternance)
      if (userData.rythme_alternance) {
        if (userData.type_alternance === 'custom') setRythmeCustom(userData.rythme_alternance)
        else setMonRythme(userData.rythme_alternance)
      }
      if (userData.ville_ecole) setVilleEcole(userData.ville_ecole)
      if (userData.ville_entreprise) setVilleEntreprise(userData.ville_entreprise)
      if (userData.bio) setBio(userData.bio)
      if (userData.garant_prenom) setGarantPrenom(userData.garant_prenom)
      if (userData.garant_nom) setGarantNom(userData.garant_nom)
      if (userData.garant_telephone) setGarantTelephone(userData.garant_telephone)
      if (userData.garant_email) setGarantEmail(userData.garant_email)
      if (userData.doc_piece_id_url) setDocPreviews(p => ({ ...p, pieceId: userData.doc_piece_id_url.split('/').pop() }))
      if (userData.doc_scolarite_url) setDocPreviews(p => ({ ...p, scolarite: userData.doc_scolarite_url.split('/').pop() }))
      if (userData.doc_rib_url) setDocPreviews(p => ({ ...p, rib: userData.doc_rib_url.split('/').pop() }))
      if (userData.identite_verifiee === 'verifiee') setIdentiteVerifiee(true)
      if (userData.preferences_email) {
        const pe = userData.preferences_email
        setPrefs({ alertes: pe.alertes !== false, messages: pe.messages !== false, candidatures: pe.candidatures !== false, paiements: pe.paiements !== false, baux: pe.baux !== false, marketing: pe.marketing !== false })
      }
    }
    loadData()
  }, [user, navigate])

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
      if (!telephone.trim()) return 'Merci de renseigner ton telephone'
      if (userType === 'proprietaire') return null
      if (!dateNaissance || dateNaissance.length !== 10) return 'Date de naissance incomplete'
      if (!dateNaissanceISO) return 'Date de naissance invalide'
      if (!sexe) return 'Merci de selectionner ton sexe'
      const birthDate = new Date(dateNaissanceISO)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const md = today.getMonth() - birthDate.getMonth()
      if (md < 0 || (md === 0 && today.getDate() < birthDate.getDate())) age--
      if (age < 18) return 'Tu dois avoir au moins 18 ans'
    }
    if (step === 2) {
      if (!ecole.trim()) return 'Merci de renseigner ton ecole'
      if (!anneeEtudes.trim()) return 'Merci de renseigner ton annee d\'etudes'
      if (!filiere.trim()) return 'Merci de renseigner ta filiere'
    }
    if (step === 5) {
      const pieceOk = docFiles.pieceId || docPreviews.pieceId
      const scolOk = docFiles.scolarite || docPreviews.scolarite
      if (!pieceOk || !scolOk) return 'Merci d\'ajouter tous les documents obligatoires'
    }
    if (step === 6) {
      if (!garantPrenom.trim()) return 'Merci de renseigner le prenom du garant'
      if (!garantNom.trim()) return 'Merci de renseigner le nom du garant'
      if (!garantTelephone.trim()) return 'Merci de renseigner le telephone du garant'
      if (!garantEmail.trim()) return 'Merci de renseigner l\'email du garant'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(garantEmail.trim())) return 'L\'email du garant n\'est pas valide'
    }
    return null
  }

  function nextStep(current) {
    if (isAdmin) { if (current + 1 > totalSteps) { enregistrerProfil(); return } setCurrentStep(current + 1); return }
    const err = validateStep(current)
    if (err) { showError(err); return }
    if (userType === 'proprietaire' && current >= 1) { enregistrerProfil(); return }
    setCurrentStep(current + 1)
    setError('')
  }

  // Date
  function handleDateInput(e) {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 8) value = value.slice(0, 8)
    let formatted = ''
    if (value.length > 0) formatted = value.slice(0, 2)
    if (value.length > 2) formatted += '/' + value.slice(2, 4)
    if (value.length > 4) formatted += '/' + value.slice(4, 8)
    setDateNaissance(formatted)
    if (value.length === 8) setDateNaissanceISO(`${value.slice(4, 8)}-${value.slice(2, 4)}-${value.slice(0, 2)}`)
    else setDateNaissanceISO('')
  }

  // Crop handlers (same pattern as CompleterProfil)
  function handlePhotoSelect(e) { if (e.target.files[0]) openCropper(e.target.files[0]) }
  function openCropper(file) {
    if (!file.type.match('image.*')) { showError('Fichier doit etre une image'); return }
    if (file.size > 5 * 1024 * 1024) { showError('Photo max 5 MB'); return }
    const reader = new FileReader()
    reader.onload = ev => { setCropImageSrc(ev.target.result); setShowCrop(true) }
    reader.readAsDataURL(file)
  }
  function handleCropImageLoad() {
    const img = cropImageRef.current; if (!img) return
    const areaSize = 260; const ratio = Math.max(areaSize / img.naturalWidth, areaSize / img.naturalHeight)
    cropStateRef.current.scale = ratio
    setCropZoomMin(Math.round(ratio * 100)); setCropZoomMax(Math.round(ratio * 300)); setCropZoom(Math.round(ratio * 100))
    cropStateRef.current.imgX = (areaSize - img.naturalWidth * ratio) / 2
    cropStateRef.current.imgY = (areaSize - img.naturalHeight * ratio) / 2
    applyCropTransform()
  }
  function applyCropTransform() {
    const img = cropImageRef.current; const s = cropStateRef.current; if (!img) return
    img.style.width = img.naturalWidth * s.scale + 'px'; img.style.height = img.naturalHeight * s.scale + 'px'
    img.style.left = s.imgX + 'px'; img.style.top = s.imgY + 'px'
  }
  function clampCropPosition() {
    const img = cropImageRef.current; const s = cropStateRef.current; if (!img) return
    const areaSize = 260; const w = img.naturalWidth * s.scale; const h = img.naturalHeight * s.scale
    if (s.imgX > 0) s.imgX = 0; if (s.imgY > 0) s.imgY = 0
    if (s.imgX < areaSize - w) s.imgX = areaSize - w; if (s.imgY < areaSize - h) s.imgY = areaSize - h
    applyCropTransform()
  }
  function handleCropZoom(e) {
    const nz = parseInt(e.target.value); setCropZoom(nz)
    const s = cropStateRef.current; const img = cropImageRef.current; if (!img) return
    const oldScale = s.scale; s.scale = nz / 100; const cx = 130; const cy = 130
    const relX = (cx - s.imgX) / (img.naturalWidth * oldScale); const relY = (cy - s.imgY) / (img.naturalHeight * oldScale)
    s.imgX = cx - relX * img.naturalWidth * s.scale; s.imgY = cy - relY * img.naturalHeight * s.scale
    clampCropPosition()
  }
  function handleCropMouseDown(e) {
    e.preventDefault(); const s = cropStateRef.current
    s.dragging = true; s.startX = e.clientX; s.startY = e.clientY; s.imgStartX = s.imgX; s.imgStartY = s.imgY
  }
  function handleCropTouchStart(e) {
    if (e.touches.length === 1) { const s = cropStateRef.current; s.dragging = true; s.startX = e.touches[0].clientX; s.startY = e.touches[0].clientY; s.imgStartX = s.imgX; s.imgStartY = s.imgY }
  }
  useEffect(() => {
    const mm = e => { const s = cropStateRef.current; if (!s.dragging) return; s.imgX = s.imgStartX + (e.clientX - s.startX); s.imgY = s.imgStartY + (e.clientY - s.startY); clampCropPosition() }
    const mu = () => { cropStateRef.current.dragging = false }
    const tm = e => { const s = cropStateRef.current; if (!s.dragging || e.touches.length !== 1) return; s.imgX = s.imgStartX + (e.touches[0].clientX - s.startX); s.imgY = s.imgStartY + (e.touches[0].clientY - s.startY); clampCropPosition() }
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu)
    window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', mu)
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', mu) }
  }, [])
  function cancelCrop() { setShowCrop(false); if (photoInputRef.current) photoInputRef.current.value = '' }
  function confirmCrop() {
    const img = cropImageRef.current; const s = cropStateRef.current
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d'); const sourceX = -s.imgX / s.scale; const sourceY = -s.imgY / s.scale; const sourceSize = 260 / s.scale
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 400, 400)
    canvas.toBlob(blob => {
      setPhotoFile(new File([blob], 'photo-profil.jpg', { type: 'image/jpeg' }))
      setPhotoPreviewUrl(URL.createObjectURL(blob)); setShowCrop(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }, 'image/jpeg', 0.9)
  }

  // Autocomplete helpers
  function filterLocalSchools(q) {
    if (!q) return ECOLES_POPULAIRES
    const qn = normalizeStr(q)
    return ECOLES_POPULAIRES.filter(e => normalizeStr(e.name).includes(qn) || normalizeStr(e.city || '').includes(qn) || e.aliases.some(a => a.includes(qn)))
  }
  function filterAnnees(q) {
    if (!q) return ANNEES_ETUDES
    const qn = normalizeStr(q)
    const scored = []; ANNEES_ETUDES.forEach(a => { let s = 0; if (a.value.toLowerCase().startsWith(qn)) s = 100; else if (normalizeStr(a.label).includes(qn)) s = 80; else { for (const al of a.aliases) { if (normalizeStr(al).includes(qn)) { s = 50; break } } }; if (s > 0) scored.push({ item: a, score: s }) })
    scored.sort((a, b) => b.score - a.score); return scored.map(s => s.item)
  }
  function filterFilieres(q) {
    if (!q) return FILIERES
    const qn = normalizeStr(q)
    const scored = []; FILIERES.forEach(f => { let s = 0; const vl = normalizeStr(f.value); if (vl.startsWith(qn)) s = 100; else if (vl.includes(qn)) s = 60; else { for (const al of f.aliases) { if (normalizeStr(al).includes(qn)) { s = 30; break } } }; if (s > 0) scored.push({ item: f, score: s }) })
    scored.sort((a, b) => b.score - a.score); return scored.map(s => s.item)
  }
  function filterVilles(q) {
    if (!q) return VILLES_DISPONIBLES
    return VILLES_DISPONIBLES.filter(v => v.toLowerCase().startsWith(q.toLowerCase()))
  }

  // Rythme options
  function getRythmeOptions() {
    if (typeAlternance === 'symmetric') return [{ v: '1-1', l: '1 sem. / 1 sem.' }, { v: '2-2', l: '2 sem. / 2 sem.' }, { v: '3-3', l: '3 sem. / 3 sem.' }, { v: '4-4', l: '4 sem. / 4 sem.' }]
    if (typeAlternance === 'asymmetric') return [{ v: '2-1', l: '2 sem. entreprise / 1 sem. ecole' }, { v: '1-2', l: '1 sem. entreprise / 2 sem. ecole' }, { v: '3-1', l: '3 sem. entreprise / 1 sem. ecole' }, { v: '1-3', l: '1 sem. entreprise / 3 sem. ecole' }]
    return []
  }

  // Doc handlers
  function handleDocSelect(key, file) {
    if (!file) return
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) { showError('Format non supporte. PDF, JPG ou PNG.'); return }
    if (file.size > 5 * 1024 * 1024) { showError('Max 5 Mo.'); return }
    setDocFiles(prev => ({ ...prev, [key]: file }))
    setDocPreviews(prev => ({ ...prev, [key]: file.name }))
  }
  function removeDoc(key) {
    setDocFiles(prev => ({ ...prev, [key]: null }))
    setDocPreviews(prev => ({ ...prev, [key]: '' }))
    if (docInputRefs[key]?.current) docInputRefs[key].current.value = ''
  }

  // Save
  async function enregistrerProfil() {
    const garantErr = validateStep(6)
    if (garantErr && !isAdmin) { showError(garantErr); return }
    setLoading(true)
    try {
      const updateData = { prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim() }
      if (userType !== 'proprietaire') {
        const rythme = typeAlternance === 'custom' ? rythmeCustom.trim() || null : monRythme || null
        Object.assign(updateData, {
          sexe, date_naissance: dateNaissanceISO,
          ecole: ecole.trim(), annee_etudes: anneeEtudes.trim(), filiere: filiere.trim(),
          bio: bio.trim() || null, type_alternance: typeAlternance || null, rythme_alternance: rythme,
          ville_ecole: villeEcole || null, ville_entreprise: villeEntreprise || null,
          garant_prenom: garantPrenom.trim() || null, garant_nom: garantNom.trim() || null,
          garant_telephone: garantTelephone.trim() || null, garant_email: garantEmail.trim() || null
        })
        // Upload docs
        for (const [key, file] of Object.entries(docFiles)) {
          if (file) {
            const ext = file.name.split('.').pop()
            const fileName = `${user.id}-${key}-${Date.now()}.${ext}`
            const { error: docErr } = await supabaseClient.storage.from('documents').upload(fileName, file, { cacheControl: '3600', upsert: true })
            if (!docErr) {
              const { data: urlData } = supabaseClient.storage.from('documents').getPublicUrl(fileName)
              const colMap = { pieceId: 'doc_piece_id_url', scolarite: 'doc_scolarite_url', rib: 'doc_rib_url' }
              updateData[colMap[key]] = urlData.publicUrl
            }
          }
        }
        if (photoFile) {
          const ext = photoFile.name.split('.').pop()
          const fileName = `${user.id}-${Date.now()}.${ext}`
          const { error: upErr } = await supabaseClient.storage.from('profils').upload(fileName, photoFile, { cacheControl: '3600', upsert: true })
          if (!upErr) { const { data: urlData } = supabaseClient.storage.from('profils').getPublicUrl(fileName); updateData.photo_profil_url = urlData.publicUrl }
        }
      }
      const { error: saveErr } = await supabaseClient.from('users').update(updateData).eq('id', user.id)
      if (saveErr) throw saveErr
      setShowConfirmation(true)
      setTimeout(() => navigate(dashboardUrl), 2000)
    } catch (err) {
      console.error('Erreur:', err); setLoading(false); showError(err.message || 'Erreur')
    }
  }

  // Email prefs
  async function sauvegarderPrefsEmail(newPrefs) {
    setPrefs(newPrefs); setPrefsSaved(false)
    clearTimeout(prefsSaveTimeout.current)
    prefsSaveTimeout.current = setTimeout(async () => {
      const { error: e } = await supabaseClient.from('users').update({ preferences_email: newPrefs }).eq('id', user.id)
      if (!e) { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) }
    }, 500)
  }

  // Password
  async function changerMotDePasse() {
    if (!newPassword || !confirmPassword) { setPasswordMessage({ text: 'Remplis les deux champs.', type: 'error' }); return }
    if (newPassword.length < 6) { setPasswordMessage({ text: 'Min. 6 caracteres.', type: 'error' }); return }
    if (newPassword !== confirmPassword) { setPasswordMessage({ text: 'Les mots de passe ne correspondent pas.', type: 'error' }); return }
    try {
      const { error: e } = await supabaseClient.auth.updateUser({ password: newPassword })
      if (e) throw e
      setPasswordMessage({ text: 'Mot de passe modifie !', type: 'success' })
      setNewPassword(''); setConfirmPassword('')
    } catch (err) { setPasswordMessage({ text: err.message || 'Erreur', type: 'error' }) }
  }

  // Delete
  async function supprimerCompte() {
    try {
      const { data: { session: sess } } = await supabaseClient.auth.getSession()
      if (!sess) { alert('Session expiree'); navigate('/connexion'); return }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_KEY },
        body: JSON.stringify({ confirmation: 'SUPPRIMER' })
      })
      const result = await response.json()
      if (!response.ok) { alert(result.error || 'Erreur'); return }
      await supabaseClient.auth.signOut()
      navigate('/')
    } catch (err) { console.error('Erreur suppression:', err); alert('Erreur. Reessaie plus tard.') }
  }

  if (!user) return null

  const docIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
  const checkIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>

  function renderDocUpload(key, label, hint, required) {
    return (
      <div className="form-group">
        <label>{label} {required ? <span className="required">*</span> : <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>(optionnel)</span>}</label>
        <div className={`upload-zone${docPreviews[key] ? ' uploaded' : ''}`} onClick={() => docInputRefs[key].current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
          onDragLeave={e => e.currentTarget.classList.remove('dragover')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleDocSelect(key, e.dataTransfer.files[0]) }}>
          <div className="upload-icon">{docIcon}</div>
          <div className="upload-info">
            <p className="upload-text"><strong>Clique</strong> ou glisse ton fichier</p>
            <span className="upload-formats">{hint}</span>
          </div>
          <input type="file" ref={docInputRefs[key]} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleDocSelect(key, e.target.files[0]) }} onClick={e => e.stopPropagation()} />
        </div>
        {docPreviews[key] && (
          <div className="file-preview">
            <span className="file-icon">{checkIcon}</span>
            <span className="file-name">{docPreviews[key]}</span>
            <button type="button" className="file-remove" onClick={() => removeDoc(key)}>x</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Crop Modal */}
      <div className={`crop-overlay${showCrop ? ' active' : ''}`}>
        <div className="crop-modal">
          <h3>Recadre ta photo</h3>
          <p className="crop-hint">Deplace et zoome pour ajuster</p>
          <div className="crop-area" onMouseDown={handleCropMouseDown} onTouchStart={handleCropTouchStart}>
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

      {/* Delete Modal */}
      <div className={`delete-overlay${showDeleteModal ? ' active' : ''}`} onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
        <div className="delete-modal">
          <div className="delete-modal-icon">&#128465;&#65039;</div>
          <h3>Supprimer mon compte</h3>
          <p>Cette action est <strong>irreversible</strong>. Ecris <strong>SUPPRIMER</strong> pour confirmer.</p>
          <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="Ecris SUPPRIMER" autoComplete="off" />
          <div className="delete-modal-actions">
            <button className="btn-cancel-delete" onClick={() => setShowDeleteModal(false)}>Annuler</button>
            <button className={`btn-confirm-delete${deleteInput.trim() === 'SUPPRIMER' ? ' active' : ''}`} disabled={deleteInput.trim() !== 'SUPPRIMER'} onClick={supprimerCompte}>Supprimer definitivement</button>
          </div>
        </div>
      </div>

      <section className="page-inscription">
        <div className="inscription-container">
          {!showConfirmation && (
            <>
              <div className="inscription-header"><h1>{stepTitles[currentStep] || ''}</h1></div>
              <div className="step-indicator">Etape {currentStep} sur {totalSteps}</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} /></div>
              {error && <div className="error-message show">{error}</div>}
            </>
          )}

          {/* STEP 1 */}
          {currentStep === 1 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                <input type="file" ref={photoInputRef} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoSelect} />
                <div className="photo-upload">
                  <div className="photo-circle" onClick={() => photoInputRef.current?.click()}>
                    {photoPreviewUrl ? <img src={photoPreviewUrl} alt="Photo" /> : (
                      <div className="placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                    )}
                  </div>
                  <div className="photo-info"><div className="photo-title">Ta photo de profil</div><div className="photo-hint">Clique sur le cercle -- JPG, PNG (max 5 MB)</div></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Prenom <span className="required">*</span></label><input type="text" value={prenom} onChange={e => setPrenom(capitalizeWords(e.target.value))} placeholder="Prenom" /></div>
                  <div className="form-group"><label>Nom <span className="required">*</span></label><input type="text" value={nom} onChange={e => setNom(capitalizeWords(e.target.value))} placeholder="Nom" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date de naissance <span className="required">*</span></label><input type="text" value={dateNaissance} onChange={handleDateInput} placeholder="JJ/MM/AAAA" maxLength="10" autoComplete="off" inputMode="numeric" /></div>
                  <div className="form-group"><label>Sexe <span className="required">*</span></label>
                    <select value={sexe} onChange={e => setSexe(e.target.value)} className={!sexe ? 'placeholder' : ''}>
                      <option value="" disabled>Selectionner</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre</option><option value="non-precise">Non precise</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Telephone <span className="required">*</span></label><input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" /></div>
              </div>
              <div className="buttons-row single"><button className="btn-next" onClick={() => nextStep(1)}>Continuer</button></div>
              <div className="back-link"><a href="#" onClick={e => { e.preventDefault(); navigate(dashboardUrl) }}>Retour</a></div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && !showConfirmation && (
            <div className="step active">
              <div className="step-content" style={{ paddingTop: '10px' }}>
                <div className="form-group"><label>Ecole / Universite <span className="required">*</span></label>
                  <div className="school-search-wrapper">
                    <span className="school-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
                    <input type="text" value={ecole} onChange={e => { setEcole(e.target.value); const m = filterLocalSchools(e.target.value); setSchoolSuggestions(m.length > 0 ? m : ECOLES_POPULAIRES); setShowSchoolSuggestions(true) }}
                      onFocus={() => { setSchoolSuggestions(filterLocalSchools(ecole)); setShowSchoolSuggestions(true) }} onBlur={() => setTimeout(() => setShowSchoolSuggestions(false), 200)}
                      placeholder="Recherche ton ecole..." autoComplete="off" />
                    {showSchoolSuggestions && schoolSuggestions.length > 0 && <div className="school-suggestions show">{schoolSuggestions.map((s, i) => <div key={i} className="school-suggestion-item" onMouseDown={() => { setEcole(s.name + (s.city ? ' — ' + s.city : '')); setShowSchoolSuggestions(false) }}><strong>{s.name}</strong>{s.city && <small>{s.city}</small>}</div>)}</div>}
                  </div>
                </div>
                <div className="form-group"><label>Annee d'etudes <span className="required">*</span></label>
                  <div className="annee-search-wrapper">
                    <input type="text" value={anneeEtudes} onChange={e => { setAnneeEtudes(e.target.value); setAnneeSuggestions(filterAnnees(e.target.value)); setShowAnneeSuggestions(true) }}
                      onFocus={() => { setAnneeSuggestions(filterAnnees(anneeEtudes)); setShowAnneeSuggestions(true) }} onBlur={() => setTimeout(() => setShowAnneeSuggestions(false), 200)}
                      placeholder="ex: L3, M1..." autoComplete="off" />
                    {showAnneeSuggestions && anneeSuggestions.length > 0 && <div className="annee-suggestions show">{anneeSuggestions.map((a, i) => <div key={i} className="annee-suggestion-item" onMouseDown={() => { setAnneeEtudes(a.value); setShowAnneeSuggestions(false) }}>{a.label}</div>)}</div>}
                  </div>
                </div>
                <div className="form-group"><label>Filiere / Domaine <span className="required">*</span></label>
                  <div className="filiere-search-wrapper">
                    <input type="text" value={filiere} onChange={e => { setFiliere(e.target.value); setFiliereSuggestions(filterFilieres(e.target.value)); setShowFiliereSuggestions(true) }}
                      onFocus={() => { setFiliereSuggestions(filterFilieres(filiere)); setShowFiliereSuggestions(true) }} onBlur={() => setTimeout(() => setShowFiliereSuggestions(false), 200)}
                      placeholder="ex: Informatique, Commerce..." autoComplete="off" />
                    {showFiliereSuggestions && filiereSuggestions.length > 0 && <div className="filiere-suggestions show">{filiereSuggestions.map((f, i) => <div key={i} className="filiere-suggestion-item" onMouseDown={() => { setFiliere(f.value); setShowFiliereSuggestions(false) }}>{f.value}</div>)}</div>}
                  </div>
                </div>
              </div>
              <div className="buttons-row single"><button className="btn-next" onClick={() => nextStep(2)}>Continuer</button></div>
              <div className="back-link"><a href="#" onClick={e => { e.preventDefault(); setCurrentStep(1) }}>Retour</a></div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                <div className="form-group"><label>Type d'alternance</label>
                  <select value={typeAlternance} onChange={e => { setTypeAlternance(e.target.value); setMonRythme('') }} className={!typeAlternance ? 'placeholder' : ''}>
                    <option value="" disabled>Selectionner</option><option value="symmetric">Symetrique (meme duree)</option><option value="asymmetric">Asymetrique (durees differentes)</option><option value="custom">Personnalise</option>
                  </select>
                </div>
                {(typeAlternance === 'symmetric' || typeAlternance === 'asymmetric') && (
                  <div className="form-group"><label>Mon rythme</label>
                    <select value={monRythme} onChange={e => setMonRythme(e.target.value)} className={!monRythme ? 'placeholder' : ''}>
                      <option value="" disabled>Selectionner</option>
                      {getRythmeOptions().map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                )}
                {typeAlternance === 'custom' && (
                  <div className="form-group"><label>Decris ton rythme</label><input type="text" value={rythmeCustom} onChange={e => setRythmeCustom(e.target.value)} placeholder="Ex : 3 jours ecole / 2 jours entreprise" /></div>
                )}
                <div className="form-group"><label>Ville de ton ecole</label>
                  <div className="ville-wrapper">
                    <input type="text" value={villeEcole} onChange={e => { setVilleEcole(capitalizeWords(e.target.value)); setVilleEcoleSuggestions(filterVilles(e.target.value)); setShowVilleEcoleSugg(true) }}
                      onFocus={() => { setVilleEcoleSuggestions(filterVilles(villeEcole)); setShowVilleEcoleSugg(true) }} onBlur={() => setTimeout(() => setShowVilleEcoleSugg(false), 200)}
                      placeholder="Ex: Rennes, Nantes..." autoComplete="off" />
                    {showVilleEcoleSugg && villeEcoleSuggestions.length > 0 && <div className="ville-suggestions show">{villeEcoleSuggestions.map((v, i) => <div key={i} className="ville-suggestion" onMouseDown={() => { setVilleEcole(v); setShowVilleEcoleSugg(false) }}>{v}</div>)}</div>}
                  </div>
                </div>
                <div className="form-group"><label>Ville de ton entreprise</label>
                  <div className="ville-wrapper">
                    <input type="text" value={villeEntreprise} onChange={e => { setVilleEntreprise(capitalizeWords(e.target.value)); setVilleEntrepriseSuggestions(filterVilles(e.target.value)); setShowVilleEntrepriseSugg(true) }}
                      onFocus={() => { setVilleEntrepriseSuggestions(filterVilles(villeEntreprise)); setShowVilleEntrepriseSugg(true) }} onBlur={() => setTimeout(() => setShowVilleEntrepriseSugg(false), 200)}
                      placeholder="Ex: Nantes, Brest..." autoComplete="off" />
                    {showVilleEntrepriseSugg && villeEntrepriseSuggestions.length > 0 && <div className="ville-suggestions show">{villeEntrepriseSuggestions.map((v, i) => <div key={i} className="ville-suggestion" onMouseDown={() => { setVilleEntreprise(v); setShowVilleEntrepriseSugg(false) }}>{v}</div>)}</div>}
                  </div>
                </div>
              </div>
              <div className="buttons-row single"><button className="btn-next" onClick={() => nextStep(3)}>Continuer</button></div>
              <div className="back-link"><a href="#" onClick={e => { e.preventDefault(); setCurrentStep(2) }}>Retour</a></div>
            </div>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && !showConfirmation && (
            <div className="step active">
              <div className="step-content" style={{ paddingTop: '10px' }}>
                <div className="form-group"><label>A propos de toi</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Parle de toi, tes centres d'interets..." maxLength="300" rows="5" />
                  <p className="hint">Optionnel -- Max 300 caracteres</p>
                </div>
              </div>
              <div className="buttons-row single"><button className="btn-next" onClick={() => nextStep(4)}>Continuer</button></div>
              <div className="back-link"><a href="#" onClick={e => { e.preventDefault(); setCurrentStep(3) }}>Retour</a></div>
            </div>
          )}

          {/* STEP 5 */}
          {currentStep === 5 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                {renderDocUpload('pieceId', 'Piece d\'identite', 'Carte d\'identite / passeport — PDF, JPG, PNG', true)}
                {renderDocUpload('scolarite', 'Certificat de scolarite', 'Attestation d\'inscription — PDF, JPG, PNG', true)}
                {renderDocUpload('rib', 'RIB', 'Releve d\'identite bancaire -- PDF, JPG, PNG', false)}
                {identiteVerifiee && (
                  <div className="identity-verified-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Identite verifiee
                  </div>
                )}
              </div>
              <div className="buttons-row single"><button className="btn-next" onClick={() => nextStep(5)}>Continuer</button></div>
              <div className="back-link"><a href="#" onClick={e => { e.preventDefault(); setCurrentStep(4) }}>Retour</a></div>
            </div>
          )}

          {/* STEP 6 */}
          {currentStep === 6 && !showConfirmation && (
            <div className="step active">
              <div className="step-content">
                <div className="garant-section">
                  <div className="garant-title">Informations du garant</div>
                  <div className="garant-note">Un garant garantit le paiement de ton loyer. Les proprietaires peuvent en faire la demande.</div>
                  <div className="form-row">
                    <div className="form-group"><label>Prenom du garant <span className="required">*</span></label><input type="text" value={garantPrenom} onChange={e => setGarantPrenom(e.target.value)} placeholder="Prenom" /></div>
                    <div className="form-group"><label>Nom du garant <span className="required">*</span></label><input type="text" value={garantNom} onChange={e => setGarantNom(e.target.value)} placeholder="Nom" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Telephone du garant <span className="required">*</span></label><input type="tel" value={garantTelephone} onChange={e => setGarantTelephone(e.target.value)} placeholder="06 98 76 54 32" /></div>
                    <div className="form-group"><label>Email du garant <span className="required">*</span></label><input type="email" value={garantEmail} onChange={e => setGarantEmail(e.target.value)} placeholder="jean@email.com" /></div>
                  </div>
                </div>
              </div>
              <div className="buttons-row single"><button className={`btn-next${loading ? ' loading' : ''}`} onClick={enregistrerProfil} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button></div>
              <div className="back-link"><a href="#" onClick={e => { e.preventDefault(); setCurrentStep(5) }}>Retour</a></div>
            </div>
          )}

          {/* CONFIRMATION */}
          {showConfirmation && (
            <div className="confirmation-screen active">
              <div className="confirmation-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg></div>
              <div className="confirmation-title">Profil mis a jour !</div>
              <div className="confirmation-text">Tes modifications ont ete enregistrees.<br />Redirection vers ton espace...</div>
            </div>
          )}
        </div>
      </section>

      {/* Email prefs */}
      {!showConfirmation && (
        <div className="email-prefs-section">
          <div className="email-prefs-title">Preferences email</div>
          <div className="email-prefs-subtitle">Choisis les emails que tu souhaites recevoir.</div>
          {[
            { key: 'alertes', label: 'Alertes logement', desc: 'Nouveaux logements correspondant a tes criteres' },
            { key: 'messages', label: 'Messages', desc: 'Notification quand tu recois un message' },
            { key: 'candidatures', label: 'Candidatures', desc: 'Mises a jour sur tes candidatures' },
            { key: 'paiements', label: 'Paiements', desc: 'Recus et rappels de paiement' },
            { key: 'baux', label: 'Baux', desc: 'Fin de bail, renouvellement' },
            { key: 'marketing', label: 'Actualites STERNY', desc: 'Nouveautes et offres de la plateforme' },
          ].map(p => (
            <div className="pref-row" key={p.key}>
              <div><div className="pref-label">{p.label}</div><div className="pref-desc">{p.desc}</div></div>
              <label className="toggle-switch">
                <input type="checkbox" checked={prefs[p.key]} onChange={e => sauvegarderPrefsEmail({ ...prefs, [p.key]: e.target.checked })} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
          <div className={`prefs-saved${prefsSaved ? ' show' : ''}`}>Preferences sauvegardees</div>
        </div>
      )}

      {/* Password */}
      {!showConfirmation && (
        <div className="password-section">
          <div className="password-section-title">Changer mon mot de passe</div>
          <div className="password-section-text">Renseigne ton nouveau mot de passe (min. 6 caracteres).</div>
          <div className="password-form-group"><label htmlFor="newPassword">Nouveau mot de passe</label><input type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 caracteres" autoComplete="new-password" /></div>
          <div className="password-form-group"><label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label><input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Retape le mot de passe" autoComplete="new-password" /></div>
          <button className="btn-change-password" onClick={changerMotDePasse}>Modifier le mot de passe</button>
          {passwordMessage.text && <div className={`password-message ${passwordMessage.type}`}>{passwordMessage.text}</div>}
        </div>
      )}

      {/* Danger zone */}
      {!showConfirmation && (
        <div className="danger-zone">
          <div className="danger-zone-title">Zone danger</div>
          <div className="danger-zone-text">Supprimer ton compte est irreversible. Toutes tes donnees seront definitivement supprimees.</div>
          <button className="btn-delete-account" onClick={() => { setShowDeleteModal(true); setDeleteInput('') }}>Supprimer mon compte</button>
        </div>
      )}
    </>
  )
}
