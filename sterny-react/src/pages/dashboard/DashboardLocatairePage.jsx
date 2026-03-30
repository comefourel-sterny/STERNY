import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import './DashboardLocatairePage.css'

const VILLES_DISPONIBLES = [
  'Rennes', 'Nantes', 'Brest', 'Quimper', 'Lorient', 'Vannes',
  'Saint-Brieuc', 'Ploermel', 'Carhaix', 'Morlaix', 'Lannion',
  'Douarnenez', 'Guingamp', 'Ploufragan', 'Saint-Malo', 'Dinan', 'Vitre'
]

const MOIS_NOMS = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']

function formatTimeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return "a l'instant"
  if (diff < 3600) return Math.floor(diff / 60) + ' min'
  if (diff < 86400) return Math.floor(diff / 3600) + ' h'
  if (diff < 604800) return Math.floor(diff / 86400) + ' j'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formaterRythme(rythme) {
  if (!rythme) return 'Non renseigne'
  if (rythme === 'custom') return 'Rythme personnalise'
  const clean = rythme.replace(/sem/gi, '').replace(/\//g, '-')
  const parts = clean.split('-').map(s => s.trim())
  if (parts.length !== 2) return rythme
  return parts[0] + ' sem. / ' + parts[1] + ' sem.'
}

function formaterRythmeAvecVilles(rythme, mode, userData) {
  if (!rythme || !userData) return formaterRythme(rythme)
  if (rythme === 'custom') return userData.rythme_alternance || 'Rythme personnalise'
  const clean = rythme.replace(/sem/gi, '').replace(/\//g, '-')
  const parts = clean.split('-').map(s => s.trim())
  if (parts.length !== 2) return rythme
  const villeRecherche = userData.ville_entreprise || '?'
  const villeHote = userData.ville_ecole || '?'
  if (mode === 'recherche') {
    return parts[0] + ' sem. a ' + villeRecherche + ' - ' + parts[1] + ' sem. a ' + villeHote
  } else {
    return parts[1] + ' sem. a ' + villeHote + ' - ' + parts[0] + ' sem. a ' + villeRecherche
  }
}

export default function DashboardLocatairePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  // Profile state
  const [userData, setUserData] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isLesDeux, setIsLesDeux] = useState(false)
  const [currentMode, setCurrentMode] = useState('recherche')
  const [hoteDataLoaded, setHoteDataLoaded] = useState(false)

  // Data state
  const [contrats, setContrats] = useState([])
  const [renouvellements, setRenouvellements] = useState({})
  const [alertes, setAlertes] = useState([])
  const [favoris, setFavoris] = useState([])
  const [candidatures, setCandidatures] = useState([])
  const [candidaturesRecues, setCandidaturesRecues] = useState([])
  const [allConversations, setAllConversations] = useState([])
  const [annonce, setAnnonce] = useState(null)
  const [referralCode, setReferralCode] = useState('...')
  const [proprioData, setProprioData] = useState(null)
  const [proprioNom, setProprioNom] = useState(null)
  const [locataireAccepte, setLocataireAccepte] = useState(null)

  // UI state
  const [showMessagesOverlay, setShowMessagesOverlay] = useState(false)
  const [chatView, setChatView] = useState(false)
  const [chatContact, setChatContact] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showAlerteModal, setShowAlerteModal] = useState(false)
  const [alerteEditMode, setAlerteEditMode] = useState(false)
  const [alerteCalMonth, setAlerteCalMonth] = useState(new Date().getMonth())
  const [alerteCalYear, setAlerteCalYear] = useState(new Date().getFullYear())
  const [alerteSelectedDate, setAlerteSelectedDate] = useState(null)
  const [alerteError, setAlerteError] = useState('')
  const [alerteSuccess, setAlerteSuccess] = useState('')
  const [showVilleModal, setShowVilleModal] = useState(false)
  const [villeModalInput, setVilleModalInput] = useState('')
  const [villeModalSelected, setVilleModalSelected] = useState('')
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [proprietaireEmail, setProprietaireEmail] = useState('')
  const [relationStatus, setRelationStatus] = useState('form') // form, sending, success, pending
  const [pendingEmail, setPendingEmail] = useState('')
  const [sendingChat, setSendingChat] = useState(false)

  const chatMessagesRef = useRef(null)
  const chatInputRef = useRef(null)

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
        const lesDeux = uData.statut_ville_ecole === 'hote' && uData.statut_ville_entreprise === 'recherche'
        setIsLesDeux(lesDeux)

        if (uData.code_parrainage) {
          setReferralCode(uData.code_parrainage)
        }

        // Load all data
        await Promise.all([
          loadLocations(authUser.id),
          loadAlertes(authUser.id, uData.email),
          loadFavoris(authUser.id),
          loadMesCandidatures(authUser.id),
          loadMessages(authUser.id),
        ])
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
  async function loadAlertes(userId, userEmail) {
    try {
      let data = null
      if (userEmail) {
        const res = await supabaseClient.from('alertes').select('*').eq('email', userEmail).order('created_at', { ascending: false })
        data = res.data
      }
      if ((!data || data.length === 0) && userId) {
        const res = await supabaseClient.from('alertes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        if (res.data && res.data.length > 0) data = res.data
      }
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

  // === MESSAGES ===
  async function loadMessages(userId) {
    try {
      const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`expediteur_id.eq.${userId},destinataire_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!messages || messages.length === 0) return

      const autreIds = new Set()
      messages.forEach(msg => {
        autreIds.add(msg.expediteur_id === userId ? msg.destinataire_id : msg.expediteur_id)
      })

      const usersMap = {}
      for (const id of autreIds) {
        const { data: uData } = await supabaseClient
          .from('users')
          .select('id, prenom, nom, type_user')
          .eq('id', id)
          .single()
        if (uData) usersMap[uData.id] = uData
      }

      const conversations = {}
      messages.forEach(msg => {
        const autreId = msg.expediteur_id === userId ? msg.destinataire_id : msg.expediteur_id
        if (!conversations[autreId]) {
          const autre = usersMap[autreId] || {}
          conversations[autreId] = {
            userId: autreId,
            prenom: autre.prenom || 'Utilisateur',
            nom: autre.nom || '',
            typeUser: autre.type_user || '',
            dernierMessage: msg.contenu || '',
            date: msg.created_at,
            nonLu: msg.destinataire_id === userId && !msg.lu,
            estEnvoye: msg.expediteur_id === userId
          }
        }
      })

      setAllConversations(Object.values(conversations))
    } catch (error) {
      console.error('Erreur messages:', error)
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
        await loadAnnonce(currentUserId)
        await loadCandidaturesRecues(currentUserId)
      }
    }
  }

  async function verifierMiseEnRelation() {
    if (!currentUserId) return
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
      }
    } catch (error) {
      // pas de demande
    }
  }

  async function loadParrainage() {
    if (!userData) return
    if (userData.code_parrainage) {
      setReferralCode(userData.code_parrainage)
    } else {
      const code = await genererCodeParrainage(userData.prenom, currentUserId)
      setReferralCode(code)
    }
  }

  async function genererCodeParrainage(prenom, userId) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const prenomPart = (prenom || 'USER').substring(0, 5).toUpperCase().padEnd(5, 'X')
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const fullCode = `${prenomPart}-${code}`
    try {
      await supabaseClient.from('users').update({ code_parrainage: fullCode }).eq('id', userId)
    } catch (error) {
      console.error('Erreur sauvegarde code:', error)
    }
    return fullCode
  }

  async function loadAnnonce(userId) {
    try {
      const villeHote = userData?.ville_ecole || null
      let query = supabaseClient.from('annonces').select('*').eq('user_id', userId)
      if (villeHote) query = query.eq('ville', villeHote)
      query = query.order('created_at', { ascending: false }).limit(1)
      const { data } = await query.single()
      if (data) setAnnonce(data)
    } catch (error) { /* no annonce */ }
  }

  async function loadCandidaturesRecues(userId) {
    try {
      const villeHote = userData?.ville_ecole || null
      let queryAnnonces = supabaseClient.from('annonces').select('id').eq('user_id', userId)
      if (villeHote) queryAnnonces = queryAnnonces.eq('ville', villeHote)
      const { data: mesAnnonces } = await queryAnnonces
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

  // === OVERLAY MESSAGES ===
  function ouvrirOverlayMessages() {
    setShowMessagesOverlay(true)
    setChatView(false)
  }

  function fermerOverlayMessages() {
    setShowMessagesOverlay(false)
    setChatView(false)
    setChatContact(null)
  }

  async function ouvrirConversation(userId, prenom, nom, typeUser) {
    setChatContact({ userId, prenom, nom: nom || '', typeUser })
    setChatView(true)
    if (!showMessagesOverlay) setShowMessagesOverlay(true)

    // Mark as read in local state
    setAllConversations(prev => prev.map(c =>
      c.userId === userId ? { ...c, nonLu: false } : c
    ))

    await loadChatMessages(userId)
  }

  async function loadChatMessages(contactId) {
    try {
      const { data: msgs } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(expediteur_id.eq.${currentUserId},destinataire_id.eq.${contactId}),and(expediteur_id.eq.${contactId},destinataire_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      setChatMessages(msgs || [])

      // Mark as read
      await supabaseClient
        .from('messages')
        .update({ lu: true })
        .eq('destinataire_id', currentUserId)
        .eq('expediteur_id', contactId)
        .eq('lu', false)

      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
        }
      }, 100)
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  async function envoyerMessage() {
    if (!chatInput.trim() || !chatContact) return
    setSendingChat(true)
    try {
      await supabaseClient.from('messages').insert([{
        expediteur_id: currentUserId,
        destinataire_id: chatContact.userId,
        contenu: chatInput.trim(),
        lu: false
      }])
      setChatInput('')
      await loadChatMessages(chatContact.userId)

      setAllConversations(prev => prev.map(c =>
        c.userId === chatContact.userId
          ? { ...c, dernierMessage: chatInput.trim(), date: new Date().toISOString(), estEnvoye: true }
          : c
      ))
    } catch (err) {
      console.error('Erreur envoi:', err)
    } finally {
      setSendingChat(false)
    }
  }

  function retourListeMessages() {
    setChatView(false)
    setChatContact(null)
  }

  // === ALERTE ===
  function ouvrirModalAlerte(editMode = false) {
    setAlerteEditMode(editMode)
    setAlerteError('')
    setAlerteSuccess('')
    if (editMode && alertes.length > 0 && alertes[0].date_debut_alternance) {
      const existDate = new Date(alertes[0].date_debut_alternance)
      setAlerteCalMonth(existDate.getMonth())
      setAlerteCalYear(existDate.getFullYear())
      setAlerteSelectedDate(alertes[0].date_debut_alternance)
    } else {
      setAlerteSelectedDate(null)
      setAlerteCalMonth(new Date().getMonth())
      setAlerteCalYear(new Date().getFullYear())
    }
    setShowAlerteModal(true)
  }

  async function creerAlerte() {
    const ville = isLesDeux ? userData?.ville_entreprise : userData?.ville
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

      if (alerteEditMode && alertes.length > 0) {
        await supabaseClient.from('alertes').update({
          ville: villeSlug,
          rythme,
          date_debut_alternance: alerteSelectedDate
        }).eq('id', alertes[0].id)
        setAlerteSuccess('Alerte modifiee avec succes')
      } else {
        await supabaseClient.from('alertes').insert({
          email, ville: villeSlug, rythme, user_id: currentUserId,
          date_debut_alternance: alerteSelectedDate
        })
        setAlerteSuccess('Alerte activee avec succes')
      }
      setTimeout(() => {
        setShowAlerteModal(false)
        loadAlertes(currentUserId, userData?.email)
      }, 2000)
    } catch (error) {
      console.error('Erreur:', error)
      setAlerteError('Erreur, reessaie')
    }
  }

  async function desactiverAlerte() {
    if (alertes.length === 0) return
    try {
      await supabaseClient.from('alertes').delete().eq('id', alertes[0].id)
      setAlertes([])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // === VILLE SECONDAIRE ===
  async function confirmerVilleSecondaire() {
    if (!villeModalSelected) return
    try {
      await supabaseClient.from('users').update({ ville_recherche_secondaire: villeModalSelected }).eq('id', currentUserId)
      setUserData(prev => ({ ...prev, ville_recherche_secondaire: villeModalSelected }))
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
      loadMesCandidatures(currentUserId)
    } catch (e) {
      console.error('Erreur:', e)
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
    navigator.clipboard.writeText(referralCode)
  }

  // === ENVOYER MISE EN RELATION ===
  async function envoyerMiseEnRelation() {
    const email = proprietaireEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (email === userData?.email) return

    setRelationStatus('sending')
    try {
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
  const hasUnreadMessages = allConversations.some(c => c.nonLu)
  const hasBailActif = contrats.length > 0
  const profilComplet = userData && [userData.ecole, userData.filiere, userData.annee_etudes, userData.date_naissance, userData.sexe, userData.telephone].every(c => c && c.toString().trim() !== '')

  const avatarContent = userData?.photo_profil_url
    ? <img src={userData.photo_profil_url} alt="Photo de profil" />
    : ((userData?.prenom?.[0] || '') + (userData?.nom?.[0] || '')).toUpperCase() || '—'

  const villeAffichee = isLesDeux
    ? (currentMode === 'recherche' ? userData?.ville_entreprise : userData?.ville_ecole)
    : userData?.ville

  const rythmeAffiche = isLesDeux
    ? formaterRythmeAvecVilles(userData?.rythme_alternance, currentMode, userData)
    : formaterRythme(userData?.rythme_alternance)

  const villeLabelAffiche = isLesDeux
    ? (currentMode === 'recherche' ? 'Je cherche a' : 'Je propose a')
    : 'Ville'

  const subtitle = hasBailActif
    ? 'Ton logement est actif — gere ton bail et tes messages'
    : (currentMode === 'recherche'
      ? 'Gere ton profil, tes alertes et tes messages'
      : 'Gere ton annonce et ton code de parrainage')

  // Ville suggestions
  const villeSuggestions = villeModalInput.trim()
    ? VILLES_DISPONIBLES.filter(v =>
        v.toLowerCase().startsWith(villeModalInput.trim().toLowerCase()) &&
        v.toLowerCase() !== (userData?.ville || '').toLowerCase()
      )
    : []

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="page-header">
        <h1>Bonjour {userData?.prenom || '...'}</h1>
        <p>{subtitle}</p>

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

        {/* Ville header for single-ville users */}
        {!isLesDeux && userData?.ville && !hasBailActif && (
          <div className="ville-header-row">
            <div className="ville-header-badge">
              <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>
              <span>{userData.ville}</span>
            </div>
            {userData.ville_recherche_secondaire && (
              <div className="ville-header-secondaire">
                <div className="ville-header-badge">
                  <span>{userData.ville_recherche_secondaire}</span>
                  <button className="ville-header-remove" onClick={supprimerVilleSecondaire}>&times;</button>
                </div>
              </div>
            )}
            {!userData.ville_recherche_secondaire && (
              <div className="plus-menu-wrapper">
                <button className="btn-plus-ville" onClick={() => setShowPlusMenu(!showPlusMenu)} title="Ajouter une ville">+</button>
                {showPlusMenu && (
                  <div className="plus-menu show">
                    <button className="plus-menu-item" onClick={() => { setShowPlusMenu(false); setShowVilleModal(true); }}>
                      <div className="plus-menu-icon search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                      </div>
                      <div className="plus-menu-text">
                        <div className="plus-menu-label">Rechercher un logement</div>
                        <div className="plus-menu-desc">Ajouter une ville de recherche</div>
                      </div>
                    </button>
                    <button className="plus-menu-item" onClick={() => { setShowPlusMenu(false); navigate('/annonce/creer'); }}>
                      <div className="plus-menu-icon host">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      </div>
                      <div className="plus-menu-text">
                        <div className="plus-menu-label">Proposer mon logement</div>
                        <div className="plus-menu-desc">Louer ou sous-louer dans une ville</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION PROFIL */}
      <div className="section">
        <div className="profil-header">
          <div className="profil-avatar">
            {avatarContent}
          </div>
          <div className="profil-header-info">
            <div className="profil-header-name">{(userData?.prenom || '') + ' ' + (userData?.nom || '')}</div>
            {userData?.identite_verifiee === 'verifiee' && (
              <span className="badge-verifie">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
                Identite verifiee
              </span>
            )}
            {userData?.identite_verifiee === 'documents_fournis' && (
              <span className="badge-documents">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                Documents fournis
              </span>
            )}
            <div className="profil-header-email">{userData?.email || '—'}</div>
            {!profilComplet && (
              <Link to="/profil/modifier" className="btn-completer-dossier" style={{ marginTop: 4 }}>
                Completer mon dossier
              </Link>
            )}
            {profilComplet && (
              <Link to="/profil/modifier" className="btn-edit-profil" style={{ marginTop: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Modifier
              </Link>
            )}
          </div>
          <button className="btn-messages-profil" onClick={ouvrirOverlayMessages} title="Messages">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <div className={`btn-messages-dot ${hasUnreadMessages ? 'active' : ''}`} />
          </button>
        </div>

        <div className="profil-grid">
          <div className="profil-item">
            <span className="profil-label">Telephone</span>
            <span className="profil-value">{userData?.telephone || 'Non renseigne'}</span>
          </div>
          <div className="profil-item">
            <span className="profil-label">{villeLabelAffiche}</span>
            <span className="profil-value">{villeAffichee || 'Non renseignee'}</span>
          </div>
          <div className="profil-item">
            <span className="profil-label">Rythme d'alternance</span>
            <span className="profil-value">{rythmeAffiche}</span>
          </div>
        </div>
      </div>

      {/* LOCATIONS ACTIVES */}
      {hasBailActif && (
        <div className="section" style={{ minHeight: 'auto' }}>
          <div className="section-header">
            <div className="section-title">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              Mes locations actives
            </div>
            <div className="section-description">Tes baux en cours et possibilites de renouvellement</div>
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
          <div className={`alerte-bandeau ${alertes.length > 0 ? 'active' : ''}`}>
            <div className="alerte-bandeau-left">
              <div className="alerte-bandeau-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <span>{alertes.length > 0
                ? 'Alerte active — tu seras notifie des qu\'un logement correspond'
                : 'Active une alerte pour etre notifie des qu\'un logement correspond'
              }</span>
            </div>
            {alertes.length > 0 ? (
              <button className="alerte-bandeau-btn-desactiver" onClick={() => ouvrirModalAlerte(true)}>Modifier</button>
            ) : (
              <button className="alerte-bandeau-btn" onClick={() => ouvrirModalAlerte(false)}>Creer une alerte</button>
            )}
          </div>

          {/* FAVORIS */}
          <div className="section section-with-empty section-favoris">
            <div className="section-header">
              <div className="section-title">
                <div className="section-icon orange">
                  <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </div>
                Mes favoris
                {favoris.length > 0 && <span className="favoris-count">{favoris.length}</span>}
              </div>
              <div className="section-description">Les logements que tu as sauvegardes</div>
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
          <div className="section section-with-empty">
            <div className="section-header">
              <div className="section-title">
                <div className="section-icon" style={{ background: '#EEF2FF' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                </div>
                Mes candidatures
                {candidatures.length > 0 && <span className="favoris-count">{candidatures.length}</span>}
              </div>
              <div className="section-description">Les logements ou tu as postule</div>
            </div>
            {candidatures.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                </div>
                <div className="empty-text">Tu n'as pas encore candidate a un logement</div>
                <Link to="/recherche" className="btn btn-orange">Parcourir les annonces</Link>
              </div>
            ) : (
              candidatures.map(c => {
                if (!c.annonces) return null
                const ann = c.annonces
                let statutLabel = 'En attente', statutClass = 'en-attente'
                if (c.statut === 'acceptee') { statutLabel = 'Acceptee'; statutClass = 'acceptee' }
                else if (c.statut === 'refusee') { statutLabel = 'Refusee'; statutClass = 'refusee' }

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
          {/* MON PROPRIETAIRE */}
          {relationStatus !== 'validated' && (
            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  <div className="section-icon orange">
                    <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  Mon proprietaire
                </div>
                <div className="section-description">Invite ton proprietaire a rejoindre STERNY pour officialiser l'echange</div>
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
                  <div className="proprio-label">Code de parrainage</div>
                  <div className="proprio-code-inline">
                    <div className="proprio-code">{referralCode}</div>
                    <button className="proprio-copy-btn-inline" onClick={copierCode}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      Copier
                    </button>
                  </div>
                  <div className="proprio-help">Ton proprietaire devra entrer ce code lors de son inscription sur STERNY.</div>
                </div>
              </div>
            </div>
          )}

          {/* MON ANNONCE */}
          <div className="section section-with-empty">
            <div className="section-header">
              <div className="section-title">
                <div className="section-icon orange">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                Mon annonce
              </div>
              <div className="section-description">Ton logement propose a l'alternance</div>
            </div>
            {!annonce ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <div className="empty-text">Tu n'as pas encore cree d'annonce</div>
                <Link to="/annonce/creer?type=locataire" className="btn btn-orange">Creer mon annonce</Link>
              </div>
            ) : (
              <div className="annonce-card">
                <div className="annonce-thumb">
                  {annonce.photos && annonce.photos.length > 0
                    ? <img src={annonce.photos[0]} alt={annonce.titre} />
                    : <div className="annonce-thumb-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
                  }
                </div>
                <div className="annonce-body">
                  <div className="annonce-title">{annonce.titre || 'Mon logement'}</div>
                  <div className="annonce-meta">
                    {annonce.ville && <span className="annonce-tag">{annonce.ville}</span>}
                    {annonce.type_logement && <span className="annonce-tag">{annonce.type_logement}</span>}
                    {annonce.surface && <span className="annonce-tag">{annonce.surface} m&sup2;</span>}
                    {annonce.prix && <span className="annonce-tag">{annonce.prix}&euro;/sem.</span>}
                  </div>
                  <div className="annonce-actions">
                    <Link to={`/annonce/modifier?id=${annonce.id}`} className="btn-annonce-modifier">Modifier</Link>
                    <Link to={`/logement?id=${annonce.id}`} className="btn-annonce-voir">Voir l'annonce</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CANDIDATURES RECUES */}
          <div className="section section-with-empty">
            <div className="section-header">
              <div className="section-title">
                <div className="section-icon" style={{ background: '#EEF2FF' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                </div>
                Candidatures recues
                {candidaturesRecues.length > 0 && <span className="favoris-count">{candidaturesRecues.length}</span>}
              </div>
              <div className="section-description">Les personnes interessees par ton logement</div>
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
                if (c.statut === 'acceptee') { statutLabel = 'Acceptee'; statutClass = 'acceptee' }
                else if (c.statut === 'refusee') { statutLabel = 'Refusee'; statutClass = 'refusee' }

                return (
                  <div className="candidature-item" key={c.id}>
                    <div className="candidature-avatar">{initiales}</div>
                    <div className="candidature-info">
                      <div className="candidature-titre">{u.prenom} {u.nom}</div>
                      <div className="candidature-ville">{[u.ecole, u.ville_entreprise].filter(Boolean).join(' - ') || u.email}</div>
                    </div>
                    <div className={`candidature-statut ${statutClass}`}>{statutLabel}</div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ACCOUNT ACTIONS */}
      <div className="account-actions-bar">
        <button className="account-action-link" onClick={() => { setShowPasswordModal(true); setPwdNew(''); setPwdConfirm(''); setPwdMsg({ text: '', type: '' }) }}>
          Changer mon mot de passe
        </button>
        <span style={{ color: '#CBD5E1' }}>&middot;</span>
        <button className="account-action-link" onClick={exporterDonnees}>Exporter mes donnees</button>
        <span style={{ color: '#CBD5E1' }}>&middot;</span>
        <button className="account-action-link" onClick={() => { setShowDeleteModal(true); setDeleteConfirm('') }}>Supprimer mon compte</button>
      </div>

      {/* MODAL MOT DE PASSE */}
      {showPasswordModal && (
        <div className="modal-pwd-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowPasswordModal(false) }}>
          <div className="modal-pwd-card">
            <h3>Changer mon mot de passe</h3>
            {pwdMsg.text && <div className={`modal-pwd-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
            <div className="modal-pwd-group">
              <label htmlFor="pwdNew">Nouveau mot de passe</label>
              <input type="password" id="pwdNew" placeholder="Minimum 8 caracteres" minLength="8" value={pwdNew} onChange={e => setPwdNew(e.target.value)} />
            </div>
            <div className="modal-pwd-group">
              <label htmlFor="pwdConfirm">Confirmer le nouveau mot de passe</label>
              <input type="password" id="pwdConfirm" placeholder="Retape ton mot de passe" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} />
            </div>
            <div className="modal-pwd-buttons">
              <button className="modal-pwd-btn-cancel" onClick={() => setShowPasswordModal(false)}>Annuler</button>
              <button className="modal-pwd-btn-save" onClick={changerMotDePasse}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && (
        <div className="modal-delete-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="modal-delete-card">
            <div className="modal-delete-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3>Supprimer ton compte ?</h3>
            <p>Cette action est <strong>irreversible</strong>. Toutes tes donnees seront definitivement supprimees.</p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input type="text" className="modal-delete-confirm-input" placeholder="SUPPRIMER" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <div className="modal-delete-buttons">
              <button className="modal-delete-btn-cancel" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="modal-delete-btn-delete" disabled={deleteConfirm.trim() !== 'SUPPRIMER'} onClick={supprimerCompte}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VILLE */}
      {showVilleModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowVilleModal(false) }}>
          <div className="modal-box">
            <div className="modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <h3 className="modal-title">Ajouter une ville de recherche</h3>
            <p className="modal-desc">Tu peux chercher un logement dans une seconde ville.</p>
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
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setShowVilleModal(false)}>Annuler</button>
              <button className="modal-btn-confirm" disabled={!villeModalSelected} onClick={confirmerVilleSecondaire}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

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
      {showMessagesOverlay && (
        <div className="messages-overlay active" onClick={e => { if (e.target === e.currentTarget) fermerOverlayMessages() }}>
          <div className={`messages-overlay-box ${chatView ? 'chat-mode' : ''}`}>
            {!chatView ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="messages-overlay-header">
                  <div className="messages-overlay-title">
                    <div className="section-icon">
                      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    Mes messages
                  </div>
                  <button className="messages-overlay-close" onClick={fermerOverlayMessages}>&times;</button>
                </div>
                <div className="messages-overlay-list">
                  {allConversations.length === 0 ? (
                    <div className="messages-overlay-empty">Aucun message pour le moment</div>
                  ) : (
                    allConversations.map(c => {
                      const initials = ((c.prenom || 'U')[0] + (c.nom ? c.nom[0] : '')).toUpperCase()
                      const timeAgo = formatTimeAgo(c.date)
                      const preview = c.dernierMessage.length > 80 ? c.dernierMessage.substring(0, 80) + '...' : c.dernierMessage

                      return (
                        <div
                          key={c.userId}
                          className={`message-item ${c.nonLu ? 'message-unread' : ''}`}
                          onClick={() => ouvrirConversation(c.userId, c.prenom, c.nom, c.typeUser)}
                        >
                          <div className="message-avatar">{initials}</div>
                          <div className="message-content">
                            <div className="message-top-row">
                              <div className="message-name">{c.prenom} {c.nom || ''}</div>
                              <span className="message-time">{timeAgo}</span>
                            </div>
                            <div className="message-bottom-row">
                              <div className="message-preview">
                                {c.estEnvoye && <span className="message-preview-prefix">Vous : </span>}
                                {preview || 'Nouvelle conversation'}
                              </div>
                              {c.nonLu && <div className="message-unread-dot" />}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="overlay-chat-view active">
                <div className="overlay-chat-header">
                  <button className="overlay-chat-back" onClick={retourListeMessages}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
                  </button>
                  <div className="overlay-chat-contact">
                    <div className="overlay-chat-avatar">
                      {chatContact ? ((chatContact.prenom || 'U')[0] + (chatContact.nom ? chatContact.nom[0] : '')).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="overlay-chat-name">{chatContact ? (chatContact.prenom + ' ' + (chatContact.nom || '')).trim() : '...'}</div>
                      <div className="overlay-chat-role">
                        {chatContact?.typeUser === 'locataire' ? 'Locataire' : chatContact?.typeUser === 'proprietaire' ? 'Proprietaire' : chatContact?.typeUser === 'hote' ? 'Hote' : ''}
                      </div>
                    </div>
                  </div>
                  <button className="messages-overlay-close" onClick={fermerOverlayMessages}>&times;</button>
                </div>
                <div className="overlay-chat-messages" ref={chatMessagesRef}>
                  {chatMessages.length === 0 ? (
                    <div className="overlay-chat-empty">Envoie ton premier message !</div>
                  ) : (
                    (() => {
                      let lastDate = ''
                      return chatMessages.map((msg, idx) => {
                        const isSent = msg.expediteur_id === currentUserId
                        const msgDate = new Date(msg.created_at)
                        const dateStr = msgDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                        const time = msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        const showDateSep = dateStr !== lastDate
                        if (showDateSep) lastDate = dateStr

                        return (
                          <div key={msg.id || idx}>
                            {showDateSep && <div className="chat-date-sep"><span>{dateStr}</span></div>}
                            <div className={`chat-msg ${isSent ? 'sent' : 'received'}`}>
                              <div>
                                <div className="chat-bubble">{msg.contenu}</div>
                                <div className="chat-msg-time">{time}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
                <div className="overlay-chat-input">
                  <textarea
                    className="overlay-chat-textarea"
                    ref={chatInputRef}
                    placeholder="Ecris ton message..."
                    rows="1"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } }}
                  />
                  <button className="overlay-chat-send" disabled={sendingChat || !chatInput.trim()} onClick={envoyerMessage}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
