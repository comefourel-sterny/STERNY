import { Link } from 'react-router-dom'
import './BottomAuthLinks.css'

export default function BottomAuthLinks({
  onRetour,
  retourTo,
  retourLabel = 'Retour',
  showSignInLink = false,
  signInTo = '/connexion',
  className = '',
  style,
}) {
  const retourEl = (() => {
    if (!onRetour && !retourTo) return null
    if (retourTo) {
      return (
        <Link to={retourTo} className="aw-bottom-auth-link">{retourLabel}</Link>
      )
    }
    return (
      <a
        href="#"
        className="aw-bottom-auth-link"
        onClick={(e) => { e.preventDefault(); onRetour?.() }}
      >
        {retourLabel}
      </a>
    )
  })()

  return (
    <p className={`aw-bottom-auth ${className}`} style={style}>
      {retourEl}
      {retourEl && showSignInLink && <span className="aw-bottom-auth-sep" aria-hidden="true"> · </span>}
      {showSignInLink && (
        <>
          Déjà un compte ? <Link to={signInTo} className="aw-bottom-auth-link">Se connecter</Link>
        </>
      )}
    </p>
  )
}
