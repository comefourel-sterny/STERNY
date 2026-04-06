import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'

const NOTIF_ICONS = {
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

export default function HamburgerMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifsExpanded, setNotifsExpanded] = useState(false)
  const panelRef = useRef(null)

  // Fetch user role
  useEffect(() => {
    if (!user) { setUserRole(null); return }
    supabaseClient
      .from('users')
      .select('type_user')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setUserRole(data.type_user) })
  }, [user])

  // Fetch notifications
  const chargerNotifs = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabaseClient
        .from('notifications_in_app')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      const list = data || []
      setNotifs(list)
      setUnreadCount(list.filter(n => !n.lu).length)
    } catch (e) {
      console.log('Notifications:', e.message)
    }
  }, [user])

  useEffect(() => {
    chargerNotifs()
    const interval = setInterval(chargerNotifs, 30000)
    return () => clearInterval(interval)
  }, [chargerNotifs])

  // Close on route change
  useEffect(() => { setIsOpen(false) }, [location.pathname])

  const getDashboardPath = () => {
    switch (userRole) {
      case 'proprietaire': return '/dashboard/proprietaire'
      case 'hote': return '/dashboard/hote'
      case 'admin': return '/dashboard/admin'
      default: return '/dashboard/locataire'
    }
  }

  const handleNotifClick = async (notifId, lien) => {
    try {
      await supabaseClient
        .from('notifications_in_app')
        .update({ lu: true })
        .eq('id', notifId)
    } catch (e) { /* silent */ }
    setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    if (lien) {
      setIsOpen(false)
      navigate(lien)
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
    } catch (e) { /* silent */ }
  }

  const handleSignOut = (e) => {
    e.preventDefault()
    setIsOpen(false)
    signOut()
    navigate('/')
  }

  const totalBadge = unreadCount

  return (
    <>
      {/* Hamburger button */}
      <button
        className={`hm-trigger${isOpen ? ' active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <span /><span /><span />
        {totalBadge > 0 && (
          <span className="hm-trigger-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>
        )}
      </button>

      {/* Overlay */}
      <div
        className={`hm-overlay${isOpen ? ' active' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div className={`hm-panel${isOpen ? ' open' : ''}`} ref={panelRef}>
        <div className="hm-panel-inner">

          {user ? (
            <>
              {/* Nav section */}
              <div className="hm-section">
                <Link to={getDashboardPath()} className="hm-item hm-item-highlight" onClick={() => setIsOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  Mon espace
                </Link>

                <Link to="/profil/modifier" className="hm-item" onClick={() => setIsOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Mon profil
                </Link>

                <Link to="/comment-ca-marche" className="hm-item" onClick={() => setIsOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Comment ca marche
                </Link>
              </div>

              {/* Notifications section */}
              <div className="hm-section">
                <div className="hm-section-header" onClick={() => setNotifsExpanded(!notifsExpanded)}>
                  <div className="hm-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                    Notifications
                    {unreadCount > 0 && <span className="hm-badge">{unreadCount}</span>}
                  </div>
                  <svg className={`hm-chevron${notifsExpanded ? ' expanded' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>

                {notifsExpanded && (
                  <div className="hm-notifs">
                    {unreadCount > 0 && (
                      <div className="hm-notifs-action" onClick={markAllRead}>Tout marquer lu</div>
                    )}
                    {notifs.length === 0 ? (
                      <div className="hm-notifs-empty">Aucune notification</div>
                    ) : (
                      notifs.slice(0, 10).map(n => (
                        <div
                          key={n.id}
                          className={`hm-notif${!n.lu ? ' unread' : ''}`}
                          onClick={() => handleNotifClick(n.id, n.lien)}
                        >
                          <span className="hm-notif-icon">{NOTIF_ICONS[n.type] || '\u{1F514}'}</span>
                          <div className="hm-notif-content">
                            <div className="hm-notif-title">{n.titre}</div>
                            <div className="hm-notif-time">{tempsRelatif(n.created_at)}</div>
                          </div>
                          {!n.lu && <div className="hm-notif-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Bottom section */}
              <div className="hm-section hm-section-bottom">
                <a href="#" className="hm-item hm-item-muted" onClick={handleSignOut}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Deconnexion
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="hm-section">
                <Link to="/connexion" className="hm-item hm-item-highlight" onClick={() => setIsOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Mon espace
                </Link>
                <Link to="/comment-ca-marche" className="hm-item" onClick={() => setIsOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Comment ca marche
                </Link>
                <Link to="/inscription/partager" className="hm-item" onClick={() => setIsOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Devenir hote
                </Link>
                <Link to="/inscription" className="hm-item hm-item-cta" onClick={() => setIsOpen(false)}>
                  S'inscrire
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
