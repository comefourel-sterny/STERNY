import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { validateAddress } from '../../utils/addressVerification'
import { deduireOffre } from '../../utils/deduireRecherche'
import PlancheCouverture from '../../components/rhythm/PlancheCouverture'
import { academicYearForMonday } from '../../utils/academicYear'
import Cropper from 'cropperjs'
import './ModifierAnnoncePage.css'

// ==========================================
// CONSTANTS
// ==========================================

const CODE_POSTAL_VILLE = {
  '35000': 'Rennes', '35200': 'Rennes', '35700': 'Rennes',
  '44000': 'Nantes', '44100': 'Nantes', '44200': 'Nantes', '44300': 'Nantes',
  '29200': 'Brest', '29000': 'Quimper', '56100': 'Lorient',
  '56000': 'Vannes', '35400': 'Saint-Malo', '22000': 'Saint-Brieuc',
  '35300': 'Fougères', '35500': 'Vitré'
}

const MOTS_INTERDITS = [
  'connard', 'connasse', 'enculé', 'enculer', 'putain', 'pute', 'salope', 'salaud',
  'merde', 'nique', 'niquer', 'ntm', 'fdp', 'tg', 'ta gueule', 'ferme ta gueule',
  'bâtard', 'batard', 'fils de pute', 'pd', 'tapette', 'gogol', 'débile', 'abruti',
  'crétin', 'ordure', 'pourriture', 'sous-merde', 'enfoiré',
  'sexe', 'escort', 'massage sensuel', 'plan cul', 'nude', 'onlyfans', 'webcam',
  'rencontre coquine', 'call girl', 'gigolo',
  'bitcoin', 'crypto', 'investissement garanti', 'gagner de l\'argent facilement',
  'cliquez ici', 'offre exceptionnelle', 'telegram', 'whatsapp.me',
  'cannabis', 'weed', 'drogue', 'dealer', 'shit', 'coke', 'cocaïne',
  'sale arabe', 'sale noir', 'sale blanc', 'sale juif', 'racaille', 'nègre'
]

const PATTERNS_SUSPECTS = [
  /https?:\/\/(?!sterny\.|localhost)/i,
  /t\.me\//i, /wa\.me\//i,
  /bit\.ly|tinyurl|shorturl/i,
  /\b\d{10}\b/,
  /(?:0|\+33)\s*[1-9](?:[\s.-]*\d{2}){4}/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /(.)\1{5,}/
]


const joursNoms = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function toLocalISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateForInput(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateDisplay(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function parseDate(dateStr) {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const day = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1
  const year = parseInt(parts[2])
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2020 || year > 2100) return null
  return new Date(year, month, day)
}

function capitalizeAddress(str) {
  const petitsMots = ['rue', 'avenue', 'av', 'boulevard', 'bd', 'blvd', 'place', 'allée', 'impasse', 'chemin', 'passage', 'cours', 'quai', 'route', 'de', 'du', 'la', 'le', 'les', 'des', 'au', 'aux', 'et', 'en']
  return str.replace(/\S+/g, function (mot, index) {
    if (/^[lLdD]'/.test(mot)) {
      return mot.charAt(0).toLowerCase() + "'" + mot.charAt(2).toUpperCase() + mot.slice(3).toLowerCase()
    }
    if (index === 0 && /^\d/.test(mot)) return mot
    if (index > 0 && petitsMots.includes(mot.toLowerCase())) return mot.toLowerCase()
    return mot.charAt(0).toUpperCase() + mot.slice(1).toLowerCase()
  })
}

function verifierContenuTexte(texte, nomChamp) {
  if (!texte || texte.trim().length === 0) return { valide: true, message: '' }
  const texteLower = texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const mot of MOTS_INTERDITS) {
    const motNormalise = mot.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (texteLower.includes(motNormalise)) {
      return { valide: false, message: `Le champ "${nomChamp}" contient du contenu inapproprié. Merci de rester respectueux et pertinent.` }
    }
  }
  for (const pattern of PATTERNS_SUSPECTS) {
    if (pattern.test(texte)) {
      return { valide: false, message: `Le champ "${nomChamp}" contient des éléments non autorisés (liens, numéros de téléphone ou emails). Les échanges de coordonnées se font via la messagerie STERNY.` }
    }
  }
  const lettres = texte.replace(/[^a-zA-ZÀ-ÿ]/g, '')
  if (lettres.length > 10) {
    const majuscules = lettres.replace(/[^A-ZÀ-Ý]/g, '').length
    if (majuscules / lettres.length > 0.7) {
      return { valide: false, message: `Le champ "${nomChamp}" contient trop de majuscules. Merci d'écrire normalement.` }
    }
  }
  return { valide: true, message: '' }
}

function formatEtage(numero) {
  if (!numero || numero === '') return null
  const num = parseInt(numero)
  if (isNaN(num)) return null
  if (num === 0) return 'Rez-de-chaussée'
  if (num === 1) return '1er étage'
  return num + 'ème étage'
}

// PDF date extraction helpers
function findDatesInText(text) {
  if (!text || text.length < 10) return null
  const moisMap = {
    'janvier': '01', 'janv': '01', 'fevrier': '02', 'février': '02', 'fev': '02', 'fév': '02',
    'mars': '03', 'avril': '04', 'avr': '04', 'mai': '05', 'juin': '06',
    'juillet': '07', 'juil': '07', 'aout': '08', 'août': '08',
    'septembre': '09', 'sept': '09', 'sep': '09', 'octobre': '10', 'oct': '10',
    'novembre': '11', 'nov': '11', 'decembre': '12', 'décembre': '12', 'dec': '12', 'déc': '12'
  }
  const tousLesMois = Object.keys(moisMap).join('|')
  const foundDates = []
  let match

  const dateRegex = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g
  while ((match = dateRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0')
    const month = match[2].padStart(2, '0')
    const year = match[3]
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31 && parseInt(year) >= 2024 && parseInt(year) <= 2030) {
      foundDates.push({ dateStr: `${day}/${month}/${year}`, position: match.index })
    }
  }

  const moisRegex = new RegExp('(\\d{1,2})(?:er|ER|ème|eme)?\\s*(' + tousLesMois + ')(?:\\.|\\s)\\s*(\\d{4})', 'gi')
  while ((match = moisRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0')
    const moisBrut = match[2].toLowerCase()
    const moisNormalise = moisBrut.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const month = moisMap[moisBrut] || moisMap[moisNormalise]
    const year = match[3]
    if (month && parseInt(year) >= 2024 && parseInt(year) <= 2030) {
      const dateStr = `${day}/${month}/${year}`
      if (!foundDates.some(d => d.dateStr === dateStr && Math.abs(d.position - match.index) < 5)) {
        foundDates.push({ dateStr, position: match.index })
      }
    }
  }

  if (foundDates.length === 0) return null

  const textLower = text.toLowerCase()
  let startDate = null
  let endDate = null

  const datePattern = '\\d{1,2}(?:er)?\\s*(?:' + tousLesMois + ')\\s*\\d{4}|\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{4}'
  const regexDebut = new RegExp("(?:prise d'effet|prend effet|date de d[ée]but|[àa] compter|commence|[àa] partir du|entr[ée]e en jouissance)[^\\d]{0,50}(" + datePattern + ")", "gi")
  const regexFin = new RegExp("(?:fin de bail|fin du bail|date de fin|jusqu'au|expire|terme du bail|[ée]ch[ée]ance|prendra fin)[^\\d]{0,50}(" + datePattern + ")", "gi")

  function normalizeFoundDate(raw) {
    const numMatch = raw.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
    if (numMatch) return numMatch[1].padStart(2, '0') + '/' + numMatch[2].padStart(2, '0') + '/' + numMatch[3]
    const moisMatch = raw.match(new RegExp('(\\d{1,2})(?:er)?\\s*(' + tousLesMois + ')\\s*(\\d{4})', 'i'))
    if (moisMatch) {
      const d = moisMatch[1].padStart(2, '0')
      const mb = moisMatch[2].toLowerCase()
      const mn = mb.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const mo = moisMap[mb] || moisMap[mn]
      if (mo) return d + '/' + mo + '/' + moisMatch[3]
    }
    return null
  }

  let m = regexDebut.exec(textLower)
  if (m) { const n = normalizeFoundDate(m[1]); if (n) startDate = n }
  m = regexFin.exec(textLower)
  if (m) { const n = normalizeFoundDate(m[1]); if (n) endDate = n }

  if (!startDate) {
    const sorted = [...foundDates].sort((a, b) => {
      const [dA, mA, yA] = a.dateStr.split('/').map(Number)
      const [dB, mB, yB] = b.dateStr.split('/').map(Number)
      return new Date(yA, mA - 1, dA) - new Date(yB, mB - 1, dB)
    })
    startDate = sorted[0].dateStr
    if (sorted.length >= 2 && !endDate) endDate = sorted[sorted.length - 1].dateStr
  }

  const result = { startDate }
  if (endDate && endDate !== startDate) result.endDate = endDate
  return result
}

function findPricingInText(text) {
  if (!text || text.length < 50) return null
  const textLower = text.toLowerCase().replace(/\s+/g, ' ')
  const result = {}

  const loyerPatterns = [
    /(?:loyer\s+mensuel|loyer\s+de\s+base|montant\s+du\s+loyer|loyer\s+principal|loyer\s+hors\s+charges?)[^€\d]{0,80}?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?)/gi,
    /loyer[^€\d]{0,40}?(?:fix[ée]e?\s+[àa]\s+)?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?)/gi
  ]
  for (const pattern of loyerPatterns) {
    const match = pattern.exec(textLower)
    if (match) {
      const val = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
      if (val >= 100 && val <= 5000) { result.loyer = val; break }
    }
  }

  const chargesPatterns = [
    /(?:charges?\s+locatives?|provisions?\s+(?:sur|pour)\s+charges?|charges?\s+forfaitaires?)[^€\d]{0,80}?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?)/gi,
  ]
  for (const pattern of chargesPatterns) {
    const match = pattern.exec(textLower)
    if (match) {
      const val = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
      if (val >= 10 && val <= 1000) { result.charges = val; break }
    }
  }

  const cautionPatterns = [
    /(?:d[ée]p[oô]t\s+de\s+garantie|caution|garantie\s+locative)[^€\d]{0,80}?(\d[\d\s,.]*\d|\d+)\s*(?:€|euros?)/gi,
  ]
  for (const pattern of cautionPatterns) {
    const match = pattern.exec(textLower)
    if (match) {
      const val = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
      if (val >= 50 && val <= 10000) { result.caution = val; break }
    }
  }

  if (/charges?\s+forfaitaires?|forfait\s+(?:de\s+)?charges?|charges?\s+incluses?|tout\s+compris/i.test(text)) result.chargeMode = 'forfaitaire'
  else if (/charges?\s+(?:au\s+)?r[ée]el/i.test(text)) result.chargeMode = 'separe'
  else if (/provisions?\s+(?:sur|pour)\s+charges?/i.test(text)) result.chargeMode = 'plafond'

  if (!result.loyer && !result.charges && !result.caution) return null
  return result
}

function verifierDocumentBail(texte) {
  if (!texte || texte.length < 50) return { isBail: false, confidence: 0 }
  const texteLower = texte.toLowerCase()
  const motsClesBail = ['bail', 'contrat de location', 'bailleur', 'preneur', 'locataire', 'loyer', 'charges locatives', 'dépôt de garantie', "prise d'effet", 'état des lieux', 'logement', 'habitation', 'préavis', 'congé', 'caution', 'garant', 'surface habitable', 'dpe', 'quittance']
  const motsExclusion = ['facture n°', 'montant ttc', 'tva', 'bulletin de salaire', 'bulletin de paie', 'urssaf', 'relevé de compte', 'ordonnance', "carte d'identité", 'passeport n°']
  let scoreBail = 0, scoreExclusion = 0
  motsClesBail.forEach(mot => { if (texteLower.includes(mot)) scoreBail++ })
  motsExclusion.forEach(mot => { if (texteLower.includes(mot)) scoreExclusion++ })
  return { isBail: scoreBail >= 3 && scoreExclusion < 2, confidence: Math.min(100, Math.round((scoreBail / 5) * 100)), scoreBail, scoreExclusion }
}

// ==========================================
// COMPONENT
// ==========================================

export default function ModifierAnnoncePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  // --- Annonce ID ---
  const annonceIdRef = useRef(null)
  const existingPhotoUrlsRef = useRef([])

  // --- Core state ---
  const [currentStep, setCurrentStep] = useState(1)
  const [userType, setUserType] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // --- Lot 6a — Profil de l'hôte-auteur (chargé au montage, consommé par la dérivation dispo) ---
  // Miroir de CreerAnnoncePage : deduireOffre renvoie [{ ville, nature, semaines }] par pôle hôte.
  const [hostProfile, setHostProfile] = useState(null)
  const offreHote = useMemo(() => (hostProfile ? deduireOffre(hostProfile) : []), [hostProfile])
  const natureLogement = offreHote.length === 1 ? offreHote[0].nature : null
  const semainesLibres = offreHote.length === 1 ? offreHote[0].semaines : []
  // [6a] Trace temporaire (retirée au nettoyage final).
  useEffect(() => {
    if (hostProfile) console.log('[6a] nature:', natureLogement, '| semaines libres:', semainesLibres.length)
  }, [hostProfile, natureLogement, semainesLibres])

  const [showMainForm, setShowMainForm] = useState(false)
  const [loading, setLoading] = useState(true)

  // --- Step 1: Basic info ---
  const [type, setType] = useState('')
  const [surface, setSurface] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [codePostalOriginal, setCodePostalOriginal] = useState('')
  const [adresse, setAdresse] = useState('')
  const [villeDetectee, setVilleDetectee] = useState(null)
  const [codePostalCheckmarkVisible, setCodePostalCheckmarkVisible] = useState(false)
  const [villeMessage, setVilleMessage] = useState({ text: '', className: 'ville-detectee' })
  const [addressVerified, setAddressVerified] = useState(false)
  const [verifiedCoordinates, setVerifiedCoordinates] = useState(null)
  const [adresseCheckmarkVisible, setAdresseCheckmarkVisible] = useState(false)
  const [addressValidationMsg, setAddressValidationMsg] = useState({ text: '', severity: '', show: false })

  // --- Step 2: Details ---
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [etage, setEtage] = useState('')
  const [pieces, setPieces] = useState('')
  const [dpe, setDpe] = useState('')
  const [equipements, setEquipements] = useState({ wifi: false, meuble: false, parking: false, cuisine: false, balcon: false, autre: false })
  const [autreEquipementTexte, setAutreEquipementTexte] = useState('')
  const [reglesLogement, setReglesLogement] = useState('')

  // --- Step 3: Photos ---
  const [uploadedPhotos, setUploadedPhotos] = useState([])
  const [showCropModal, setShowCropModal] = useState(false)
  const cropImageRef = useRef(null)
  const cropperRef = useRef(null)
  const pendingFilesRef = useRef([])
  const currentFileIndexRef = useRef(0)
  const photoInputRef = useRef(null)

  // --- Step 4: Bail & Calendar ---
  const [bailStartDate, setBailStartDate] = useState('')
  const [bailEndDate, setBailEndDate] = useState('')
  const [bailDuree, setBailDuree] = useState('')
  const [selectedDates, setSelectedDates] = useState([])
  const [showEditCalendar, setShowEditCalendar] = useState(false)

  // --- Lot 6b — Planche-semaines cliquable (calendrier unique, charte invariant 4/7) ---
  // Union : semaines libres de l'hôte + semaines déjà proposées dans l'annonce (orphelines incluses),
  // pour que toute semaine cochée reste cliquable-pour-retirer même si le rythme a changé depuis la création.
  const etatsDispoAnnonce = useMemo(() => {
    const map = {}
    const union = new Set([...semainesLibres, ...selectedDates])
    for (const lundi of union) {
      map[lundi] = { nature: natureLogement, cherchee: true, couvert: false, proposee: selectedDates.includes(lundi) }
    }
    return map
  }, [semainesLibres, selectedDates, natureLogement])
  const anneeDispoInitiale = (semainesLibres[0] || selectedDates[0]) ? academicYearForMonday(semainesLibres[0] || [...selectedDates].sort()[0]) : undefined
  const toggleSemaineDispo = useCallback((weekStart) =>
    setSelectedDates(prev => prev.includes(weekStart) ? prev.filter(d => d !== weekStart) : [...prev, weekStart].sort()), [])
  // Réinitialiser = revenir à l'état d'ouverture de l'annonce (les semaines enregistrées), PAS le défaut rythme.
  const ouvertureDispoRef = useRef(null)
  const reinitialiserDispo = useCallback(() => {
    if (ouvertureDispoRef.current) setSelectedDates([...ouvertureDispoRef.current])
  }, [])

  // --- Bail file ---
  const [bailFileData, setBailFileData] = useState(null)
  const [bailFileName, setBailFileName] = useState('')
  const [bailFileStatus, setBailFileStatus] = useState('')
  const [showBailFileResult, setShowBailFileResult] = useState(false)
  const [showBailUploadZone, setShowBailUploadZone] = useState(true)
  const [showBailSeparator, setShowBailSeparator] = useState(true)
  const [showBailLoader, setShowBailLoader] = useState(false)
  const [bailDatesAutoExtracted, setBailDatesAutoExtracted] = useState(false)

  // --- Step 5: Price ---
  const [chargeMode, setChargeMode] = useState('forfaitaire')
  const [prixForfaitaire, setPrixForfaitaire] = useState('')
  const [caution, setCaution] = useState('')
  const [prixBasePlafond, setPrixBasePlafond] = useState('')
  const [chargesMoyennes, setChargesMoyennes] = useState('')
  const [consoElec, setConsoElec] = useState('')
  const [consoEau, setConsoEau] = useState('')
  const [cautionPlafond, setCautionPlafond] = useState('')
  const [prixBaseSepare, setPrixBaseSepare] = useState('')
  const [cautionSepare, setCautionSepare] = useState('')
  const [chargesTypes, setChargesTypes] = useState({ eau: true, electricite: true, internet: true, chauffage: false })
  const [showPricingBanner, setShowPricingBanner] = useState(false)

  // --- Modals & notifications ---
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'success' })
  const [errors, setErrors] = useState({})
  const [publishing, setPublishing] = useState(false)
  const [publishBtnText, setPublishBtnText] = useState('Enregistrer les modifications')

  // --- COCO-SSD model ---
  const cocoModelRef = useRef(null)

  // ==========================================
  // INITIALIZATION
  // ==========================================

  useEffect(() => {
    loadCocoModel()
  }, [])

  useEffect(() => {
    if (!user) return
    checkUserAndLoadAnnonce()
  }, [user?.id])

  async function checkUserAndLoadAnnonce() {
    try {
      const { data: userData } = await supabaseClient.from('users').select('type_user, is_admin, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise, rhythm_calendar').eq('id', user.id).single()
      setIsAdmin(userData?.is_admin === true)
      setHostProfile(userData)
      console.log('[6a] hostProfile chargé', userData)

      const annonceId = searchParams.get('id')
      if (!annonceId) {
        showNotificationFn('Erreur', 'Aucune annonce à modifier', 'error')
        setTimeout(() => navigate('/dashboard/proprietaire'), 2000)
        return
      }

      annonceIdRef.current = annonceId
      await chargerAnnonceExistante(user.id, annonceId)
    } catch (error) {
      console.error('Erreur checkUserAndLoadAnnonce:', error)
      navigate('/dashboard/proprietaire')
    }
  }

  async function chargerAnnonceExistante(userId, id) {
    try {
      const { data: annonce, error } = await supabaseClient
        .from('annonces')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error || !annonce) {
        showNotificationFn('Erreur', 'Annonce introuvable', 'error')
        setTimeout(() => navigate('/dashboard/proprietaire'), 2000)
        return
      }

      // Charte conv 86 : l'auteur d'une annonce est TOUJOURS l'alternant-hôte.
      // userType='locataire' = l'hôte (nommage hérité ; renommage→'hote' différé DETTE #6).
      const detectedType = 'locataire'
      setUserType(detectedType)
      setShowMainForm(true)
      setLoading(false)

      setTimeout(() => {
        prefillForm(annonce, detectedType)
      }, 100)
    } catch (err) {
      console.error('Erreur chargement annonce:', err)
      showNotificationFn('Erreur', 'Impossible de charger l\'annonce', 'error')
    }
  }

  async function prefillForm(annonce, detectedType) {
    // --- STEP 1: Basic info ---
    if (annonce.type_logement) setType(annonce.type_logement)
    if (annonce.surface) setSurface(String(annonce.surface))

    if (annonce.adresse) {
      const parts = annonce.adresse.split(',')
      if (parts.length >= 2) {
        const cp = parts[parts.length - 1].trim().match(/\d{5}/)
        if (cp) {
          setCodePostalOriginal(cp[0])
          detecterVille(cp[0])
        }
        setAdresse(parts.slice(0, -1).join(',').trim())
      } else {
        setAdresse(annonce.adresse)
      }
    }
    if (annonce.ville) {
      setVilleDetectee(annonce.ville)
    }
    if (annonce.adresse_verifiee) {
      setAddressVerified(true)
      if (annonce.longitude && annonce.latitude) {
        setVerifiedCoordinates([annonce.longitude, annonce.latitude])
      }
      setAdresseCheckmarkVisible(true)
    }

    // --- STEP 2: Details ---
    if (annonce.titre) setTitre(annonce.titre)
    if (annonce.description) setDescription(annonce.description)
    if (annonce.etage) {
      const etageMatch = annonce.etage.match(/\d+/)
      if (etageMatch) {
        setEtage(String(parseInt(etageMatch[0])))
      } else if (annonce.etage === 'Rez-de-chaussée') {
        setEtage('0')
      }
    }

    if (annonce.equipements && Array.isArray(annonce.equipements)) {
      const newEquips = { wifi: false, meuble: false, parking: false, cuisine: false, balcon: false, autre: false }
      const equipMap = { 'WiFi': 'wifi', 'Meublé': 'meuble', 'Parking': 'parking', 'Cuisine équipée': 'cuisine', 'Balcon/Terrasse': 'balcon' }
      annonce.equipements.forEach(equip => {
        if (equip.startsWith('Autre:')) {
          newEquips.autre = true
          setAutreEquipementTexte(equip.replace('Autre: ', ''))
        } else if (equipMap[equip]) {
          newEquips[equipMap[equip]] = true
        }
      })
      setEquipements(newEquips)
    }

    if (annonce.regles && annonce.regles.length > 0) {
      setReglesLogement(annonce.regles.join('\n'))
    }

    // --- STEP 3: Photos ---
    if (annonce.photos && annonce.photos.length > 0) {
      existingPhotoUrlsRef.current = [...annonce.photos]
      const loadedPhotos = []
      for (let i = 0; i < annonce.photos.length; i++) {
        const url = annonce.photos[i]
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(blob)
          })
          loadedPhotos.push({
            file: blob,
            dataUrl: dataUrl,
            id: Date.now() + Math.random(),
            existingUrl: url
          })
        } catch (err) {
          console.warn('Impossible de charger la photo', i, ':', err)
        }
      }
      setUploadedPhotos(loadedPhotos)
    }

    // --- STEP 4: Bail & Calendar ---
    if (annonce.bail_info) {
      const bail = annonce.bail_info
      if (bail.date_debut) {
        const [y, m, d] = bail.date_debut.split('-')
        setBailStartDate(`${d}/${m}/${y}`)
      }
      if (bail.date_fin) {
        const [y, m, d] = bail.date_fin.split('-')
        setBailEndDate(`${d}/${m}/${y}`)
      }
      if (bail.duree_mois) {
        setBailDuree(String(bail.duree_mois))
      }
    }

    if (annonce.disponibilites_pattern && Array.isArray(annonce.disponibilites_pattern)) {
      const dates = [...annonce.disponibilites_pattern].sort()
      setSelectedDates(dates)
      ouvertureDispoRef.current = dates
      setShowEditCalendar(true)
    }

    // --- STEP 5: Price & Charges ---
    if (annonce.charges_info) {
      const charges = annonce.charges_info
      const mode = charges.mode === 'forfait_regularisation' ? 'plafond' : (charges.mode || 'forfaitaire')
      setChargeMode(mode)

      if (mode === 'forfaitaire') {
        if (charges.prix_total_hote) setPrixForfaitaire(String(charges.prix_total_hote))
        if (charges.caution) setCaution(String(charges.caution))
      } else if (mode === 'plafond') {
        if (charges.loyer_base) setPrixBasePlafond(String(charges.loyer_base))
        if (charges.forfait_charges) setChargesMoyennes(String(charges.forfait_charges))
        if (charges.conso_normale_elec_kwh) setConsoElec(String(charges.conso_normale_elec_kwh))
        if (charges.conso_normale_eau_m3) setConsoEau(String(charges.conso_normale_eau_m3))
        if (charges.caution) setCautionPlafond(String(charges.caution))
      } else if (mode === 'separe') {
        if (charges.loyer_base) setPrixBaseSepare(String(charges.loyer_base))
        if (charges.caution) setCautionSepare(String(charges.caution))
        if (charges.charges_types && Array.isArray(charges.charges_types)) {
          const newTypes = { eau: false, electricite: false, internet: false, chauffage: false }
          charges.charges_types.forEach(t => { if (newTypes.hasOwnProperty(t)) newTypes[t] = true })
          setChargesTypes(newTypes)
        }
      }
    }
  }

  // ==========================================
  // NOTIFICATION SYSTEM
  // ==========================================

  function showNotificationFn(title, message, type = 'success') {
    setNotification({ show: true, title, message, type })
  }

  function closeNotificationFn() {
    setNotification(prev => ({ ...prev, show: false }))
  }

  // ==========================================
  // ADDRESS DETECTION
  // ==========================================

  function detecterVille(cp) {
    const chiffresSeuls = cp.replace(/[^0-9]/g, '')
    if (!chiffresSeuls || chiffresSeuls.length !== 5) {
      setVilleMessage({ text: '', className: 'ville-detectee' })
      setCodePostalCheckmarkVisible(false)
      setVilleDetectee(null)
      setCodePostalOriginal(chiffresSeuls)
      return
    }
    const ville = CODE_POSTAL_VILLE[chiffresSeuls]
    if (ville) {
      setCodePostal(`${chiffresSeuls} - ${ville}`)
      setCodePostalCheckmarkVisible(true)
      setVilleMessage({ text: '', className: 'ville-detectee' })
      setVilleDetectee(ville)
      setCodePostalOriginal(chiffresSeuls)
    } else {
      setCodePostal(chiffresSeuls)
      setCodePostalCheckmarkVisible(false)
      setVilleMessage({ text: 'STERNY arrive bientôt dans ta région !', className: 'ville-detectee warning show' })
      setVilleDetectee(null)
      setCodePostalOriginal(chiffresSeuls)
    }
  }

  function handleCodePostalFocus() {
    if (villeDetectee && codePostalOriginal) {
      setCodePostal(codePostalOriginal)
      setCodePostalCheckmarkVisible(false)
    }
  }

  function handleCodePostalBlur() {
    const chiffresSeuls = codePostal.replace(/[^0-9]/g, '')
    if (chiffresSeuls.length === 5 && CODE_POSTAL_VILLE[chiffresSeuls]) {
      setCodePostal(`${chiffresSeuls} - ${CODE_POSTAL_VILLE[chiffresSeuls]}`)
      setCodePostalCheckmarkVisible(true)
    }
    autoVerifyAddress()
  }

  async function autoVerifyAddress() {
    const addr = adresse.trim()
    setAddressVerified(false)
    setVerifiedCoordinates(null)
    setAdresseCheckmarkVisible(false)

    if (!addr || !codePostalOriginal || !villeDetectee) {
      setAddressValidationMsg({ text: '', severity: '', show: false })
      return
    }
    if (codePostalOriginal.length !== 5 || !/^\d+$/.test(codePostalOriginal)) {
      setAddressValidationMsg({ text: 'Le code postal doit contenir 5 chiffres', severity: 'error', show: true })
      return
    }
    setAddressValidationMsg({ text: '', severity: '', show: false })

    try {
      const fullAddress = `${addr}, ${codePostalOriginal}, ${villeDetectee}, France`
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
      const response = await fetch(url)
      const data = await response.json()

      if (!data.features || data.features.length === 0) {
        setAddressValidationMsg({ text: 'Adresse non trouvée dans la base nationale', severity: 'error', show: true })
        return
      }

      const result = data.features[0]
      const score = result.properties.score

      if (score < 0.5) {
        setAddressValidationMsg({ text: 'Adresse introuvable ou imprécise', severity: 'error', show: true })
      } else if (score < 0.7) {
        setAddressVerified(true)
        setVerifiedCoordinates(result.geometry.coordinates)
        setAdresseCheckmarkVisible(true)
        setAddressValidationMsg({ text: 'Adresse trouvée mais peu précise. Vérifie l\'orthographe.', severity: 'warning', show: true })
      } else {
        setAddressVerified(true)
        setVerifiedCoordinates(result.geometry.coordinates)
        setAdresseCheckmarkVisible(true)
        setAddressValidationMsg({ text: '', severity: '', show: false })
      }
    } catch (error) {
      console.error('Erreur:', error)
      setAddressValidationMsg({ text: 'Impossible de vérifier l\'adresse', severity: 'warning', show: true })
    }
  }

  // ==========================================
  // PHOTO MANAGEMENT
  // ==========================================

  async function loadCocoModel() {
    if (cocoModelRef.current) return cocoModelRef.current
    try {
      const tf = await import('@tensorflow/tfjs')
      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      cocoModelRef.current = await cocoSsd.load({ base: 'mobilenet_v2' })
      return cocoModelRef.current
    } catch (e) {
      console.error('Erreur chargement modele IA:', e)
      return null
    }
  }

  async function detectPersonInImage(imgElement) {
    const model = await loadCocoModel()
    if (!model) return { isPerson: false, reason: 'model_unavailable' }
    try {
      const detectCanvas = document.createElement('canvas')
      const maxDim = 640
      let w = imgElement.naturalWidth || imgElement.width
      let h = imgElement.naturalHeight || imgElement.height
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      detectCanvas.width = w
      detectCanvas.height = h
      const ctx = detectCanvas.getContext('2d')
      ctx.drawImage(imgElement, 0, 0, w, h)
      const predictions = await model.detect(detectCanvas, 20, 0.25)
      const personDetections = predictions.filter(p => p.class === 'person' && p.score > 0.30)
      if (personDetections.length > 0) {
        return { isPerson: true, count: personDetections.length, maxScore: Math.max(...personDetections.map(p => p.score)) }
      }
      return { isPerson: false }
    } catch (e) {
      console.error('Erreur detection IA:', e)
      return { isPerson: false, reason: 'detection_error' }
    }
  }

  function verifyPhoto(file) {
    return new Promise(async (resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const img = new Image()
        img.onload = async () => {
          if (img.width < 300 || img.height < 200) {
            resolve({ valid: false, reason: 'Image trop petite. Minimum 300x200 pixels requis.' })
            return
          }
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const sampleSize = 100
          canvas.width = sampleSize
          canvas.height = sampleSize
          ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
          const pixels = imageData.data
          const totalPixels = sampleSize * sampleSize
          let uniformPixels = 0, darkPixels = 0
          const firstR = pixels[0], firstG = pixels[1], firstB = pixels[2]
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
            if (Math.abs(r - firstR) < 8 && Math.abs(g - firstG) < 8 && Math.abs(b - firstB) < 8) uniformPixels++
            if (r < 20 && g < 20 && b < 20) darkPixels++
          }
          if (uniformPixels / totalPixels > 0.90) { resolve({ valid: false, reason: 'Cette image semble être une couleur unie.' }); return }
          if (darkPixels / totalPixels > 0.80) { resolve({ valid: false, reason: 'Cette image est trop sombre.' }); return }

          try {
            const detection = await detectPersonInImage(img)
            if (detection.isPerson) {
              const msg = detection.count === 1
                ? `Une personne a été détectée sur cette photo. Seules les photos de logement sont autorisées.`
                : `${detection.count} personnes ont été détectées sur cette photo. Seules les photos de logement sont autorisées.`
              resolve({ valid: false, reason: msg })
              return
            }
          } catch (detectError) { console.error('Detection IA erreur:', detectError) }

          resolve({ valid: true })
        }
        img.onerror = () => resolve({ valid: false, reason: 'Impossible de lire cette image.' })
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handlePhotoUpload(event) {
    const files = Array.from(event.target.files)
    if (uploadedPhotos.length + files.length > 10) {
      showNotificationFn('Limite atteinte', 'Maximum 10 photos autorisées', 'warning')
      event.target.value = ''
      return
    }
    const validFiles = []
    for (const file of files) {
      if (!file.type.match('image/(jpeg|png|webp)')) {
        showNotificationFn('Format non supporté', `${file.name} n'est pas un format supporté`, 'warning')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        showNotificationFn('Fichier trop volumineux', `${file.name} est trop volumineux (max 5 MB)`, 'warning')
        continue
      }
      const verification = await verifyPhoto(file)
      if (!verification.valid) {
        showNotificationFn('Photo non conforme', verification.reason, 'warning')
        continue
      }
      validFiles.push(file)
    }
    if (validFiles.length > 0) {
      pendingFilesRef.current = validFiles
      currentFileIndexRef.current = 0
      openCropModal(validFiles[0])
    }
    event.target.value = ''
  }

  function openCropModal(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      setShowCropModal(true)
      setTimeout(() => {
        const image = cropImageRef.current
        if (!image) return
        image.src = e.target.result
        if (cropperRef.current) cropperRef.current.destroy()
        cropperRef.current = new Cropper(image, {
          aspectRatio: 4 / 3,
          viewMode: 3,
          dragMode: 'move',
          autoCropArea: 1,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
          background: false,
          modal: false,
          checkOrientation: true,
          ready() { this.cropper.reset(); this.cropper.center() }
        })
      }, 100)
    }
    reader.readAsDataURL(file)
  }

  function closeCropModal() {
    setShowCropModal(false)
    if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null }
    pendingFilesRef.current = []
    currentFileIndexRef.current = 0
  }

  function confirmCrop() {
    if (!cropperRef.current) return
    cropperRef.current.getCroppedCanvas({ width: 1200, height: 900, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' }).toBlob((blob) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedPhotos(prev => [...prev, { file: blob, dataUrl: e.target.result, id: Date.now() + Math.random() }])
        currentFileIndexRef.current++
        if (currentFileIndexRef.current < pendingFilesRef.current.length) {
          openCropModal(pendingFilesRef.current[currentFileIndexRef.current])
        } else {
          closeCropModal()
        }
      }
      reader.readAsDataURL(blob)
    }, 'image/jpeg', 0.95)
  }

  function deletePhoto(index) {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index))
  }

  function previewPhoto(index) {
    if (index === 0) return
    setUploadedPhotos(prev => {
      const newPhotos = [...prev]
      const clicked = newPhotos[index]
      newPhotos[index] = newPhotos[0]
      newPhotos[0] = clicked
      return newPhotos
    })
  }

  const draggedPhotoIndexRef = useRef(null)

  function handleDragStart(e, index) {
    draggedPhotoIndexRef.current = index
    e.currentTarget.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add('drag-over')
  }

  function handleDrop(e, targetIndex) {
    e.preventDefault()
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
    if (draggedPhotoIndexRef.current !== null && draggedPhotoIndexRef.current !== targetIndex) {
      setUploadedPhotos(prev => {
        const newPhotos = [...prev]
        const dragged = newPhotos[draggedPhotoIndexRef.current]
        newPhotos.splice(draggedPhotoIndexRef.current, 1)
        newPhotos.splice(targetIndex, 0, dragged)
        return newPhotos
      })
    }
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging')
    document.querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over'))
    draggedPhotoIndexRef.current = null
  }

  // ==========================================
  // BAIL MANAGEMENT
  // ==========================================

  async function handleBailUpload(file) {
    if (!file) return
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!validTypes.includes(file.type)) { showNotificationFn('Format non supporté', 'Formats acceptés : PDF, JPG, PNG', 'warning'); return }
    if (file.size > 10 * 1024 * 1024) { showNotificationFn('Fichier trop volumineux', 'Le bail doit faire moins de 10 Mo', 'warning'); return }

    setBailFileData(file)
    setShowBailLoader(true)
    setShowBailFileResult(false)
    setShowBailUploadZone(false)
    setShowBailSeparator(false)

    try {
      let extractedDates = null
      if (file.type === 'application/pdf') {
        extractedDates = await extractDatesFromPDF(file)
      }
      setShowBailLoader(false)
      setBailFileName(file.name)

      if (extractedDates && extractedDates.notBail) {
        setShowBailUploadZone(true)
        setShowBailSeparator(true)
        setBailFileData(null)
        showNotificationFn('Document non reconnu', 'Ce document ne semble pas être un bail de location.', 'warning')
        return
      }

      setShowBailFileResult(true)

      if (extractedDates && extractedDates.startDate) {
        setBailFileStatus('Document enregistré - dates détectées automatiquement')
        setBailStartDate(extractedDates.startDate)
        if (extractedDates.endDate) {
          setBailEndDate(extractedDates.endDate)
          const start = parseDate(extractedDates.startDate)
          const end = parseDate(extractedDates.endDate)
          if (start && end) {
            const diffMonths = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44))
            const closestOption = [3, 6, 9, 10, 12, 24].reduce((prev, curr) => Math.abs(curr - diffMonths) < Math.abs(prev - diffMonths) ? curr : prev)
            setBailDuree(String(closestOption))
          }
        }
        setBailDatesAutoExtracted(true)
        if (extractedDates.pricing) {
          prefillPricingFromBail(extractedDates.pricing)
          setShowPricingBanner(true)
        }
      } else {
        setBailFileStatus('Document enregistré - remplis les dates manuellement')
        showNotificationFn('Bail enregistré', 'Remplis les dates manuellement.', 'success')
        if (extractedDates && extractedDates.pricing) {
          prefillPricingFromBail(extractedDates.pricing)
          setShowPricingBanner(true)
        }
      }
    } catch (error) {
      console.error('Erreur analyse bail:', error)
      setShowBailLoader(false)
      setShowBailFileResult(true)
      setBailFileName(file.name)
      setBailFileStatus('Document enregistré - remplis les dates manuellement')
    }
  }

  async function extractDatesFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer()
    try {
      const pdfjsModule = await import('pdfjs-dist/build/pdf.mjs')
      const pdfjsLib = pdfjsModule
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        fullText += textContent.items.map(item => item.str).join(' ') + '\n'
      }
      const verification = verifierDocumentBail(fullText)
      if (!verification.isBail) return { notBail: true }
      const dates = findDatesInText(fullText)
      const pricing = findPricingInText(fullText)
      if (dates) { dates.pricing = pricing; return dates }
      return pricing ? { pricing } : null
    } catch (e) {
      console.error('Erreur pdf.js:', e)
      return null
    }
  }

  function removeBailFile() {
    setBailFileData(null)
    setShowBailFileResult(false)
    setShowBailUploadZone(true)
    setShowBailSeparator(true)
    setBailStartDate('')
    setBailEndDate('')
    setBailDuree('')
    setShowPricingBanner(false)
  }

  function prefillPricingFromBail(pricing) {
    if (!pricing) return
    let modeChoisi = pricing.chargeMode || 'forfaitaire'
    if (pricing.loyer && pricing.charges) {
      if (modeChoisi === 'forfaitaire') setPrixForfaitaire(String(pricing.loyer + pricing.charges))
      else if (modeChoisi === 'plafond') { setPrixBasePlafond(String(pricing.loyer)); setChargesMoyennes(String(pricing.charges)) }
      else if (modeChoisi === 'separe') setPrixBaseSepare(String(pricing.loyer))
    } else if (pricing.loyer) {
      if (modeChoisi === 'forfaitaire') setPrixForfaitaire(String(pricing.loyer))
      else if (modeChoisi === 'plafond') setPrixBasePlafond(String(pricing.loyer))
      else if (modeChoisi === 'separe') setPrixBaseSepare(String(pricing.loyer))
    }
    if (pricing.caution) {
      if (modeChoisi === 'forfaitaire') setCaution(String(pricing.caution))
      else if (modeChoisi === 'plafond') setCautionPlafond(String(pricing.caution))
      else if (modeChoisi === 'separe') setCautionSepare(String(pricing.caution))
    }
    setChargeMode(modeChoisi)
  }

  // ==========================================
  // CALENDAR
  // ==========================================

  function getSelectedWeeksCount() {
    return Math.ceil(selectedDates.length / 7)
  }

  function clearAllDates() {
    if (confirm('Effacer toutes les dates sélectionnées ?')) {
      setSelectedDates([])
    }
  }

  function handleBailEndDateCalc() {
    const dureeMois = parseInt(bailDuree)
    if (!bailStartDate || !dureeMois) return
    const start = parseDate(bailStartDate)
    if (!start) return
    const bailEnd = new Date(start)
    bailEnd.setMonth(bailEnd.getMonth() + dureeMois)
    setBailEndDate(formatDateForInput(bailEnd))
  }

  function handleBailFromDates() {
    if (!bailStartDate || !bailEndDate) return
    const start = parseDate(bailStartDate)
    const end = parseDate(bailEndDate)
    if (!start || !end || end <= start) return
    const diffMonths = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44))
    const closestOption = [3, 6, 9, 10, 12, 24].reduce((prev, curr) => Math.abs(curr - diffMonths) < Math.abs(prev - diffMonths) ? curr : prev)
    if (Math.abs(closestOption - diffMonths) <= 1) setBailDuree(String(closestOption))
  }

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  function calcPriceDisplay(mode, prixF, prixBP, chgMoy, prixBS) {
    if (mode === 'forfaitaire') {
      const total = parseFloat(prixF)
      if (!total || total <= 0) return null
      const base = total / 2
      const perWeek = base / 4.33
      const commission = perWeek * 0.15
      return { base, perWeek, commission, final: perWeek + commission }
    }
    if (mode === 'plafond') {
      const base = parseFloat(prixBP)
      const charges = parseFloat(chgMoy)
      if (!base || base <= 0 || !charges || charges < 0) return null
      const divided = (base + charges) / 2
      const perWeek = divided / 4.33
      const commission = perWeek * 0.15
      return { base: divided, perWeek, commission, final: perWeek + commission }
    }
    if (mode === 'separe') {
      const base = parseFloat(prixBS)
      if (!base || base <= 0) return null
      const divided = base / 2
      const perWeek = divided / 4.33
      const commission = perWeek * 0.15
      return { base: divided, perWeek, commission, final: perWeek + commission }
    }
    return null
  }

  const priceCalc = calcPriceDisplay(chargeMode, prixForfaitaire, prixBasePlafond, chargesMoyennes, prixBaseSepare)

  // ==========================================
  // VALIDATION
  // ==========================================

  function validateStep(step) {
    if (isAdmin) return true
    // ⚠️ BYPASS DEV (#117) — désactive la validation des champs en LOCAL uniquement.
    // import.meta.env.DEV = true via `npm run dev`, false au build prod → la validation
    // revient automatiquement en production. À garder jusqu'à la fin de la refonte design (Lot 6).
    if (import.meta.env.DEV) return true
    setErrors({})

    if (step === 1) {
      if (!type || !surface) { setErrors({ [step]: 'Merci de remplir tous les champs obligatoires' }); return false }
      if (!codePostalOriginal || codePostalOriginal.length !== 5) { setErrors({ [step]: 'Merci de saisir un code postal valide (5 chiffres)' }); return false }
      if (!villeDetectee) { setErrors({ [step]: 'STERNY arrive bientôt dans ta région !' }); return false }
      if (!adresse.trim()) { setErrors({ [step]: 'Merci de saisir une adresse' }); return false }
    }
    if (step === 2) {
      if (!titre) { setErrors({ [step]: 'Merci de remplir le titre de l\'annonce' }); return false }
      if (!description || description.trim().length < 20) { setErrors({ [step]: 'Merci de rédiger une description (minimum 20 caractères)' }); return false }
      const vt = verifierContenuTexte(titre, 'Titre'); if (!vt.valide) { setErrors({ [step]: vt.message }); return false }
      const vd = verifierContenuTexte(description, 'Description'); if (!vd.valide) { setErrors({ [step]: vd.message }); return false }
      if (equipements.autre && !autreEquipementTexte.trim()) { setErrors({ [step]: 'Tu as coché "Autre" mais n\'as pas précisé tes équipements' }); return false }
    }
    if (step === 3) {
      if (uploadedPhotos.length < 5) { setErrors({ [step]: `Ajoute au moins 5 photos (actuellement : ${uploadedPhotos.length})` }); return false }
    }
    if (step === 4 && userType === 'locataire') {
      if (!bailStartDate) { setErrors({ [step]: 'Merci de renseigner la date de début du bail' }); return false }
      if (!parseDate(bailStartDate)) { setErrors({ [step]: 'Date de début invalide. Format : JJ/MM/AAAA' }); return false }
      if (!bailEndDate && !bailDuree) { setErrors({ [step]: 'Merci de renseigner la date de fin ou choisir une durée' }); return false }
      if (selectedDates.length === 0) { setErrors({ [step]: 'Renseigne les dates et génère ton calendrier' }); return false }
      if (selectedDates.length < 7) { setErrors({ [step]: 'Sélectionne au moins 1 semaine complète' }); return false }
    }
    if (step === 5) {
      if (chargeMode === 'forfaitaire') {
        if (!prixForfaitaire || parseFloat(prixForfaitaire) <= 0) { setErrors({ [step]: 'Merci d\'indiquer le loyer mensuel' }); return false }
        if (!caution || parseFloat(caution) < 0) { setErrors({ [step]: 'Merci d\'indiquer la caution' }); return false }
      } else if (chargeMode === 'plafond') {
        if (!prixBasePlafond || parseFloat(prixBasePlafond) <= 0) { setErrors({ [step]: 'Merci d\'indiquer le loyer de base' }); return false }
        if (!chargesMoyennes || parseFloat(chargesMoyennes) < 0) { setErrors({ [step]: 'Merci d\'indiquer le forfait de charges' }); return false }
        if (!cautionPlafond || parseFloat(cautionPlafond) < 0) { setErrors({ [step]: 'Merci d\'indiquer la caution' }); return false }
      } else if (chargeMode === 'separe') {
        if (!prixBaseSepare || parseFloat(prixBaseSepare) <= 0) { setErrors({ [step]: 'Merci d\'indiquer le loyer de base' }); return false }
        if (!cautionSepare || parseFloat(cautionSepare) < 0) { setErrors({ [step]: 'Merci d\'indiquer la caution' }); return false }
      }
    }
    return true
  }

  function nextStep() {
    if (!validateStep(currentStep)) return
    const maxStep = 5
    if (currentStep < maxStep) {
      let next = currentStep + 1
      setCurrentStep(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (next === 5 && bailDatesAutoExtracted) {
        showNotificationFn('Bail analysé', 'Vérifie bien les montants avant de continuer.', 'success')
        setBailDatesAutoExtracted(false)
      }
    }
  }

  function prevStep() {
    if (currentStep === 0) { navigate('/dashboard/proprietaire'); return }
    let prev = currentStep - 1
    setCurrentStep(prev)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getProgressWidth() {
    const totalSteps = 6
    const stepPosition = currentStep
    return (stepPosition / (totalSteps - 1)) * 100
  }

  // ==========================================
  // SAVE (UPDATE)
  // ==========================================

  function showConfirmationModal() {
    if (!validateStep(currentStep)) return
    setShowConfirmModal(true)
    document.body.style.overflow = 'hidden'
  }

  function closeConfirmationModal() {
    setShowConfirmModal(false)
    document.body.style.overflow = 'auto'
  }

  async function enregistrerModifications() {
    closeConfirmationModal()
    if (!validateStep(5)) return

    setPublishing(true)
    setPublishBtnText('Enregistrement en cours...')

    try {
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
      if (!currentUser) { navigate('/connexion'); return }

      const { data: identityCheck } = await supabaseClient.from('users').select('identite_verifiee').eq('id', currentUser.id).single()
      if (!identityCheck || identityCheck.identite_verifiee !== 'verifiee') {
        if (confirm('Pour publier, tu dois vérifier ton identité. Continuer ?')) {
          try {
            const { data: identityData, error: identityError } = await supabaseClient.functions.invoke('create-stripe-identity-session', { body: { user_id: currentUser.id, return_url: window.location.href } })
            if (identityError) throw identityError
            if (identityData?.url) { window.location.href = identityData.url; return }
          } catch (e) { console.error('Erreur Stripe Identity:', e); alert('Impossible de lancer la vérification.') }
        }
        setPublishing(false); setPublishBtnText('Enregistrer les modifications'); return
      }

      const adresseComplete = (adresse.trim() && codePostalOriginal) ? `${adresse.trim()}, ${codePostalOriginal}` : null
      if (adresseComplete && !addressVerified) {
        if (!confirm('Ton adresse n\'a pas été vérifiée. Enregistrer quand même ?')) {
          setPublishing(false); setPublishBtnText('Enregistrer les modifications'); return
        }
      }

      const verifFinale = verifierContenuTexte(titre, 'Titre')
      if (!verifFinale.valide) { showNotificationFn('Contenu non autorisé', verifFinale.message, 'error'); setPublishing(false); setPublishBtnText('Enregistrer les modifications'); return }

      const equips = []
      if (equipements.wifi) equips.push('WiFi')
      if (equipements.meuble) equips.push('Meublé')
      if (equipements.parking) equips.push('Parking')
      if (equipements.cuisine) equips.push('Cuisine équipée')
      if (equipements.balcon) equips.push('Balcon/Terrasse')
      if (equipements.autre && autreEquipementTexte.trim()) equips.push('Autre: ' + autreEquipementTexte.trim())

      const regles = reglesLogement.trim() ? [reglesLogement.trim()] : []

      let prixBase = 0
      let chargesInfo = {}
      if (chargeMode === 'forfaitaire') {
        const prixTotal = parseFloat(prixForfaitaire)
        const cautionVal = parseFloat(caution)
        prixBase = prixTotal / 2
        chargesInfo = { mode: 'forfaitaire', prix_total_hote: prixTotal, prix_par_alternant: prixBase + prixBase * 0.15, caution: cautionVal }
      } else if (chargeMode === 'plafond') {
        const loyer = parseFloat(prixBasePlafond)
        const forfait = parseFloat(chargesMoyennes)
        prixBase = (loyer + forfait) / 2
        chargesInfo = { mode: 'forfait_regularisation', loyer_base: loyer, forfait_charges: forfait, conso_normale_elec_kwh: parseFloat(consoElec) || null, conso_normale_eau_m3: parseFloat(consoEau) || null, prix_par_alternant: prixBase + prixBase * 0.15, caution: parseFloat(cautionPlafond) }
      } else if (chargeMode === 'separe') {
        const loyer = parseFloat(prixBaseSepare)
        prixBase = loyer / 2
        const ct = []
        if (chargesTypes.eau) ct.push('eau')
        if (chargesTypes.electricite) ct.push('electricite')
        if (chargesTypes.internet) ct.push('internet')
        if (chargesTypes.chauffage) ct.push('chauffage')
        chargesInfo = { mode: 'separe', loyer_base: loyer, charges_types: ct, prix_base_par_alternant: prixBase + prixBase * 0.15, caution: parseFloat(cautionSepare) }
      }

      const prixParSemaine = prixBase / 4.33
      const prixSemaineAvecCommission = prixParSemaine + prixParSemaine * 0.15
      const nbSemaines = getSelectedWeeksCount()
      let prixTotalSejour = null
      if (userType === 'locataire' && nbSemaines > 0) prixTotalSejour = Math.round(prixSemaineAvecCommission * nbSemaines)

      let bailInfo = null
      if (userType === 'locataire') {
        const startParsed = parseDate(bailStartDate)
        const endParsed = parseDate(bailEndDate)
        const dureeMois = bailDuree ? parseInt(bailDuree) : null
        bailInfo = {
          date_debut: startParsed ? toLocalISODate(startParsed) : null,
          date_fin: endParsed ? toLocalISODate(endParsed) : null,
          duree_mois: dureeMois,
          nb_semaines_presence: nbSemaines,
          prix_total_sejour: prixTotalSejour
        }
      }

      const annonce = {
        type_logement: type,
        ville: villeDetectee,
        surface: parseInt(surface),
        etage: formatEtage(etage),
        adresse: adresseComplete || null,
        prix: Math.round(prixSemaineAvecCommission),
        titre, description: description || null,
        equipements: equips, regles, charges_info: chargesInfo, bail_info: bailInfo,
        disponibilites_debut: selectedDates.length > 0 ? selectedDates[0] : null,
        disponibilites_pattern: selectedDates.length > 0 ? selectedDates : null,
        adresse_verifiee: addressVerified,
        latitude: verifiedCoordinates ? verifiedCoordinates[1] : null,
        longitude: verifiedCoordinates ? verifiedCoordinates[0] : null,
        adresse_verification_date: addressVerified ? new Date().toISOString() : null
      }

      // --- PHOTO UPLOAD ---
      setPublishBtnText('Upload des photos...')
      const photoUrls = []
      const annonceId = annonceIdRef.current

      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i]
        if (photo.existingUrl) {
          photoUrls.push(photo.existingUrl)
          continue
        }
        const fileName = `${currentUser.id}/${annonceId}/photo_${i}.jpg`
        try {
          const { error: uploadError } = await supabaseClient.storage.from('annonces-photos').upload(fileName, photo.file, { contentType: 'image/jpeg', upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabaseClient.storage.from('annonces-photos').getPublicUrl(fileName)
            if (urlData?.publicUrl) photoUrls.push(urlData.publicUrl + '?v=' + Date.now())
          } else {
            console.error('Erreur upload photo ' + i + ':', JSON.stringify(uploadError))
          }
        } catch (uploadCatch) {
          console.error('Exception upload photo ' + i + ':', uploadCatch)
        }
      }

      annonce.photos = photoUrls.length > 0 ? photoUrls : null

      setPublishBtnText('Enregistrement...')
      const { data, error } = await supabaseClient
        .from('annonces')
        .update(annonce)
        .eq('id', annonceId)
        .select()

      if (error) {
        console.error('Erreur Supabase:', error)
        throw new Error(`Erreur base de données: ${error.message || error.toString()}`)
      }

      showNotificationFn('Modifications enregistrées !', 'Ton annonce a été mise à jour avec succès.', 'success')
      setTimeout(() => navigate('/dashboard/proprietaire'), 2000)
    } catch (error) {
      console.error('Erreur:', error)
      showNotificationFn('Erreur', 'Erreur lors de l\'enregistrement : ' + error.message, 'error')
      setPublishing(false)
      setPublishBtnText('Enregistrer les modifications')
    }
  }

  const nbSemaines = getSelectedWeeksCount()
  let summaryDebut = '-', summaryFin = '-', summaryDebutJour = '', summaryFinJour = ''
  if (selectedDates.length > 0) {
    const premierJour = selectedDates[0]
    const dernierJour = selectedDates[selectedDates.length - 1]
    const [y1, m1, d1] = premierJour.split('-').map(Number)
    const dateDebut = new Date(y1, m1 - 1, d1)
    const dowDebut = dateDebut.getDay()
    dateDebut.setDate(dateDebut.getDate() + (dowDebut === 0 ? -6 : 1 - dowDebut))
    const [y2, m2, d2] = dernierJour.split('-').map(Number)
    const dateFin = new Date(y2, m2 - 1, d2)
    const dowFin = dateFin.getDay()
    dateFin.setDate(dateFin.getDate() + (dowFin === 0 ? 0 : 7 - dowFin))
    summaryDebut = formatDateDisplay(toLocalISODate(dateDebut))
    summaryFin = formatDateDisplay(toLocalISODate(dateFin))
    summaryDebutJour = 'Lundi'
    summaryFinJour = 'Dimanche'
  }

  const villeText = villeDetectee && codePostalOriginal ? `${villeDetectee} (${codePostalOriginal})` : villeDetectee || '\u2014'
  const recapLogement = type && surface ? `${type} \u2014 ${surface} m\u00b2` : type || '\u2014'
  const modeLabels = { forfaitaire: 'Forfait fixe', plafond: 'Forfait + régularisation', separe: 'Charges séparées' }
  const recapPrix = priceCalc ? priceCalc.final.toFixed(2) + '\u20ac' : '\u2014'
  const recapCautionVal = chargeMode === 'forfaitaire' ? caution : chargeMode === 'plafond' ? cautionPlafond : cautionSepare
  const recapSemaines = nbSemaines > 0 ? `${nbSemaines} semaine${nbSemaines > 1 ? 's' : ''}` : '\u2014'

  let recapPeriode = '\u2014'
  if (selectedDates.length > 0) {
    recapPeriode = `${summaryDebut} \u2192 ${summaryFin}`
  }

  function handleDateInput(value, setter) {
    let v = value.replace(/\D/g, '')
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2)
    if (v.length >= 5) v = v.slice(0, 5) + '/' + v.slice(5)
    if (v.length > 10) v = v.slice(0, 10)
    setter(v)
  }

  // ==========================================
  // RENDER
  // ==========================================

  if (!user || loading) {
    return (
      <div className="create-container">
        <div className="page-header">
          <h1>Chargement...</h1>
        </div>
      </div>
    )
  }

  if (!showMainForm) {
    return <div className="create-container"><div className="page-header"><h1>Chargement...</h1></div></div>
  }

  const totalSteps = 6
  const progressGridCols = 'repeat(6, 1fr)'
  const stepNumber5Text = '5'

  return (
    <>
      <div className="create-container">
        {/* HEADER */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
            <h1 style={{ margin: 0 }}>Modifier mon annonce</h1>
            <span style={{ display: 'inline-block', background: '#F3F4F6', color: '#6B7280', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
              {'Locataire'}
            </span>
          </div>
          <p>Modifie les informations de ton annonce</p>
        </div>

        {/* PROGRESS BAR */}
        <div className="progress-container">
          <div className="progress-steps" style={{ gridTemplateColumns: progressGridCols }}>
            {[0, 1, 2, 3, 4, 5].map((s, i) => {
              let cls = 'progress-step'
              if (s < currentStep) cls += ' completed'
              else if (s === currentStep) cls += ' active'
              const label = s === 0 ? 'Bail' : s === 1 ? 'Informations' : s === 2 ? 'Détails' : s === 3 ? 'Photos' : s === 4 ? 'Disponibilités' : 'Prix'
              const num = String(i + 1)
              return (
                <div key={s} className={cls} data-step={s}>
                  <div className="step-number">{num}</div>
                  <div className="step-label">{label}</div>
                </div>
              )
            })}
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${getProgressWidth()}%` }} />
          </div>
        </div>

        {/* STEP 0 : Bail (placeholder 6c-② sous-pas 2a — contenu déplacé au sous-pas suivant) */}
        <div className={`form-section ${currentStep === 0 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title"><span className="section-number">1</span>Bail</div>
            <div className="section-description">Importe ton bail (placeholder — contenu déplacé au sous-pas suivant)</div>
          </div>
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 1 */}
        <div className={`form-section ${currentStep === 1 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title"><span className="section-number">1</span>Informations de base</div>
            <div className="section-description">Commence par les informations essentielles de ton logement</div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Type de logement <span className="required">*</span></label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="" disabled>Sélectionne le type</option>
                <option value="Studio">Studio</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4+">T4+</option>
              </select>
            </div>
            <div className="form-group">
              <label>Surface <span className="required">*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input type="number" value={surface} onChange={e => setSurface(e.target.value)} min="10" max="200" placeholder="45" style={{ width: '100%', paddingRight: '50px' }} />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 600, fontSize: '16px', pointerEvents: 'none' }}>m²</span>
              </div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Code postal <span className="required">*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input type="text" value={codePostal} onChange={e => { setCodePostal(e.target.value); const digits = e.target.value.replace(/[^0-9]/g, ''); if (digits.length === 5) detecterVille(digits) }} onFocus={handleCodePostalFocus} onBlur={handleCodePostalBlur} placeholder="Ex: 35000" maxLength="5" style={{ width: '100%', paddingRight: '45px' }} />
                <span className={`input-checkmark ${codePostalCheckmarkVisible ? 'show' : ''}`}>{'\u2713'}</span>
              </div>
              <div className={villeMessage.className}>{villeMessage.text}</div>
            </div>
            <div className="form-group">
              <label>Adresse <span className="required">*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input type="text" value={adresse} onChange={e => { setAdresse(capitalizeAddress(e.target.value)); setAdresseCheckmarkVisible(false); setAddressValidationMsg({ text: '', severity: '', show: false }) }} onBlur={autoVerifyAddress} placeholder="Ex: 15 rue de la République" style={{ width: '100%', paddingRight: '45px' }} />
                <span className={`input-checkmark ${adresseCheckmarkVisible ? 'show' : ''}`}>{'\u2713'}</span>
              </div>
              {addressValidationMsg.show && (
                <div className={`address-validation-message ${addressValidationMsg.severity} show`}>{addressValidationMsg.text}</div>
              )}
            </div>
          </div>
          <div className="form-grid full-width">
            <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500, fontStyle: 'italic', marginTop: '-12px' }}>
              L'adresse complète sera visible uniquement après réservation confirmée
            </div>
          </div>
          {errors[1] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[1]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className={`form-section ${currentStep === 2 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title"><span className="section-number">2</span>Détails & Équipements</div>
            <div className="section-description">Décris ton logement et ses équipements</div>
          </div>
          <div className="form-grid full-width">
            <div className="form-group">
              <label>Titre de l'annonce <span className="required">*</span></label>
              <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Studio lumineux proche campus" maxLength="80" />
            </div>
          </div>
          <div className="form-grid full-width">
            <div className="form-group">
              <label>Description <span className="required">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décris ton logement : ambiance, points forts..." minLength="20" />
              <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500, fontStyle: 'italic', marginTop: '8px' }}>
                Les informations de proximité seront calculées automatiquement
              </div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Étage</label>
              <input type="number" value={etage} onChange={e => setEtage(e.target.value)} placeholder="Ex: 3" min="0" max="99" />
              <small style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Entrez juste le chiffre</small>
            </div>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '32px 0 16px', color: '#1E293B' }}>Équipements disponibles</h3>
          <div className="equipements-grid">
            {[
              { key: 'wifi', label: 'WiFi' }, { key: 'meuble', label: 'Meublé' }, { key: 'parking', label: 'Parking' },
              { key: 'cuisine', label: 'Cuisine équipée' }, { key: 'balcon', label: 'Balcon/Terrasse' }
            ].map(eq => (
              <div className="equipement-checkbox" key={eq.key}>
                <input type="checkbox" id={`mod-${eq.key}`} checked={equipements[eq.key]} onChange={e => setEquipements(prev => ({ ...prev, [eq.key]: e.target.checked }))} />
                <label htmlFor={`mod-${eq.key}`} className="equipement-label">{eq.label}</label>
              </div>
            ))}
            <div className="equipement-checkbox">
              <input type="checkbox" id="mod-autre-equipement" checked={equipements.autre} onChange={e => setEquipements(prev => ({ ...prev, autre: e.target.checked }))} />
              <label htmlFor="mod-autre-equipement" className="equipement-label equipement-autre">+ Autre</label>
            </div>
          </div>
          {equipements.autre && (
            <div style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label>Précise tes autres équipements</label>
                <textarea value={autreEquipementTexte} onChange={e => setAutreEquipementTexte(e.target.value)} placeholder="Ex: Sèche-linge, climatisation, cave..." style={{ minHeight: '60px' }} />
              </div>
            </div>
          )}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Règles spécifiques à ton logement</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <textarea value={reglesLogement} onChange={e => setReglesLogement(e.target.value)} placeholder="Ex: Pas d'animaux, calme après 22h..." style={{ minHeight: '100px' }} />
            </div>
            <div style={{ background: 'linear-gradient(135deg, #FFF4ED 0%, #FFEDD5 100%)', borderLeft: '4px solid #E8622A', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontWeight: 600, color: '#9A3412', fontSize: '14px', marginBottom: '6px' }}>Bon à savoir</div>
              <div style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.6 }}>
                Les règles générales sont déjà incluses dans le document d'engagement signé par chaque locataire.
              </div>
            </div>
          </div>
          {errors[2] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[2]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 3: Photos */}
        <div className={`form-section ${currentStep === 3 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title"><span className="section-number">3</span>Photos du logement</div>
            <div className="section-description">Ajoute au moins 5 photos de qualité</div>
          </div>
          <div className="photos-upload-container">
            {uploadedPhotos.length === 0 ? (
              <div className="upload-zone-simple" onClick={() => photoInputRef.current?.click()}>
                <div className="upload-icon-large">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" /><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" /><circle cx="13" cy="7" r="1" fill="#9CA3AF" /><rect x="8" y="2" width="14" height="14" rx="2" /></svg>
                </div>
                <div className="upload-text-large">Clique pour ajouter des photos</div>
                <div className="upload-subtext-large">JPG, PNG ou WEBP - Max 5 MB par photo</div>
              </div>
            ) : (
              <div className="photos-preview-main">
                <div className="main-photo-wrapper" onDragOver={handleDragOver} onDrop={e => handleDrop(e, 0)} onDragLeave={e => e.currentTarget.classList.remove('drag-over')}>
                  <img loading="lazy" src={uploadedPhotos[0].dataUrl} alt="Photo principale" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="photo-main-badge">Photo principale</div>
                  <div className="photo-number">1</div>
                  <button className="photo-delete-btn" onClick={() => deletePhoto(0)}>{'\u00d7'}</button>
                </div>
                {uploadedPhotos.length > 1 && (
                  <div className="thumbnail-wrapper">
                    <div className="thumbnail-grid">
                      {uploadedPhotos.slice(1).map((photo, i) => (
                        <div key={photo.id} className="thumbnail-item" draggable onDragStart={e => handleDragStart(e, i + 1)} onDragOver={handleDragOver} onDrop={e => handleDrop(e, i + 1)} onDragEnd={handleDragEnd} onClick={() => previewPhoto(i + 1)}>
                          <img loading="lazy" src={photo.dataUrl} alt={`Photo ${i + 2}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div className="photo-number">{i + 2}</div>
                          <button className="photo-delete-btn" onClick={e => { e.stopPropagation(); deletePhoto(i + 1) }}>{'\u00d7'}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
            {uploadedPhotos.length > 0 && uploadedPhotos.length < 10 && (
              <button className="btn-add-photos" onClick={() => photoInputRef.current?.click()}>+ Ajouter d'autres photos</button>
            )}
          </div>
          <div className="photos-counter"><span className="photo-count-number">{uploadedPhotos.length}</span> / 10 photos - <strong>Minimum 5 photos requis</strong></div>
          <div className="photos-tips">
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Conseils pour de bonnes photos :</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', color: '#6B7280' }}>
              <span>- La première photo sera la photo principale</span>
              <span>- Photographie toutes les pièces</span>
              <span>- Privilégie la lumière naturelle</span>
              <span>- Range un peu avant de photographier</span>
            </div>
          </div>
          {errors[3] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[3]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 4: Bail & Calendar (locataires only) */}
        <div className={`form-section ${currentStep === 4 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title"><span className="section-number">4</span>Disponibilités & Bail</div>
            <div className="section-description">Indique ton rythme d'alternance et les dates de ton bail</div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>Ton bail</h3>
          {showBailUploadZone && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA' }} onClick={() => document.getElementById('bailFileInputModifier')?.click()}>
                <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>Importe ton bail</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>PDF ou image - Les dates seront lues automatiquement</div>
              </div>
              <input type="file" id="bailFileInputModifier" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => handleBailUpload(e.target.files[0])} />
            </div>
          )}
          {showBailLoader && (
            <div style={{ marginTop: '12px', background: '#FFF4ED', border: '1px solid #FFEDD5', borderRadius: '10px', padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#9A3412', fontWeight: 500 }}>Analyse du document en cours...</div>
            </div>
          )}
          {showBailFileResult && (
            <div style={{ marginTop: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#16A34A', fontSize: '18px' }}>{'\u2713'}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#166534', fontSize: '14px' }}>{bailFileName}</div>
                    <div style={{ fontSize: '12px', color: '#16A34A' }}>{bailFileStatus}</div>
                  </div>
                </div>
                <button onClick={removeBailFile} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>{'\u00d7'}</button>
              </div>
            </div>
          )}

          {showBailSeparator && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
              <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>ou remplis manuellement</span>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Date de début du bail <span className="required">*</span></label>
              <input type="text" value={bailStartDate} onChange={e => handleDateInput(e.target.value, setBailStartDate)} onBlur={handleBailEndDateCalc} placeholder="JJ/MM/AAAA" style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '15px' }} />
              <div className="input-hint">Premier jour de ton bail</div>
            </div>
            <div className="form-group">
              <label>Date de fin du bail <span className="required">*</span></label>
              <input type="text" value={bailEndDate} onChange={e => handleDateInput(e.target.value, setBailEndDate)} onBlur={handleBailFromDates} placeholder="JJ/MM/AAAA" style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '15px' }} />
              <div className="input-hint">Dernier jour de ton bail</div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Durée prédéfinie</label>
            <select value={bailDuree} onChange={e => { setBailDuree(e.target.value); setTimeout(handleBailEndDateCalc, 0) }} style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '15px', background: 'white' }}>
              <option value="" disabled>Choisis la durée de ton bail</option>
              {[3, 6, 9, 10, 12, 24].map(d => <option key={d} value={d}>{d} mois{d === 9 ? ' (année scolaire)' : d === 12 ? ' (1 an)' : d === 24 ? ' (2 ans)' : ''}</option>)}
            </select>
          </div>

          {showEditCalendar && (
            <div className="calendar-container">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 4px' }}>Tes semaines à proposer</h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
                  {selectedDates.length} semaine{selectedDates.length > 1 ? 's' : ''} proposée{selectedDates.length > 1 ? 's' : ''}. Clique sur une semaine pour la retirer ou la remettre.
                </p>
              </div>
              <PlancheCouverture
                etatsParSemaine={etatsDispoAnnonce}
                anneeScolaireInitiale={anneeDispoInitiale}
                onSemaineClick={toggleSemaineDispo}
                className="planche-annonce"
              />
              <button type="button" className="clear-dates-btn" onClick={reinitialiserDispo} style={{ marginTop: '16px' }}>
                Réinitialiser
              </button>
            </div>
          )}

          {errors[4] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[4]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" onClick={nextStep}>Continuer</button>
            </div>
          </div>
        </div>

        {/* STEP 5: Price */}
        <div className={`form-section ${currentStep === 5 ? 'active' : ''}`}>
          <div className="section-header">
            <div className="section-title"><span className="section-number">{stepNumber5Text}</span>Prix & Charges</div>
            <div className="section-description">Définis ton prix et le mode de gestion des charges</div>
          </div>

          {showPricingBanner && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderLeft: '4px solid #22C55E', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', color: '#22C55E' }}>{'\u2713'}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Tarifs pré-remplis depuis ton bail</span>
              </div>
            </div>
          )}

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#1E293B' }}>Mode de gestion des charges</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              { id: 'forfaitaire', title: 'Charges forfaitaires', desc: 'Prix fixe tout compris.', badge: null },
              { id: 'plafond', title: 'Forfait avec régularisation', desc: 'Forfait mensuel fixe couvrant une consommation normale.', badge: 'RECOMMANDÉ' },
              { id: 'separe', title: 'Charges séparées', desc: 'L\'alternant paye exactement ce qu\'il consomme.', badge: null }
            ].map(opt => (
              <label className="radio-option" htmlFor={`mod-${opt.id}`} key={opt.id}>
                <input type="radio" name="chargeModeModifier" id={`mod-${opt.id}`} value={opt.id} checked={chargeMode === opt.id} onChange={() => setChargeMode(opt.id)} />
                <div className="radio-option-content">
                  <div className="radio-option-header">
                    <span className="radio-option-title">{opt.title}</span>
                    {opt.badge && <span className="radio-badge-recommended">{opt.badge}</span>}
                  </div>
                  <div className="radio-option-description">{opt.desc}</div>
                </div>
                <div className="card-check">{'\u2713'}</div>
              </label>
            ))}
          </div>

          {/* Forfaitaire form */}
          <div className={`charge-form ${chargeMode === 'forfaitaire' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>Loyer mensuel total (charges comprises) <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={prixForfaitaire} onChange={e => setPrixForfaitaire(e.target.value)} min="100" max="3000" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Montant de la caution <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={caution} onChange={e => setCaution(e.target.value)} min="0" max="5000" placeholder="Ex: 800" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            {chargeMode === 'forfaitaire' && priceCalc && (
              <div className="price-preview">
                <div className="price-preview-title">Calcul du prix</div>
                <div className="price-breakdown">
                  <div className="price-line"><span>Loyer mensuel / 2 alternants</span><span>{priceCalc.base.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line"><span>Prix par semaine / alternant</span><span>{priceCalc.perWeek.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line commission"><span>+ Commission STERNY (15%)</span><span>{priceCalc.commission.toFixed(2)}{'\u20ac'}/semaine</span></div>
                  <div className="price-line total"><span>Prix par semaine (avec commission)</span><span>{priceCalc.final.toFixed(2)}{'\u20ac'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Plafond form */}
          <div className={`charge-form ${chargeMode === 'plafond' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>Loyer de base (hors charges) <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={prixBasePlafond} onChange={e => setPrixBasePlafond(e.target.value)} min="100" max="3000" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Forfait mensuel de charges <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={chargesMoyennes} onChange={e => setChargesMoyennes(e.target.value)} min="0" max="500" placeholder="Exemple : 100" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Montant de la caution <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={cautionPlafond} onChange={e => setCautionPlafond(e.target.value)} min="0" max="5000" placeholder="Ex: 800" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            {chargeMode === 'plafond' && priceCalc && (
              <div className="price-preview">
                <div className="price-preview-title">Calcul du prix</div>
                <div className="price-breakdown">
                  <div className="price-line"><span>Loyer + forfait charges / 2</span><span>{priceCalc.base.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line"><span>Prix par semaine / alternant</span><span>{priceCalc.perWeek.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line commission"><span>+ Commission STERNY (15%)</span><span>{priceCalc.commission.toFixed(2)}{'\u20ac'}/semaine</span></div>
                  <div className="price-line total"><span>Prix par semaine (avec commission)</span><span>{priceCalc.final.toFixed(2)}{'\u20ac'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Separe form */}
          <div className={`charge-form ${chargeMode === 'separe' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>Loyer de base (hors charges) <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={prixBaseSepare} onChange={e => setPrixBaseSepare(e.target.value)} min="100" max="3000" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Montant de la caution <span className="required">*</span></label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="number" value={cautionSepare} onChange={e => setCautionSepare(e.target.value)} min="0" max="5000" placeholder="Ex: 800" style={{ width: '100%', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 500, fontSize: '15px', pointerEvents: 'none' }}>{'\u20ac'}</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Types de charges à la consommation</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                {[{ key: 'eau', label: 'Eau' }, { key: 'electricite', label: 'Électricité' }, { key: 'internet', label: 'Internet' }, { key: 'chauffage', label: 'Chauffage' }].map(ct => (
                  <label className="charge-type-checkbox" key={ct.key}>
                    <input type="checkbox" checked={chargesTypes[ct.key]} onChange={e => setChargesTypes(prev => ({ ...prev, [ct.key]: e.target.checked }))} />
                    <span>{ct.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {chargeMode === 'separe' && priceCalc && (
              <div className="price-preview">
                <div className="price-preview-title">Calcul du prix</div>
                <div className="price-breakdown">
                  <div className="price-line"><span>Loyer / 2</span><span>{priceCalc.base.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line"><span>Prix par semaine / alternant</span><span>{priceCalc.perWeek.toFixed(2)}{'\u20ac'}</span></div>
                  <div className="price-line commission"><span>+ Commission STERNY (15%)</span><span>{priceCalc.commission.toFixed(2)}{'\u20ac'}/semaine</span></div>
                  <div className="price-line total"><span>Prix par semaine (avec commission)</span><span>{priceCalc.final.toFixed(2)}{'\u20ac'}</span></div>
                </div>
                <div className="price-note">+ Charges variables selon consommation réelle</div>
              </div>
            )}
          </div>

          {errors[5] && <div className="error-message show" onClick={() => setErrors({})}><span>{errors[5]}</span></div>}
          <div className="form-navigation">
            <div className="form-navigation-buttons">
              <button className="btn btn-secondary" onClick={prevStep}>Retour</button>
              <button className="btn btn-primary" disabled={publishing} onClick={showConfirmationModal}>{publishBtnText}</button>
            </div>
          </div>
        </div>
      </div>

      {/* CROP MODAL */}
      {showCropModal && (
        <div className="crop-modal">
          <div className="crop-modal-content">
            <div className="crop-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Recadrer la photo</h3>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Ajuste le cadre orange pour sélectionner la zone (format 4:3)</div>
              </div>
              <button className="crop-close" onClick={closeCropModal}>{'\u00d7'}</button>
            </div>
            <div className="crop-container">
              <img ref={cropImageRef} src="" alt="Crop" />
            </div>
            <div className="crop-modal-footer">
              <button className="btn btn-secondary" onClick={closeCropModal}>Annuler</button>
              <button className="btn btn-primary" onClick={confirmCrop}>Valider le cadrage</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="ma-confirm-overlay">
          <div className="modal-content-confirm">
            <div className="modal-confirm-title">Confirmer les modifications ?</div>
            <p className="modal-confirm-subtitle">Les modifications seront immédiatement visibles sur ton annonce.</p>
            <div className="modal-recap">
              {[
                ['Logement', recapLogement],
                ['Ville', villeText],
                ['Occupation', recapSemaines],
                ['Période', recapPeriode],
                ['Charges', modeLabels[chargeMode] || '\u2014'],
                ['Prix / semaine', recapPrix],
                ['Caution', recapCautionVal ? `${recapCautionVal} \u20ac` : '\u2014']
              ].map(([label, value]) => (
                <div className="modal-recap-row" key={label}>
                  <span className="modal-recap-label">{label}</span>
                  <span className="modal-recap-value">{value}</span>
                </div>
              ))}
            </div>
            <p className="modal-confirm-reassurance">Les modifications seront appliquées immédiatement.</p>
            <div className="modal-confirm-actions">
              <button className="modal-btn-cancel" onClick={closeConfirmationModal}>Annuler</button>
              <button className="modal-btn-publish" onClick={enregistrerModifications}>Enregistrer les modifications</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification.show && (
        <div className="custom-notification show">
          <div className="notification-content">
            <div className="notification-icon" style={{ background: notification.type === 'error' ? '#DC2626' : notification.type === 'warning' ? '#1E293B' : '#E8622A', color: 'white' }}>
              {notification.type === 'error' ? '\u2717' : notification.type === 'warning' ? '!' : '\u2713'}
            </div>
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }} />
            <button className="notification-btn" onClick={closeNotificationFn}>OK</button>
          </div>
        </div>
      )}
    </>
  )
}
