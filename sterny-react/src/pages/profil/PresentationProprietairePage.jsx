import { Link } from 'react-router-dom'
import './PresentationProprietairePage.css'

export default function PresentationProprietairePage() {
  return (
    <section className="presentation-page">
      {/* Titre */}
      <div className="presentation-header-zone">
        <h1>Augmentez vos revenus locatifs gr\u00e2ce aux alternants</h1>
        <p className="subtitle">Occup\u00e9 toute l'ann\u00e9e, z\u00e9ro gestion</p>
      </div>

      {/* Vid\u00e9o */}
      <div className="presentation-video-container">
        <div className="presentation-video-inner">
          <div className="presentation-play-circle">
            <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="presentation-cta-zone">
        <Link to="/inscription/proprietaire" className="presentation-btn-start">Cr\u00e9er mon compte</Link>
        <div className="presentation-sub-links">
          D\u00e9j\u00e0 inscrit ? <Link to="/connexion">Se connecter</Link> &middot; <Link to="/comment-ca-marche/proprietaire">En savoir plus</Link>
        </div>
      </div>
    </section>
  )
}
