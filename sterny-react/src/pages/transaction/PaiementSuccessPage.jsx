import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './PaiementSuccessPage.css'

export default function PaiementSuccessPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const isDemo = searchParams.get('demo') === 'true'
  const paymentType = searchParams.get('type') || 'initial'

  const [state, setState] = useState('loading') // loading | success | error
  const [title, setTitle] = useState('Prelevement mis en place !')
  const [message, setMessage] = useState('Votre mandat SEPA a ete enregistre avec succes.<br/>Vos loyers seront preleves automatiquement chaque mois.')
  const [montant, setMontant] = useState('\u2014')
  const [montantLabel, setMontantLabel] = useState('Montant mensuel')
  const [date, setDate] = useState('\u2014')
  const [ref, setRef] = useState('\u2014')
  const [nextHint, setNextHint] = useState("Prochaine etape : etat des lieux d'entree")
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard')

  function afficherSucces(montantVal, refVal, type) {
    setState('success')
    if (montantVal) setMontant(montantVal)
    if (refVal) setRef(refVal)
    setDate(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))

    if (type === 'impaye') {
      setTitle('Paiement confirme')
      setMontantLabel('Montant paye')
      setMessage('Votre loyer a bien ete regularise.<br/>Un recu de paiement a ete envoye a votre adresse email.')
      setNextHint('')
    }
  }

  useEffect(() => {
    async function verifierPaiement() {
      if (isDemo) {
        const demoLoyerMensuel = Math.round(95 * 52 / 12)
        const demoCommission = parseFloat((demoLoyerMensuel * 0.10).toFixed(2))
        const demoTotal = demoLoyerMensuel + demoCommission
        afficherSucces(`${demoTotal}\u20ac/mois`, 'Ref. demo_' + Date.now(), 'initial')
        return
      }

      try {
        if (!user) {
          afficherSucces(null, null, 'initial')
          return
        }

        if (sessionId) {
          const { data: paiement } = await supabaseClient
            .from('paiements_loyer')
            .select('montant')
            .eq('stripe_session_id', sessionId)
            .single()

          if (paiement) {
            afficherSucces(`${paiement.montant}\u20ac`, 'Ref. ' + sessionId.substring(0, 20) + '...', 'impaye')
          } else {
            const { data: contrat } = await supabaseClient
              .from('contrats')
              .select('stripe_session_id, stripe_subscription_id')
              .eq('stripe_session_id', sessionId)
              .single()

            if (contrat && contrat.stripe_subscription_id) {
              afficherSucces(null, 'Ref. ' + sessionId.substring(0, 20) + '...', 'initial')
              setTitle('Prelevement mis en place !')
              setMessage('Votre mandat SEPA a ete enregistre avec succes.<br/>Vos loyers seront preleves automatiquement chaque mois.')
              setNextHint("Prochaine etape : etat des lieux d'entree")
            } else if (contrat) {
              afficherSucces(null, 'Ref. ' + sessionId.substring(0, 20) + '...', 'initial')
              setMessage('Votre prelevement est en cours de mise en place.<br/>Un recu vous sera envoye par email.')
            } else {
              afficherSucces(null, 'Ref. ' + sessionId.substring(0, 20) + '...', 'initial')
              setMessage('Votre paiement est en cours de traitement.<br/>Un recu vous sera envoye par email.')
            }
          }
        } else {
          afficherSucces(null, null, 'initial')
        }
      } catch (error) {
        console.error('Erreur:', error)
        afficherSucces(null, null, 'initial')
      }
    }

    async function gererDashboard() {
      if (!user) return
      try {
        const { data: userData } = await supabaseClient
          .from('users')
          .select('type_user')
          .eq('id', user.id)
          .single()

        if (userData?.type_user === 'proprietaire') {
          setDashboardUrl('/dashboard/proprietaire')
        }
      } catch (e) {
        console.error('Erreur dashboard:', e)
      }
    }

    verifierPaiement()
    gererDashboard()
  }, [user, sessionId, isDemo])

  return (
    <div className="paiement-success-page">
      <div className="paiement-success-container">
        <div className="success-card">

          {/* LOADING STATE */}
          {state === 'loading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <div className="loading-text">Verification du paiement...</div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {state === 'success' && (
            <div>
              <div className="success-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h1 className="success-title">{title}</h1>
              <p className="success-subtitle" role="status" aria-live="polite" dangerouslySetInnerHTML={{ __html: message }}></p>

              <div className="recap-rows">
                <div className="recap-row">
                  <span className="recap-label">{montantLabel}</span>
                  <span className="recap-value green">{montant}</span>
                </div>
                <div className="recap-row">
                  <span className="recap-label">Date</span>
                  <span className="recap-value">{date}</span>
                </div>
                <div className="recap-row">
                  <span className="recap-label">Reference</span>
                  <span className="recap-value ref">{ref}</span>
                </div>
              </div>

              {nextHint && <p className="next-hint">{nextHint}</p>}

              <Link to={dashboardUrl} className="btn-primary-success">Mon espace</Link>
            </div>
          )}

          {/* ERROR STATE */}
          {state === 'error' && (
            <div>
              <div className="error-icon">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
              <h1 className="success-title" style={{ color: '#EF4444' }}>Erreur de paiement</h1>
              <p className="success-subtitle" role="alert" aria-live="polite">
                Le paiement n&apos;a pas pu etre verifie.<br />Contactez-nous a contact@sterny.co
              </p>
              <Link to="/dashboard" className="btn-secondary-success">Retour</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
