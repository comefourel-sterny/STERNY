import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import useAccountActions from '../../hooks/useAccountActions'
import { getInitials } from '../../utils/formatters'
import PasswordRevealButton from '../../components/PasswordRevealButton'
import { useShakeButton } from '../../components/auth-wizard/useShakeButton'
import CustomSelect from '../../components/auth-wizard/CustomSelect'
import AutocompleteInput from '../../components/auth-wizard/AutocompleteInput'
import TextArea from '../../components/auth-wizard/TextArea'
import './GestionComptePage.css'

// Icônes SVG inline (style Feather, cohérent avec ParametresPage) — pas de lucide-react.
const IconInfos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
const IconEtudes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
)
const IconAlternance = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
)
const IconApropos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
)
const IconDocuments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
)
const IconGarant = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
const IconCompte = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)
const IconNotifications = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
)

// Catégories groupées, dans l'ordre validé (3 groupes / 8 catégories).
const GROUPES = [
  {
    label: 'Profil',
    items: [
      { id: 'infos', libelle: 'Infos personnelles', Icone: IconInfos },
      { id: 'etudes', libelle: 'Tes études', Icone: IconEtudes },
      { id: 'alternance', libelle: 'Ton alternance', Icone: IconAlternance },
      { id: 'apropos', libelle: 'À propos de toi', Icone: IconApropos },
    ],
  },
  {
    label: 'Dossier',
    items: [
      { id: 'documents', libelle: 'Tes documents', Icone: IconDocuments },
      { id: 'garant', libelle: 'Ton garant', Icone: IconGarant },
    ],
  },
  {
    label: 'Compte',
    items: [
      { id: 'compte', libelle: 'Compte', Icone: IconCompte },
      { id: 'notifications', libelle: 'Notifications', Icone: IconNotifications },
    ],
  },
]

// Préférences email portées de ModifierProfilPage (mêmes clés, mêmes libellés).
const PREFS_EMAIL = [
  { key: 'alertes', label: 'Alertes logement', desc: 'Nouveaux logements correspondant à tes critères' },
  { key: 'messages', label: 'Messages', desc: 'Notification quand tu reçois un message' },
  { key: 'candidatures', label: 'Candidatures', desc: 'Mises à jour sur tes candidatures' },
  { key: 'paiements', label: 'Paiements', desc: 'Reçus et rappels de paiement' },
  { key: 'baux', label: 'Baux', desc: 'Fin de bail, renouvellement' },
  { key: 'marketing', label: 'Actualités STERNY', desc: 'Nouveautés et offres de la plateforme' },
]

// Recopié verbatim de ModifierProfilPage (fonction locale, non exportée).
function capitalizeWords(str) { return str.replace(/(?:^|[\s-])([a-zA-ZÀ-ÿ])/g, m => m.toUpperCase()) }

// Bouton d'enregistrement réutilisable (aligné à droite). Grisé tant que rien n'a changé.
function BoutonEnregistrer({ onSave, modifie, loading, ok, erreur, btnRef }) {
  return (
    <div className="gc-actions">
      {erreur && <span className="gc-erreur">{erreur}</span>}
      <button
        ref={btnRef}
        type="button"
        className={`gc-btn-save${ok ? ' gc-btn-save-ok' : ''}`}
        onClick={onSave}
        disabled={loading || ok || !modifie}
      >
        {loading ? 'Enregistrement…' : ok ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
    </div>
  )
}

const SEXE_OPTIONS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
  { value: 'non-precise', label: 'Non précisé' },
]

// Suggestions recopiées des constantes locales de ModifierProfilPage.jsx (ECOLES_POPULAIRES / ANNEES_ETUDES / FILIERES),
// page vouée à suppression au patch 7 : recopie plutôt qu'import. AutocompleteInput attend des tableaux de chaînes
// (il filtre lui-même par sous-chaîne), donc on ne reprend que les valeurs affichées, sans les alias inutiles ici.
const ECOLES_SUGGESTIONS = [
  'Universite de Rennes — Rennes', 'Universite Rennes 2 — Rennes', 'INSA Rennes — Rennes',
  'Sciences Po Rennes — Rennes', 'Rennes School of Business — Rennes', 'IUT de Rennes — Rennes',
  'EPITECH Rennes — Rennes', 'ENS Rennes — Rennes', 'Nantes Universite — Nantes',
  'Centrale Nantes — Nantes', 'Audencia — Nantes', 'Universite de Bretagne Occidentale — Brest',
  'ENIB — Brest', 'Universite Bretagne Sud — Lorient',
]
const ANNEES_SUGGESTIONS = ['Bac+1', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5', 'Bac+6', 'Bac+7', 'Bac+8']
const FILIERES_SUGGESTIONS = [
  'Informatique', 'Commerce', 'Marketing', 'Finance', 'Droit', 'Communication', 'Architecture',
  'Design', 'Medecine', 'Sciences politiques', 'Economie', 'Data / Intelligence artificielle', 'Cybersecurite',
]

// Villes recopiées VERBATIM de ModifierProfilPage.jsx (VILLES_DISPONIBLES, page vouée à suppression au patch 7).
// SANS accents et jamais importée : accentuer créerait deux orthographes de la même ville en base selon la date
// d'inscription (même raisonnement que les suggestions d'école du patch 3b).
const VILLES_DISPONIBLES = ['Rennes', 'Nantes', 'Brest', 'Quimper', 'Lorient', 'Vannes', 'Saint-Malo', 'Saint-Brieuc', 'Fougeres', 'Vitre']

// Options de la fonction dans une ville (« ce que tu fais »). value = statut_ville_* écrit en base.
const FONCTION_OPTIONS = [
  { value: 'recherche', label: 'Je cherche un logement' },
  { value: 'hote', label: 'Je propose mon logement' },
]

export default function GestionComptePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [categorieActive, setCategorieActive] = useState('infos')

  // Préférences email (portées de ModifierProfilPage) — autosave debounce 500 ms.
  const [prefs, setPrefs] = useState({ alertes: true, messages: true, candidatures: true, paiements: true, baux: true, marketing: true })
  const [prefsSaved, setPrefsSaved] = useState(false)
  const prefsSaveTimeout = useRef(null)

  // Actions de compte (mot de passe / suppression / export) + états visibilité de l'œil.
  const {
    showPasswordModal, setShowPasswordModal,
    pwdNew, setPwdNew,
    pwdConfirm, setPwdConfirm,
    pwdMsg,
    openPasswordModal,
    changerMotDePasse,
    showDeleteModal, setShowDeleteModal,
    deleteConfirm, setDeleteConfirm,
    openDeleteModal,
    supprimerCompte,
    exporterDonnees,
  } = useAccountActions()
  const [showPwdNew, setShowPwdNew] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  // Infos personnelles
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [dateNaissanceISO, setDateNaissanceISO] = useState('')
  const [sexe, setSexe] = useState('')
  const [telephone, setTelephone] = useState('')
  const [valeursInitiales, setValeursInitiales] = useState({ prenom: '', nom: '', dateNaissanceISO: '', sexe: '', telephone: '' })
  const [infosErreur, setInfosErreur] = useState('')
  const [erreursChamps, setErreursChamps] = useState({})
  const [infosLoading, setInfosLoading] = useState(false)
  const [infosSaved, setInfosSaved] = useState(false)

  // Photo + recadrage (code maison porté à l'identique de ModifierProfilPage — géométrie non modifiée).
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const [photoErreur, setPhotoErreur] = useState(false)
  const photoInputRef = useRef(null)
  const [showCrop, setShowCrop] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const cropImageRef = useRef(null)
  const cropStateRef = useRef({ imgX: 0, imgY: 0, scale: 1, dragging: false, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })
  const [cropZoom, setCropZoom] = useState(100)
  const [cropZoomMin, setCropZoomMin] = useState(100)
  const [cropZoomMax, setCropZoomMax] = useState(300)
  const infosErreurTimeout = useRef(null)
  const infosChampErreurTimeout = useRef(null)
  const { ref: shakeRef, shake: shakeBouton } = useShakeButton()
  const { ref: photoShakeRef, shake: photoShake } = useShakeButton()

  // Catégorie "Tes études" — états propres, jamais partagés avec une autre catégorie.
  const [ecole, setEcole] = useState('')
  const [anneeEtudes, setAnneeEtudes] = useState('')
  const [filiere, setFiliere] = useState('')
  const [etudesInitiales, setEtudesInitiales] = useState({ ecole: '', anneeEtudes: '', filiere: '' })
  const [erreursEtudes, setErreursEtudes] = useState({})
  const [etudesErreur, setEtudesErreur] = useState('')
  const [etudesLoading, setEtudesLoading] = useState(false)
  const [etudesSaved, setEtudesSaved] = useState(false)
  const etudesErreurTimeout = useRef(null)
  const etudesChampErreurTimeout = useRef(null)
  const { ref: etudesShakeRef, shake: etudesShake } = useShakeButton()

  // Catégorie "À propos de toi" — états propres. (erreursApropos existe par cohérence ; la bio n'a aucune validation.)
  const [bio, setBio] = useState('')
  const [aproposInitial, setAproposInitial] = useState({ bio: '' })
  const [erreursApropos, setErreursApropos] = useState({})
  const [aproposErreur, setAproposErreur] = useState('')
  const [aproposLoading, setAproposLoading] = useState(false)
  const [aproposSaved, setAproposSaved] = useState(false)
  const aproposErreurTimeout = useRef(null)
  const { ref: aproposShakeRef, shake: aproposShake } = useShakeButton()

  // Catégorie "Ton alternance" — états propres (patch 3c). fonction* = 'recherche' | 'hote' | '' (écrit dans statut_ville_*).
  const [villeEcole, setVilleEcole] = useState('')
  const [villeEntreprise, setVilleEntreprise] = useState('')
  const [fonctionVilleEcole, setFonctionVilleEcole] = useState('')
  const [fonctionVilleEntreprise, setFonctionVilleEntreprise] = useState('')
  const [villesInitiales, setVillesInitiales] = useState({ villeEcole: '', villeEntreprise: '', fonctionVilleEcole: '', fonctionVilleEntreprise: '' })
  const [erreursVilles, setErreursVilles] = useState({})
  const [villesErreur, setVillesErreur] = useState('')
  const [villesLoading, setVillesLoading] = useState(false)
  const [villesSaved, setVillesSaved] = useState(false)
  const villesErreurTimeout = useRef(null)
  const villesChampErreurTimeout = useRef(null)
  const { ref: villesShakeRef, shake: villesShake } = useShakeButton()
  const [showBloqueModal, setShowBloqueModal] = useState(false)

  useEffect(() => {
    if (!user) return
    supabaseClient
      .from('users')
      .select('prenom, nom, email, telephone, sexe, date_naissance, type_user, photo_profil_url, preferences_email, ecole, annee_etudes, filiere, bio, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setUserData(data)
        if (data.prenom) setPrenom(data.prenom)
        if (data.nom) setNom(data.nom)
        if (data.sexe) setSexe(data.sexe)
        if (data.telephone) setTelephone(data.telephone)
        let iso = ''
        if (data.date_naissance) {
          const d = new Date(data.date_naissance)
          setDateNaissance(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)
          setDateNaissanceISO(data.date_naissance)
          iso = data.date_naissance
        }
        if (data.photo_profil_url) setPhotoPreviewUrl(data.photo_profil_url)
        setValeursInitiales({ prenom: data.prenom || '', nom: data.nom || '', dateNaissanceISO: iso, sexe: data.sexe || '', telephone: data.telephone || '' })
        // Patch 3b — Tes études + À propos de toi : poser les valeurs ET les références de comparaison.
        if (data.ecole) setEcole(data.ecole)
        if (data.annee_etudes) setAnneeEtudes(data.annee_etudes)
        if (data.filiere) setFiliere(data.filiere)
        if (data.bio) setBio(data.bio)
        setEtudesInitiales({ ecole: data.ecole || '', anneeEtudes: data.annee_etudes || '', filiere: data.filiere || '' })
        setAproposInitial({ bio: data.bio || '' })
        // Patch 3c — Ton alternance : villes + fonction (statut_ville_*). PIÈGE 3b : sans ces colonnes au SELECT,
        // les champs s'afficheraient vides malgré des valeurs réelles et le 1er enregistrement les écraserait.
        if (data.ville_ecole) setVilleEcole(data.ville_ecole)
        if (data.ville_entreprise) setVilleEntreprise(data.ville_entreprise)
        if (data.statut_ville_ecole) setFonctionVilleEcole(data.statut_ville_ecole)
        if (data.statut_ville_entreprise) setFonctionVilleEntreprise(data.statut_ville_entreprise)
        setVillesInitiales({ villeEcole: data.ville_ecole || '', villeEntreprise: data.ville_entreprise || '', fonctionVilleEcole: data.statut_ville_ecole || '', fonctionVilleEntreprise: data.statut_ville_entreprise || '' })
        if (data.preferences_email) {
          const pe = data.preferences_email
          setPrefs({ alertes: pe.alertes !== false, messages: pe.messages !== false, candidatures: pe.candidatures !== false, paiements: pe.paiements !== false, baux: pe.baux !== false, marketing: pe.marketing !== false })
        }
      })
  }, [user])

  // Listeners globaux du recadrage (drag souris + tactile) — porté verbatim de ModifierProfilPage.
  useEffect(() => {
    const mm = e => { const s = cropStateRef.current; if (!s.dragging) return; s.imgX = s.imgStartX + (e.clientX - s.startX); s.imgY = s.imgStartY + (e.clientY - s.startY); clampCropPosition() }
    const mu = () => { cropStateRef.current.dragging = false }
    const tm = e => { const s = cropStateRef.current; if (!s.dragging || e.touches.length !== 1) return; s.imgX = s.imgStartX + (e.touches[0].clientX - s.startX); s.imgY = s.imgStartY + (e.touches[0].clientY - s.startY); clampCropPosition() }
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu)
    window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', mu)
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', mu) }
  }, [])

  useEffect(() => () => {
    clearTimeout(infosErreurTimeout.current)
    clearTimeout(infosChampErreurTimeout.current)
    clearTimeout(etudesErreurTimeout.current)
    clearTimeout(etudesChampErreurTimeout.current)
    clearTimeout(aproposErreurTimeout.current)
    clearTimeout(villesErreurTimeout.current)
    clearTimeout(villesChampErreurTimeout.current)
    clearTimeout(prefsSaveTimeout.current)
  }, [])

  // Autosave debounce 500 ms — comportement identique à ModifierProfilPage.sauvegarderPrefsEmail.
  function sauvegarderPrefsEmail(newPrefs) {
    setPrefs(newPrefs); setPrefsSaved(false)
    clearTimeout(prefsSaveTimeout.current)
    prefsSaveTimeout.current = setTimeout(async () => {
      const { error } = await supabaseClient.from('users').update({ preferences_email: newPrefs }).eq('id', user.id)
      if (!error) { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) }
    }, 500)
  }

  // --- Date : reformatage JJ/MM/AAAA affiché + ISO envoyé (porté verbatim de ModifierProfilPage) ---
  function handleDateInput(e) {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 8) value = value.slice(0, 8)
    let formatted = ''
    if (value.length > 0) formatted = value.slice(0, 2)
    if (value.length > 2) formatted += '/' + value.slice(2, 4)
    if (value.length > 4) formatted += '/' + value.slice(4, 8)
    const iso = value.length === 8 ? `${value.slice(4, 8)}-${value.slice(2, 4)}-${value.slice(0, 2)}` : ''
    setDateNaissance(formatted)
    setDateNaissanceISO(iso)
    if (erreursChamps.dateNaissance) validerChamp('dateNaissance', { dateNaissance: formatted, dateNaissanceISO: iso })
  }

  // --- Photo + recadrage : fonctions portées verbatim, géométrie inchangée (zone 260px, canvas 400px) ---
  function handlePhotoSelect(e) { if (e.target.files[0]) openCropper(e.target.files[0]) }
  function openCropper(file) {
    if (!file.type.match('image.*')) { afficherErreurInfos('Fichier doit être une image'); setPhotoErreur(true); photoShake(); return }
    if (file.size > 5 * 1024 * 1024) { afficherErreurInfos('Photo max 5 MB'); setPhotoErreur(true); photoShake(); return }
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
  function cancelCrop() { setShowCrop(false); if (photoInputRef.current) photoInputRef.current.value = '' }
  function confirmCrop() {
    const img = cropImageRef.current; const s = cropStateRef.current
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d'); const sourceX = -s.imgX / s.scale; const sourceY = -s.imgY / s.scale; const sourceSize = 260 / s.scale
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 400, 400)
    canvas.toBlob(blob => {
      setPhotoFile(new File([blob], 'photo-profil.jpg', { type: 'image/jpeg' }))
      setPhotoPreviewUrl(URL.createObjectURL(blob)); setShowCrop(false)
      setPhotoErreur(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }, 'image/jpeg', 0.9)
  }

  function afficherErreurInfos(message) {
    setInfosErreur(message)
    shakeBouton()
    clearTimeout(infosErreurTimeout.current)
    infosErreurTimeout.current = setTimeout(() => { setInfosErreur(''); setPhotoErreur(false) }, 3000)
  }

  // Validation pure — retourne { champ: message } ne contenant QUE les champs en défaut.
  // Le contrôle d'âge est dans le `else` final : jamais exécuté sur une date absente ou invalide.
  function validerInfos({ prenom, nom, telephone, dateNaissance, dateNaissanceISO, sexe }) {
    const e = {}
    if (!prenom.trim()) e.prenom = 'Merci de renseigner ton prénom'
    if (!nom.trim()) e.nom = 'Merci de renseigner ton nom'
    if (!telephone.trim()) e.telephone = 'Merci de renseigner ton téléphone'
    if (!dateNaissance || dateNaissance.length !== 10) e.dateNaissance = 'Date de naissance incomplète'
    else if (!dateNaissanceISO) e.dateNaissance = 'Date de naissance invalide'
    else {
      const birthDate = new Date(dateNaissanceISO)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const md = today.getMonth() - birthDate.getMonth()
      if (md < 0 || (md === 0 && today.getDate() < birthDate.getDate())) age--
      if (age < 18) e.dateNaissance = 'Tu dois avoir au moins 18 ans'
    }
    if (!sexe) e.sexe = 'Merci de sélectionner ton sexe'
    return e
  }

  // Valide UN seul champ (onBlur / saisie). valeurs = surcharge pour lire la frappe courante malgré le décalage d'état React.
  function validerChamp(champ, valeurs = {}) {
    const base = { prenom, nom, telephone, dateNaissance, dateNaissanceISO, sexe }
    const erreurs = validerInfos({ ...base, ...valeurs })
    setErreursChamps(prev => {
      const suivant = { ...prev }
      if (erreurs[champ]) suivant[champ] = erreurs[champ]
      else delete suivant[champ]
      return suivant
    })
  }

  // Enregistrement "Infos personnelles" — validation étape 1 (sans isAdmin ni branche proprietaire).
  // Écrit UNIQUEMENT les 6 colonnes de cette catégorie (piège : ne jamais inclure études/alternance/bio/docs/garant).
  async function enregistrerInfosPersonnelles() {
    const erreurs = validerInfos({ prenom, nom, telephone, dateNaissance, dateNaissanceISO, sexe })
    if (Object.keys(erreurs).length > 0) {
      setErreursChamps(erreurs)
      shakeBouton()
      clearTimeout(infosChampErreurTimeout.current)
      infosChampErreurTimeout.current = setTimeout(() => setErreursChamps({}), 3000)
      return
    }
    setErreursChamps({})
    setInfosErreur('')
    setPhotoErreur(false)
    setInfosLoading(true)
    try {
      const updateData = { prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim(), sexe, date_naissance: dateNaissanceISO }
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabaseClient.storage.from('profils').upload(fileName, photoFile, { cacheControl: '3600', upsert: true })
        if (upErr) {
          console.error('[compte] echec upload photo profil', upErr)
          setPhotoErreur(true)
          photoShake()
          throw new Error("Photo non envoyée, rien n'a été enregistré.")
        }
        const { data: urlData } = supabaseClient.storage.from('profils').getPublicUrl(fileName)
        updateData.photo_profil_url = urlData.publicUrl
      }
      const { error } = await supabaseClient.from('users').update(updateData).eq('id', user.id)
      if (error) throw error
      setUserData(prev => ({ ...prev, ...updateData }))
      setValeursInitiales({ prenom: prenom.trim(), nom: nom.trim(), dateNaissanceISO, sexe, telephone: telephone.trim() })
      setPhotoFile(null)
      setErreursChamps({})
      setInfosLoading(false)
      setInfosSaved(true)
      setTimeout(() => setInfosSaved(false), 2000)
    } catch (e) {
      setInfosLoading(false)
      afficherErreurInfos(e.message || "Erreur lors de l'enregistrement")
    }
  }

  // Validation pure de "Tes études" — { champ: message } des seuls champs en défaut. La bio n'a aucune validation.
  function computeErreursEtudes({ ecole, anneeEtudes, filiere }) {
    const e = {}
    if (!ecole.trim()) e.ecole = 'Merci de renseigner ton école'
    if (!anneeEtudes.trim()) e.anneeEtudes = "Merci de renseigner ton année d'études"
    if (!filiere.trim()) e.filiere = 'Merci de renseigner ta filière'
    return e
  }

  // Revalidation d'un seul champ études pendant la frappe (surcharge pour lire la valeur courante).
  function validerChampEtudes(champ, valeurs = {}) {
    const erreurs = computeErreursEtudes({ ecole, anneeEtudes, filiere, ...valeurs })
    setErreursEtudes(prev => {
      const suivant = { ...prev }
      if (erreurs[champ]) suivant[champ] = erreurs[champ]
      else delete suivant[champ]
      return suivant
    })
  }

  // Recopiée VERBATIM de ModifierProfilPage.jsx (jamais réécrite ni simplifiée) : préserve un statut existant,
  // ne devine jamais pour les_deux, remet à null quand la ville est vidée. Validée runtime depuis le 24/07.
  function deriverStatutVille(statutExistant, villeValeur, typeUserReel) {
    if (!villeValeur) return null
    if (statutExistant) return statutExistant
    if (typeUserReel === 'locataire') return 'recherche'
    if (typeUserReel === 'hote') return 'hote'
    return statutExistant // les_deux ou autre cas : ne jamais deviner, on garde tel quel (null si null)
  }

  // Validation V2 pure de "Ton alternance" — erreur SOUS le champ fonction si une ville est renseignée sans fonction.
  // (V1 « au moins une ville » est une erreur GLOBALE, traitée dans enregistrerVilles, pas ici.)
  function computeErreursVilles({ villeEcole, villeEntreprise, fonctionVilleEcole, fonctionVilleEntreprise }) {
    const e = {}
    if (villeEcole.trim() && !fonctionVilleEcole) e.fonctionEcole = 'Indique ce que tu fais dans cette ville.'
    if (villeEntreprise.trim() && !fonctionVilleEntreprise) e.fonctionEntreprise = 'Indique ce que tu fais dans cette ville.'
    return e
  }

  // Revalidation d'un seul champ villes pendant la frappe/sélection (surcharge pour lire la valeur courante).
  function validerChampVilles(champ, valeurs = {}) {
    const erreurs = computeErreursVilles({ villeEcole, villeEntreprise, fonctionVilleEcole, fonctionVilleEntreprise, ...valeurs })
    setErreursVilles(prev => {
      const suivant = { ...prev }
      if (erreurs[champ]) suivant[champ] = erreurs[champ]
      else delete suivant[champ]
      return suivant
    })
  }

  // Fonction d'enregistrement COMMUNE paramétrée par la liste de colonnes (patch 3b).
  // enregistrerInfosPersonnelles n'est PAS migrée ici (prévu patch 5) : deux mécanismes coexistent temporairement.
  // cle route les états de retour visuel propres à chaque catégorie ; colonnes ne contient QUE les colonnes de la catégorie.
  async function enregistrerCategorie({ cle, valider, colonnes, avantEcriture, champsInitiaux }) {
    const ctx = {
      etudes: { setErrs: setErreursEtudes, shake: etudesShake, setErr: setEtudesErreur, setLoading: setEtudesLoading, setSaved: setEtudesSaved, setInit: setEtudesInitiales, timeout: etudesErreurTimeout, champTimeout: etudesChampErreurTimeout },
      apropos: { setErrs: setErreursApropos, shake: aproposShake, setErr: setAproposErreur, setLoading: setAproposLoading, setSaved: setAproposSaved, setInit: setAproposInitial, timeout: aproposErreurTimeout },
      villes: { setErrs: setErreursVilles, shake: villesShake, setErr: setVillesErreur, setLoading: setVillesLoading, setSaved: setVillesSaved, setInit: setVillesInitiales, timeout: villesErreurTimeout, champTimeout: villesChampErreurTimeout },
    }[cle]
    const erreurs = valider()
    if (Object.keys(erreurs).length > 0) {
      ctx.setErrs(erreurs)
      ctx.shake()
      clearTimeout(ctx.champTimeout.current)
      ctx.champTimeout.current = setTimeout(() => ctx.setErrs({}), 3000)
      return
    }
    ctx.setErrs({})
    ctx.setErr('')
    ctx.setLoading(true)
    try {
      // Deux modes d'interruption du crochet, volontairement distincts : un throw = échec réel (ex. upload photo
      // patch 5) → géré par le catch (erreur globale inline, shake, minuterie) ; un retour { interrompu: true } =
      // blocage volontaire par une règle métier (ex. annonce en ligne) → sortie propre, sans erreur ni shake.
      const resultatAvant = avantEcriture ? await avantEcriture() : null
      if (resultatAvant?.interrompu) { ctx.setLoading(false); return }
      const { error } = await supabaseClient.from('users').update(colonnes).eq('id', user.id)
      if (error) throw error
      setUserData(prev => ({ ...prev, ...colonnes }))
      ctx.setInit(champsInitiaux)
      ctx.setErrs({})
      ctx.setLoading(false)
      ctx.setSaved(true)
      setTimeout(() => ctx.setSaved(false), 2000)
    } catch (e) {
      ctx.setLoading(false)
      ctx.setErr(e.message || "Erreur lors de l'enregistrement")
      ctx.shake()
      clearTimeout(ctx.timeout.current)
      ctx.timeout.current = setTimeout(() => ctx.setErr(''), 3000)
    }
  }

  const enregistrerEtudes = () => {
    // Nettoyage UNE seule fois, propagé à l'état affiché, aux colonnes ET à la référence : sinon un espace résiduel
    // laisserait le bouton actif après un enregistrement réussi (état affiché ≠ référence nettoyée).
    const vals = { ecole: ecole.trim(), anneeEtudes: anneeEtudes.trim(), filiere: filiere.trim() }
    setEcole(vals.ecole); setAnneeEtudes(vals.anneeEtudes); setFiliere(vals.filiere)
    return enregistrerCategorie({
      cle: 'etudes',
      valider: () => computeErreursEtudes(vals),
      colonnes: { ecole: vals.ecole, annee_etudes: vals.anneeEtudes, filiere: vals.filiere },
      champsInitiaux: vals,
    })
  }

  const enregistrerApropos = () => {
    const v = bio.trim()
    setBio(v)
    return enregistrerCategorie({
      cle: 'apropos',
      valider: () => ({}),
      colonnes: { bio: v || null },
      champsInitiaux: { bio: v },
    })
  }

  // Crochet avantEcriture (patch 3c) : un pôle est VERROUILLÉ si sa fonction INITIALE valait 'hote' ET que l'une
  // de ces conditions est vraie — (a) la fonction saisie n'est plus 'hote' (changement de fonction, ou ville vidée) ;
  // (b) la ville saisie diffère de la ville initiale (comparaison sur valeurs déjà nettoyées des espaces). Un pôle
  // verrouillé qui porte une annonce bloque : le rapprochement se fait sur annonces.pole ('ecole'|'entreprise',
  // NOT NULL + UNIQUE user_id,pole), JAMAIS sur un nom de ville (DETTE #144). N'écrit rien, ouvre la modale et
  // retourne { interrompu: true } ; ne lève aucune exception (le catch de enregistrerCategorie reste intact).
  async function controleAnnonceBloquante({ vEcole, fEcole, vEntreprise, fEntreprise }) {
    const verrouille = {
      ecole: villesInitiales.fonctionVilleEcole === 'hote' && (fEcole !== 'hote' || vEcole !== villesInitiales.villeEcole),
      entreprise: villesInitiales.fonctionVilleEntreprise === 'hote' && (fEntreprise !== 'hote' || vEntreprise !== villesInitiales.villeEntreprise),
    }
    if (!verrouille.ecole && !verrouille.entreprise) return null
    const { data: annoncesUser } = await supabaseClient.from('annonces').select('id, pole').eq('user_id', user.id)
    const poles = (annoncesUser || []).map(a => a.pole)
    const bloque = (verrouille.ecole && poles.includes('ecole')) || (verrouille.entreprise && poles.includes('entreprise'))
    if (bloque) { setShowBloqueModal(true); return { interrompu: true } }
    return null
  }

  const enregistrerVilles = () => {
    // Nettoyage UNE seule fois (propagé état affiché + colonnes + référence, cf. patch 3b). Fonction remise à ''
    // si la ville est vide : le champ fonction n'est alors pas affiché, son état ne doit pas rester renseigné.
    const vEcole = villeEcole.trim()
    const vEntreprise = villeEntreprise.trim()
    const fEcole = vEcole ? fonctionVilleEcole : ''
    const fEntreprise = vEntreprise ? fonctionVilleEntreprise : ''
    setVilleEcole(vEcole); setVilleEntreprise(vEntreprise)
    setFonctionVilleEcole(fEcole); setFonctionVilleEntreprise(fEntreprise)

    // V1 (erreur GLOBALE) : au moins une ville renseignée. Minuterie globale dédiée (villesErreurTimeout).
    if (!vEcole && !vEntreprise) {
      setVillesErreur('Renseigne au moins une ville.')
      villesShake()
      clearTimeout(villesErreurTimeout.current)
      villesErreurTimeout.current = setTimeout(() => setVillesErreur(''), 3000)
      return
    }

    const typeUserReel = userData?.type_user
    // type_user déduit des deux fonctions présentes (ville renseignée).
    const fonctionsPresentes = [fEcole, fEntreprise].filter(Boolean)
    const aRecherche = fonctionsPresentes.includes('recherche')
    const aHote = fonctionsPresentes.includes('hote')
    const typeUserDeduit = aRecherche && aHote ? 'les_deux' : aHote ? 'hote' : 'locataire'

    // colonnes : EXACTEMENT ces 5 (jamais une de plus). deriverStatutVille reçoit la fonction saisie comme statut
    // existant → un choix explicite prime toujours. GARDE-FOU : ne pas écraser un type_user 'proprietaire'.
    const colonnes = {
      ville_ecole: vEcole || null,
      ville_entreprise: vEntreprise || null,
      statut_ville_ecole: deriverStatutVille(fEcole, vEcole, typeUserReel),
      statut_ville_entreprise: deriverStatutVille(fEntreprise, vEntreprise, typeUserReel),
    }
    if (typeUserReel !== 'proprietaire') colonnes.type_user = typeUserDeduit

    return enregistrerCategorie({
      cle: 'villes',
      valider: () => computeErreursVilles({ villeEcole: vEcole, villeEntreprise: vEntreprise, fonctionVilleEcole: fEcole, fonctionVilleEntreprise: fEntreprise }),
      colonnes,
      avantEcriture: () => controleAnnonceBloquante({ vEcole, fEcole, vEntreprise, fEntreprise }),
      champsInitiaux: { villeEcole: vEcole, villeEntreprise: vEntreprise, fonctionVilleEcole: fEcole, fonctionVilleEntreprise: fEntreprise },
    })
  }

  const estProprietaire = userData?.type_user === 'proprietaire'

  // Garde-fou : si la catégorie active vient d'être masquée pour un propriétaire, revenir sur une catégorie visible.
  // AVANT le retour anticipé `if (!user) return null` — un hook ne doit jamais suivre un return conditionnel.
  useEffect(() => {
    if (estProprietaire && (categorieActive === 'etudes' || categorieActive === 'alternance')) {
      setCategorieActive('infos')
    }
  }, [estProprietaire, categorieActive])

  if (!user) return null

  const roleLabel = userData
    ? (userData.type_user === 'proprietaire' ? 'Proprietaire'
      : userData.type_user === 'hote' ? 'Hote'
      : userData.type_user === 'les_deux' ? 'Locataire & Hote'
      : 'Locataire')
    : ''

  const libelleActif = GROUPES
    .flatMap(g => g.items)
    .find(i => i.id === categorieActive)?.libelle || ''

  // Comparaison par valeur : remettre la valeur d'origine annule la modification. RÉSERVÉ à "Infos personnelles".
  const formModifie = (
    prenom !== valeursInitiales.prenom ||
    nom !== valeursInitiales.nom ||
    dateNaissanceISO !== valeursInitiales.dateNaissanceISO ||
    sexe !== valeursInitiales.sexe ||
    telephone !== valeursInitiales.telephone ||
    photoFile !== null
  )

  // Comparaisons par valeur, une par nouvelle catégorie (jamais élargir formModifie).
  const etudesModifie = (
    ecole !== etudesInitiales.ecole ||
    anneeEtudes !== etudesInitiales.anneeEtudes ||
    filiere !== etudesInitiales.filiere
  )
  const aproposModifie = bio !== aproposInitial.bio
  const villesModifie = (
    villeEcole !== villesInitiales.villeEcole ||
    villeEntreprise !== villesInitiales.villeEntreprise ||
    fonctionVilleEcole !== villesInitiales.fonctionVilleEcole ||
    fonctionVilleEntreprise !== villesInitiales.fonctionVilleEntreprise
  )

  // Masquage catégories pour les propriétaires (ni "Tes études" ni "Ton alternance" : un propriétaire n'est pas alternant).
  const groupesVisibles = GROUPES
    .map(g => ({ ...g, items: g.items.filter(i => !(estProprietaire && (i.id === 'etudes' || i.id === 'alternance'))) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="gc-page">
      <div className="gc-layout">
        <aside className="gc-sidebar">
          <div className="gc-identite">
            {userData?.photo_profil_url
              ? <img className="gc-avatar" src={userData.photo_profil_url} alt="" />
              : <div className="gc-avatar gc-avatar-initiales">{getInitials(userData?.prenom, userData?.nom)}</div>
            }
            <div className="gc-identite-texte">
              <div className="gc-identite-nom">{userData ? `${userData.prenom} ${userData.nom}` : '...'}</div>
              <div className="gc-identite-role">{roleLabel}</div>
            </div>
          </div>

          {groupesVisibles.map(groupe => (
            <div key={groupe.label} className="gc-groupe">
              <div className="gc-groupe-label">{groupe.label}</div>
              {groupe.items.map(({ id, libelle, Icone }) => (
                <button
                  key={id}
                  type="button"
                  className={`gc-item ${categorieActive === id ? 'gc-item-actif' : ''}`}
                  onClick={() => setCategorieActive(id)}
                >
                  <Icone />
                  <span>{libelle}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="gc-panel">
          <div className="gc-panel-titre">{libelleActif}</div>

          {categorieActive === 'compte' && (
            <>
              <div className="gc-ligne">
                <div><div className="gc-ligne-label">Adresse email</div></div>
                <div className="gc-ligne-valeur">{userData?.email}</div>
              </div>
              <div className="gc-ligne">
                <div><div className="gc-ligne-label">Type de compte</div></div>
                <div className="gc-ligne-valeur">{roleLabel}</div>
              </div>

              <div className="gc-sous-titre">Sécurité</div>
              <div className="gc-ligne gc-ligne-cliquable" onClick={openPasswordModal}>
                <div>
                  <div className="gc-ligne-label">Changer mon mot de passe</div>
                </div>
                <span className="gc-ligne-action">Modifier</span>
              </div>

              <div className="gc-sous-titre">Tes données</div>
              <div className="gc-ligne gc-ligne-cliquable" onClick={exporterDonnees}>
                <div>
                  <div className="gc-ligne-label">Exporter mes données</div>
                  <div className="gc-ligne-desc">Télécharge toutes tes données en JSON</div>
                </div>
                <span className="gc-ligne-action">Exporter</span>
              </div>

              <div className="gc-sous-titre gc-sous-titre-danger">Zone danger</div>
              <div className="gc-ligne gc-ligne-cliquable" onClick={openDeleteModal}>
                <div>
                  <div className="gc-ligne-label">Supprimer mon compte</div>
                  <div className="gc-ligne-desc">Cette action est irréversible</div>
                </div>
                <span className="gc-ligne-action gc-ligne-action-danger">Supprimer</span>
              </div>

              <button className="gc-logout" onClick={() => { signOut(); navigate('/') }}>Se déconnecter</button>
            </>
          )}

          {categorieActive === 'notifications' && (
            <>
              {PREFS_EMAIL.map(p => (
                <div className="gc-ligne" key={p.key}>
                  <div>
                    <div className="gc-ligne-label">{p.label}</div>
                    <div className="gc-ligne-desc">{p.desc}</div>
                  </div>
                  <label className="gc-toggle">
                    <input type="checkbox" checked={prefs[p.key]} onChange={e => sauvegarderPrefsEmail({ ...prefs, [p.key]: e.target.checked })} />
                    <span className="gc-toggle-slider" />
                  </label>
                </div>
              ))}
              <div className={`gc-prefs-saved${prefsSaved ? ' gc-prefs-saved-visible' : ''}`}>Préférences sauvegardées</div>
            </>
          )}

          {categorieActive === 'infos' && (
            <>
              <input type="file" ref={photoInputRef} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              <div className="gc-ligne gc-ligne-photo">
                <div
                  ref={photoShakeRef}
                  className={`gc-photo-circle${photoErreur ? ' gc-photo-invalide' : ''}`}
                  onClick={() => photoInputRef.current?.click()}
                  title="Modifier ta photo"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInputRef.current?.click() } }}
                >
                  {photoPreviewUrl
                    ? <img src={photoPreviewUrl} alt="Ta photo de profil" />
                    : <div className="gc-photo-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                  }
                  <div className="gc-photo-voile" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  </div>
                </div>
                <button type="button" className="gc-ligne-action" onClick={() => photoInputRef.current?.click()}>
                  {photoPreviewUrl ? 'Modifier' : 'Ajouter'}
                </button>
              </div>

              <div className="gc-form-row">
                <div className="gc-champ"><label className="gc-label">Prénom <span className="gc-required">*</span></label><input className={`gc-input${erreursChamps.prenom ? ' gc-champ-invalide' : ''}`} type="text" value={prenom} onChange={e => { const v = capitalizeWords(e.target.value); setPrenom(v); if (erreursChamps.prenom) validerChamp('prenom', { prenom: v }) }} placeholder="Prénom" /><div className="gc-champ-erreur-slot">{erreursChamps.prenom && <p className="gc-champ-erreur">{erreursChamps.prenom}</p>}</div></div>
                <div className="gc-champ"><label className="gc-label">Nom <span className="gc-required">*</span></label><input className={`gc-input${erreursChamps.nom ? ' gc-champ-invalide' : ''}`} type="text" value={nom} onChange={e => { const v = capitalizeWords(e.target.value); setNom(v); if (erreursChamps.nom) validerChamp('nom', { nom: v }) }} placeholder="Nom" /><div className="gc-champ-erreur-slot">{erreursChamps.nom && <p className="gc-champ-erreur">{erreursChamps.nom}</p>}</div></div>
              </div>
              <div className="gc-form-row">
                <div className="gc-champ"><label className="gc-label">Date de naissance <span className="gc-required">*</span></label><input className={`gc-input${erreursChamps.dateNaissance ? ' gc-champ-invalide' : ''}`} type="text" value={dateNaissance} onChange={handleDateInput} placeholder="JJ/MM/AAAA" maxLength="10" autoComplete="off" inputMode="numeric" /><div className="gc-champ-erreur-slot">{erreursChamps.dateNaissance && <p className="gc-champ-erreur">{erreursChamps.dateNaissance}</p>}</div></div>
                <div className="gc-champ"><label className="gc-label">Sexe <span className="gc-required">*</span></label>
                  <div className={`gc-champ-select${erreursChamps.sexe ? ' gc-champ-select-invalide' : ''}`}>
                    <CustomSelect
                      name="sexe"
                      options={SEXE_OPTIONS}
                      value={sexe}
                      onChange={e => { const v = e.target.value; setSexe(v); if (erreursChamps.sexe) validerChamp('sexe', { sexe: v }) }}
                      placeholder="Sélectionner"
                    />
                  </div>
                  <div className="gc-champ-erreur-slot">{erreursChamps.sexe && <p className="gc-champ-erreur">{erreursChamps.sexe}</p>}</div>
                </div>
              </div>
              <div className="gc-champ gc-champ-moitie"><label className="gc-label">Téléphone <span className="gc-required">*</span></label><input className={`gc-input${erreursChamps.telephone ? ' gc-champ-invalide' : ''}`} type="tel" value={telephone} onChange={e => { const v = e.target.value; setTelephone(v); if (erreursChamps.telephone) validerChamp('telephone', { telephone: v }) }} placeholder="06 12 34 56 78" /><div className="gc-champ-erreur-slot">{erreursChamps.telephone && <p className="gc-champ-erreur">{erreursChamps.telephone}</p>}</div></div>

              <BoutonEnregistrer onSave={enregistrerInfosPersonnelles} modifie={formModifie} loading={infosLoading} ok={infosSaved} erreur={infosErreur} btnRef={shakeRef} />
            </>
          )}

          {categorieActive === 'etudes' && (
            <>
              <div className="gc-champ">
                <label className="gc-label">École / Université <span className="gc-required">*</span></label>
                <div className={`gc-champ-autocomplete${erreursEtudes.ecole ? ' gc-champ-autocomplete-invalide' : ''}`}>
                  <AutocompleteInput name="ecole" value={ecole} suggestions={ECOLES_SUGGESTIONS} placeholder="Recherche ton école…"
                    onChange={e => { const v = e.target.value; setEcole(v); if (erreursEtudes.ecole) validerChampEtudes('ecole', { ecole: v }) }} />
                </div>
                <div className="gc-champ-erreur-slot">{erreursEtudes.ecole && <p className="gc-champ-erreur">{erreursEtudes.ecole}</p>}</div>
              </div>
              <div className="gc-champ">
                <label className="gc-label">Année d'études <span className="gc-required">*</span></label>
                <div className={`gc-champ-autocomplete${erreursEtudes.anneeEtudes ? ' gc-champ-autocomplete-invalide' : ''}`}>
                  <AutocompleteInput name="anneeEtudes" value={anneeEtudes} suggestions={ANNEES_SUGGESTIONS} placeholder="Ton niveau…"
                    onChange={e => { const v = e.target.value; setAnneeEtudes(v); if (erreursEtudes.anneeEtudes) validerChampEtudes('anneeEtudes', { anneeEtudes: v }) }} />
                </div>
                <div className="gc-champ-erreur-slot">{erreursEtudes.anneeEtudes && <p className="gc-champ-erreur">{erreursEtudes.anneeEtudes}</p>}</div>
              </div>
              <div className="gc-champ">
                <label className="gc-label">Filière / Domaine <span className="gc-required">*</span></label>
                <div className={`gc-champ-autocomplete${erreursEtudes.filiere ? ' gc-champ-autocomplete-invalide' : ''}`}>
                  <AutocompleteInput name="filiere" value={filiere} suggestions={FILIERES_SUGGESTIONS} placeholder="Ton domaine…"
                    onChange={e => { const v = e.target.value; setFiliere(v); if (erreursEtudes.filiere) validerChampEtudes('filiere', { filiere: v }) }} />
                </div>
                <div className="gc-champ-erreur-slot">{erreursEtudes.filiere && <p className="gc-champ-erreur">{erreursEtudes.filiere}</p>}</div>
              </div>
              <BoutonEnregistrer onSave={enregistrerEtudes} modifie={etudesModifie} loading={etudesLoading} ok={etudesSaved} erreur={etudesErreur} btnRef={etudesShakeRef} />
            </>
          )}

          {categorieActive === 'apropos' && (
            <>
              <div className="gc-champ">
                <label className="gc-label">À propos de toi</label>
                <div className="gc-champ-textarea">
                  <TextArea name="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Parle de toi, tes centres d'intérêts…" maxLength={300} rows={5} />
                </div>
                <p className="gc-hint-bio">Optionnel — Max 300 caractères</p>
              </div>
              <BoutonEnregistrer onSave={enregistrerApropos} modifie={aproposModifie} loading={aproposLoading} ok={aproposSaved} erreur={aproposErreur} btnRef={aproposShakeRef} />
            </>
          )}

          {categorieActive === 'alternance' && (
            <>
              <div className="gc-champ">
                <label className="gc-label">Ville de ton école</label>
                <div className="gc-champ-autocomplete">
                  <AutocompleteInput name="villeEcole" value={villeEcole} suggestions={VILLES_DISPONIBLES} placeholder="Ta ville d'école…"
                    onChange={e => { const v = e.target.value; setVilleEcole(v); if (villesErreur) setVillesErreur(''); if (!v.trim()) setFonctionVilleEcole('') }} />
                </div>
                <div className="gc-champ-erreur-slot" />
              </div>
              {villeEcole.trim() && (
                <div className="gc-champ">
                  <label className="gc-label">Dans cette ville <span className="gc-required">*</span></label>
                  <div className={`gc-champ-select${erreursVilles.fonctionEcole ? ' gc-champ-select-invalide' : ''}`}>
                    <CustomSelect name="fonctionVilleEcole" options={FONCTION_OPTIONS} value={fonctionVilleEcole} placeholder="Sélectionner"
                      onChange={e => { const v = e.target.value; setFonctionVilleEcole(v); if (erreursVilles.fonctionEcole) validerChampVilles('fonctionEcole', { fonctionVilleEcole: v }) }} />
                  </div>
                  <div className="gc-champ-erreur-slot">{erreursVilles.fonctionEcole && <p className="gc-champ-erreur">{erreursVilles.fonctionEcole}</p>}</div>
                </div>
              )}
              <div className="gc-champ">
                <label className="gc-label">Ville de ton entreprise</label>
                <div className="gc-champ-autocomplete">
                  <AutocompleteInput name="villeEntreprise" value={villeEntreprise} suggestions={VILLES_DISPONIBLES} placeholder="Ta ville d'entreprise…"
                    onChange={e => { const v = e.target.value; setVilleEntreprise(v); if (villesErreur) setVillesErreur(''); if (!v.trim()) setFonctionVilleEntreprise('') }} />
                </div>
                <div className="gc-champ-erreur-slot" />
              </div>
              {villeEntreprise.trim() && (
                <div className="gc-champ">
                  <label className="gc-label">Dans cette ville <span className="gc-required">*</span></label>
                  <div className={`gc-champ-select${erreursVilles.fonctionEntreprise ? ' gc-champ-select-invalide' : ''}`}>
                    <CustomSelect name="fonctionVilleEntreprise" options={FONCTION_OPTIONS} value={fonctionVilleEntreprise} placeholder="Sélectionner"
                      onChange={e => { const v = e.target.value; setFonctionVilleEntreprise(v); if (erreursVilles.fonctionEntreprise) validerChampVilles('fonctionEntreprise', { fonctionVilleEntreprise: v }) }} />
                  </div>
                  <div className="gc-champ-erreur-slot">{erreursVilles.fonctionEntreprise && <p className="gc-champ-erreur">{erreursVilles.fonctionEntreprise}</p>}</div>
                </div>
              )}
              <BoutonEnregistrer onSave={enregistrerVilles} modifie={villesModifie} loading={villesLoading} ok={villesSaved} erreur={villesErreur} btnRef={villesShakeRef} />
            </>
          )}

          {categorieActive !== 'compte' && categorieActive !== 'notifications' && categorieActive !== 'infos' && categorieActive !== 'etudes' && categorieActive !== 'apropos' && categorieActive !== 'alternance' && (
            <div className="gc-placeholder">Cette section arrive au prochain patch.</div>
          )}
        </section>
      </div>

      {/* Modale de recadrage (code maison porté, classes scopées gc-, rendue conditionnellement) */}
      {showCrop && (
        <div className="gc-crop-overlay">
          <div className="gc-crop-modal">
            <h3>Recadre ta photo</h3>
            <p className="gc-crop-hint">Déplace et zoome pour ajuster</p>
            <div className="gc-crop-area" onMouseDown={handleCropMouseDown} onTouchStart={handleCropTouchStart}>
              <img ref={cropImageRef} src={cropImageSrc} alt="Photo à recadrer" onLoad={handleCropImageLoad} />
            </div>
            <div className="gc-crop-zoom">
              <label>Zoom</label>
              <input type="range" min={cropZoomMin} max={cropZoomMax} value={cropZoom} onChange={handleCropZoom} />
            </div>
            <div className="gc-crop-actions">
              <button className="gc-crop-cancel" onClick={cancelCrop}>Annuler</button>
              <button className="gc-crop-confirm" onClick={confirmCrop}>Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale mot de passe (balisage repris de ParametresPage, classes scopées gc-) */}
      {showPasswordModal && (
        <div className="gc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false) }}>
          <div className="gc-modal-pwd-card">
            <h3>Changer mon mot de passe</h3>
            {pwdMsg.text && <div className={`gc-modal-pwd-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
            <div className="gc-modal-pwd-group">
              <label>Nouveau mot de passe</label>
              <div className="pw-field">
                <input type={showPwdNew ? 'text' : 'password'} className="pw-has-reveal" placeholder="Minimum 8 caractères" minLength="8" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
                <PasswordRevealButton visible={showPwdNew} onToggle={() => setShowPwdNew(v => !v)} />
              </div>
            </div>
            <div className="gc-modal-pwd-group">
              <label>Confirmer le nouveau mot de passe</label>
              <div className="pw-field">
                <input type={showPwdConfirm ? 'text' : 'password'} className="pw-has-reveal" placeholder="Retape ton mot de passe" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
                <PasswordRevealButton visible={showPwdConfirm} onToggle={() => setShowPwdConfirm(v => !v)} />
              </div>
            </div>
            <div className="gc-modal-pwd-buttons">
              <button className="gc-modal-pwd-btn-cancel" onClick={() => setShowPasswordModal(false)}>Annuler</button>
              <button className="gc-modal-pwd-btn-save" onClick={changerMotDePasse}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale suppression (balisage repris de ParametresPage, classes scopées gc-) */}
      {showDeleteModal && (
        <div className="gc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="gc-modal-delete-card">
            <div className="gc-modal-delete-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3>Supprimer ton compte ?</h3>
            <p>Cette action est <strong>irréversible</strong>. Toutes tes données seront définitivement supprimées.</p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input type="text" className="gc-modal-delete-confirm-input" placeholder="SUPPRIMER" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            <div className="gc-modal-delete-buttons">
              <button className="gc-modal-delete-btn-cancel" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="gc-modal-delete-btn-delete" disabled={deleteConfirm.trim() !== 'SUPPRIMER'} onClick={supprimerCompte}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de blocage (patch 3c) : annonce en ligne sur un pôle qui quitte le statut hôte. Calquée sur la
          modale de suppression, SANS champ de confirmation, un seul bouton. Réutilise .gc-modal-overlay. */}
      {showBloqueModal && (
        <div className="gc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowBloqueModal(false) }}>
          <div className="gc-modal-bloque-card">
            <div className="gc-modal-bloque-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3>Annonce en ligne</h3>
            <p>Tu as une annonce en ligne dans cette ville. Tant qu'elle est en ligne, tu ne peux ni changer cette ville ni changer ce que tu y fais. Supprime-la depuis ton tableau de bord si tu veux modifier.</p>
            <div className="gc-modal-bloque-buttons">
              <button className="gc-modal-bloque-btn-ok" onClick={() => setShowBloqueModal(false)}>J'ai compris</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
