import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseClient } from '../../config/supabase'
import './ModifierAlertePage.css'

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

export default function ModifierAlertePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const alerteId = searchParams.get('id')

  const [ville, setVille] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [dateDisponibilite, setDateDisponibilite] = useState('')
  const [selectedEquipements, setSelectedEquipements] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingAlerte, setLoadingAlerte] = useState(true)
  const [message, setMessage] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!loading && !user) {
      navigate('/connexion')
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user || !alerteId) return

    if (!alerteId) {
      showMessage('Aucune alerte specifiee', 'error')
      setTimeout(() => navigate('/dashboard/locataire'), 2000)
      return
    }

    async function chargerAlerte() {
      try {
        const { data: alerte, error } = await supabaseClient
          .from('alertes')
          .select('*')
          .eq('id', alerteId)
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        if (!alerte) {
          showMessage('Alerte introuvable', 'error')
          setTimeout(() => navigate('/dashboard/locataire'), 2000)
          return
        }

        setVille(alerte.ville || '')
        setBudgetMax(alerte.budget_max?.toString() || '')
        setDateDisponibilite(alerte.date_disponibilite || '')
        setSelectedEquipements(alerte.equipements || [])
      } catch (error) {
        console.error('Erreur chargement alerte:', error)
        showMessage("Erreur de chargement de l'alerte", 'error')
        setTimeout(() => navigate('/dashboard/locataire'), 2000)
      } finally {
        setLoadingAlerte(false)
      }
    }

    chargerAlerte()
  }, [user, alerteId, navigate])

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
    if (!user || !alerteId) return

    setSubmitting(true)

    try {
      const alerteData = {
        ville,
        budget_max: parseInt(budgetMax),
        date_disponibilite: dateDisponibilite,
        equipements: selectedEquipements.length > 0 ? selectedEquipements : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabaseClient
        .from('alertes')
        .update(alerteData)
        .eq('id', alerteId)
        .eq('user_id', user.id)
        .select()

      if (error) throw error

      showMessage('Alerte modifiee avec succes !', 'success')

      setTimeout(() => {
        navigate('/dashboard/locataire')
      }, 1500)
    } catch (error) {
      console.error('Erreur modification alerte:', error)
      showMessage("Erreur lors de la modification de l'alerte", 'error')
      setSubmitting(false)
    }
  }

  if (loading || loadingAlerte) return null

  return (
    <div className="modifier-alerte-page">
      <div className="main-container">
        <div className="page-header">
          <div className="icon">&#x1F514;</div>
          <h1>Modifier mon alerte</h1>
          <p>Modifie les criteres de ton alerte de recherche</p>
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
                {submitting ? 'Modification en cours...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
