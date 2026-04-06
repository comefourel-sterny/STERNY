import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'

const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

const IconSearch = () => <svg {...svgProps}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const IconClipboard = () => <svg {...svgProps}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
const IconCalendar = () => <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
const IconMessage = () => <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const IconHome = () => <svg {...svgProps}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconHeart = () => <svg {...svgProps}><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78L12 21l7.65-7.65.77-.78a5.4 5.4 0 0 0 0-7.65z"/></svg>
const IconEuro = () => <svg {...svgProps}><path d="M4 10h12M4 14h12M19.5 6.5A7.5 7.5 0 0 0 5 10.5v3a7.5 7.5 0 0 0 14.5 4"/></svg>
const IconUser = () => <svg {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconSettings = () => <svg {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const IconLogout = () => <svg {...svgProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconLogin = () => <svg {...svgProps}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
const IconUserPlus = () => <svg {...svgProps}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
const IconHelp = () => <svg {...svgProps}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconMenu = () => <svg {...svgProps}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
const IconGrid = () => <svg {...svgProps}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>

export default function UserDropdown() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [initials, setInitials] = useState('')
  const [userName, setUserName] = useState('')
  const panelRef = useRef(null)

  // Fetch user role + initials
  useEffect(() => {
    if (!user) { setUserRole(null); setInitials(''); return }
    supabaseClient
      .from('users')
      .select('type_user, prenom, nom')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserRole(data.type_user)
          const prenom = data.prenom || ''
          const nom = data.nom || ''
          const p = prenom.charAt(0).toUpperCase()
          const n = nom.charAt(0).toUpperCase()
          setInitials(p + n || '?')
          setUserName(`${prenom} ${nom}`.trim())
        }
      })
  }, [user])

  // Close on route change
  useEffect(() => { setIsOpen(false) }, [location.pathname])

  // Lock body scroll when panel open (logged-in only uses bubble now, but keep for safety)
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const close = () => setIsOpen(false)

  const handleSignOut = (e) => {
    e.preventDefault()
    close()
    signOut()
    navigate('/')
  }

  const visitorItems = [
    { icon: <IconLogin />, label: 'Se connecter ou s\'inscrire', to: '/connexion' },
    'separator',
    { icon: <IconHome />, label: 'Proposer un logement', to: '/inscription/partager', description: 'Trouvez un alternant pour votre logement' },
    { icon: <IconHelp />, label: 'Comment \u00e7a marche', to: '/comment-ca-marche' },
  ]

  const locataireItems = [
    { icon: <IconSearch />, label: 'Rechercher un logement', to: '/recherche' },
    { icon: <IconMessage />, label: 'Messages', to: '/messages' },
    'separator',
    { icon: <IconUser />, label: 'Mon profil', to: '/profil' },
    { icon: <IconSettings />, label: 'Parametres du compte', to: '/parametres' },
    'separator',
    { icon: <IconHelp />, label: 'Besoin d\'aide ?', to: '/comment-ca-marche' },
    { icon: <IconLogout />, label: 'Deconnexion', action: handleSignOut }
  ]

  const proprietaireItems = [
    { icon: <IconMessage />, label: 'Messages', to: '/messages' },
    'separator',
    { icon: <IconUser />, label: 'Mon profil', to: '/profil' },
    { icon: <IconSettings />, label: 'Parametres du compte', to: '/parametres' },
    'separator',
    { icon: <IconHelp />, label: 'Besoin d\'aide ?', to: '/comment-ca-marche' },
    { icon: <IconLogout />, label: 'Deconnexion', action: handleSignOut }
  ]

  const menuItems = user
    ? (userRole === 'proprietaire' ? proprietaireItems : locataireItems)
    : visitorItems
  const roleLabel = userRole === 'proprietaire' ? 'Proprietaire' : 'Locataire'

  const renderItems = (items) => items.map((item, i) => {
    if (item === 'separator') {
      return <div key={`sep-${i}`} className="ud-separator" />
    }
    if (item.action) {
      return (
        <a key={i} href="#" className="ud-item ud-item-logout" onClick={item.action}>
          {item.icon && <span className="ud-item-icon">{item.icon}</span>}
          {item.label}
        </a>
      )
    }
    return (
      <Link key={i} to={item.to} className="ud-item" onClick={close}>
        {item.icon && <span className="ud-item-icon">{item.icon}</span>}
        <div>
          <div>{item.label}</div>
          {item.description && <div className="ud-item-desc">{item.description}</div>}
        </div>
      </Link>
    )
  })

  // Visitor: compact dropdown bubble
  if (!user) {
    return (
      <div className="ud-bubble-wrap" ref={panelRef}>
        <button
          className="ud-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menu"
        >
          <IconMenu />
        </button>

        {isOpen && (
          <>
            <div className="ud-bubble-overlay" onClick={close} />
            <div className="ud-bubble">
              {renderItems(menuItems)}
            </div>
          </>
        )}
      </div>
    )
  }

  // Logged in: avatar link + menu button + side panel
  const dashboardPath = userRole === 'proprietaire'
    ? '/dashboard/proprietaire'
    : userRole === 'hote'
      ? '/dashboard/hote'
      : userRole === 'admin'
        ? '/dashboard/admin'
        : '/dashboard/locataire'

  return (
    <>
      <Link to={dashboardPath} className="ud-avatar" aria-label="Mon espace">
        {initials}
      </Link>

      <div className="ud-bubble-wrap">
        <button
          className="ud-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menu"
        >
          <IconMenu />
        </button>

        {isOpen && (
          <>
            <div className="ud-bubble-overlay" onClick={close} />
            <div className="ud-bubble ud-bubble-logged">
              {renderItems(menuItems)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
