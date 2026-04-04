import { Link } from 'react-router-dom'
import './CommentCaMarchePage.css'

export default function CommentCaMarchePage() {
  return (
    <section className="ccm-page">
      <div className="ccm-card">
        <h1 className="ccm-title ccm-stagger">COMMENT ÇA MARCHE</h1>
        <p className="ccm-subtitle ccm-stagger" style={{ animationDelay: '0.08s' }}>Choisis ton profil pour en savoir plus</p>

        <div className="ccm-options">
          {/* Propriétaire */}
          <Link className="ccm-option ccm-stagger" style={{ animationDelay: '0.16s' }} to="/comment-ca-marche/proprietaire">
            <div className="ccm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px">
                <path d="M700-200h40v-100h100v-40H740v-100h-40v100H600v40h100v100Zm20 80q-83 0-141.5-58.5T520-320q0-83 58.5-141.5T720-520q83 0 141.5 58.5T920-320q0 83-58.5 141.5T720-120Zm-560-80v-480l320-240 320 240v92q-19-6-39-9t-41-3v-40L480-820 240-640v360h203q3 21 9 41t15 39H160Zm320-350Z" />
              </svg>
            </div>
            <div className="ccm-content">
              <div className="ccm-option-title">Je suis propriétaire</div>
              <div className="ccm-option-desc">J'ai un logement à louer à des alternants</div>
            </div>
            <div className="ccm-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
              </svg>
            </div>
          </Link>

          {/* Partager mon logement */}
          <Link className="ccm-option ccm-stagger" style={{ animationDelay: '0.24s' }} to="/comment-ca-marche/alterner">
            <div className="ccm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px">
                <path d="M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11Zm278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56-160 160Z" />
              </svg>
            </div>
            <div className="ccm-content">
              <div className="ccm-option-title">J'ai un logement à partager</div>
              <div className="ccm-option-desc">Je veux trouver un binôme pour diviser mon loyer</div>
            </div>
            <div className="ccm-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
              </svg>
            </div>
          </Link>

          {/* Rechercher un logement */}
          <Link className="ccm-option ccm-stagger" style={{ animationDelay: '0.32s' }} to="/comment-ca-marche/recherche">
            <div className="ccm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px">
                <path d="M440-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T520-640q0-33-23.5-56.5T440-720q-33 0-56.5 23.5T360-640q0 33 23.5 56.5T440-560ZM884-20 756-148q-21 12-45 20t-51 8q-75 0-127.5-52.5T480-300q0-75 52.5-127.5T660-480q75 0 127.5 52.5T840-300q0 27-8 51t-20 45L940-76l-56 56ZM731-229q29-29 29-71t-29-71q-29-29-71-29t-71 29q-29 29-29 71t29 71q29 29 71 29t71-29Zm-611 69v-111q0-34 17-63t47-44q51-26 115-44t142-18q-12 18-20.5 38.5T407-359q-60 5-107 20.5T221-306q-10 5-15.5 14.5T200-271v31h207q5 22 13.5 42t20.5 38H120Zm320-480Zm-33 400Z" />
              </svg>
            </div>
            <div className="ccm-content">
              <div className="ccm-option-title">Je cherche un logement</div>
              <div className="ccm-option-desc">Je veux trouver un logement adapté à mon alternance</div>
            </div>
            <div className="ccm-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
              </svg>
            </div>
          </Link>
        </div>

        <p className="ccm-back ccm-stagger" style={{ animationDelay: '0.40s' }}>
          <Link to="/">Retour</Link>
        </p>
      </div>
    </section>
  )
}
