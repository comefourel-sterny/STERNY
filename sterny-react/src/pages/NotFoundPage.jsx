import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <section className="error-page">
      <div className="error-card">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Page introuvable</h2>
        <p className="error-text">Cette page n'existe pas ou a été déplacée.</p>

        <div className="error-actions">
          <Link to="/recherche" className="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            Rechercher un logement
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link to="/" className="link-secondary">Accueil</Link>
        </div>
      </div>
    </section>
  );
}
