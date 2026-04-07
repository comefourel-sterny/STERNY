import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import { getInitials } from '../../utils/formatters'
import AgendaCard from '../../components/dashboard/AgendaCard'
import ChatComponent from '../../components/chat/ChatComponent'
import './DashboardHotePage.css'

export default function DashboardHotePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  // Profile state
  const [userData, setUserData] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [referralCode, setReferralCode] = useState('LOADING...')

  // Proprietaire relation
  const [relationStatus, setRelationStatus] = useState('form') // form, pending, connected
  const [pendingEmail, setPendingEmail] = useState('')
  const [proprietaireEmail, setProprietaireEmail] = useState('')
  const [connectedProprio, setConnectedProprio] = useState(null)

  // Data state
  const [annonces, setAnnonces] = useState([])
  const [candidatures, setCandidatures] = useState([])
  const [hasUnread, setHasUnread] = useState(false)

  // Messages overlay
  const [showMessagesOverlay, setShowMessagesOverlay] = useState(false)

  // Load profile on mount
  useEffect(() => {
    if (user) loadProfile()
    return () => {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current)
    }
  }, [user])

  async function loadProfile() {
    try {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser()
      if (!authUser) { navigate('/connexion'); return }
      setCurrentUserId(authUser.id)

      const { data: uData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (uData) {
        setUserData(uData)

        if (uData.invitation_token) {
          setReferralCode(uData.invitation_token)
        } else {
          const token = await genererInvitationToken(authUser.id)
          setReferralCode(token)
        }

        await chargerMiseEnRelation(authUser.id, uData)
      }

      await chargerAnnonces(authUser.id)
      await chargerCandidatures(authUser.id)
      await chargerMessagesNonLus(authUser.id)
    } catch (error) {
      console.error('Erreur:', error)
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

  async function chargerMiseEnRelation(userId, uData) {
    try {
      const emailProprio = uData.email_proprietaire || null
      if (emailProprio) {
        setRelationStatus('pending')
        setPendingEmail(emailProprio)

        const { data: proprio } = await supabaseClient
          .from('users')
          .select('id, prenom, nom')
          .eq('parrain_id', userId)
          .eq('type_user', 'proprietaire')
          .limit(1)
          .single()

        if (proprio) {
          setRelationStatus('connected')
          setConnectedProprio(proprio)
        }
      }
    } catch (error) {
      console.error('Erreur mise en relation:', error)
    }
  }

  async function envoyerInvitationProprio() {
    const email = proprietaireEmail.trim()
    if (!email || !email.includes('@')) return
    try {
      await supabaseClient.from('users').update({ email_proprietaire: email }).eq('id', currentUserId)

      await supabaseClient.functions.invoke('send-proprietaire-invitation', {
        body: {
          proprietaire_email: email,
          alternant_prenom: userData?.prenom || '',
          alternant_nom: userData?.nom || '',
          invitation_token: referralCode
        }
      })

      setRelationStatus('pending')
      setPendingEmail(email)
    } catch (error) {
      console.error('Erreur envoi invitation:', error)
    }
  }

  function copierCode() {
    const invitationUrl = `${window.location.origin}/invitation/${referralCode}`
    navigator.clipboard.writeText(invitationUrl).then(() => {
      const btn = document.querySelector('.btn-copy')
      if (btn) {
        const old = btn.innerHTML
        btn.textContent = 'Copie !'
        setTimeout(() => { btn.innerHTML = old }, 2000)
      }
    })
  }

  async function chargerAnnonces(userId) {
    try {
      const { data } = await supabaseClient
        .from('annonces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (data) setAnnonces(data)
    } catch (error) {
      // No annonce
    }
  }

  async function chargerCandidatures(userId) {
    try {
      const { data } = await supabaseClient
        .from('candidatures')
        .select('*, annonces(titre, ville, prix, user_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (data && data.length > 0) setCandidatures(data)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  async function chargerMessagesNonLus(userId) {
    try {
      const { count } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('destinataire_id', userId)
        .eq('lu', false)
      if (count && count > 0) setHasUnread(true)
    } catch (e) {
      // pas grave
    }
  }

  return (
    <div className="dashboard-hote-container">
      {/* HEADER */}
      <div className="page-header">
        <h1>Bonjour {userData?.prenom || '...'}</h1>
        <p>Gérez votre annonce et invitez votre propriétaire</p>
      </div>

      {/* SECTION : MON PROPRIETAIRE */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <div className="section-icon orange">
              <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            </div>
            Mon proprietaire
          </div>
          <div className="section-description">Invite ton proprietaire a rejoindre STERNY pour officialiser l'echange</div>
        </div>

        <div className="proprio-grid">
          {/* Colonne gauche : Mise en relation */}
          <div className="proprio-col">
            <div className="proprio-label">Mise en relation</div>
            {relationStatus === 'form' && (
              <div className="proprio-email-form">
                <input
                  type="email"
                  className="proprio-email-input"
                  placeholder="Email de votre proprietaire"
                  value={proprietaireEmail}
                  onChange={(e) => setProprietaireEmail(e.target.value)}
                />
                <button className="btn-send-email" onClick={envoyerInvitationProprio}>Envoyer</button>
              </div>
            )}
            {relationStatus === 'pending' && (
              <div className="badge-en-attente">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                En attente &mdash; {pendingEmail}
              </div>
            )}
            {relationStatus === 'connected' && connectedProprio && (
              <div className="badge-connecte">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Connecte &mdash; {connectedProprio.prenom} {connectedProprio.nom}
              </div>
            )}
          </div>

          {/* Colonne droite : Lien d'invitation */}
          <div className="proprio-col">
            <div className="proprio-label">Lien d'invitation</div>
            <div className="code-row">
              <div className="code-value" style={{ fontSize: '12px' }}>{`${window.location.origin}/invitation/${referralCode}`}</div>
              <button className="btn-copy" onClick={copierCode}>
                <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copier
              </button>
            </div>
            <div className="code-helper">Partage ce lien avec ton propriétaire pour l'inviter sur STERNY.</div>
          </div>
        </div>
      </div>

      {/* SECTION : MON ANNONCE */}
      <div className="section section-with-empty">
        <div className="section-header">
          <div className="section-title">
            <div className="section-icon orange">
              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            {annonces.length <= 1 ? 'Mon annonce' : `Mes annonces (${annonces.length})`}
          </div>
          <div className="section-description">Ton logement propose a l'alternance</div>
        </div>

        {annonces.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div className="empty-text">Vous n'avez pas encore cree d'annonce</div>
            <Link to="/annonce/creer" className="btn btn-orange">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Creer mon annonce
            </Link>
          </div>
        ) : (
          <div>
            {annonces.map(annonce => (
              <div key={annonce.id} className="annonce-card" style={{ marginBottom: '12px' }}>
                <div className="annonce-thumb">
                  {annonce.photos && annonce.photos.length > 0
                    ? <img loading="lazy" src={annonce.photos[0]} alt={annonce.titre} />
                    : <div className="annonce-thumb-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
                  }
                </div>
                <div className="annonce-body">
                  <div className="annonce-title">{annonce.titre || 'Mon logement'}</div>
                  <div className="annonce-meta">
                    {annonce.ville && <span className="annonce-tag"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>{annonce.ville}</span>}
                    {annonce.surface && <span className="annonce-tag"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>{annonce.surface} m2</span>}
                    {annonce.nb_chambres && <span className="annonce-tag"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>{annonce.nb_chambres} ch.</span>}
                    {annonce.prix_semaine && <span className="annonce-tag"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>{annonce.prix_semaine}EUR/sem</span>}
                  </div>
                  <div className="annonce-actions">
                    <Link to={`/annonce/modifier?id=${annonce.id}`} className="btn btn-primary">Modifier</Link>
                    <Link to={`/logement?id=${annonce.id}`} className="btn btn-secondary">Voir</Link>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-orange" style={{ marginTop: '8px' }} onClick={async () => {
              if (userData?.type_user === 'hote') {
                await supabaseClient.from('users').update({ type_user: 'les_deux' }).eq('id', userData.id)
              }
              navigate('/annonce/creer')
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Ajouter une annonce
            </button>
          </div>
        )}
      </div>

      {/* SECTION : CANDIDATURES ENVOYEES */}
      <div className="section section-with-empty">
        <div className="section-header">
          <div className="section-title">
            <div className="section-icon">
              <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            </div>
            Mes candidatures envoyees
          </div>
          <div className="section-description">Suivez l'etat de vos candidatures</div>
        </div>

        {candidatures.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            </div>
            <div className="empty-text">Aucune candidature envoyee pour le moment</div>
          </div>
        ) : (
          candidatures.map(c => {
            const statusClass = { en_attente: 'status-en-attente', acceptee: 'status-acceptee', refusee: 'status-refusee' }[c.statut] || 'status-en-attente'
            const statusText = { en_attente: 'En attente', acceptee: 'Acceptee', refusee: 'Refusee' }[c.statut] || 'En attente'
            const initiales = (c.annonces?.titre || '??').substring(0, 2).toUpperCase()
            const date = new Date(c.created_at).toLocaleDateString('fr-FR')
            return (
              <div key={c.id} className="candidature-bloc">
                <div className="cand-avatar">{initiales}</div>
                <div className="cand-info">
                  <div className="cand-name">{c.annonces?.titre || 'Annonce'}</div>
                  <div className="cand-subtitle">{c.annonces?.ville || ''} {c.annonces?.prix ? `\u2022 ${c.annonces.prix}EUR/mois` : ''} &middot; {date}</div>
                </div>
                <span className={`status-badge ${statusClass}`}>{statusText}</span>
                {c.statut === 'acceptee' && (
                  <Link to={`/match-actif?match_id=${c.id}`} className="btn btn-orange" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}>
                    Voir le match &rarr;
                  </Link>
                )}
              </div>
            )
          })
        )}
      </div>


      {/* OVERLAY MESSAGES */}
      <ChatComponent
        mode="overlay"
        isOpen={showMessagesOverlay}
        onClose={() => setShowMessagesOverlay(false)}
        currentUserId={currentUserId}
        currentUserType="hote"
      />
    </div>
  )
}
