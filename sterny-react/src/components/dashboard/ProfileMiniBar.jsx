import { Link } from 'react-router-dom'
import { getInitials } from '../../utils/formatters'
import './ProfileMiniBar.css'

export default function ProfileMiniBar({ userData, hasUnread, onMessagesClick }) {
  if (!userData) return null

  const initials = getInitials(userData.prenom, userData.nom)
  const editPath = userData.type_user === 'proprietaire' ? '/profil/modifier-proprietaire' : '/profil/modifier'

  return (
    <div className="mini-bar">
      <div className="mini-bar-left">
        <div className="mini-bar-avatar">
          {userData.photo_url
            ? <img src={userData.photo_url} alt="" />
            : initials
          }
        </div>
        <div className="mini-bar-info">
          <div className="mini-bar-name">{userData.prenom} {userData.nom}</div>
          <Link to={editPath} className="mini-bar-edit">Voir mon profil</Link>
        </div>
      </div>
      <div className="mini-bar-actions">
        <button className="mini-bar-btn" onClick={onMessagesClick} aria-label="Messages">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          {hasUnread && <span className="mini-bar-dot" />}
        </button>
        <Link to="/parametres" className="mini-bar-btn" aria-label="Parametres">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </Link>
      </div>
    </div>
  )
}
