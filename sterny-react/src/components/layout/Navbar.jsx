import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import UserDropdown from './UserDropdown'

export default function Navbar({ variant = 'default' }) {
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const isHomepage = location.pathname === '/'

  useEffect(() => {
    if (variant !== 'dark') return
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  const isDark = variant === 'dark'
  const navClass = isDark ? (scrolled ? 'index-nav nav-scrolled' : 'index-nav nav-transparent') : ''

  return (
    <nav role="navigation" aria-label="Navigation principale" className={navClass} id="mainNav">
      <div className="nav-grid">
        {/* Left: Logo */}
        <div className="nav-left">
          <Link to="/" className="logo">
            <img
              id="navLogo"
              src={isDark && !scrolled ? '/Logo-Sterny-V1-white.svg' : '/Logo-Sterny-V1.svg'}
              alt="STERNY"
            />
          </Link>
        </div>

        {/* Center: Mode toggle — homepage only, hidden on scroll */}
        <div className="nav-center">
          {isHomepage && !scrolled && (
            <div className="mode-toggle">
              <button className="mode-pill mode-active">Alternance</button>
              <span className="mode-separator">|</span>
              <button className="mode-pill mode-inactive">Stage</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="nav-right">
          {!user && (
            <>
              <Link to="/connexion" className="nav-right-link">Se connecter</Link>
              <Link to="/inscription" className="nav-cta-inscription">S'inscrire</Link>
            </>
          )}
          <UserDropdown />
        </div>
      </div>
    </nav>
  )
}
