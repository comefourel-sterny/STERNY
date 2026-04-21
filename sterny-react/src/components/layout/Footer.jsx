import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/Logo-Sterny-V1-white.svg" alt="STERNY" style={{ height: '40px' }} />
          <p>Le logement pensé pour les alternants. Flexible, vérifié, 100% en ligne.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Plateforme</h4>
            <Link to="/recherche">Rechercher</Link>
            <Link to="/comment-ca-marche">Comment ça marche</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-col">
            <h4>Entreprise</h4>
            <Link to="/a-propos">À propos</Link>
            <Link to="/agences-partenaires">Partenariat</Link>
            <Link to="/comment-ca-marche?role=hote">Devenir hôte</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>STERNY &copy; {new Date().getFullYear()}</span>
        <div className="footer-legal-links">
          <Link to="/cgv">CGV</Link>
          <Link to="/cgu">CGU</Link>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/politique-confidentialite">Confidentialité</Link>
        </div>
      </div>
    </footer>
  )
}
