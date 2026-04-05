import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import './CommentCaMarcheProprietairePage.css'

export default function CommentCaMarcheProprietairePage() {
  const { user } = useAuth()
  return (
    <div className="ccmp">
      {/* HERO */}
      <section className="ccmp-hero">
        <div className="ccmp-hero-inner">
          <span className="ccmp-badge ccmp-stagger">Propriétaires</span>
          <h1 className="ccmp-stagger" style={{ animationDelay: '0.08s' }}>Louez votre logement à des alternants</h1>
          <p className="ccmp-stagger" style={{ animationDelay: '0.16s' }}>Un logement occupé toute l'année grâce à l'alternance, sans aucune gestion</p>
        </div>
      </section>

      {/* ÉTAPES */}
      <section className="ccmp-steps-section">
        <div className="ccmp-container">
          <h2 className="ccmp-section-title ccmp-stagger">COMMENT ÇA MARCHE</h2>

          <div className="ccmp-steps">
            <div className="ccmp-step ccmp-stagger" style={{ animationDelay: '0.08s' }}>
              <div className="ccmp-step-num">1</div>
              <div className="ccmp-step-body">
                <h3>Créez ou vérifiez votre annonce</h3>
                <p>Renseignez votre logement ou vérifiez l'annonce créée par votre locataire alternant.</p>
              </div>
            </div>

            <div className="ccmp-step ccmp-stagger" style={{ animationDelay: '0.16s' }}>
              <div className="ccmp-step-num">2</div>
              <div className="ccmp-step-body">
                <h3>On vous trouve des locataires</h3>
                <p>STERNY met en relation votre logement avec des étudiants en alternance qui ont un rythme compatible.</p>
              </div>
            </div>

            <div className="ccmp-step ccmp-stagger" style={{ animationDelay: '0.24s' }}>
              <div className="ccmp-step-num">3</div>
              <div className="ccmp-step-body">
                <h3>Validez et signez en ligne</h3>
                <p>Consultez les profils des candidats, acceptez ceux qui vous conviennent et signez le contrat directement sur la plateforme.</p>
              </div>
            </div>

            <div className="ccmp-step ccmp-stagger" style={{ animationDelay: '0.32s' }}>
              <div className="ccmp-step-num">4</div>
              <div className="ccmp-step-body">
                <h3>Recevez vos loyers automatiquement</h3>
                <p>Les paiements sont prélevés chaque mois et versés directement sur votre compte. Zéro relance, zéro impayé.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section className="ccmp-avantages-section">
        <div className="ccmp-container">
          <h2 className="ccmp-section-title ccmp-stagger">POURQUOI STERNY</h2>

          <div className="ccmp-grid">
            <div className="ccmp-avantage ccmp-stagger" style={{ animationDelay: '0.08s' }}>
              <div className="ccmp-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Z" />
                </svg>
              </div>
              <h4>Occupation maximale</h4>
              <p>Deux alternants se relaient dans votre logement : il est occupé toute l'année.</p>
            </div>

            <div className="ccmp-avantage ccmp-stagger" style={{ animationDelay: '0.16s' }}>
              <div className="ccmp-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q65 0 123 19t107 53l-58 59q-38-24-81-37.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-18-2-36t-6-35l65-65q11 32 17 66t6 70q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-56-216L254-466l56-56 114 114 400-401 56 56-456 457Z" />
                </svg>
              </div>
              <h4>Locataires vérifiés</h4>
              <p>Chaque étudiant est vérifié et s'engage via un contrat signé sur la plateforme.</p>
            </div>

            <div className="ccmp-avantage ccmp-stagger" style={{ animationDelay: '0.24s' }}>
              <div className="ccmp-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M480-120q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-480q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q82 0 155.5 35T760-706v-134h80v280H560v-80h144q-38-54-97-87t-127-33q-116 0-198 82t-82 198q0 116 82 198t198 82q94 0 170-56.5T738-390h82q-16 124-112.5 207T480-120Z" />
                </svg>
              </div>
              <h4>Aucune gestion</h4>
              <p>Contrats, états des lieux, encaissements : STERNY gère tout pour vous.</p>
            </div>

            <div className="ccmp-avantage ccmp-stagger" style={{ animationDelay: '0.32s' }}>
              <div className="ccmp-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q97-30 162-118.5T718-480H480v-315l-240 90v207q0 7 2 18h238v316Z" />
                </svg>
              </div>
              <h4>Zéro impayé</h4>
              <p>Les loyers sont prélevés automatiquement et sécurisés par la plateforme.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — masqué si connecté */}
      {!user && <section className="ccmp-cta-section">
        <div className="ccmp-container">
          <div className="ccmp-cta ccmp-stagger">
            <h2>Prêt à rejoindre STERNY ?</h2>
            <p>Créez votre compte propriétaire en quelques minutes</p>
            <div className="ccmp-cta-btns">
              <Link to="/inscription/proprietaire" className="ccmp-btn-primary">S'inscrire</Link>
              <Link to="/connexion" className="ccmp-btn-secondary">Se connecter</Link>
            </div>
          </div>
        </div>
      </section>}

    </div>
  )
}
