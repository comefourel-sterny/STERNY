import { Link } from 'react-router-dom'
import './CommentCaMarcheRecherchePage.css'

export default function CommentCaMarcheRecherchePage() {
  return (
    <div className="ccm-recherche">
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <h1>Un logement adapté à ton alternance</h1>
          <p>Paie uniquement les semaines où tu es là, pas un mois complet pour rien</p>
        </div>
      </section>

      {/* ÉTAPES */}
      <section className="steps-section">
        <div className="steps-container">
          <h2 className="steps-title">Comment ça marche ?</h2>

          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Inscris-toi avec ton rythme</h3>
              <p>Indique ta ville et ton rythme d'alternance. STERNY te montre uniquement les logements disponibles sur tes semaines.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Parcours les annonces</h3>
              <p>Chaque logement affiche un score de compatibilité avec ton rythme. Tu vois immédiatement ce qui te correspond.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Réserve et signe en ligne</h3>
              <p>Envoie ta demande, signe le contrat et fais l'état des lieux directement sur la plateforme. Zéro paperasse.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Emménage l'esprit tranquille</h3>
              <p>Tu paies à la semaine, uniquement quand tu occupes le logement. Tout est sécurisé par STERNY.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section className="avantages-section">
        <div className="avantages-container">
          <h2 className="avantages-title">Pourquoi chercher avec STERNY ?</h2>

          <div className="avantages-grid">
            <div className="avantage-card">
              <div className="avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M440-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T520-640q0-33-23.5-56.5T440-720q-33 0-56.5 23.5T360-640q0 33 23.5 56.5T440-560ZM884-20 756-148q-21 12-45 20t-51 8q-75 0-127.5-52.5T480-300q0-75 52.5-127.5T660-480q75 0 127.5 52.5T840-300q0 27-8 51t-20 45L940-76l-56 56Z" />
                </svg>
              </div>
              <h4>Filtré par ton rythme</h4>
              <p>Tu ne vois que les logements compatibles avec tes semaines d'alternance.</p>
            </div>

            <div className="avantage-card">
              <div className="avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Z" />
                </svg>
              </div>
              <h4>Paie à la semaine</h4>
              <p>Fini de payer un loyer complet quand tu n'es là que 2 semaines par mois.</p>
            </div>

            <div className="avantage-card">
              <div className="avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q97-30 162-118.5T718-480H480v-315l-240 90v207q0 7 2 18h238v316Z" />
                </svg>
              </div>
              <h4>Tout est sécurisé</h4>
              <p>Contrat en ligne, état des lieux digital, paiements protégés par la plateforme.</p>
            </div>

            <div className="avantage-card">
              <div className="avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm280-200q-17 0-28.5-11.5T440-400q0-17 11.5-28.5T480-440q17 0 28.5 11.5T520-400q0 17-11.5 28.5T480-360Z" />
                </svg>
              </div>
              <h4>Sans engagement</h4>
              <p>Pas de bail longue durée. Tu loues à la semaine, selon tes besoins.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-card">
          <h2>Prêt à trouver ton logement ?</h2>
          <p>Commence ta recherche dès maintenant</p>
          <div className="cta-buttons">
            <Link to="/inscription" className="cta-btn">Créer mon compte</Link>
            <Link to="/connexion" className="cta-btn-secondary">Se connecter</Link>
          </div>
        </div>
      </section>

      {/* BACK */}
      <div className="back-section">
        <Link to="/comment-ca-marche">&larr; Retour à Comment ça marche</Link>
      </div>
    </div>
  )
}
