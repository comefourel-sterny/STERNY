import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import './CommentCaMarcheAlternerPage.css'

export default function CommentCaMarcheAlternerPage() {
  const { user } = useAuth()
  return (
    <div className="ccma">
      {/* HERO */}
      <section className="ccma-hero">
        <div className="ccma-hero-inner">
          <span className="ccma-badge ccma-stagger">Partage de logement</span>
          <h1 className="ccma-stagger" style={{ animationDelay: '0.08s' }}>Divise ton loyer grâce à l'alternance</h1>
          <p className="ccma-stagger" style={{ animationDelay: '0.16s' }}>Tu as un logement ? Trouve un binôme avec un rythme complémentaire et partagez les frais</p>
        </div>
      </section>

      {/* ÉTAPES */}
      <section className="ccma-steps-section">
        <div className="ccma-container">
          <h2 className="ccma-section-title ccma-stagger">COMMENT ÇA MARCHE</h2>

          <div className="ccma-steps">
            <div className="ccma-step ccma-stagger" style={{ animationDelay: '0.08s' }}>
              <div className="ccma-step-num">1</div>
              <div className="ccma-step-body">
                <h3>Inscris-toi avec ton rythme</h3>
                <p>Indique ta ville et ton rythme d'alternance. STERNY cherche un binôme dont les semaines sont complémentaires aux tiennes.</p>
              </div>
            </div>

            <div className="ccma-step ccma-stagger" style={{ animationDelay: '0.16s' }}>
              <div className="ccma-step-num">2</div>
              <div className="ccma-step-body">
                <h3>Découvre ton binôme</h3>
                <p>On te propose un étudiant compatible : quand tu es en cours, il est en entreprise (et inversement). Vous ne vous croisez jamais.</p>
              </div>
            </div>

            <div className="ccma-step ccma-stagger" style={{ animationDelay: '0.24s' }}>
              <div className="ccma-step-num">3</div>
              <div className="ccma-step-body">
                <h3>Signez ensemble en ligne</h3>
                <p>Validez le binôme, signez le contrat sur la plateforme. Tout est encadré par STERNY.</p>
              </div>
            </div>

            <div className="ccma-step ccma-stagger" style={{ animationDelay: '0.32s' }}>
              <div className="ccma-step-num">4</div>
              <div className="ccma-step-body">
                <h3>Paie selon ton occupation</h3>
                <p>Chacun paie chaque mois en fonction de ses semaines d'occupation. Ton loyer est divisé, sans compromis sur le confort.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section className="ccma-avantages-section">
        <div className="ccma-container">
          <h2 className="ccma-section-title ccma-stagger">POURQUOI STERNY</h2>

          <div className="ccma-grid">
            <div className="ccma-avantage ccma-stagger" style={{ animationDelay: '0.08s' }}>
              <div className="ccma-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Z" />
                </svg>
              </div>
              <h4>Loyer divisé par 2</h4>
              <p>Tu ne paies que tes semaines d'occupation. Ton binôme paie les siennes.</p>
            </div>

            <div className="ccma-avantage ccma-stagger" style={{ animationDelay: '0.16s' }}>
              <div className="ccma-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11Zm278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56-160 160Z" />
                </svg>
              </div>
              <h4>Jamais en même temps</h4>
              <p>Le matching par rythme garantit que vous n'êtes jamais dans le logement au même moment.</p>
            </div>

            <div className="ccma-avantage ccma-stagger" style={{ animationDelay: '0.24s' }}>
              <div className="ccma-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
                </svg>
              </div>
              <h4>Binôme vérifié</h4>
              <p>Chaque étudiant est vérifié par STERNY avant d'être proposé comme binôme.</p>
            </div>

            <div className="ccma-avantage ccma-stagger" style={{ animationDelay: '0.32s' }}>
              <div className="ccma-avantage-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white">
                  <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q97-30 162-118.5T718-480H480v-315l-240 90v207q0 7 2 18h238v316Z" />
                </svg>
              </div>
              <h4>Tout est sécurisé</h4>
              <p>Contrat en ligne, paiements automatiques, aucune mauvaise surprise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — masqué si connecté */}
      {!user && <section className="ccma-cta-section">
        <div className="ccma-container">
          <div className="ccma-cta ccma-stagger">
            <h2>Prêt à diviser ton loyer ?</h2>
            <p>Inscris-toi et trouve ton binôme</p>
            <div className="ccma-cta-btns">
              <Link to="/inscription" className="ccma-btn-primary">Créer mon compte</Link>
              <Link to="/connexion" className="ccma-btn-secondary">Se connecter</Link>
            </div>
          </div>
        </div>
      </section>}
    </div>
  )
}
