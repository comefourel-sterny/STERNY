import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import { getInitials } from '../../utils/formatters'
import AgendaCard from '../../components/dashboard/AgendaCard'
import ChatComponent from '../../components/chat/ChatComponent'
import './DashboardProprietairePage.css'

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export default function DashboardProprietairePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  // Profile state
  const [userData, setUserData] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentLocataireData, setCurrentLocataireData] = useState(null)

  // Data state
  const [annonces, setAnnonces] = useState([])
  const [approbations, setApprobations] = useState([])
  const [renouvellements, setRenouvellements] = useState([])
  const [locationsActives, setLocationsActives] = useState([])
  const [paiements, setPaiements] = useState([])
  // UI state
  const [showMessagesOverlay, setShowMessagesOverlay] = useState(false)
  const [chatContactId, setChatContactId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const [showLocataireOverlay, setShowLocataireOverlay] = useState(false)
  const [showCandidatureOverlay, setShowCandidatureOverlay] = useState(false)
  const [selectedCandidatureIndex, setSelectedCandidatureIndex] = useState(null)

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showRefuseModal, setShowRefuseModal] = useState(false)
  const [currentCandidatureId, setCurrentCandidatureId] = useState(null)
  const [modalData, setModalData] = useState({})
  const [messageRefus, setMessageRefus] = useState('')

  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [pendingActionId, setPendingActionId] = useState(null)

  const [showDeleteAnnonceModal, setShowDeleteAnnonceModal] = useState(false)
  const [pendingDeleteAnnonceId, setPendingDeleteAnnonceId] = useState(null)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const [toast, setToast] = useState({ visible: false, type: '', message: '' })

  // Calendar & Documents
  const [showCalendar, setShowCalendar] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)
  const [allContrats, setAllContrats] = useState([])
  const [allPaiements, setAllPaiements] = useState([])

  function showToast(type, message) {
    setToast({ visible: true, type, message })
    setTimeout(() => setToast({ visible: false, type: '', message: '' }), 3500)
  }

  function openChatWith(contactId) {
    setChatContactId(contactId)
    setShowMessagesOverlay(true)
  }

  const [profilScrolledToBottom, setProfilScrolledToBottom] = useState(false)
  function handleProfilScroll(e) {
    const el = e.target
    setProfilScrolledToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 8)
  }

  // Block body scroll when any overlay is open
  useEffect(() => {
    const anyOpen = showLocataireOverlay || showCandidatureOverlay || showApproveModal || showRejectModal || showDeleteAnnonceModal || showMessagesOverlay
    document.body.style.overflow = anyOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showLocataireOverlay, showCandidatureOverlay, showApproveModal, showRejectModal, showDeleteAnnonceModal, showMessagesOverlay])

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

        if (uData.parrain_id) {
          await chargerLocataire(uData.parrain_id)
        }

        await Promise.all([
          chargerAnnonces(authUser.id),
          chargerLocationsActives(authUser.id),
          chargerApprobations(authUser.id, uData),
          chargerDemandesRenouvellement(authUser.id),
          chargerPaiements(authUser.id),
          chargerTousContrats(authUser.id),
          chargerTousPaiements(authUser.id),
          supabaseClient.from('messages').select('*', { count: 'exact', head: true }).eq('destinataire_id', authUser.id).eq('lu', false).then(({ count }) => setUnreadCount(count || 0)),
        ])
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  async function chargerLocataire(parrainId) {
    try {
      const { data: parrain } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', parrainId)
        .single()
      if (parrain) setCurrentLocataireData(parrain)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  async function chargerAnnonces(userId) {
    try {
      const { data } = await supabaseClient
        .from('annonces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (data && data.length > 0) setAnnonces(data)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  async function chargerLocationsActives(userId) {
    try {
      const { data: contrats, error } = await supabaseClient
        .from('contrats')
        .select('*, annonces(id, titre, ville), users!contrats_locataire_id_fkey(id, prenom, nom, email, telephone)')
        .eq('proprietaire_id', userId)
        .eq('statut', 'signe')
        .order('date_fin', { ascending: true })
      if (!error && contrats) setLocationsActives(contrats)
    } catch (error) {
      console.error('Erreur locations actives:', error)
    }
  }

  async function chargerApprobations(userId, uData) {
    try {
      const { data: hotes } = await supabaseClient
        .from('users')
        .select('id')
        .eq('parrain_id', userId)

      let hoteIds = (hotes || []).map(h => h.id)
      if (uData && uData.parrain_id && !hoteIds.includes(uData.parrain_id)) {
        hoteIds.push(uData.parrain_id)
      }
      if (hoteIds.length === 0) return

      const { data: annoncesHotes } = await supabaseClient
        .from('annonces')
        .select('id')
        .in('user_id', hoteIds)
      if (!annoncesHotes || annoncesHotes.length === 0) return

      const annonceIds = annoncesHotes.map(a => a.id)

      const { data: candidatures } = await supabaseClient
        .from('candidatures')
        .select('*, annonces(titre, ville, prix), users:locataire_id(id, nom, prenom, email, telephone, sexe, date_naissance, ecole, annee_etudes, filiere, bio, photo_profil_url, ville, type_alternance, rythme_alternance)')
        .in('annonce_id', annonceIds)
        .eq('statut', 'acceptee')
        .order('created_at', { ascending: false })

      if (candidatures && candidatures.length > 0) setApprobations(candidatures)
    } catch (error) {
      console.error('Erreur approbations:', error)
    }
  }

  async function chargerDemandesRenouvellement(userId) {
    try {
      const { data: demandes, error } = await supabaseClient
        .from('renouvellements')
        .select('*, users!renouvellements_locataire_id_fkey(prenom, nom, email), annonces(titre, ville), contrats!renouvellements_contrat_original_id_fkey(loyer_mensuel, date_debut, date_fin)')
        .eq('proprietaire_id', userId)
        .in('statut', ['demande_locataire'])
        .order('created_at', { ascending: false })
      if (!error && demandes && demandes.length > 0) setRenouvellements(demandes)
    } catch (error) {
      console.error('Erreur renouvellements:', error)
    }
  }

  async function chargerPaiements(userId) {
    try {
      const { data: paiementsData, error } = await supabaseClient
        .from('paiements_loyer')
        .select('*, contrats(id, locataire_id, annonce_id, loyer_mensuel, annonces(titre, ville), users!contrats_locataire_id_fkey(prenom, nom, email, garant_prenom, garant_nom, garant_email))')
        .in('statut', ['impaye', 'relance_envoyee'])
        .order('mois', { ascending: false })

      if (error) return

      const mesPaiements = (paiementsData || []).filter(p => p.contrats && p.signale_par === userId)
      setPaiements(mesPaiements)
    } catch (error) {
      console.error('Erreur paiements:', error)
    }
  }

  async function chargerTousContrats(userId) {
    try {
      const { data } = await supabaseClient
        .from('contrats')
        .select('*, annonces(id, titre, ville), users!contrats_locataire_id_fkey(id, prenom, nom)')
        .eq('proprietaire_id', userId)
        .order('date_debut', { ascending: true })
      if (data) setAllContrats(data)
    } catch (e) { console.error('Erreur contrats:', e) }
  }

  async function chargerTousPaiements(userId) {
    try {
      const { data } = await supabaseClient
        .from('paiements_loyer')
        .select('*, contrats!inner(id, proprietaire_id, annonces(titre, ville), users!contrats_locataire_id_fkey(prenom, nom))')
        .eq('contrats.proprietaire_id', userId)
        .order('mois', { ascending: false })
      setAllPaiements(data || [])
    } catch (e) { console.error('Erreur paiements historique:', e) }
  }

  // === ACTIONS ===
  function handleDeleteAnnonce(annonceId) {
    // Bloquer si bail en cours sur cette annonce
    const bailEnCours = locationsActives.some(loc => loc.annonce_id === annonceId)
    if (bailEnCours) {
      showToast('error', 'Impossible de supprimer : un bail est en cours sur cette annonce.')
      return
    }
    setPendingDeleteAnnonceId(annonceId)
    setShowDeleteAnnonceModal(true)
  }

  async function confirmDeleteAnnonce() {
    if (!pendingDeleteAnnonceId) return
    try {
      await supabaseClient.from('candidatures').delete().eq('annonce_id', pendingDeleteAnnonceId)
      const { error } = await supabaseClient.from('annonces').delete().eq('id', pendingDeleteAnnonceId).eq('user_id', userData.id)
      if (error) throw error
      setAnnonces(prev => prev.filter(a => a.id !== pendingDeleteAnnonceId))
      showToast('success', 'Annonce supprimée.')
    } catch (e) {
      console.error('Erreur suppression annonce:', e)
      showToast('error', "Erreur lors de la suppression de l'annonce.")
    }
    setShowDeleteAnnonceModal(false)
    setPendingDeleteAnnonceId(null)
  }

  function handleApprouver(candidatureId) {
    setPendingActionId(candidatureId)
    setShowApproveModal(true)
  }

  async function confirmApprouver() {
    if (!pendingActionId) return
    try {
      const { error } = await supabaseClient
        .from('candidatures')
        .update({ approbation_proprietaire: 'approuve', date_approbation_proprietaire: new Date().toISOString(), proprietaire_id: currentUserId })
        .eq('id', pendingActionId)
      if (error) { showToast('error', "Erreur lors de l'approbation"); setShowApproveModal(false); return }
      showToast('success', 'Profil approuve ! Le locataire pourra proceder au paiement.')
      setApprobations(prev => prev.map(c => c.id === pendingActionId ? { ...c, approbation_proprietaire: 'approuve' } : c))
      navigate(`/match-confirmation?match_id=${pendingActionId}`)
    } catch (err) {
      showToast('error', "Erreur lors de l'approbation")
    }
    setShowApproveModal(false)
    setPendingActionId(null)
  }

  function handleRejeter(candidatureId) {
    setPendingActionId(candidatureId)
    setShowRejectModal(true)
  }

  async function confirmRejeter() {
    if (!pendingActionId) return
    try {
      const { error } = await supabaseClient
        .from('candidatures')
        .update({ approbation_proprietaire: 'rejete', date_approbation_proprietaire: new Date().toISOString(), proprietaire_id: currentUserId })
        .eq('id', pendingActionId)
      if (error) { showToast('error', 'Erreur lors du rejet'); setShowRejectModal(false); return }
      showToast('success', 'Profil rejete.')
      setApprobations(prev => prev.map(c => c.id === pendingActionId ? { ...c, approbation_proprietaire: 'rejete' } : c))
    } catch (err) {
      showToast('error', 'Erreur lors du rejet')
    }
    setShowRejectModal(false)
    setPendingActionId(null)
  }

  async function signalerImpaye(contratId, loyer, prenom, nom) {
    const moisActuel = new Date()
    moisActuel.setDate(1)
    const moisStr = moisActuel.toISOString().split('T')[0]
    const moisLabel = moisActuel.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!window.confirm(`Signaler un impaye pour ${prenom} ${nom} - ${loyer}EUR - ${moisLabel} ?`)) return
    try {
      const { error } = await supabaseClient
        .from('paiements_loyer')
        .upsert({ contrat_id: contratId, mois: moisStr, montant: loyer, statut: 'impaye', signale_par: currentUserId, date_signalement: new Date().toISOString() }, { onConflict: 'contrat_id,mois' })
      if (error) { alert('Erreur lors du signalement.'); return }
      showToast('success', `Impaye signale pour ${prenom} ${nom}.`)
      await chargerPaiements(currentUserId)
    } catch (err) {
      alert('Erreur lors du signalement.')
    }
  }

  async function marquerPaye(paiementId) {
    if (!window.confirm('Confirmer que ce loyer a ete paye ?')) return
    try {
      const { error } = await supabaseClient
        .from('paiements_loyer')
        .update({ statut: 'paye', date_paiement: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', paiementId)
      if (error) { alert('Erreur.'); return }
      showToast('success', 'Paiement marque comme recu.')
      await chargerPaiements(currentUserId)
    } catch (err) {
      console.error('Erreur marquer paye:', err)
    }
  }

  // === PASSWORD / DELETE ===
  async function changerMotDePasse() {
    if (pwdNew.length < 8) { setPwdMsg({ text: 'Le mot de passe doit contenir au moins 8 caracteres.', type: 'error' }); return }
    if (pwdNew !== pwdConfirm) { setPwdMsg({ text: 'Les deux mots de passe ne correspondent pas.', type: 'error' }); return }
    try {
      const result = await supabaseClient.auth.updateUser({ password: pwdNew })
      if (result.error) throw result.error
      setPwdMsg({ text: 'Mot de passe modifie avec succes !', type: 'success' })
      setTimeout(() => { setShowPasswordModal(false); setPwdMsg({ text: '', type: '' }) }, 1500)
    } catch (e) {
      setPwdMsg({ text: e.message || 'Erreur lors du changement.', type: 'error' })
    }
  }

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
      console.error('Erreur suppression compte:', e)
      alert('Erreur lors de la suppression.')
    }
  }

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
      alert("Erreur lors de l'export.")
    }
  }

  // Helper: compute days remaining
  function getCountdown(dateFin) {
    const today = new Date()
    const end = new Date(dateFin)
    const days = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    let cls = 'ok'
    if (days <= 0) cls = 'urgent'
    else if (days <= 14) cls = 'urgent'
    else if (days <= 30) cls = 'warning'
    return { days, cls, text: days > 0 ? `${days}j restants` : 'Termine' }
  }

  // Avatar helper


  const firstVille = annonces.find(a => a.ville)?.ville
  const allVilles = [...new Set(annonces.map(a => a.ville).filter(Boolean))]
  const locataireAnnonceIndex = currentLocataireData?.ville ? annonces.findIndex(a => a.ville === currentLocataireData.ville) : -1
  const locataireBlocIndex = locataireAnnonceIndex >= 0 ? locataireAnnonceIndex : 0

  return (<>
    <div className="dashboard-proprio-container">
      {/* HEADER */}
      <div className="page-header">
        <h1>Bonjour <span className="dp-prenom">{userData?.prenom || '...'}</span></h1>
        {annonces.length > 0 && allVilles.length > 0 && (
          <div className="ville-header-row">
            {allVilles.map(ville => (
              <div key={ville} className="ville-header-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <span>{ville}</span>
              </div>
            ))}
            <Link to="/annonce/creer" className="btn-add-annonce" title="Ajouter un logement">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </Link>
          </div>
        )}
      </div>

      {/* SECTION : MON ANNONCE */}
      <div className="dp-card">
        <div className="dp-card-title">
          <span className="dp-card-icon" style={{ background: '#FFF1E8' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </span>
          {annonces.length <= 1 ? 'Mon annonce' : `Mes annonces (${annonces.length})`}
        </div>

        {annonces.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div className="empty-text">Vous n'avez pas encore cree d'annonce</div>
            <Link to="/annonce/creer" className="btn btn-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Creer mon annonce
            </Link>
          </div>
        ) : (
          <div>
            {annonces.map((a, index) => (
              <div key={a.id}>
                <div className="annonce-card">
                  <div className="annonce-thumb">
                    {a.photos && a.photos.length > 0
                      ? <img src={a.photos[0]} alt={a.titre} />
                      : <div className="annonce-thumb-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
                    }
                  </div>
                  <div className="annonce-body">
                    <div className="annonce-title">{a.titre || 'Mon logement'}</div>
                    <div className="annonce-meta">
                      {a.ville && <span className="annonce-tag"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>{a.ville}</span>}
                      {a.type_logement && <span className="annonce-tag"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>{a.type_logement}</span>}
                      {a.surface && <span className="annonce-tag"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>{a.surface} m²</span>}
                      {a.prix && <span className="annonce-tag">{a.prix}€/sem</span>}
                    </div>
                    <div className="annonce-actions">
                      <Link to={`/annonce/modifier?id=${a.id}`} className="btn-annonce-action">Modifier</Link>
                      <Link to={`/logement?id=${a.id}`} className="btn-annonce-action">Voir</Link>
                      <button className="btn-annonce-action btn-annonce-action-delete" onClick={() => handleDeleteAnnonce(a.id)}>Supprimer</button>
                    </div>
                  </div>
                </div>

                {/* Locataire sous l'annonce correspondante */}
                {index === locataireBlocIndex && currentLocataireData && (
                  <div className="locataire-bloc" onClick={() => { setProfilScrolledToBottom(false); setShowLocataireOverlay(true) }}>
                    <span className="profile-link">
                      <div className="loc-avatar">{getInitials(currentLocataireData.prenom, currentLocataireData.nom)}</div>
                      <div className="loc-info">
                        <div className="loc-label">Locataire <span className="dp-badge dp-badge-active">Hote</span></div>
                        <div className="loc-name">{currentLocataireData.prenom} {currentLocataireData.nom}</div>
                      </div>
                    </span>
                    <button className="btn btn-orange btn-icon-only" onClick={(e) => { e.stopPropagation(); openChatWith(currentLocataireData.id) }} title="Contacter">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Locations actives */}
            {locationsActives.map(contrat => {
              const loc = contrat.users
              if (!loc) return null
              const countdown = getCountdown(contrat.date_fin)
              return (
                <div key={contrat.id} className="locataire-bloc">
                  <span className="profile-link">
                    <div className="loc-avatar">{getInitials(loc.prenom, loc.nom)}</div>
                    <div className="loc-info">
                      <div className="loc-label">Locataire <span className="dp-badge dp-badge-active">Bail signe</span> &middot; <span className={`la-countdown ${countdown.cls}`} style={{ fontSize: '10px', padding: '2px 8px' }}>{countdown.text}</span></div>
                      <div className="loc-name">{loc.prenom} {loc.nom}</div>
                    </div>
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-orange btn-icon-only" onClick={() => openChatWith(loc.id)} title="Contacter">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </button>
                    <button className="btn-impaye" onClick={() => signalerImpaye(contrat.id, contrat.loyer_mensuel || 0, loc.prenom, loc.nom)}>
                      Signaler un impaye
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION : PROFILS A APPROUVER */}
      {approbations.length > 0 && (
        <div className="dp-card">
          <div className="dp-card-title">
            <span className="dp-card-icon" style={{ background: '#FFF1E8' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
            </span>
            Profils en attente
          </div>
          {approbations.map((c, index) => {
            const initials = getInitials(c.users.prenom, c.users.nom)
            const avatarContent = c.users.photo_profil_url
              ? <img src={c.users.photo_profil_url} alt={c.users.prenom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            const dejaApprouve = c.approbation_proprietaire === 'approuve'
            const dejaRejete = c.approbation_proprietaire === 'rejete'

            return (
              <div key={c.id} className="candidature-bloc" onClick={() => { setProfilScrolledToBottom(false); setSelectedCandidatureIndex(index); setShowCandidatureOverlay(true) }}>
                <span className="profile-link" onClick={() => { setProfilScrolledToBottom(false); setSelectedCandidatureIndex(index); setShowCandidatureOverlay(true) }}>
                  <div className="cand-avatar">{avatarContent}</div>
                  <div className="cand-info">
                    <div className="cand-name">{c.users.prenom} {c.users.nom}</div>
                    <div className="cand-subtitle">{c.annonces.titre} &middot; {c.annonces.ville}</div>
                  </div>
                </span>
                {dejaApprouve && <span className="status-badge status-acceptee">Approuve</span>}
                {dejaRejete && <span className="status-badge status-refusee">Rejete</span>}
                <div className="cand-actions">
                  <button className="btn btn-orange btn-icon-only" onClick={(e) => { e.stopPropagation(); openChatWith(c.users.id) }} title="Contacter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SECTION : DEMANDES DE RENOUVELLEMENT */}
      {renouvellements.length > 0 && (
        <div className="dp-card">
          <div className="dp-card-title">
            <span className="dp-card-icon" style={{ background: '#FFF1E8' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            </span>
            Demandes de renouvellement
          </div>
          {renouvellements.map(demande => {
            const locataire = demande.users || {}
            const initiales = getInitials(locataire.prenom, locataire.nom)
            const dateDebut = new Date(demande.date_debut)
            const dateFin = new Date(demande.date_fin)
            const mois = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + (dateFin.getMonth() - dateDebut.getMonth())
            return (
              <div key={demande.id} className="renouv-card">
                <span className="profile-link">
                  <div className="renouv-avatar">{initiales}</div>
                  <div className="renouv-info">
                    <div className="renouv-name">{locataire.prenom} {locataire.nom}</div>
                    <div className="renouv-meta">{demande.annonces?.titre || 'Logement'} &middot; {mois} mois &middot; {demande.loyer_mensuel}EUR/sem</div>
                  </div>
                </span>
                <div className="renouv-actions">
                  <Link to={`/renouvellement?contrat_id=${demande.contrat_original_id}`} className="btn-voir-demande">Voir la demande</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SECTION : SUIVI DES PAIEMENTS */}
      {paiements.length > 0 && (
        <div className="dp-card">
          <div className="dp-card-title">
            <span className="dp-card-icon" style={{ background: '#FFF1E8' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </span>
            Suivi des paiements
          </div>
          {paiements.map(p => {
            const contrat = p.contrats
            const loc = contrat?.users || {}
            const annonce = contrat?.annonces || {}
            const moisLabel = new Date(p.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            const initials = getInitials(loc.prenom, loc.nom)
            const montant = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(p.montant)
            return (
              <div key={p.id} className="paiement-card">
                <div className="paiement-avatar">{initials}</div>
                <div className="paiement-info">
                  <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '14px' }}>{loc.prenom} {loc.nom} &mdash; {moisLabel}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{annonce.titre} &middot; {annonce.ville} &middot; {montant}</div>
                  {loc.garant_prenom
                    ? <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Garant : {loc.garant_prenom} {loc.garant_nom || ''} {loc.garant_email ? `(${loc.garant_email})` : ''}</div>
                    : <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Aucun garant renseigne</div>
                  }
                </div>
                <div className="paiement-actions">
                  <span style={{
                    background: p.statut === 'relance_envoyee' ? '#FEF3C7' : '#FEE2E2',
                    color: p.statut === 'relance_envoyee' ? '#92400E' : '#991B1B',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
                  }}>
                    {p.statut === 'relance_envoyee' ? 'Relance envoyee' : 'Impaye'}
                  </span>
                  <button className="btn-marquer-paye" onClick={() => marquerPaye(p.id)}>Marquer paye</button>
                </div>
              </div>
            )
          })}
        </div>
      )}


      {/* SECTION : CALENDRIER D'OCCUPATION — uniquement si contrats existent */}
      {allContrats.length > 0 && (
      <div className="dp-card">
        <div className="dp-card-title dp-card-toggle" onClick={() => setShowCalendar(!showCalendar)}>
          <span className="dp-card-icon" style={{ background: '#FFF1E8' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </span>
          Calendrier d'occupation
          <svg className={`dp-card-chevron${showCalendar ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {showCalendar && (
          <div className="dp-timeline">
            {allContrats.length === 0 ? (
              <div className="dp-timeline-empty">Aucun contrat pour le moment</div>
            ) : (
              allContrats.map(c => {
                const loc = c.users || {}
                const annonce = c.annonces || {}
                const debut = new Date(c.date_debut)
                const fin = new Date(c.date_fin)
                const now = new Date()
                const isActive = c.statut === 'signe' && fin >= now
                const isPast = fin < now
                const totalDays = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24))
                const elapsed = Math.min(Math.ceil((now - debut) / (1000 * 60 * 60 * 24)), totalDays)
                const progress = isActive ? Math.round((elapsed / totalDays) * 100) : isPast ? 100 : 0

                return (
                  <div key={c.id} className={`dp-timeline-item${isActive ? ' active' : ''}${isPast ? ' past' : ''}`}>
                    <div className="dp-timeline-header">
                      <div className="dp-timeline-avatar">{getInitials(loc.prenom, loc.nom)}</div>
                      <div className="dp-timeline-info">
                        <div className="dp-timeline-name">{loc.prenom} {loc.nom}</div>
                        <div className="dp-timeline-meta">{annonce.titre} &middot; {annonce.ville}</div>
                      </div>
                      <div className="dp-timeline-dates">
                        <span>{debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="dp-timeline-arrow">&rarr;</span>
                        <span>{fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="dp-timeline-bar">
                      <div className="dp-timeline-progress" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="dp-timeline-status">
                      {isActive && <span className="dp-badge dp-badge-active">En cours</span>}
                      {isPast && <span className="dp-badge dp-badge-past">Termine</span>}
                      {!isActive && !isPast && <span className="dp-badge dp-badge-future">A venir</span>}
                      <span className="dp-timeline-duration">{totalDays} jours</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      )}

      {/* SECTION : DOCUMENTS — uniquement si contrats existent */}
      {allContrats.length > 0 && (
      <div className="dp-card">
        <div className="dp-card-title dp-card-toggle" onClick={() => setShowDocuments(!showDocuments)}>
          <span className="dp-card-icon" style={{ background: '#FFF1E8' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </span>
          Documents
          <svg className={`dp-card-chevron${showDocuments ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {showDocuments && (
          <div className="dp-docs">
            {/* Contrats */}
            <div className="dp-docs-group">
              <div className="dp-docs-label">Contrats</div>
              {allContrats.length === 0 ? (
                <div className="dp-docs-empty">Aucun contrat</div>
              ) : (
                allContrats.map(c => {
                  const loc = c.users || {}
                  return (
                    <Link key={c.id} to={`/contrat-location?contrat_id=${c.id}`} className="dp-doc-row">
                      <div className="dp-doc-icon contrat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div className="dp-doc-info">
                        <div className="dp-doc-name">Contrat &mdash; {loc.prenom} {loc.nom}</div>
                        <div className="dp-doc-meta">{new Date(c.date_debut).toLocaleDateString('fr-FR')} &rarr; {new Date(c.date_fin).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <span className={`dp-badge ${c.statut === 'signe' ? 'dp-badge-active' : 'dp-badge-past'}`}>
                        {c.statut === 'signe' ? 'Signe' : c.statut}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Historique paiements */}
            <div className="dp-docs-group">
              <div className="dp-docs-label">Historique des paiements</div>
              {allPaiements.length === 0 ? (
                <div className="dp-docs-empty">Aucun paiement enregistre</div>
              ) : (
                allPaiements.map(p => {
                  const loc = p.contrats?.users || {}
                  const moisLabel = new Date(p.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  const montant = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(p.montant)
                  return (
                    <div key={p.id} className="dp-doc-row">
                      <div className={`dp-doc-icon ${p.statut === 'paye' ? 'paye' : 'impaye'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      </div>
                      <div className="dp-doc-info">
                        <div className="dp-doc-name">{loc.prenom} {loc.nom} &mdash; {moisLabel}</div>
                        <div className="dp-doc-meta">{montant}</div>
                      </div>
                      <span className={`dp-badge ${p.statut === 'paye' ? 'dp-badge-active' : 'dp-badge-past'}`}>
                        {p.statut === 'paye' ? 'Paye' : p.statut === 'relance_envoyee' ? 'Relance' : 'Impaye'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* OVERLAY MESSAGES */}
      <ChatComponent
        mode="overlay"
        isOpen={showMessagesOverlay}
        onClose={() => { setShowMessagesOverlay(false); setChatContactId(null) }}
        currentUserId={currentUserId}
        currentUserType="proprietaire"
        initialContactId={chatContactId}
      />

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false) }}>
          <div className="modal-pwd-card">
            <h3>Changer mon mot de passe</h3>
            {pwdMsg.text && <div className={`modal-pwd-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
            <div className="modal-pwd-group">
              <label>Nouveau mot de passe</label>
              <input type="password" placeholder="Minimum 8 caracteres" minLength="8" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
            </div>
            <div className="modal-pwd-group">
              <label>Confirmer le nouveau mot de passe</label>
              <input type="password" placeholder="Retape ton mot de passe" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
            </div>
            <div className="modal-pwd-buttons">
              <button className="modal-pwd-btn-cancel" onClick={() => setShowPasswordModal(false)}>Annuler</button>
              <button className="modal-pwd-btn-save" onClick={changerMotDePasse}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="modal-delete-card">
            <div className="modal-delete-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3>Supprimer ton compte ?</h3>
            <p>Cette action est <strong>irreversible</strong>. Toutes tes donnees seront definitivement supprimees.</p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input type="text" className="modal-delete-confirm-input" placeholder="SUPPRIMER" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            <div className="modal-delete-buttons">
              <button className="modal-delete-btn-cancel" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="modal-delete-btn-delete" disabled={deleteConfirm !== 'SUPPRIMER'} onClick={supprimerCompte}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast-notification ${toast.type}${toast.visible ? ' visible' : ''}`}>
        {toast.message}
      </div>
    </div>

    {/* PORTALS — rendus directement dans document.body pour éviter les problèmes de stacking context */}

    {showLocataireOverlay && currentLocataireData && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) setShowLocataireOverlay(false) }}>
        <div className="cand-profil-card">
          <button className="cand-profil-close" onClick={() => setShowLocataireOverlay(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="cand-profil-header">
            <div className="cand-profil-avatar">
              {currentLocataireData.photo_profil_url
                ? <img src={currentLocataireData.photo_profil_url} alt={currentLocataireData.prenom} />
                : getInitials(currentLocataireData.prenom, currentLocataireData.nom)}
            </div>
            <h3>{currentLocataireData.prenom} {currentLocataireData.nom}</h3>
            <p className="cand-profil-sub">{currentLocataireData.type_user === 'hote' ? 'Hôte' : 'Locataire'} {currentLocataireData.ville && `· ${currentLocataireData.ville}`}</p>
          </div>
          <div className="cand-profil-details" onScroll={handleProfilScroll}>
            {currentLocataireData.email && <div className="cand-profil-row"><span className="cand-profil-label">Email</span><span>{currentLocataireData.email}</span></div>}
            {currentLocataireData.telephone && <div className="cand-profil-row"><span className="cand-profil-label">Telephone</span><span>{currentLocataireData.telephone}</span></div>}
            {currentLocataireData.sexe && <div className="cand-profil-row"><span className="cand-profil-label">Sexe</span><span>{currentLocataireData.sexe}</span></div>}
            {currentLocataireData.date_naissance && <div className="cand-profil-row"><span className="cand-profil-label">Date de naissance</span><span>{new Date(currentLocataireData.date_naissance).toLocaleDateString('fr-FR')}</span></div>}
            {currentLocataireData.ecole && <div className="cand-profil-row"><span className="cand-profil-label">Ecole</span><span>{currentLocataireData.ecole}</span></div>}
            {currentLocataireData.filiere && <div className="cand-profil-row"><span className="cand-profil-label">Filiere</span><span>{currentLocataireData.filiere}</span></div>}
            {currentLocataireData.annee_etudes && <div className="cand-profil-row"><span className="cand-profil-label">Annee</span><span>{currentLocataireData.annee_etudes}</span></div>}
            {currentLocataireData.type_alternance && <div className="cand-profil-row"><span className="cand-profil-label">Alternance</span><span>{currentLocataireData.type_alternance}</span></div>}
            {currentLocataireData.rythme_alternance && <div className="cand-profil-row"><span className="cand-profil-label">Rythme</span><span>{currentLocataireData.rythme_alternance}</span></div>}
            {currentLocataireData.bio && <div className="cand-profil-row cand-profil-row-bio"><span className="cand-profil-label">Bio</span><span>{currentLocataireData.bio}</span></div>}
          </div>
          <div className={`cand-profil-actions${profilScrolledToBottom ? ' scrolled-bottom' : ''}`}>
            <button className="cand-profil-btn-approve" onClick={() => { setShowLocataireOverlay(false); openChatWith(currentLocataireData.id) }}>Contacter</button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {(() => {
      if (!showCandidatureOverlay || selectedCandidatureIndex === null) return null
      const cand = approbations[selectedCandidatureIndex]
      if (!cand || !cand.users) return null
      const u = cand.users
      return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) setShowCandidatureOverlay(false) }}>
          <div className="cand-profil-card">
            <button className="cand-profil-close" onClick={() => setShowCandidatureOverlay(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="cand-profil-header">
              <div className="cand-profil-avatar">
                {u.photo_profil_url ? <img src={u.photo_profil_url} alt={u.prenom} /> : getInitials(u.prenom, u.nom)}
              </div>
              <h3>{u.prenom} {u.nom}</h3>
              <p className="cand-profil-sub">{cand.annonces.titre} &middot; {cand.annonces.ville}</p>
            </div>
            <div className="cand-profil-details" onScroll={handleProfilScroll}>
              {u.email && <div className="cand-profil-row"><span className="cand-profil-label">Email</span><span>{u.email}</span></div>}
              {u.telephone && <div className="cand-profil-row"><span className="cand-profil-label">Telephone</span><span>{u.telephone}</span></div>}
              {u.sexe && <div className="cand-profil-row"><span className="cand-profil-label">Sexe</span><span>{u.sexe}</span></div>}
              {u.date_naissance && <div className="cand-profil-row"><span className="cand-profil-label">Date de naissance</span><span>{new Date(u.date_naissance).toLocaleDateString('fr-FR')}</span></div>}
              {u.ville && <div className="cand-profil-row"><span className="cand-profil-label">Ville</span><span>{u.ville}</span></div>}
              {u.ecole && <div className="cand-profil-row"><span className="cand-profil-label">Ecole</span><span>{u.ecole}</span></div>}
              {u.filiere && <div className="cand-profil-row"><span className="cand-profil-label">Filiere</span><span>{u.filiere}</span></div>}
              {u.annee_etudes && <div className="cand-profil-row"><span className="cand-profil-label">Annee</span><span>{u.annee_etudes}</span></div>}
              {u.type_alternance && <div className="cand-profil-row"><span className="cand-profil-label">Alternance</span><span>{u.type_alternance}</span></div>}
              {u.rythme_alternance && <div className="cand-profil-row"><span className="cand-profil-label">Rythme</span><span>{u.rythme_alternance}</span></div>}
              {u.bio && <div className="cand-profil-row cand-profil-row-bio"><span className="cand-profil-label">Bio</span><span>{u.bio}</span></div>}
            </div>
            {cand.approbation_proprietaire !== 'approuve' && cand.approbation_proprietaire !== 'rejete' && (
              <div className={`cand-profil-actions${profilScrolledToBottom ? ' scrolled-bottom' : ''}`}>
                <button className="cand-profil-btn-approve green" onClick={() => { setShowCandidatureOverlay(false); handleApprouver(cand.id) }}>Approuver</button>
                <button className="cand-profil-btn-reject" onClick={() => { setShowCandidatureOverlay(false); handleRejeter(cand.id) }}>Rejeter</button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    })()}

    {showApproveModal && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) setShowApproveModal(false) }}>
        <div className="modal-delete-card">
          <div className="modal-delete-icon" style={{ background: '#ECFDF5' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3>Approuver ce profil ?</h3>
          <p>Le locataire sera notifie et pourra proceder au paiement pour valider sa reservation.</p>
          <div className="modal-delete-buttons">
            <button className="modal-delete-btn-cancel" onClick={() => { setShowApproveModal(false); setPendingActionId(null) }}>Annuler</button>
            <button className="modal-delete-btn-delete" style={{ background: '#059669' }} onClick={confirmApprouver}>Approuver</button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showRejectModal && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) setShowRejectModal(false) }}>
        <div className="modal-delete-card">
          <div className="modal-delete-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <h3>Rejeter ce profil ?</h3>
          <p>Le locataire ne pourra plus candidater a cette annonce.</p>
          <div className="modal-delete-buttons">
            <button className="modal-delete-btn-cancel" onClick={() => { setShowRejectModal(false); setPendingActionId(null) }}>Annuler</button>
            <button className="modal-delete-btn-delete" onClick={confirmRejeter}>Rejeter</button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showDeleteAnnonceModal && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteAnnonceModal(false) }}>
        <div className="modal-delete-card">
          <div className="modal-delete-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <h3>Supprimer cette annonce ?</h3>
          <p>Cette action est <strong>irreversible</strong>. L'annonce et toutes les candidatures associees seront supprimees.</p>
          <div className="modal-delete-buttons">
            <button className="modal-delete-btn-cancel" onClick={() => { setShowDeleteAnnonceModal(false); setPendingDeleteAnnonceId(null) }}>Annuler</button>
            <button className="modal-delete-btn-delete" onClick={confirmDeleteAnnonce}>Supprimer</button>
          </div>
        </div>
      </div>,
      document.body
    )}

  </>
  )
}
