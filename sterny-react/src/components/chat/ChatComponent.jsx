import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../../config/supabase'
import { formatTimeAgo } from '../../utils/formatters'
import './ChatComponent.css'

export default function ChatComponent({ currentUserId, currentUserType, mode = 'overlay', isOpen, onClose, initialContactId }) {
  const [chatView, setChatView] = useState(false)
  const [chatContact, setChatContact] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [allConversations, setAllConversations] = useState([])

  const chatMessagesRef = useRef(null)
  const chatInputRef = useRef(null)
  const initialContactLoadedRef = useRef(false)

  // Load conversations on mount or when userId changes
  useEffect(() => {
    if (currentUserId) {
      loadMessages(currentUserId)
    }
  }, [currentUserId])

  // Reset when initialContactId changes
  useEffect(() => {
    initialContactLoadedRef.current = false
  }, [initialContactId])

  // Handle initialContactId — open specific thread after conversations load
  useEffect(() => {
    if (initialContactId && allConversations.length > 0 && !initialContactLoadedRef.current) {
      initialContactLoadedRef.current = true
      const contact = allConversations.find(c => c.userId === initialContactId)
      if (contact) {
        ouvrirConversation(contact.userId, contact.prenom, contact.nom, contact.typeUser)
      }
    }
  }, [initialContactId, allConversations])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

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
      const { data: usersData } = await supabaseClient
        .from('users')
        .select('id, prenom, nom, type_user')
        .in('id', [...autreIds])
      if (usersData) usersData.forEach(u => { usersMap[u.id] = u })

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
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  async function ouvrirConversation(userId, prenom, nom, typeUser) {
    setChatContact({ userId, prenom, nom: nom || '', typeUser })
    setChatView(true)

    // Mark as read in local state
    setAllConversations(prev => prev.map(c =>
      c.userId === userId ? { ...c, nonLu: false } : c
    ))

    await loadChatMessages(userId)
  }

  async function envoyerMessage() {
    if (!chatInput.trim() || !chatContact) return
    const messageText = chatInput.trim()
    setSendingChat(true)
    try {
      await supabaseClient.from('messages').insert([{
        expediteur_id: currentUserId,
        destinataire_id: chatContact.userId,
        contenu: messageText,
        lu: false
      }])
      setChatInput('')
      await loadChatMessages(chatContact.userId)

      setAllConversations(prev => prev.map(c =>
        c.userId === chatContact.userId
          ? { ...c, dernierMessage: messageText, date: new Date().toISOString(), estEnvoye: true }
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

  function handleClose() {
    setChatView(false)
    setChatContact(null)
    if (onClose) onClose()
  }

  // === Shared JSX pieces ===

  function getRoleBadge(typeUser) {
    if (typeUser === 'locataire') return <span className="chat-comp-role-badge locataire">Locataire</span>
    if (typeUser === 'proprietaire') return <span className="chat-comp-role-badge proprietaire">Proprietaire</span>
    if (typeUser === 'hote') return <span className="chat-comp-role-badge hote">Hote</span>
    return null
  }

  function renderConversationList() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="chat-comp-header">
          <div className="chat-comp-title">
            <div className="chat-comp-title-icon">
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            Messages
          </div>
          {mode === 'overlay' && (
            <button className="chat-comp-close" onClick={handleClose}>&times;</button>
          )}
        </div>
        <div className="chat-comp-list">
          {allConversations.length === 0 ? (
            <div className="chat-comp-empty">Aucun message pour le moment</div>
          ) : (
            allConversations.map(c => {
              const initials = ((c.prenom || 'U')[0] + (c.nom ? c.nom[0] : '')).toUpperCase()
              const timeAgo = formatTimeAgo(c.date)
              const preview = c.dernierMessage.length > 80 ? c.dernierMessage.substring(0, 80) + '...' : c.dernierMessage
              const isActive = chatContact && chatContact.userId === c.userId

              return (
                <div
                  key={c.userId}
                  className={`chat-comp-item${c.nonLu ? ' chat-comp-item-unread' : ''}${isActive ? ' chat-comp-item-active' : ''}`}
                  onClick={() => ouvrirConversation(c.userId, c.prenom, c.nom, c.typeUser)}
                >
                  <div className="chat-comp-item-avatar">{initials}</div>
                  <div className="chat-comp-item-content">
                    <div className="chat-comp-item-top">
                      <div className="chat-comp-item-name">{c.prenom} {c.nom || ''} {c.typeUser && getRoleBadge(c.typeUser)}</div>
                      <span className="chat-comp-item-time">{timeAgo}</span>
                    </div>
                    <div className="chat-comp-item-bottom">
                      <div className="chat-comp-item-preview">
                        {c.estEnvoye && <span className="chat-comp-item-prefix">Vous : </span>}
                        {preview || 'Nouvelle conversation'}
                      </div>
                      {c.nonLu && <div className="chat-comp-item-dot" />}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  function renderEmptyThread() {
    return (
      <div className="chat-comp-empty-thread">
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        <div>Selectionnez une conversation</div>
      </div>
    )
  }

  function renderChatThread() {
    return (
      <div className="chat-comp-thread">
        <div className="chat-comp-thread-header">
          <button className="chat-comp-back" onClick={initialContactId ? handleClose : retourListeMessages}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          </button>
          <div className="chat-comp-contact">
            <div className="chat-comp-contact-avatar">
              {chatContact ? ((chatContact.prenom || 'U')[0] + (chatContact.nom ? chatContact.nom[0] : '')).toUpperCase() : '?'}
            </div>
            <div>
              <div className="chat-comp-contact-name">{chatContact ? (chatContact.prenom + ' ' + (chatContact.nom || '')).trim() : '...'}</div>
              {chatContact && getRoleBadge(chatContact.typeUser)}
            </div>
          </div>
          {mode === 'overlay' && (
            <button className="chat-comp-close" onClick={handleClose}>&times;</button>
          )}
        </div>
        <div className="chat-comp-messages" ref={chatMessagesRef}>
          {chatMessages.length === 0 ? (
            <div className="chat-comp-messages-empty">Envoie ton premier message !</div>
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
                  <React.Fragment key={msg.id || idx}>
                    {showDateSep && <div className="chat-comp-date-sep"><span>{dateStr}</span></div>}
                    <div className={`chat-comp-msg ${isSent ? 'sent' : 'received'}`}>
                      <div>
                        <div className="chat-comp-bubble">{msg.contenu}</div>
                        <div className="chat-comp-msg-time">{time}</div>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })
            })()
          )}
        </div>
        <div className="chat-comp-input">
          <textarea
            className="chat-comp-textarea"
            ref={chatInputRef}
            placeholder="Ecris ton message..."
            rows="1"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } }}
          />
          <button className="chat-comp-send" disabled={sendingChat || !chatInput.trim()} onClick={envoyerMessage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    )
  }

  // === OVERLAY MODE ===
  if (mode === 'overlay') {
    if (!isOpen) return null
    return (
      <div className="chat-comp-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
        <div className={`chat-comp-box ${chatView ? 'chat-mode' : ''}`}>
          {!chatView ? renderConversationList() : renderChatThread()}
        </div>
      </div>
    )
  }

  // === PAGE MODE — Two columns ===
  return (
    <div className={`chat-comp-page${chatView ? ' chat-active' : ''}`}>
      <div className="chat-comp-sidebar">
        {renderConversationList()}
      </div>
      <div className="chat-comp-main">
        {chatView ? renderChatThread() : renderEmptyThread()}
      </div>
    </div>
  )
}
