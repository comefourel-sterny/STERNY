import { Link } from 'react-router-dom';
import './AgencesPartenairesPage.css';

const checkSvg = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

export default function AgencesPartenairesPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero-agences">
        <div className="hero-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Logement alternants
        </div>
        <h1>Trouve ton logement<br /><span>avec nos partenaires</span></h1>
        <p className="hero-sub">Des agences sp&eacute;cialis&eacute;es pour t'aider &agrave; trouver un logement adapt&eacute; &agrave; ton rythme d'alternance</p>
      </section>

      {/* ===== SECTION AGENCES ===== */}
      <section className="section-agences">
        <div className="section-agences-inner">
          <div className="agences-grid">

            {/* Agence 1 */}
            <div className="agence-card">
              <h3>Nexity Stud&eacute;a</h3>
              <p className="agence-desc">R&eacute;sidences &eacute;tudiantes dans toute la France. Logements meubl&eacute;s et &eacute;quip&eacute;s, pr&ecirc;ts &agrave; vivre.</p>
              <ul className="agence-features">
                <li>{checkSvg} Meubl&eacute; et &eacute;quip&eacute;</li>
                <li>{checkSvg} Bail flexible</li>
                <li>{checkSvg} Charges incluses</li>
              </ul>
              <a href="#" className="btn-agence">Voir les offres</a>
            </div>

            {/* Agence 2 */}
            <div className="agence-card">
              <h3>Studapart</h3>
              <p className="agence-desc">Logements v&eacute;rifi&eacute;s pour &eacute;tudiants et jeunes actifs. Garantie locative incluse.</p>
              <ul className="agence-features">
                <li>{checkSvg} Meubl&eacute; et v&eacute;rifi&eacute;</li>
                <li>{checkSvg} Annonces v&eacute;rifi&eacute;es</li>
                <li>{checkSvg} Garantie locative</li>
              </ul>
              <a href="#" className="btn-agence">Voir les offres</a>
            </div>

            {/* Agence 3 */}
            <div className="agence-card">
              <h3>Immojeune</h3>
              <p className="agence-desc">Sp&eacute;cialiste du logement pour jeunes actifs et alternants. Solutions sans garant.</p>
              <ul className="agence-features">
                <li>{checkSvg} Meubl&eacute;</li>
                <li>{checkSvg} Courte dur&eacute;e possible</li>
                <li>{checkSvg} Sans garant</li>
              </ul>
              <a href="#" className="btn-agence">Voir les offres</a>
            </div>

          </div>
        </div>
      </section>

      {/* ===== SECTION AVANTAGES ===== */}
      <section className="section-avantages">
        <div className="section-avantages-inner">
          <div className="section-title">
            <h2>Pourquoi passer par nos partenaires ?</h2>
          </div>
          <div className="avantages-grid">
            <div className="avantage-item">
              <div className="avantage-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
              <h3>Logements v&eacute;rifi&eacute;s</h3>
              <p>Tous les logements sont visit&eacute;s et valid&eacute;s par nos partenaires avant d'&ecirc;tre propos&eacute;s.</p>
            </div>
            <div className="avantage-item">
              <div className="avantage-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3>Baux flexibles</h3>
              <p>Adapt&eacute;s aux rythmes d'alternance : courte dur&eacute;e, renouvellement mensuel, d&eacute;part anticip&eacute;.</p>
            </div>
            <div className="avantage-item">
              <div className="avantage-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3>Garanties incluses</h3>
              <p>Assurance et garanties locatives pour louer sereinement, m&ecirc;me sans garant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA AGENCES ===== */}
      <div className="cta-line">
        <span>Vous &ecirc;tes une agence ?</span>
        <Link to="/contact">Contactez-nous</Link>
      </div>
    </>
  );
}
