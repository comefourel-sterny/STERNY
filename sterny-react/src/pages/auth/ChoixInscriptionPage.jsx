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
      etudiant: '/inscription/recherche',
      les_deux: '/inscription/recherche'
    }
    navigate(routes[selected], selected === 'les_deux' ? { state: { type: 'les_deux' } } : undefined)
  }

  return (
    <section className="ci-page">
      <div className="ci-card" style={{ minHeight: '536px' }}>
        <h2 className="ci-title ci-stagger">INSCRIPTION</h2>

        <div className="ci-options">
          <label
            className={`ci-profile ci-stagger${selected === 'proprietaire' ? ' selected' : ''}`}
            style={{ animationDelay: '0.08s' }}
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
            <div className="ci-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
                <path d="M700-200h40v-100h100v-40H740v-100h-40v100H600v40h100v100Zm20 80q-83 0-141.5-58.5T520-320q0-83 58.5-141.5T720-520q83 0 141.5 58.5T920-320q0 83-58.5 141.5T720-120Zm-560-80v-480l320-240 320 240v92q-19-6-39-9t-41-3v-40L480-820 240-640v360h203q3 21 9 41t15 39H160Zm320-350Z" />
              </svg>
            </div>
            <div className="ci-content">
              <div className="ci-card-title">Je suis propriétaire</div>
              <div className="ci-card-desc">Je loue mon bien à des alternants</div>
            </div>
            <div className="ci-check">{'\u2713'}</div>
          </label>

          <label
            className={`ci-profile ci-stagger${selected === 'etudiant' ? ' selected' : ''}`}
            style={{ animationDelay: '0.16s' }}
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
            <div className="ci-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
                <path d="M480-120 200-272v-240L40-600l440-240 440 240v320h-80v-276l-80 44v240L480-120Zm0-332 274-148-274-148-274 148 274 148Zm0 241 200-108v-151L480-362 280-470v151l200 108Zm0-241Zm0 90Zm0 0Z" />
              </svg>
            </div>
            <div className="ci-content">
              <div className="ci-card-title">Je suis étudiant en alternance</div>
              <div className="ci-card-desc">Je cherche ou je partage un logement</div>
            </div>
            <div className="ci-check">{'\u2713'}</div>
          </label>

          <label
            className={`ci-profile ci-stagger${selected === 'les_deux' ? ' selected' : ''}`}
            style={{ animationDelay: '0.24s' }}
            htmlFor="typeLesDeux"
          >
            <input
              type="radio"
              name="profileType"
              id="typeLesDeux"
              value="les_deux"
              checked={selected === 'les_deux'}
              onChange={() => setSelected('les_deux')}
            />
            <div className="ci-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
                <path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z" />
              </svg>
            </div>
            <div className="ci-content">
              <div className="ci-card-title">Je cherche ET je propose</div>
              <div className="ci-card-desc">Tu veux trouver un logement et proposer le tien</div>
            </div>
            <div className="ci-check">{'\u2713'}</div>
          </label>
        </div>

        <div className="ci-bottom">
          <button
            className="ci-btn ci-stagger"
            style={{ animationDelay: '0.24s' }}
            disabled={!selected}
            onClick={handleContinue}
          >
            Continuer
          </button>

          <p className="ci-back ci-stagger" style={{ animationDelay: '0.32s' }}>
            Déjà un compte ? <Link to="/connexion">Se connecter</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
