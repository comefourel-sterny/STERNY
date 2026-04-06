import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import HamburgerMenu from './HamburgerMenu'

export default function Navbar({ variant = 'default' }) {
  const [scrolled, setScrolled] = useState(false)

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
      <div className="container">
        <Link to="/" className="logo">
          <img
            id="navLogo"
            src={isDark && !scrolled ? '/Logo-Sterny-V1-white.svg' : '/Logo-Sterny-V1.svg'}
            alt="STERNY"
          />
        </Link>
        <HamburgerMenu />
      </div>
    </nav>
  )
}
