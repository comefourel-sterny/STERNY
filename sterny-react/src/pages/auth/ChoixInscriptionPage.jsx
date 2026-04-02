import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ChoixInscriptionPage.css'

export default function ChoixInscriptionPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('')

  const handleContinue = () => {
    if (!selected) return
    const routes = {
      proprietaire: '/inscription/proprietaire',
      etudiant: '/inscription/recherche'
    }
    navigate(routes[selected])
  }

  return (
    <section className="ci-page">
      <div className="ci-card">
        <div className="ci-header">
          <h1>Créer un compte</h1>
          <p>Pour commencer, indique-nous ton profil</p>
        </div>

        <div className="profile-options">
          <label
            className={`profile-card${selected === 'proprietaire' ? ' selected' : ''}`}
            htmlFor="typeProprietaire"
          >
            <input
              type="radio"
              name="profileType"
              id="typeProprietaire"
              value="proprietaire"
              checked={selected === 'proprietaire'}
              onChange={() => setSelected('proprietaire')}
            />
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280">
                <path d="M700-200h40v-100h100v-40H740v-100h-40v100H600v40h100v100Zm20 80q-83 0-141.5-58.5T520-320q0-83 58.5-141.5T720-520q83 0 141.5 58.5T920-320q0 83-58.5 141.5T720-120Zm-560-80v-480l320-240 320 240v92q-19-6-39-9t-41-3v-40L480-820 240-640v360h203q3 21 9 41t15 39H160Zm320-350Z" />
              </svg>
            </div>
            <div className="card-content">
              <div className="card-title">Je suis propriétaire</div>
              <div className="card-description">Je loue mon bien à des alternants</div>
            </div>
            <div className="card-check">{'\u2713'}</div>
          </label>

          <label
            className={`profile-card${selected === 'etudiant' ? ' selected' : ''}`}
            htmlFor="typeEtudiant"
          >
            <input
              type="radio"
              name="profileType"
              id="typeEtudiant"
              value="etudiant"
              checked={selected === 'etudiant'}
              onChange={() => setSelected('etudiant')}
            />
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#6B7280">
                <path d="M480-120 200-272v-240L40-600l440-240 440 240v320h-80v-276l-80 44v240L480-120Zm0-332 274-148-274-148-274 148 274 148Zm0 241 200-108v-151L480-362 280-470v151l200 108Zm0-241Zm0 90Zm0 0Z" />
              </svg>
            </div>
            <div className="card-content">
              <div className="card-title">Je suis étudiant en alternance</div>
              <div className="card-description">Je cherche ou je partage un logement</div>
            </div>
            <div className="card-check">{'\u2713'}</div>
          </label>
        </div>

        <div className="ci-bottom">
          <button
            className="ci-btn"
            disabled={!selected}
            onClick={handleContinue}
          >
            Continuer
          </button>

          <p className="ci-back">
            Déjà un compte ? <Link to="/connexion">Se connecter</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
