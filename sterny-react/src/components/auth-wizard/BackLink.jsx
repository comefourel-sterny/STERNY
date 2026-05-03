import { Link } from 'react-router-dom'
import './BackLink.css'

export default function BackLink({ children, onClick, to, className = '', style }) {
  const content = (
    <span className={`aw-backlink-text ${className}`}>{children}</span>
  )
  return (
    <p className="aw-backlink" style={style}>
      {to ? (
        <Link to={to} className="aw-backlink-anchor">{content}</Link>
      ) : (
        <button type="button" onClick={onClick} className="aw-backlink-button">
          {content}
        </button>
      )}
    </p>
  )
}
