import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import NotificationBell from './NotificationBell'

export default function Navbar({ variant = 'default' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')

  useEffect(() => {
    if (variant !== 'dark') return
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  useEffect(() => {
    if (user) {
      supabaseClient
        .from('users')
        .select('type')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserRole(data.type)
        })
    } else {
      setUserRole(null)
    }
  }, [user])

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const getDashboardPath = () => {
    switch (userRole) {
      case 'proprietaire': return '/dashboard/proprietaire'
      case 'hote': return '/dashboard/hote'
      case 'admin': return '/dashboard/admin'
      default: return '/dashboard/locataire'
    }
  }

  const isDark = variant === 'dark'
  const navClass = isDark ? (scrolled ? 'index-nav nav-scrolled' : 'index-nav nav-transparent') : ''

  return (
    <nav role="navigation" aria-label="Navigation principale" className={navClass} id="mainNav">
      <div className="container">
        <Link to="/" className="logo">
          <img
            id="navLogo"
            src={isDark && !scrolled ? '/Logo-Sterny-V1-white.svg' : '/Logo-Sterny-V1.svg'}
            alt="STERNY"
          />
        </Link>
        <NotificationBell />
        <button
          className={`hamburger${menuOpen ? ' active' : ''}`}
          onClick={toggleMenu}
          aria-label="Menu"
        >
          <span></span><span></span><span></span>
        </button>
        <div
          className={`menu-overlay${menuOpen ? ' active' : ''}`}
          onClick={closeMenu}
        ></div>
        <ul className={menuOpen ? 'open' : ''}>
          {user ? (
            <>
              <li>
                <Link to={getDashboardPath()} className="nav-highlight" onClick={closeMenu}>
                  Mon espace
                </Link>
              </li>
              <li>
                <Link to="/comment-ca-marche" onClick={closeMenu}>
                  Comment ça marche
                </Link>
              </li>
              {isDashboard && (
                <li>
                  <a href="#" style={{ color: '#94A3B8' }} onClick={(e) => { e.preventDefault(); closeMenu(); signOut(); navigate('/') }}>
                    Déconnexion
                  </a>
                </li>
              )}
            </>
          ) : (
            <>
              <li>
                <Link to="/connexion" className="nav-highlight" onClick={closeMenu}>
                  Mon espace
                </Link>
              </li>
              <li>
                <Link to="/comment-ca-marche" onClick={closeMenu}>
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link to="/inscription/partager" onClick={closeMenu}>
                  Devenir hôte
                </Link>
              </li>
              <li id="navInscriptionLi">
                <Link to="/inscription" className="nav-cta-inscription" onClick={closeMenu}>
                  S'inscrire
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}
