import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseClient } from '../../config/supabase'
import './CreerAlertePage.css'

const VILLES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes',
  'Rennes', 'Bordeaux', 'Lille', 'Strasbourg', 'Montpellier', 'Grenoble'
]

const EQUIPEMENTS = [
  { id: 'meuble', value: 'Meuble', label: 'Meuble' },
  { id: 'wifi', value: 'Wifi', label: 'Wifi' },
  { id: 'cuisine', value: 'Cuisine equipee', label: 'Cuisine equipee' },
  { id: 'lave_linge', value: 'Lave-linge', label: 'Lave-linge' },
  { id: 'parking', value: 'Parking', label: 'Parking' },
  { id: 'balcon', value: 'Balcon', label: 'Balcon' }
]

export default function CreerAlertePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [ville, setVille] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [dateDisponibilite, setDateDisponibilite] = useState('')
  const [selectedEquipements, setSelectedEquipements] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null) // { text, type }

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!loading && !user) {
      navigate('/connexion')
    }
  }, [user, loading, navigate])

  function showMessage(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  function handleEquipementChange(value) {
    setSelectedEquipements(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)

    try {
      const alerteData = {
        user_id: user.id,
        ville,
        budget_max: parseInt(budgetMax),
        date_disponibilite: dateDisponibilite,
        equipements: selectedEquipements.length > 0 ? selectedEquipements : null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabaseClient
        .from('alertes')
        .insert([alerteData])
        .select()

      if (error) throw error

      showMessage('Alerte creee avec succes !', 'success')

      setTimeout(() => {
        navigate('/dashboard/locataire')
      }, 1500)
    } catch (error) {
      console.error('Erreur creation alerte:', error)
      showMessage("Erreur lors de la creation de l'alerte", 'error')
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className="creer-alerte-page">
      <div className="main-container">
        <div className="page-header">
          <div className="icon">&#x1F514;</div>
          <h1>Creer une alerte</h1>
          <p>Sois prevenu des qu'un logement correspond a tes criteres</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Criteres de recherche</h3>

              <div className="form-group">
                <label htmlFor="ville">
                  &#x1F4CD; Ville <span className="required">*</span>
                </label>
                <select
                  id="ville"
                  required
                  value={ville}
                  onChange={e => setVille(e.target.value)}
                >
                  <option value="" disabled>Selectionner une ville...</option>
                  {VILLES.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="budgetMax">
                  &#x1F4B0; Budget maximum <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="budgetMax"
                  min="100"
                  max="1000"
                  step="10"
                  placeholder="350"
                  required
                  value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                />
                <div className="helper-text">&euro;/semaine</div>
              </div>

              <div className="form-group">
                <label htmlFor="dateDisponibilite">
                  &#x1F4C5; Disponible a partir de <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="dateDisponibilite"
                  required
                  min={today}
                  value={dateDisponibilite}
                  onChange={e => setDateDisponibilite(e.target.value)}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Equipements souhaites (optionnel)</h3>

              <div className="checkboxes-group">
                {EQUIPEMENTS.map(eq => (
                  <div className="checkbox-item" key={eq.id}>
                    <input
                      type="checkbox"
                      id={eq.id}
                      checked={selectedEquipements.includes(eq.value)}
                      onChange={() => handleEquipementChange(eq.value)}
                    />
                    <label htmlFor={eq.id}>{eq.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <Link to="/dashboard/locataire" className="btn btn-secondary">
                Annuler
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creation en cours...' : "Creer l'alerte"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
