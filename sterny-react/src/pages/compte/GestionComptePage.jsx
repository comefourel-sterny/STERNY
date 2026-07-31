import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import useAccountActions from '../../hooks/useAccountActions'
import { getInitials } from '../../utils/formatters'
import PasswordRevealButton from '../../components/PasswordRevealButton'
import { useShakeButton } from '../../components/auth-wizard/useShakeButton'
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
  const photoInputRef = useRef(null)
  const [showCrop, setShowCrop] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const cropImageRef = useRef(null)
  const cropStateRef = useRef({ imgX: 0, imgY: 0, scale: 1, dragging: false, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })
  const [cropZoom, setCropZoom] = useState(100)
  const [cropZoomMin, setCropZoomMin] = useState(100)
  const [cropZoomMax, setCropZoomMax] = useState(300)
  const infosErreurTimeout = useRef(null)
  const { ref: shakeRef, shake: shakeBouton } = useShakeButton()

  useEffect(() => {
    if (!user) return
    supabaseClient
      .from('users')
      .select('prenom, nom, email, telephone, sexe, date_naissance, type_user, photo_profil_url, preferences_email')
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

  useEffect(() => () => clearTimeout(infosErreurTimeout.current), [])

  useEffect(() => {
    if (Object.keys(erreursChamps).length === 0) return
    const t = setTimeout(() => setErreursChamps({}), 3000)
    return () => clearTimeout(t)
  }, [erreursChamps])

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
    if (!file.type.match('image.*')) { afficherErreurInfos('Fichier doit être une image'); return }
    if (file.size > 5 * 1024 * 1024) { afficherErreurInfos('Photo max 5 MB'); return }
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
      if (photoInputRef.current) photoInputRef.current.value = ''
    }, 'image/jpeg', 0.9)
  }

  function afficherErreurInfos(message) {
    setInfosErreur(message)
    shakeBouton()
    clearTimeout(infosErreurTimeout.current)
    infosErreurTimeout.current = setTimeout(() => setInfosErreur(''), 3000)
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
      return
    }
    setErreursChamps({})
    setInfosErreur('')
    setInfosLoading(true)
    try {
      const updateData = { prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim(), sexe, date_naissance: dateNaissanceISO }
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabaseClient.storage.from('profils').upload(fileName, photoFile, { cacheControl: '3600', upsert: true })
        if (!upErr) { const { data: urlData } = supabaseClient.storage.from('profils').getPublicUrl(fileName); updateData.photo_profil_url = urlData.publicUrl }
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

  // Comparaison par valeur : remettre la valeur d'origine annule la modification.
  const formModifie = (
    prenom !== valeursInitiales.prenom ||
    nom !== valeursInitiales.nom ||
    dateNaissanceISO !== valeursInitiales.dateNaissanceISO ||
    sexe !== valeursInitiales.sexe ||
    telephone !== valeursInitiales.telephone ||
    photoFile !== null
  )

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

          {GROUPES.map(groupe => (
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
                  className="gc-photo-circle"
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
                  <select className={`gc-select${!sexe ? ' gc-select-placeholder' : ''}${erreursChamps.sexe ? ' gc-champ-invalide' : ''}`} value={sexe} onChange={e => { const v = e.target.value; setSexe(v); if (erreursChamps.sexe) validerChamp('sexe', { sexe: v }) }}>
                    <option value="" disabled>Sélectionner</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                    <option value="non-precise">Non précisé</option>
                  </select>
                  <div className="gc-champ-erreur-slot">{erreursChamps.sexe && <p className="gc-champ-erreur">{erreursChamps.sexe}</p>}</div>
                </div>
              </div>
              <div className="gc-champ gc-champ-moitie"><label className="gc-label">Téléphone <span className="gc-required">*</span></label><input className={`gc-input${erreursChamps.telephone ? ' gc-champ-invalide' : ''}`} type="tel" value={telephone} onChange={e => { const v = e.target.value; setTelephone(v); if (erreursChamps.telephone) validerChamp('telephone', { telephone: v }) }} placeholder="06 12 34 56 78" /><div className="gc-champ-erreur-slot">{erreursChamps.telephone && <p className="gc-champ-erreur">{erreursChamps.telephone}</p>}</div></div>

              <BoutonEnregistrer onSave={enregistrerInfosPersonnelles} modifie={formModifie} loading={infosLoading} ok={infosSaved} erreur={infosErreur} btnRef={shakeRef} />
            </>
          )}

          {categorieActive !== 'compte' && categorieActive !== 'notifications' && categorieActive !== 'infos' && (
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
    </div>
  )
}
