import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'

const ICONS = {
  candidature_recue: '\u{1F4E9}',
  candidature_acceptee: '\u{1F389}',
  candidature_refusee: '\u{274C}',
  match_cree: '\u{1F91D}',
  contrat_signe: '\u{270D}\uFE0F',
  paiement_recu: '\u{1F4B0}',
  paiement_confirme: '\u{2705}',
  avis_recu: '\u{2B50}',
  message_recu: '\u{1F4AC}',
  annonce_expiree: '\u{23F0}',
  identite_verifiee: '\u{1F6E1}\uFE0F',
  systeme: '\u{1F514}'
}

function tempsRelatif(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffJ = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "A l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffH < 24) return `Il y a ${diffH}h`
  if (diffJ < 7) return `Il y a ${diffJ}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const charger = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabaseClient
        .from('notifications_in_app')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      const list = data || []
      setNotifs(list)
      setUnreadCount(list.filter(n => !n.lu).length)
    } catch (e) {
      console.log('Notifications: erreur chargement', e.message)
    }
  }, [user])

  useEffect(() => {
    charger()
    const interval = setInterval(charger, 30000)
    return () => clearInterval(interval)
  }, [charger])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleClick = async (notifId, lien) => {
    try {
      await supabaseClient
        .from('notifications_in_app')
        .update({ lu: true })
        .eq('id', notifId)
    } catch (e) { /* silently fail */ }

    setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    if (lien) {
      window.location.href = lien
    }
  }

  const markAllRead = async () => {
    if (!user) return
    try {
      await supabaseClient
        .from('notifications_in_app')
        .update({ lu: true })
        .eq('user_id', user.id)
        .eq('lu', false)

      setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
      setUnreadCount(0)
    } catch (e) {
      console.log('Erreur markAllRead:', e.message)
    }
  }

  return (
    <div id="notif-bell-container" ref={containerRef}>
      <div
        id="notif-bell"
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
      >
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span id="notif-badge" style={{
            position: 'absolute', top: -4, right: -6,
            background: '#EF4444', color: 'white',
            fontSize: 10, fontWeight: 700,
            minWidth: 16, height: 16, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div id="notif-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 420,
          background: 'white', border: '1.5px solid rgba(232,98,42,0.25)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(232,98,42,0.10)',
          zIndex: 1100, overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid #F1F5F9'
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Notifications</span>
            {unreadCount > 0 && (
              <span
                onClick={markAllRead}
                style={{ fontSize: 12, color: '#E8622A', cursor: 'pointer', fontWeight: 600 }}
              >
                Tout marquer lu
              </span>
            )}
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <div style={{ marginBottom: 8 }}>
                  <svg width="28" height="28" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Aucune notification</div>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n.id, n.lien)}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 18px',
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: n.lu ? 'transparent' : 'rgba(232, 98, 42, 0.04)',
                    borderBottom: '1px solid #F8F9FA'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.background = n.lu ? 'transparent' : 'rgba(232, 98, 42, 0.04)'}
                >
                  <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{ICONS[n.type] || '\u{1F514}'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 2 }}>{n.titre}</div>
                    <div style={{
                      fontSize: 12, color: '#6B7280', lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{tempsRelatif(n.created_at)}</div>
                  </div>
                  {!n.lu && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#E8622A', flexShrink: 0, marginTop: 5
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
