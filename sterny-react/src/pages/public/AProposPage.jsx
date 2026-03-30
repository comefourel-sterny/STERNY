import { Link } from 'react-router-dom';
import './AProposPage.css';

export default function AProposPage() {
  return (
    <div className="page-about">
      <div className="about-card">
        <Link to="/" className="btn-back-top">
          <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Retour
        </Link>
        <h1>&Agrave; propos de STERNY</h1>
        <p className="subtitle">Le logement pens&eacute; pour les alternants</p>

        {/* HERO */}
        <div className="about-hero">
          <h2>Pourquoi STERNY existe ?</h2>
          <p>
            Chaque ann&eacute;e, des milliers d&rsquo;&eacute;tudiants en alternance font face au m&ecirc;me probl&egrave;me : <span className="accent">trouver un logement adapt&eacute; &agrave; leur rythme</span>.
            Entre leur ville d&rsquo;entreprise et leur ville d&rsquo;&eacute;cole, ils jonglent avec deux loyers, des trajets co&ucirc;teux et des solutions inadapt&eacute;es.
            STERNY est n&eacute; pour r&eacute;soudre ce probl&egrave;me.
          </p>
        </div>

        {/* NOTRE MISSION */}
        <div className="about-section">
          <h2>Notre mission</h2>
          <p>
            STERNY est une <strong>plateforme de mise en relation</strong> entre &eacute;tudiants en alternance et propri&eacute;taires.
            Notre objectif : permettre &agrave; chaque alternant de trouver un logement qui <strong>correspond &agrave; son rythme</strong>
            (1 semaine sur 2, 3 semaines / 1 semaine, etc.) et &agrave; son budget.
          </p>
          <p>
            Pour les propri&eacute;taires, c&rsquo;est l&rsquo;assurance de louer &agrave; des <strong>locataires v&eacute;rifi&eacute;s</strong>,
            avec des contrats g&eacute;n&eacute;r&eacute;s automatiquement, des paiements s&eacute;curis&eacute;s via Stripe,
            et une gestion simplifi&eacute;e de A &agrave; Z.
          </p>
        </div>

        {/* COMMENT CA MARCHE */}
        <div className="about-section">
          <h2>Comment &ccedil;a marche</h2>
          <p>
            <strong>1.</strong> L&rsquo;&eacute;tudiant cr&eacute;e son profil avec ses informations d&rsquo;alternance (villes, rythme, budget).<br />
            <strong>2.</strong> Notre algorithme de <strong>matching</strong> propose les logements les plus compatibles.<br />
            <strong>3.</strong> L&rsquo;&eacute;tudiant candidate, le propri&eacute;taire accepte.<br />
            <strong>4.</strong> Le contrat est g&eacute;n&eacute;r&eacute;, sign&eacute; en ligne, et le paiement est s&eacute;curis&eacute;.
          </p>
          <p>
            Tout se fait en ligne, sans paperasse. <Link to="/comment-ca-marche">En savoir plus &rarr;</Link>
          </p>
        </div>

        {/* CHIFFRES */}
        <div className="about-section">
          <h2>STERNY en chiffres</h2>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-number">3</span>
              <div className="stat-label">Villes disponibles</div>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <div className="stat-label">En ligne</div>
            </div>
            <div className="stat-item">
              <span className="stat-number">24h</span>
              <div className="stat-label">Temps de r&eacute;ponse</div>
            </div>
          </div>
        </div>

        {/* NOS VALEURS */}
        <div className="about-section">
          <h2>Nos valeurs</h2>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">&#x1F3AF;</div>
              <h3>Adapt&eacute; aux alternants</h3>
              <p>Chaque fonctionnalit&eacute; est pens&eacute;e pour le rythme sp&eacute;cifique de l&rsquo;alternance.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">&#x1F512;</div>
              <h3>S&eacute;curit&eacute;</h3>
              <p>Paiements Stripe, v&eacute;rification des profils, contrats conformes au droit fran&ccedil;ais.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">&#x26A1;</div>
              <h3>Simplicit&eacute;</h3>
              <p>Inscription en 2 minutes, matching automatique, contrat g&eacute;n&eacute;r&eacute; en un clic.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">&#x1F91D;</div>
              <h3>Confiance</h3>
              <p>Transparence sur les prix, avis v&eacute;rifi&eacute;s, support r&eacute;actif sous 24h.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="about-cta">
          <h3>Pr&ecirc;t &agrave; rejoindre STERNY ?</h3>
          <p>&Eacute;tudiant ou propri&eacute;taire, trouvez la solution qui vous correspond.</p>
          <div className="about-cta-buttons">
            <Link to="/inscription" className="btn-cta-primary">S&rsquo;inscrire gratuitement</Link>
            <Link to="/contact" className="btn-cta-secondary">Nous contacter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
