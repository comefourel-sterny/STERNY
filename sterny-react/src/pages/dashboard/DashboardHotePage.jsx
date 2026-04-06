import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import { formatTimeAgo, getInitials } from '../../utils/formatters'
import AgendaCard from '../../components/dashboard/AgendaCard'
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
  const [annonce, setAnnonce] = useState(null)
  const [candidatures, setCandidatures] = useState([])
  const [hasUnread, setHasUnread] = useState(false)

  // Messages overlay
  const [showMessagesOverlay, setShowMessagesOverlay] = useState(false)
  const [chatView, setChatView] = useState(false)
  const [chatContact, setChatContact] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [conversations, setConversations] = useState([])

  const chatMessagesRef = useRef(null)
  const chatIntervalRef = useRef(null)

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

      await chargerAnnonce(authUser.id)
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

  async function chargerAnnonce(userId) {
    try {
      const { data } = await supabaseClient
        .from('annonces')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'swap')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setAnnonce(data)
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

  // === MESSAGES OVERLAY ===
  async function ouvrirOverlayMessages() {
    setShowMessagesOverlay(true)
    setChatView(false)
    await chargerListeConversations()
  }

  function fermerOverlayMessages() {
    setShowMessagesOverlay(false)
    setChatView(false)
    setChatContact(null)
    if (chatIntervalRef.current) { clearInterval(chatIntervalRef.current); chatIntervalRef.current = null }
  }

  async function chargerListeConversations() {
    try {
      const { data: msgs } = await supabaseClient
        .from('messages')
        .select('*, expediteur:users!expediteur_id(prenom, nom), destinataire:users!destinataire_id(prenom, nom)')
        .or(`expediteur_id.eq.${currentUserId},destinataire_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })

      if (!msgs || msgs.length === 0) { setConversations([]); return }

      const convos = {}
      msgs.forEach(m => {
        const partnerId = m.expediteur_id === currentUserId ? m.destinataire_id : m.expediteur_id
        if (!convos[partnerId]) {
          const partner = m.expediteur_id === currentUserId ? m.destinataire : m.expediteur
          convos[partnerId] = {
            partnerId,
            partnerName: [partner?.prenom, partner?.nom].filter(Boolean).join(' ') || 'Utilisateur',
            lastMessage: m,
            unread: m.destinataire_id === currentUserId && !m.lu
          }
        }
      })
      setConversations(Object.values(convos))
    } catch (e) {
      setConversations([])
    }
  }

  async function ouvrirChat(partnerId, partnerName) {
    setChatContact({ partnerId, partnerName })
    setChatView(true)
    await chargerMessagesChat(partnerId)

    await supabaseClient
      .from('messages')
      .update({ lu: true })
      .eq('expediteur_id', partnerId)
      .eq('destinataire_id', currentUserId)

    setHasUnread(false)

    if (chatIntervalRef.current) clearInterval(chatIntervalRef.current)
    chatIntervalRef.current = setInterval(() => chargerMessagesChat(partnerId), 5000)
  }

  function retourListeMessages() {
    if (chatIntervalRef.current) { clearInterval(chatIntervalRef.current); chatIntervalRef.current = null }
    setChatView(false)
    setChatContact(null)
    chargerListeConversations()
  }

  async function chargerMessagesChat(partnerId) {
    try {
      const { data: msgs } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(expediteur_id.eq.${currentUserId},destinataire_id.eq.${partnerId}),and(expediteur_id.eq.${partnerId},destinataire_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
      setChatMessages(msgs || [])
    } catch (e) {
      setChatMessages([])
    }
  }

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  async function envoyerMessage() {
    if (!chatInput.trim() || !chatContact || sendingChat) return
    setSendingChat(true)
    try {
      await supabaseClient.from('messages').insert({
        expediteur_id: currentUserId,
        destinataire_id: chatContact.partnerId,
        contenu: chatInput.trim()
      })
      setChatInput('')
      await chargerMessagesChat(chatContact.partnerId)
    } catch (e) {
      console.error('Erreur envoi:', e)
    }
    setSendingChat(false)
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
            Mon annonce
          </div>
          <div className="section-description">Ton logement propose a l'alternance</div>
        </div>

        {!annonce ? (
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
          <div className="annonce-card">
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
      {showMessagesOverlay && (
        <div className="messages-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={(e) => { if (e.target === e.currentTarget) fermerOverlayMessages() }}>
          <div className={`messages-overlay-box${chatView ? ' chat-mode' : ''}`}>
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
                  {conversations.length === 0 ? (
                    <div className="messages-overlay-empty">Aucun message pour le moment</div>
                  ) : (
                    conversations.map(c => {
                      const initials = getInitials(c.partnerName)
                      const time = new Date(c.lastMessage.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      const isMe = c.lastMessage.expediteur_id === currentUserId
                      const preview = c.lastMessage.contenu || ''
                      return (
                        <div key={c.partnerId} className={`message-item${c.unread ? ' message-unread' : ''}`} onClick={() => ouvrirChat(c.partnerId, c.partnerName)} style={{ cursor: 'pointer' }}>
                          <div className="message-avatar">{initials}</div>
                          <div className="message-content">
                            <div className="message-top-row">
                              <span className="message-name">{c.partnerName}</span>
                              <span className="message-time">{time}</span>
                            </div>
                            <div className="message-bottom-row">
                              <span className="message-preview">
                                {isMe && <span className="message-preview-prefix">Vous : </span>}
                                {preview.substring(0, 60)}
                              </span>
                              {c.unread && <span className="message-unread-dot" />}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="overlay-chat-header">
                  <button className="overlay-chat-back" onClick={retourListeMessages}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
                  </button>
                  <div className="overlay-chat-contact">
                    <div className="overlay-chat-avatar">{chatContact ? getInitials(chatContact.partnerName) : '?'}</div>
                    <div className="overlay-chat-name">{chatContact?.partnerName || '...'}</div>
                  </div>
                  <button className="messages-overlay-close" onClick={fermerOverlayMessages}>&times;</button>
                </div>
                <div className="overlay-chat-messages" ref={chatMessagesRef}>
                  {chatMessages.length === 0 ? (
                    <div className="overlay-chat-empty">Envoyez votre premier message !</div>
                  ) : (
                    (() => {
                      let lastDate = ''
                      return chatMessages.map((m, i) => {
                        const d = new Date(m.created_at)
                        const dateStr = d.toLocaleDateString('fr-FR')
                        const showDate = dateStr !== lastDate
                        lastDate = dateStr
                        const isSent = m.expediteur_id === currentUserId
                        const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        return (
                          <div key={m.id || i}>
                            {showDate && <div className="chat-date-sep"><span>{dateStr}</span></div>}
                            <div className={`chat-msg ${isSent ? 'sent' : 'received'}`}>
                              <div>
                                <div className="chat-bubble">{m.contenu}</div>
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
                    placeholder="Votre message..."
                    rows="1"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } }}
                  />
                  <button className="overlay-chat-send" onClick={envoyerMessage} disabled={sendingChat || !chatInput.trim()}>
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
