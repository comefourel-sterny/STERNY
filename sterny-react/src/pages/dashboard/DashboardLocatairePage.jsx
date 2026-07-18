import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import { getInitials } from '../../utils/formatters'
import { getVillesUtilisateur } from '../../utils/deriveVilleColonnes'
import AgendaCard from '../../components/dashboard/AgendaCard'
import RythmeCarousel from '../../components/rhythm/RythmeCarousel'
import ChatComponent from '../../components/chat/ChatComponent'
import './DashboardLocatairePage.css'

const VILLES_DISPONIBLES = [
  'Rennes', 'Nantes', 'Brest', 'Quimper', 'Lorient', 'Vannes',
  'Saint-Brieuc', 'Ploermel', 'Carhaix', 'Morlaix', 'Lannion',
  'Douarnenez', 'Guingamp', 'Ploufragan', 'Saint-Malo', 'Dinan', 'Vitre'
]

const MOIS_NOMS = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']

export default function DashboardLocatairePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  // Profile state
  const [userData, setUserData] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isLesDeux, setIsLesDeux] = useState(false)
  const [isHoteOnly, setIsHoteOnly] = useState(false)
  const [currentMode, setCurrentMode] = useState('recherche')
  const [hoteDataLoaded, setHoteDataLoaded] = useState(false)

  // Data state
  const [contrats, setContrats] = useState([])
  const [renouvellements, setRenouvellements] = useState({})
  const [alertes, setAlertes] = useState([])
  const [favoris, setFavoris] = useState([])
  const [candidatures, setCandidatures] = useState([])
  const [candidaturesRecues, setCandidaturesRecues] = useState([])
  const [candidaturesEnvoyeesHote, setCandidaturesEnvoyeesHote] = useState([])
  const [confirmCandidature, setConfirmCandidature] = useState(null)
  const [annonces, setAnnonces] = useState([])
  const [referralCode, setReferralCode] = useState('...')
  const [proprioData, setProprioData] = useState(null)
  const [proprioNom, setProprioNom] = useState(null)
  const [locataireAccepte, setLocataireAccepte] = useState(null)

  // UI state
  const [showMessagesOverlay, setShowMessagesOverlay] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [showAlerteModal, setShowAlerteModal] = useState(false)
  const [alerteEditMode, setAlerteEditMode] = useState(false)
  const [editingAlerteId, setEditingAlerteId] = useState(null)
  const [alerteCalMonth, setAlerteCalMonth] = useState(new Date().getMonth())
  const [alerteCalYear, setAlerteCalYear] = useState(new Date().getFullYear())
  const [alerteSelectedDate, setAlerteSelectedDate] = useState(null)
  const [alerteError, setAlerteError] = useState('')
  const [alerteSuccess, setAlerteSuccess] = useState('')
  const [showVilleModal, setShowVilleModal] = useState(false)
  const [villeModalInput, setVilleModalInput] = useState('')
  const [villeModalSelected, setVilleModalSelected] = useState('')
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  // Sélecteur segmenté 2 villes (état purement visuel : ne pilote aucun autre contenu du dashboard).
  // false = 1ère ville (villesUser[0]) active par défaut à l'ouverture.
  const [afficheVilleSecondaire, setAfficheVilleSecondaire] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [proprietaireEmail, setProprietaireEmail] = useState('')
  const [relationStatus, setRelationStatus] = useState('form') // form, sending, success, pending
  const [pendingEmail, setPendingEmail] = useState('')
  const plusMenuRef = useRef(null)

  // Fermer le menu + au clic extérieur
  useEffect(() => {
    if (!showPlusMenu) return
    const handleClick = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
        setShowPlusMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPlusMenu])

  // Load profile on mount
  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  async function loadProfile() {
    try {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser()
      if (!authUser) return

      setCurrentUserId(authUser.id)

      const { data: uData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (uData) {
        setUserData(uData)
        const lesDeux = uData.type_user === 'les_deux' || (uData.statut_ville_ecole === 'hote' && uData.statut_ville_entreprise === 'recherche')
        const hoteOnly = uData.type_user === 'hote'
        setIsLesDeux(lesDeux)
        setIsHoteOnly(hoteOnly)

        if (hoteOnly) {
          setCurrentMode('hote')
        }

        if (uData.invitation_token) {
          setReferralCode(uData.invitation_token)
        }

        // Load common data
        await Promise.all([
          loadLocations(authUser.id),
          loadAlertes(authUser.id),
          loadFavoris(authUser.id),
          loadMesCandidatures(authUser.id),
          supabaseClient.from('messages').select('id', { count: 'exact', head: true }).eq('destinataire_id', authUser.id).eq('lu', false).then(({ count }) => setHasUnread(count > 0)),
        ])

        // Auto-load hote data for hote-only users
        if (hoteOnly) {
          setHoteDataLoaded(true)
          await verifierMiseEnRelation(uData)
          await loadParrainage(uData)
          await loadAnnonces(authUser.id)
          await loadCandidaturesRecues(authUser.id)
          await loadCandidaturesEnvoyeesHote(authUser.id)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // === LOCATIONS ===
  async function loadLocations(userId) {
    try {
      const { data: contratsData, error } = await supabaseClient
        .from('contrats')
        .select('*, annonces(titre, ville, photos)')
        .eq('locataire_id', userId)
        .eq('statut', 'signe')
        .order('date_fin', { ascending: true })

      if (error || !contratsData || contratsData.length === 0) return

      const contratIds = contratsData.map(c => c.id)
      const { data: renouvData } = await supabaseClient
        .from('renouvellements')
        .select('*')
        .in('contrat_original_id', contratIds)
        .in('statut', ['demande_locataire', 'acceptee', 'refusee', 'contrat_genere'])

      const renMap = {}
      if (renouvData) {
        renouvData.forEach(r => { renMap[r.contrat_original_id] = r })
      }

      setContrats(contratsData)
      setRenouvellements(renMap)
    } catch (error) {
      console.error('Erreur locations:', error)
    }
  }

  // === ALERTES ===
  async function loadAlertes(userId) {
    try {
      const { data } = await supabaseClient
        .from('alertes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setAlertes(data)
      }
    } catch (error) {
      console.error('Erreur alertes:', error)
    }
  }

  // === FAVORIS ===
  async function loadFavoris(userId) {
    try {
      const { data: favData } = await supabaseClient.from('favoris').select('annonce_id').eq('user_id', userId)
      if (!favData || favData.length === 0) return
      const ids = favData.map(f => f.annonce_id)
      const { data: annonces } = await supabaseClient.from('annonces').select('*').in('id', ids)
      if (annonces) setFavoris(annonces)
    } catch (error) {
      console.error('Erreur favoris:', error)
    }
  }

  // === CANDIDATURES ===
  async function loadMesCandidatures(userId) {
    try {
      const { data } = await supabaseClient
        .from('candidatures')
        .select('*, annonces(id, titre, ville, prix, photos, type_logement, surface)')
        .eq('locataire_id', userId)
        .order('created_at', { ascending: false })
      if (data) setCandidatures(data)
    } catch (error) {
      console.error('Erreur candidatures:', error)
    }
  }

  // === SWITCH MODE ===
  async function switchMode(mode) {
    setCurrentMode(mode)
    if (mode === 'hote' && !hoteDataLoaded) {
      setHoteDataLoaded(true)
      await verifierMiseEnRelation()
      await loadParrainage()
      if (currentUserId) {
        await loadAnnonces(currentUserId)
        await loadCandidaturesRecues(currentUserId)
        await loadCandidaturesEnvoyeesHote(currentUserId)
      }
    }
  }

  async function verifierMiseEnRelation(uDataParam) {
    if (!currentUserId) return
    const uData = uDataParam || userData
    try {
      const { data: demandes } = await supabaseClient
        .from('mises_en_relation')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (demandes && demandes.length > 0) {
        const demande = demandes[0]
        if (demande.statut === 'validee') {
          setRelationStatus('validated')
          try {
            const { data: proprioUser } = await supabaseClient
              .from('users')
              .select('prenom, nom, telephone, email')
              .eq('email', demande.email_proprietaire)
              .limit(1)
              .single()
            if (proprioUser) {
              setProprioData(proprioUser)
              setProprioNom(proprioUser.prenom + ' ' + proprioUser.nom)
            }
          } catch (e) { /* proprio pas encore inscrit */ }
        } else {
          setRelationStatus('pending')
          setPendingEmail(demande.email_proprietaire)
        }
        return
      }
    } catch (error) {
      // pas de demande
    }
  }

  async function loadParrainage(uDataParam) {
    const uData = uDataParam || userData
    if (!uData) return
    if (uData.invitation_token) {
      setReferralCode(uData.invitation_token)
    } else {
      const token = await genererInvitationToken(currentUserId)
      setReferralCode(token)
    }
  }

  async function genererInvitationToken(userId) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let token = ''
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    try {
      await supabaseClient.from('users').update({ invitation_token: token }).eq('id', userId)
    } catch (error) {
      console.error('Erreur sauvegarde token:', error)
    }
    return token
  }

  async function loadAnnonces(userId) {
    try {
      const { data } = await supabaseClient
        .from('annonces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (data) setAnnonces(data)
    } catch (error) { /* no annonces */ }
  }

  async function loadCandidaturesEnvoyeesHote(userId) {
    try {
      const { data } = await supabaseClient
        .from('candidatures')
        .select('*, annonces(titre, ville, prix, user_id)')
        .eq('locataire_id', userId)
        .order('created_at', { ascending: false })
      if (data) setCandidaturesEnvoyeesHote(data)
    } catch (error) { /* no candidatures */ }
  }

  async function loadCandidaturesRecues(userId) {
    try {
      const { data: mesAnnonces } = await supabaseClient
        .from('annonces')
        .select('id')
        .eq('user_id', userId)
      if (!mesAnnonces || mesAnnonces.length === 0) return

      const annonceIds = mesAnnonces.map(a => a.id)
      const { data } = await supabaseClient
        .from('candidatures')
        .select('*, users:locataire_id(id, prenom, nom, email, ecole, ville_entreprise)')
        .in('annonce_id', annonceIds)
        .order('created_at', { ascending: false })

      if (data) {
        const acceptee = data.find(c => c.statut === 'acceptee')
        if (acceptee && acceptee.users) {
          setLocataireAccepte(acceptee)
        }
        setCandidaturesRecues(data)
      }
    } catch (error) {
      console.error('Erreur candidatures recues:', error)
    }
  }

  function ouvrirOverlayMessages() {
    setShowMessagesOverlay(true)
  }

  function fermerOverlayMessages() {
    setShowMessagesOverlay(false)
  }

  // === ALERTE ===
  function ouvrirModalAlerte(editMode = false, alerte = null) {
    setAlerteEditMode(editMode)
    setEditingAlerteId(alerte?.id || null)
    setAlerteError('')
    setAlerteSuccess('')
    if (editMode && alerte?.date_debut_alternance) {
      const existDate = new Date(alerte.date_debut_alternance)
      setAlerteCalMonth(existDate.getMonth())
      setAlerteCalYear(existDate.getFullYear())
      setAlerteSelectedDate(alerte.date_debut_alternance)
    } else {
      setAlerteSelectedDate(null)
      setAlerteCalMonth(new Date().getMonth())
      setAlerteCalYear(new Date().getFullYear())
    }
    setShowAlerteModal(true)
  }

  async function creerAlerte() {
    const ville = isLesDeux ? userData?.ville_entreprise : getVillesUtilisateur(userData)[0]?.ville
    if (!ville) { setAlerteError('Renseigne ta ville dans ton profil'); return }
    if (!alerteSelectedDate) { setAlerteError('Selectionne ta premiere semaine d\'occupation'); return }

    const villeSlug = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')

    try {
      const email = userData?.email
      let rythme = null
      if (userData?.rythme_alternance) {
        const clean = userData.rythme_alternance.replace(/sem/gi, '').replace(/\//g, '-')
        const parts = clean.split('-').map(s => s.trim())
        rythme = parts[0] + '-' + parts[1]
      }

      if (alerteEditMode && editingAlerteId) {
        await supabaseClient.from('alertes').update({
          ville: villeSlug,
          rythme,
          date_debut_alternance: alerteSelectedDate
        }).eq('id', editingAlerteId)
        setAlerteSuccess('Alerte modifiee avec succes')
      } else {
        const { error: insertError } = await supabaseClient.from('alertes').insert({
          email, ville: villeSlug, rythme, user_id: currentUserId,
          date_debut_alternance: alerteSelectedDate
        })
        if (insertError) throw insertError

        try {
          await supabaseClient.functions.invoke('send-alert-email', {
            body: { email, ville: villeSlug, rythme }
          })
        } catch (emailErr) {
          console.warn('Email de confirmation non envoyé:', emailErr)
        }

        setAlerteSuccess('Alerte activee avec succes')
      }
      setTimeout(() => {
        setShowAlerteModal(false)
        loadAlertes(currentUserId)
      }, 2000)
    } catch (error) {
      console.error('Erreur:', error)
      setAlerteError('Erreur, reessaie')
    }
  }

  async function desactiverAlerte(alerteId) {
    if (!alerteId) return
    try {
      await supabaseClient.from('alertes').delete().eq('id', alerteId)
      setAlertes(prev => prev.filter(a => a.id !== alerteId))
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // === VILLE SECONDAIRE ===
  async function confirmerVilleRecherche() {
    if (!villeModalSelected || !peutAjouterVilleRecherche) return
    try {
      await supabaseClient.from('users').update({
        [colonneDeduite]: villeModalSelected,
        [statutColonneDeduite]: 'recherche',
      }).eq('id', currentUserId)
      setUserData(prev => ({ ...prev, [colonneDeduite]: villeModalSelected, [statutColonneDeduite]: 'recherche' }))
      setShowVilleModal(false)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  async function supprimerVilleSecondaire() {
    try {
      await supabaseClient.from('users').update({ ville_recherche_secondaire: null }).eq('id', currentUserId)
      setUserData(prev => ({ ...prev, ville_recherche_secondaire: null }))
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // === MOT DE PASSE ===
  async function changerMotDePasse() {
    if (pwdNew.length < 8) { setPwdMsg({ text: 'Le mot de passe doit contenir au moins 8 caracteres.', type: 'error' }); return }
    if (pwdNew !== pwdConfirm) { setPwdMsg({ text: 'Les deux mots de passe ne correspondent pas.', type: 'error' }); return }
    try {
      const result = await supabaseClient.auth.updateUser({ password: pwdNew })
      if (result.error) throw result.error
      setPwdMsg({ text: 'Mot de passe modifie avec succes !', type: 'success' })
      setTimeout(() => setShowPasswordModal(false), 1500)
    } catch (e) {
      setPwdMsg({ text: e.message || 'Erreur lors du changement.', type: 'error' })
    }
  }

  // === SUPPRESSION COMPTE ===
  async function supprimerCompte() {
    try {
      const session = await supabaseClient.auth.getSession()
      const token = session.data.session.access_token
      const res = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/delete-account', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      await signOut()
      navigate('/')
    } catch (e) {
      console.error('Erreur suppression:', e)
      alert('Erreur lors de la suppression.')
    }
  }

  // === EXPORT ===
  async function exporterDonnees() {
    try {
      const session = await supabaseClient.auth.getSession()
      const token = session.data.session.access_token
      const res = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/export-data', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Erreur export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sterny-mes-donnees-' + new Date().toISOString().split('T')[0] + '.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Erreur export:', e)
      alert('Erreur lors de l\'export.')
    }
  }

  // === RETIRER CANDIDATURE ===
  async function retirerCandidature(candidatureId) {
    if (!window.confirm('Retirer cette candidature ?')) return
    try {
      await supabaseClient.from('candidatures').delete().eq('id', candidatureId).eq('locataire_id', currentUserId)
      await loadMesCandidatures(currentUserId)
    } catch (e) {
      console.error('Erreur:', e)
    }
  }

  // === ACCEPTER / REFUSER CANDIDATURE (hôte) ===
  async function handleAccepterCandidature(candidatureId) {
    try {
      const { data, error } = await supabaseClient.from('candidatures').update({ statut: 'acceptee' }).eq('id', candidatureId).select('locataire_id, annonce_id').single()
      if (error) throw error
      setCandidaturesRecues(prev => prev.map(item => item.id === candidatureId ? { ...item, statut: 'acceptee' } : item))

      // Message au locataire (best-effort : un échec ne remet jamais en cause l'acceptation ni l'UI)
      try {
        const prenom = candidaturesRecues.find(c => c.id === candidatureId)?.users?.prenom
        const { error: msgError } = await supabaseClient.from('messages').insert([{
          expediteur_id: currentUserId,
          destinataire_id: data.locataire_id,
          contenu: `Salut ${prenom} ! Bonne nouvelle, j'ai accepté ta candidature. N'hésite pas si tu as des questions.`,
          annonce_id: data.annonce_id,
        }])
        if (msgError) console.error('Message acceptation locataire échoué :', msgError)
      } catch (e) {
        console.error('Message acceptation locataire échoué :', e)
      }
    } catch (e) {
      console.error('Erreur acceptation candidature:', e)
    }
  }

  async function handleRefuserCandidature(candidatureId) {
    try {
      const { error } = await supabaseClient.from('candidatures').update({ statut: 'refusee' }).eq('id', candidatureId)
      if (error) throw error
      setCandidaturesRecues(prev => prev.map(item => item.id === candidatureId ? { ...item, statut: 'refusee' } : item))
    } catch (e) {
      console.error('Erreur refus candidature:', e)
    }
  }

  async function handleAnnulerDecisionCandidature(candidatureId) {
    try {
      const { error } = await supabaseClient.from('candidatures').update({ statut: 'en_attente' }).eq('id', candidatureId)
      if (error) throw error
      setCandidaturesRecues(prev => prev.map(item => item.id === candidatureId ? { ...item, statut: 'en_attente' } : item))
    } catch (e) {
      console.error('Erreur annulation decision candidature:', e)
    }
  }

  // === RETIRER FAVORI ===
  async function retirerFavori(annonceId) {
    try {
      await supabaseClient.from('favoris').delete().eq('user_id', currentUserId).eq('annonce_id', annonceId)
      setFavoris(prev => prev.filter(f => f.id !== annonceId))
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // === COPIER CODE ===
  function copierCode() {
    const invitationUrl = `${window.location.origin}/invitation/${referralCode}`
    navigator.clipboard.writeText(invitationUrl)
  }

  // === ENVOYER MISE EN RELATION ===
  async function envoyerMiseEnRelation() {
    const email = proprietaireEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (email === userData?.email) return

    setRelationStatus('sending')
    try {
      await supabaseClient.functions.invoke('send-proprietaire-invitation', {
        body: {
          proprietaire_email: email,
          alternant_prenom: userData?.prenom || '',
          alternant_nom: userData?.nom || '',
          invitation_token: userData?.invitation_token || referralCode
        }
      })

      await supabaseClient.from('mises_en_relation').insert({
        user_id: currentUserId,
        email_proprietaire: email,
        prenom_user: userData?.prenom || '',
        nom_user: userData?.nom || '',
        ville: userData?.ville_ecole || '',
        statut: 'en_attente'
      })

      setRelationStatus('success')
      setTimeout(() => {
        setRelationStatus('pending')
        setPendingEmail(email)
      }, 3000)
    } catch (error) {
      console.error('Erreur:', error)
      setRelationStatus('form')
    }
  }

  // === COMPUTED ===
  const hasBailActif = contrats.length > 0

  // Villes dérivées des 4 colonnes (remplace la colonne dépréciée userData.ville) — #76
  const villesUser = getVillesUtilisateur(userData)

  // Flux "ajouter une 2e ville de recherche" (bouton "+") — nature DÉDUITE, pas demandée (VISION 18/07/2026).
  // Valide UNIQUEMENT si exactement 1 colonne ville est remplie : la case libre a alors une nature
  // déterminée par élimination (école ↔ entreprise). Si 2 colonnes remplies (cas cassé DETTE #143,
  // ville "muette"), plus de case libre → flux masqué (garde-fou).
  const peutAjouterVilleRecherche = villesUser.length === 1
  const natureDeduite = peutAjouterVilleRecherche
    ? (villesUser[0].nature === 'ecole' ? 'entreprise' : 'ecole')
    : null
  const colonneDeduite = natureDeduite === 'ecole' ? 'ville_ecole' : 'ville_entreprise'
  const statutColonneDeduite = natureDeduite === 'ecole' ? 'statut_ville_ecole' : 'statut_ville_entreprise'

  // DETTE #130 étape 4/5 : pôle hôte déjà occupé par une annonce existante → masque le CTA de création
  const poleHote = villesUser.find(v => v.action === 'hote')?.nature
  const poleOccupe = !!poleHote && annonces.some(a => a.pole === poleHote)

  // Ville suggestions
  const villeSuggestions = villeModalInput.trim()
    ? VILLES_DISPONIBLES.filter(v =>
        v.toLowerCase().startsWith(villeModalInput.trim().toLowerCase()) &&
        v.toLowerCase() !== (villesUser[0]?.ville || '').toLowerCase()
      )
    : []

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="page-header">
        <h1>Bonjour <span className="dp-prenom">{userData?.prenom || '...'}</span></h1>

        {/* Mode switch for "les deux" */}
        {isLesDeux && !hasBailActif && (
          <div className="mode-switch">
            <button
              className={`mode-btn ${currentMode === 'recherche' ? 'active' : ''}`}
              onClick={() => switchMode('recherche')}
            >
              <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>
              <span>{userData?.ville_entreprise || 'Recherche'}</span>
            </button>
            <button
              className={`mode-btn ${currentMode === 'hote' ? 'active' : ''}`}
              onClick={() => switchMode('hote')}
            >
              <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z" /></svg>
              <span>{userData?.ville_ecole || 'Hote'}</span>
            </button>
          </div>
        )}

        {/* Ville header — sélecteur segmenté si 2 villes, sinon badge simple + bouton "+" (inchangé) */}
        {!isLesDeux && villesUser.length > 0 && !hasBailActif && (
          villesUser.length === 2 ? (
            <div className="vhs-container">
              <button
                className={`vhs-segment ${!afficheVilleSecondaire ? 'vhs-active' : ''}`}
                onClick={() => setAfficheVilleSecondaire(false)}
              >
                {!afficheVilleSecondaire && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                )}
                <span>{villesUser[0].ville}</span>
              </button>
              <button
                className={`vhs-segment ${afficheVilleSecondaire ? 'vhs-active' : ''}`}
                onClick={() => setAfficheVilleSecondaire(true)}
              >
                {afficheVilleSecondaire && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                )}
                <span>{villesUser[1].ville}</span>
              </button>
            </div>
          ) : (
            <div className="ville-header-row">
              <div className="ville-header-badge">
                <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>
                <span>{villesUser[0]?.ville}</span>
              </div>
              <div className="plus-menu-wrapper" ref={plusMenuRef}>
                <button className="btn-plus-ville" onClick={() => setShowPlusMenu(!showPlusMenu)} title="Ajouter une ville">+</button>
                {showPlusMenu && (
                  <div className="plus-menu show">
                    {peutAjouterVilleRecherche && (
                      <button className="plus-menu-item" onClick={() => { setShowPlusMenu(false); setShowVilleModal(true); }}>
                        <div className="plus-menu-icon search">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        </div>
                        <div className="plus-menu-text">
                          <div className="plus-menu-label">Rechercher un logement</div>
                          <div className="plus-menu-desc">Ajouter une ville de recherche</div>
                        </div>
                      </button>
                    )}
                    {!poleOccupe && (
                      <button className="plus-menu-item" onClick={async () => {
                        setShowPlusMenu(false)
                        if (userData?.type_user === 'locataire') {
                          await supabaseClient.from('users').update({ type_user: 'les_deux' }).eq('id', userData.id)
                        }
                        navigate('/annonce/creer')
                      }}>
                        <div className="plus-menu-icon host">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </div>
                        <div className="plus-menu-text">
                          <div className="plus-menu-label">Proposer mon logement</div>
                          <div className="plus-menu-desc">Louer ou sous-louer dans une ville</div>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <RythmeCarousel
        weeks={userData?.rhythm_calendar}
        lienCalendrier={(userData?.type_user === 'locataire' || userData?.type_user === 'les_deux') ? '/mon-calendrier' : null}
      />

      {/* LOCATIONS ACTIVES */}
      {hasBailActif && (
        <div className="dp-card">
          <div className="dp-card-title">
            Tes locations actives
          </div>
          {contrats.map(contrat => {
            const dateFin = new Date(contrat.date_fin)
            const dateDebut = new Date(contrat.date_debut)
            const joursRestants = Math.ceil((dateFin - new Date()) / (1000 * 60 * 60 * 24))
            const ren = renouvellements[contrat.id]

            return (
              <div className="location-card" key={contrat.id}>
                <div className="loc-icon">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <div className="loc-details">
                  <div className="loc-title">{contrat.annonces?.titre || 'Logement'}</div>
                  <div className="loc-meta">
                    {contrat.annonces?.ville} &middot; {contrat.loyer_mensuel}&euro;/mois &middot; {dateDebut.toLocaleDateString('fr-FR')} &rarr; {dateFin.toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="loc-actions">
                  <span className={`loc-countdown ${joursRestants > 30 ? 'ok' : 'urgent'}`}>
                    {joursRestants > 0 ? `${joursRestants}j restants` : 'Termine'}
                  </span>
                  {ren && (
                    <Link to={`/renouvellement?contrat_id=${contrat.id}`}
                      className={`renewal-badge ${ren.statut === 'refusee' ? 'refusee' : ren.statut === 'demande_locataire' ? 'en-attente' : 'acceptee'}`}>
                      {ren.statut === 'demande_locataire' ? 'Renouvellement demande' :
                       ren.statut === 'acceptee' ? 'Renouvellement accepte' :
                       ren.statut === 'contrat_genere' ? 'Nouveau contrat pret' : 'Renouvellement refuse'}
                    </Link>
                  )}
                  {!ren && joursRestants <= 60 && joursRestants > 0 && (
                    <Link to={`/renouvellement?contrat_id=${contrat.id}`} className="btn-renew">Renouveler</Link>
                  )}
                  <Link to={`/match-actif?match_id=${contrat.candidature_id}`} className="btn-voir-logement">Voir mon logement</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SECTIONS RECHERCHE */}
      {currentMode === 'recherche' && !hasBailActif && (
        <>
          {/* BANDEAU ALERTE */}
          {alertes.length === 0 ? (
            <div className="alerte-bandeau">
              <div className="alerte-bandeau-left">
                <div className="alerte-bandeau-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                </div>
                <span>Active une alerte pour être notifié dès qu'un logement correspond</span>
              </div>
              <button className="alerte-bandeau-btn" onClick={() => ouvrirModalAlerte(false)}>Créer une alerte</button>
            </div>
          ) : (
            <div>
              {alertes.map(alerte => (
                <div key={alerte.id} className="alerte-bandeau active" style={{ marginBottom: '8px' }}>
                  <div className="alerte-bandeau-left">
                    <div className="alerte-bandeau-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    </div>
                    <span>{alerte.ville || 'Alerte active'}{alerte.rythme ? ` \u2022 ${alerte.rythme}` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="alerte-bandeau-btn-desactiver" onClick={() => ouvrirModalAlerte(true, alerte)}>Modifier</button>
                    <button className="alerte-bandeau-btn-desactiver" onClick={() => desactiverAlerte(alerte.id)} style={{ color: '#9CA3AF' }}>Supprimer</button>
                  </div>
                </div>
              ))}
              {alertes.length < 2 && (
                <button className="alerte-bandeau-btn" onClick={() => ouvrirModalAlerte(false)} style={{ marginTop: '4px', fontSize: '12px', padding: '6px 14px' }}>+ Ajouter une alerte</button>
              )}
            </div>
          )}

          {/* FAVORIS */}
          <div className="dp-card">
            <div className="dp-card-title">
              Tes favoris
              {favoris.length > 0 && <span className="favoris-count">{favoris.length}</span>}
            </div>
            {favoris.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </div>
                <div className="empty-text">Clique sur le coeur d'une annonce pour la retrouver ici</div>
                <Link to="/recherche" className="btn btn-orange">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  Parcourir les annonces
                </Link>
              </div>
            ) : (
              <div className="favoris-grid">
                {favoris.map(ann => (
                  <Link to={`/logement?id=${ann.id}`} className="favori-card" key={ann.id}>
                    <div className="favori-card-image">
                      {ann.photos && ann.photos.length > 0
                        ? <img src={ann.photos[0]} alt={ann.titre} />
                        : <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="8" y="2" width="14" height="14" rx="2" /></svg>
                      }
                      {ann.type_logement && <span className="favori-card-type">{ann.type_logement}</span>}
                      <button className="favori-card-remove" onClick={(e) => { e.preventDefault(); e.stopPropagation(); retirerFavori(ann.id); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="18" height="18" fill="#E8622A"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" /></svg>
                      </button>
                    </div>
                    <div className="favori-card-body">
                      <div className="favori-card-price">{ann.prix}&euro; <span>/ semaine</span></div>
                      <div className="favori-card-title">{ann.titre}</div>
                      <div className="favori-card-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                        {ann.ville}
                      </div>
                      <div className="favori-card-infos">
                        {ann.surface && <div className="favori-card-info"><strong>{ann.surface}</strong>m&sup2;</div>}
                        {ann.equipements && ann.equipements.length > 0 && <div className="favori-card-info"><strong>{ann.equipements.length}</strong> equip.</div>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* CANDIDATURES */}
          <div className="dp-card">
            <div className="dp-card-title">
              Tes candidatures
              {candidatures.length > 0 && <span className="favoris-count">{candidatures.length}</span>}
            </div>
            {candidatures.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                </div>
                <div className="empty-text">Tu n'as pas encore candidate a un logement</div>
                <Link to="/recherche" className="btn btn-orange">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  Parcourir les annonces
                </Link>
              </div>
            ) : (
              candidatures.map(c => {
                if (!c.annonces) return null
                const ann = c.annonces
                let statutLabel = 'En attente', statutClass = 'en-attente'
                if (c.statut === 'acceptee') { statutLabel = 'Acceptée'; statutClass = 'acceptee' }
                else if (c.statut === 'refusee') { statutLabel = 'Refusée'; statutClass = 'refusee' }

                return (
                  <Link to={`/logement?id=${ann.id}`} className="candidature-item" key={c.id}>
                    {ann.photos && ann.photos.length > 0
                      ? <img src={ann.photos[0]} className="candidature-thumb" alt={ann.titre} />
                      : <div className="candidature-thumb" />
                    }
                    <div className="candidature-info">
                      <div className="candidature-titre">{ann.titre}</div>
                      <div className="candidature-ville">{ann.ville} &middot; {ann.surface || ''}m&sup2; &middot; {ann.type_logement || ''}</div>
                      <div className="candidature-prix">{ann.prix}&euro; <span>/ semaine</span></div>
                    </div>
                    <div className="candidature-actions">
                      <div className={`candidature-statut ${statutClass}`}>{statutLabel}</div>
                      {c.statut === 'en_attente' && (
                        <button className="btn-retirer-candidature" onClick={(e) => { e.preventDefault(); e.stopPropagation(); retirerCandidature(c.id); }}>Retirer</button>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </>
      )}

      {/* SECTIONS HOTE */}
      {currentMode === 'hote' && !hasBailActif && (
        <>
          {/* MES ANNONCES */}
          <div className="dp-card">
            <div className="dp-card-title">
              {annonces.length <= 1 ? 'Ton annonce' : `Tes annonces (${annonces.length})`}
            </div>
            {annonces.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <div className="empty-text">Tu n'as pas encore cree d'annonce</div>
                <Link to="/annonce/creer?type=locataire" className="btn btn-orange">Creer mon annonce</Link>
              </div>
            ) : (
              <div>
                {annonces.map(ann => (
                  <div className="annonce-card" key={ann.id} style={{ marginBottom: '8px' }}>
                    <div className="annonce-thumb">
                      {ann.photos && ann.photos.length > 0
                        ? <img src={ann.photos[0]} alt={ann.titre} loading="lazy" />
                        : <div className="annonce-thumb-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
                      }
                    </div>
                    <div className="annonce-body">
                      <div className="annonce-title">{ann.titre || 'Mon logement'}</div>
                      <div className="annonce-meta">
                        {ann.ville && <span className="annonce-tag">{ann.ville}</span>}
                        {ann.type_logement && <span className="annonce-tag">{ann.type_logement}</span>}
                        {ann.surface && <span className="annonce-tag">{ann.surface} m&sup2;</span>}
                        {ann.prix && <span className="annonce-tag">{ann.prix}&euro;/sem.</span>}
                      </div>
                      <div className="annonce-actions">
                        <Link to={`/annonce/modifier?id=${ann.id}`} className="btn-annonce-modifier">Modifier</Link>
                        <Link to={`/logement?id=${ann.id}`} className="btn-annonce-voir">Voir l'annonce</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MON PROPRIETAIRE */}
          {relationStatus !== 'validated' && (
            <div className="dp-card">
              <div className="dp-card-title">
                Ton propriétaire
              </div>
              <div className="proprio-row">
                <div className="proprio-col">
                  <div className="proprio-label">Mise en relation</div>
                  {relationStatus === 'form' && (
                    <div className="proprio-input-row">
                      <input type="email" className="proprio-input" placeholder="Email du proprietaire" value={proprietaireEmail} onChange={e => setProprietaireEmail(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') envoyerMiseEnRelation() }} />
                      <button className="proprio-send-btn" onClick={envoyerMiseEnRelation}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        Envoyer
                      </button>
                    </div>
                  )}
                  {relationStatus === 'sending' && (
                    <div className="status-badge pending">Envoi en cours...</div>
                  )}
                  {relationStatus === 'success' && (
                    <div className="status-badge success">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Demande envoyee avec succes
                    </div>
                  )}
                  {relationStatus === 'pending' && (
                    <>
                      <div className="status-badge pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        En attente — <span className="status-email">{pendingEmail}</span>
                      </div>
                      <div className="proprio-help">Ton proprietaire va recevoir un email d'invitation.</div>
                    </>
                  )}
                </div>
                <div className="proprio-col">
                  <div className="proprio-label">Lien d'invitation</div>
                  <div className="proprio-code-inline">
                    <div className="proprio-code" style={{ fontSize: '13px', letterSpacing: '0', fontFamily: 'inherit' }}>{`${window.location.origin}/invitation/${referralCode}`}</div>
                    <button className="proprio-copy-btn-inline" onClick={copierCode}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      Copier
                    </button>
                  </div>
                  <div className="proprio-help">Partage ce lien avec ton proprietaire pour l'inviter sur STERNY.</div>
                </div>
              </div>
            </div>
          )}

          {/* CANDIDATURES RECUES */}
          <div className="dp-card">
            <div className="dp-card-title">
              Candidatures reçues
              {candidaturesRecues.length > 0 && <span className="favoris-count">{candidaturesRecues.length}</span>}
            </div>
            {candidaturesRecues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
                <div className="empty-text">Aucune candidature pour le moment</div>
              </div>
            ) : (
              candidaturesRecues.map(c => {
                const u = c.users
                if (!u) return null
                const initiales = ((u.prenom || '')[0] + (u.nom || '')[0]).toUpperCase()
                let statutLabel = 'En attente', statutClass = 'en-attente'
                if (c.statut === 'acceptee') { statutLabel = 'Acceptée'; statutClass = 'acceptee' }
                else if (c.statut === 'refusee') { statutLabel = 'Refusée'; statutClass = 'refusee' }

                return (
                  <div className="candidature-item" key={c.id}>
                    <div className="candidature-avatar">{initiales}</div>
                    <div className="candidature-info">
                      <div className="candidature-titre">{u.prenom} {u.nom}</div>
                      <div className="candidature-ville">{[u.ecole, u.ville_entreprise].filter(Boolean).join(' - ') || u.email}</div>
                    </div>
                    <div className={`candidature-statut ${statutClass}`}>{statutLabel}</div>
                    {c.statut === 'en_attente' && (
                      <div className="candidature-actions">
                        <button className="btn-retirer-candidature" onClick={() => setConfirmCandidature({ candidatureId: c.id, prenom: u.prenom, kind: 'refuse' })}>Refuser</button>
                        <button className="btn-retirer-candidature btn-accept-green" onClick={() => setConfirmCandidature({ candidatureId: c.id, prenom: u.prenom, kind: 'accept' })}>Accepter</button>
                      </div>
                    )}
                    {(c.statut === 'acceptee' || c.statut === 'refusee') && (
                      <div className="candidature-actions">
                        <button className="btn-retirer-candidature" onClick={() => setConfirmCandidature({ candidatureId: c.id, prenom: u.prenom, kind: 'undo', fromStatut: c.statut })}>
                          {c.statut === 'acceptee' ? "Annuler l'acceptation" : "Annuler le refus"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* CANDIDATURES ENVOYEES (hote) */}
          {candidaturesEnvoyeesHote.length > 0 && (
            <div className="dp-card">
              <div className="dp-card-title">
                Tes candidatures envoyées
                <span className="favoris-count">{candidaturesEnvoyeesHote.length}</span>
              </div>
              {candidaturesEnvoyeesHote.map(c => {
                let statutLabel = 'En attente', statutClass = 'en-attente'
                if (c.statut === 'acceptee') { statutLabel = 'Acceptée'; statutClass = 'acceptee' }
                else if (c.statut === 'refusee') { statutLabel = 'Refusée'; statutClass = 'refusee' }
                const initiales = (c.annonces?.titre || '??').substring(0, 2).toUpperCase()
                const date = new Date(c.created_at).toLocaleDateString('fr-FR')
                return (
                  <div className="candidature-item" key={c.id}>
                    <div className="candidature-avatar">{initiales}</div>
                    <div className="candidature-info">
                      <div className="candidature-titre">{c.annonces?.titre || 'Annonce'}</div>
                      <div className="candidature-ville">{[c.annonces?.ville, c.annonces?.prix ? `${c.annonces.prix}€/mois` : null, date].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className={`candidature-statut ${statutClass}`}>{statutLabel}</div>
                    {c.statut === 'acceptee' && (
                      <Link to={`/match-actif?match_id=${c.id}`} className="btn btn-orange" style={{ marginLeft: '8px', fontSize: '12px', padding: '6px 12px' }}>Voir le match</Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}


      {/* MODAL VILLE */}
      {showVilleModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowVilleModal(false) }}>
          <div className="modal-box">
            <div className="modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <h3 className="modal-title">Ajouter une ville de recherche</h3>
            <p className="modal-desc">Cherche aussi dans une autre ville.</p>
            <div className="modal-input-wrapper">
              <input type="text" className="modal-input" placeholder="Ex : Nantes, Brest..." autoComplete="off"
                value={villeModalInput}
                onChange={e => { setVilleModalInput(e.target.value); setVilleModalSelected('') }}
              />
              {villeSuggestions.length > 0 && (
                <div className="modal-suggestions show">
                  {villeSuggestions.map(v => (
                    <div key={v} className="modal-suggestion-item" onClick={() => { setVilleModalInput(v); setVilleModalSelected(v) }}>{v}</div>
                  ))}
                </div>
              )}
              {villeModalInput.trim() && villeSuggestions.length === 0 && (
                <div className="modal-suggestions show">
                  <div style={{ padding: '12px 16px', color: '#E8622A', fontWeight: 600, fontSize: 14 }}>STERNY arrive bientot dans ta ville !</div>
                </div>
              )}
            </div>
            {villeModalSelected && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', margin: '0 0 18px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                <span style={{ fontSize: '11px', color: '#94A3B8', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {villeModalSelected} sera enregistrée comme ta ville d'{natureDeduite === 'ecole' ? 'école' : 'entreprise'}
                </span>
              </div>
            )}
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setShowVilleModal(false)}>Annuler</button>
              <button className="modal-btn-confirm" disabled={!villeModalSelected} onClick={confirmerVilleRecherche}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {confirmCandidature && (() => {
        const { kind, prenom, fromStatut, candidatureId } = confirmCandidature
        let title, desc, btnLabel, btnVariant, onConfirm
        if (kind === 'accept') {
          title = 'Accepter cette candidature ?'
          desc = "Es-tu sûr de vouloir accepter ?"
          btnLabel = 'Accepter'
          btnVariant = 'accept'
          onConfirm = () => handleAccepterCandidature(candidatureId)
        } else if (kind === 'refuse') {
          title = 'Refuser cette candidature ?'
          desc = "Es-tu sûr de vouloir refuser ?"
          btnLabel = 'Refuser'
          btnVariant = 'danger'
          onConfirm = () => handleRefuserCandidature(candidatureId)
        } else {
          title = fromStatut === 'acceptee' ? "Annuler l'acceptation ?" : 'Annuler le refus ?'
          desc = "La candidature repassera en attente."
          btnLabel = fromStatut === 'acceptee' ? "Annuler l'acceptation" : 'Annuler le refus'
          btnVariant = 'neutral'
          onConfirm = () => handleAnnulerDecisionCandidature(candidatureId)
        }
        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmCandidature(null) }}>
            <div className="modal-box-cand">
              <h3 className="modal-title">{title}</h3>
              <p className="modal-desc">{desc}</p>
              <div className="modal-actions-col">
                <button className={`modal-btn-primary ${btnVariant}`} onClick={() => { onConfirm(); setConfirmCandidature(null) }}>{btnLabel}</button>
                <button className="modal-link-back" onClick={() => setConfirmCandidature(null)}>Retour</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ALERTE MODAL */}
      {showAlerteModal && (
        <div className="alerte-modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowAlerteModal(false) }}>
          <div className="alerte-modal">
            <div className="alerte-modal-header">
              <div className="alerte-modal-header-left">
                <div className="alerte-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                </div>
                <span>{alerteEditMode ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</span>
              </div>
              <button className="alerte-modal-close" onClick={() => setShowAlerteModal(false)}>&times;</button>
            </div>
            <div className="alerte-modal-body">
              <div className="alerte-cal-header">
                <button className="alerte-cal-nav" onClick={() => {
                  let m = alerteCalMonth - 3
                  let y = alerteCalYear
                  if (m < 0) { m += 12; y-- }
                  setAlerteCalMonth(m); setAlerteCalYear(y)
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
                <div className="alerte-cal-titre">
                  {MOIS_NOMS[alerteCalMonth]} – {MOIS_NOMS[(alerteCalMonth + 2) % 12]} {alerteCalYear + Math.floor((alerteCalMonth + 2) / 12)}
                </div>
                <button className="alerte-cal-nav" onClick={() => {
                  let m = alerteCalMonth + 3
                  let y = alerteCalYear
                  if (m > 11) { m -= 12; y++ }
                  setAlerteCalMonth(m); setAlerteCalYear(y)
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>

              <div className="alerte-cal-grid">
                {[0, 1, 2].map(i => {
                  const mIndex = (alerteCalMonth + i) % 12
                  const mYear = alerteCalYear + Math.floor((alerteCalMonth + i) / 12)
                  const firstDay = new Date(mYear, mIndex, 1)
                  let startingDay = firstDay.getDay()
                  startingDay = startingDay === 0 ? 6 : startingDay - 1
                  const daysInMonth = new Date(mYear, mIndex + 1, 0).getDate()
                  const today = new Date(); today.setHours(0,0,0,0)

                  return (
                    <div className="alerte-cal-month" key={`${mIndex}-${mYear}`}>
                      <div className="alerte-cal-month-title">{MOIS_NOMS[mIndex].substring(0, 3)}. {mYear}</div>
                      <div className="alerte-cal-weekdays">
                        {['L','M','M','J','V','S','D'].map((d,idx) => (
                          <div className="alerte-cal-weekday" key={idx}>{d}</div>
                        ))}
                      </div>
                      <div className="alerte-cal-days">
                        {Array.from({ length: startingDay }, (_, k) => (
                          <div className="alerte-cal-day empty" key={`empty-${k}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, k) => {
                          const d = k + 1
                          const dayDate = new Date(mYear, mIndex, d); dayDate.setHours(0,0,0,0)
                          const dateStr = `${mYear}-${String(mIndex+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                          const isPast = dayDate < today
                          const isToday = dayDate.getTime() === today.getTime()
                          const isSelected = alerteSelectedDate === dateStr

                          return (
                            <div
                              key={dateStr}
                              className={`alerte-cal-day${isPast ? ' past' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                              onClick={() => { if (!isPast) setAlerteSelectedDate(isSelected ? null : dateStr) }}
                            >
                              {d}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {alerteError && <div className="alerte-erreur-msg show">{alerteError}</div>}
              {alerteSuccess && <div className="alerte-modal-success show">{alerteSuccess}</div>}
              {!alerteSuccess && (
                <button className="btn-activer-alerte" style={{ width: '100%', marginTop: 16 }} onClick={creerAlerte}>
                  {alerteEditMode ? 'Modifier l\'alerte' : 'Activer l\'alerte'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES OVERLAY */}
      <ChatComponent
        mode="overlay"
        isOpen={showMessagesOverlay}
        onClose={fermerOverlayMessages}
        currentUserId={currentUserId}
        currentUserType={currentMode === 'hote' ? 'hote' : 'locataire'}
      />
    </div>
  )
}
