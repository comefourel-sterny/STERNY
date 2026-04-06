import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'

export default function UserDropdown() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [initials, setInitials] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const avatarRef = useRef(null)
  const dropdownRef = useRef(null)

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
          const p = (data.prenom || '').charAt(0).toUpperCase()
          const n = (data.nom || '').charAt(0).toUpperCase()
          setInitials(p + n || '?')
        }
      })
  }, [user])

  // Close on route change
  useEffect(() => { setIsOpen(false) }, [location.pathname])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (
        avatarRef.current && !avatarRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const toggleDropdown = () => {
    if (!isOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
    setIsOpen(!isOpen)
  }

  const close = () => setIsOpen(false)

  const handleSignOut = (e) => {
    e.preventDefault()
    close()
    signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  if (!user) return null

  const locataireItems = [
    { label: 'Mes recherches sauvegardees', to: '/recherche' },
    { label: 'Mes candidatures', to: '/dashboard/locataire' },
    { label: "Mon rythme d'alternance", to: '/dashboard/locataire' },
    { label: 'Messages', to: '/messages' },
    'separator',
    { label: 'Mon profil', to: '/profil' },
    { label: 'Parametres du compte', to: '/parametres' },
    'separator',
    { label: 'Deconnexion', action: handleSignOut }
  ]

  const proprietaireItems = [
    { label: 'Mes annonces', to: '/dashboard/proprietaire' },
    { label: 'Mes matchs en cours', to: '/dashboard/proprietaire' },
    { label: 'Messages', to: '/messages' },
    { label: 'Mes revenus', to: '/dashboard/proprietaire' },
    'separator',
    { label: 'Mon profil', to: '/profil' },
    { label: 'Parametres du compte', to: '/parametres' },
    'separator',
    { label: 'Deconnexion', action: handleSignOut }
  ]

  const menuItems = userRole === 'proprietaire' ? proprietaireItems : locataireItems

  return (
    <>
      <button
        ref={avatarRef}
        className="ud-avatar"
        onClick={toggleDropdown}
        aria-label="Menu utilisateur"
      >
        {initials}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="ud-dropdown"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999
          }}
        >
          {menuItems.map((item, i) => {
            if (item === 'separator') {
              return <div key={`sep-${i}`} className="ud-separator" />
            }
            if (item.action) {
              return (
                <a
                  key={i}
                  href="#"
                  className="ud-item ud-item-logout"
                  onClick={item.action}
                >
                  {item.label}
                </a>
              )
            }
            return (
              <Link
                key={i}
                to={item.to}
                className={`ud-item${isActive(item.to) ? ' ud-item-active' : ''}`}
                onClick={close}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
