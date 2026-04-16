import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './PaiementInitialPage.css'

const COMMISSION_RATE = 0.10

function formatEuros(amount) {
  if (Number.isInteger(amount)) return `${amount}\u20ac`
  return `${amount.toFixed(2).replace('.', ',')}\u20ac`
}

export default function PaiementInitialPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const matchId = searchParams.get('match_id')
  const pageType = searchParams.get('type') || 'initial'
  const contratIdParam = searchParams.get('contrat_id')
  const moisParam = searchParams.get('mois')

  // Display
  const [pageTitle, setPageTitle] = useState('Mise en place du prelevement')
  const [pageSubtitle, setPageSubtitle] = useState('Configurez votre prelevement automatique SEPA en toute securite')
  const [showProgress, setShowProgress] = useState(true)
  const [showAlertImpaye, setShowAlertImpaye] = useState(false)
  const [alertImpayeText, setAlertImpayeText] = useState('Vous avez un loyer en attente de regularisation.')
  const [showSummaryInitial, setShowSummaryInitial] = useState(true)
  const [showSummaryImpaye, setShowSummaryImpaye] = useState(false)
  const [montantCaution, setMontantCaution] = useState('\u2014')
  const [cautionStyle, setCautionStyle] = useState({})
  const [montantLoyer, setMontantLoyer] = useState('\u2014')
  const [montantFrais, setMontantFrais] = useState('\u2014')
  const [montantMensuel, setMontantMensuel] = useState('\u2014')
  const [totalLabel, setTotalLabel] = useState('1er prelevement')
  const [montantTotal, setMontantTotal] = useState('\u2014')
  const [montantImpaye, setMontantImpaye] = useState('\u2014')
  const [commissionImpaye, setCommissionImpaye] = useState('\u2014')
  const [moisImpaye, setMoisImpaye] = useState('\u2014')
  const [logementImpaye, setLogementImpaye] = useState('\u2014')
  const [retourHref, setRetourHref] = useState('/dashboard')
  const [btnPayerText, setBtnPayerText] = useState('Mettre en place le prelevement')
  const [btnPayerDisabled, setBtnPayerDisabled] = useState(true)
  const [loadingText, setLoadingText] = useState('Redirection vers la mise en place du prelevement...')
  const [showLoading, setShowLoading] = useState(false)

  // Legal checkboxes
  const [showLegalInitial, setShowLegalInitial] = useState(true)
  const [showLegalImpaye, setShowLegalImpaye] = useState(false)
  const [acceptCGV, setAcceptCGV] = useState(false)
  const [acceptCGVImpaye, setAcceptCGVImpaye] = useState(false)

  // Security badges for impaye mode
  const [isImpayeMode, setIsImpayeMode] = useState(false)

  // Progress
  const [progressSteps, setProgressSteps] = useState([
    { num: 1, label: 'Match', status: 'completed' },
    { num: 2, label: 'Dossier', status: 'completed' },
    { num: 3, label: 'Contrat', status: 'completed' },
    { num: 4, label: 'Paiement', status: 'active' },
    { num: 5, label: 'Etat des lieux', status: '' },
  ])
  const [progressWidth, setProgressWidth] = useState('70%')

  const paymentDataRef = useRef({})
  const isAdminRef = useRef(false)

  useEffect(() => {
    async function chargerPaiement() {
      try {
        if (!user) {
          navigate('/connexion')
          return
        }

        const { data: adminCheck } = await supabaseClient.from('users').select('is_admin').eq('id', user.id).single()
        isAdminRef.current = adminCheck?.is_admin === true

        if (pageType === 'impaye') {
          await chargerModeImpaye()
        } else {
          await chargerModeInitial()
        }
      } catch (error) {
        console.error('Erreur:', error)
        alert('Erreur lors du chargement des donnees de paiement.')
      }
    }

    async function chargerModeImpaye() {
      setPageTitle('Regulariser mon loyer')
      setPageSubtitle('Payez votre loyer en attente en toute securite')
      setShowProgress(false)
      setShowAlertImpaye(true)
      setShowSummaryInitial(false)
      setShowSummaryImpaye(true)
      setRetourHref('/dashboard')
      setBtnPayerText('Payer')
      setLoadingText('Redirection vers le paiement securise...')
      setTotalLabel('Total a payer TTC')
      setShowLegalInitial(false)
      setShowLegalImpaye(true)
      setIsImpayeMode(true)

      if (!contratIdParam) {
        alert('Parametres manquants.')
        return
      }

      const { data: paiement, error: pError } = await supabaseClient
        .from('paiements_loyer')
        .select('*, contrats (id, annonce_id, locataire_id, annonces (titre, ville))')
        .eq('contrat_id', contratIdParam)
        .eq('mois', moisParam)
        .in('statut', ['impaye', 'relance_envoyee'])
        .single()

      if (pError || !paiement) {
        const { data: paiementCheck } = await supabaseClient.from('paiements_loyer').select('statut').eq('contrat_id', contratIdParam).eq('mois', moisParam).single()
        if (paiementCheck?.statut === 'paye') {
          alert('Ce loyer a deja ete regularise.')
          navigate('/dashboard')
          return
        }
        alert('Aucun impaye trouve pour ces parametres.')
        return
      }

      const montant = parseFloat(paiement.montant)
      const commission = parseFloat((montant * COMMISSION_RATE).toFixed(2))
      const total = montant + commission
      const moisDate = new Date(paiement.mois + 'T00:00:00')
      const moisFormate = moisDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      const annonce = paiement.contrats?.annonces

      setMontantImpaye(formatEuros(montant))
      setCommissionImpaye(formatEuros(commission))
      setMoisImpaye(moisFormate)
      setLogementImpaye(annonce ? `${annonce.titre}${annonce.ville ? ' - ' + annonce.ville : ''}` : 'Votre logement')
      setMontantTotal(formatEuros(total))
      setAlertImpayeText(`Votre loyer de ${moisFormate} (${formatEuros(montant)} + ${formatEuros(commission)} de commission) est en attente de regularisation.`)

      const { data: locataire } = await supabaseClient.from('users').select('prenom, nom').eq('id', user.id).single()

      paymentDataRef.current = {
        type: 'impaye', contrat_id: contratIdParam, mois: moisParam,
        paiement_id: paiement.id, montant: total,
        loyer: montant, commission,
        locataire_nom: locataire?.nom || '', locataire_prenom: locataire?.prenom || '',
        annonce_titre: annonce?.titre || '', annonce_ville: annonce?.ville || '',
      }
    }

    async function chargerModeInitial() {
      if (!matchId) {
        // Demo mode
        const demoPrixSemaine = 95
        const demoLoyerMensuel = Math.round(demoPrixSemaine * 52 / 12)
        const demoCommission = parseFloat((demoLoyerMensuel * COMMISSION_RATE).toFixed(2))
        const demoDepot = demoLoyerMensuel * 2
        const demoTotalMensuel = demoLoyerMensuel + demoCommission
        const demoPremier = demoDepot + demoTotalMensuel

        setMontantCaution(formatEuros(demoDepot))
        setMontantLoyer(`${formatEuros(demoLoyerMensuel)}/mois`)
        setMontantFrais(`${formatEuros(demoCommission)}/mois`)
        setMontantMensuel(`${formatEuros(demoTotalMensuel)}/mois`)
        setMontantTotal(formatEuros(demoPremier))
        setRetourHref('/contrat-location')
        paymentDataRef.current = { type: 'initial', contrat_id: 'demo', montant: demoPremier, depot: demoDepot, loyer_mensuel: demoLoyerMensuel, commission_mensuelle: demoCommission }
        return
      }

      const { data: candidature, error } = await supabaseClient.from('candidatures').select('*, annonces (*)').eq('id', matchId).single()
      if (error) throw error

      const isLocataire = (user.id === candidature.locataire_id)
      const isProprietaire = (user.id === candidature.annonces?.user_id)
      if (!isLocataire && !isProprietaire && !isAdminRef.current) {
        alert('Acces non autorise a ce paiement.')
        navigate('/')
        return
      }

      if (candidature.statut === 'paiement_ok') { navigate(`/etat-des-lieux?match_id=${matchId}`); return }
      if (candidature.statut === 'actif') { navigate(`/match-actif?match_id=${matchId}`); return }

      const estRenouvellement = candidature.est_renouvellement === true
      const prixSemaine = candidature.annonces.prix
      const loyerMensuelVal = Math.round(prixSemaine * 52 / 12)
      const commissionMensuelle = parseFloat((loyerMensuelVal * COMMISSION_RATE).toFixed(2))
      const depot = loyerMensuelVal * 2
      const totalMensuel = loyerMensuelVal + commissionMensuelle

      if (estRenouvellement) {
        setMontantCaution('Conserve')
        setCautionStyle({ color: '#10B981' })
        setMontantLoyer(`${formatEuros(loyerMensuelVal)}/mois`)
        setMontantFrais(`${formatEuros(commissionMensuelle)}/mois`)
        setMontantMensuel(`${formatEuros(totalMensuel)}/mois`)
        setMontantTotal(formatEuros(totalMensuel))
        setProgressSteps([
          { num: 1, label: 'Renouvellement', status: 'completed' },
          { num: 2, label: 'Contrat', status: 'completed' },
          { num: 3, label: 'Paiement', status: 'active' },
        ])
        setProgressWidth('83%')
      } else {
        const premierPrelevement = depot + totalMensuel
        setMontantCaution(formatEuros(depot))
        setMontantLoyer(`${formatEuros(loyerMensuelVal)}/mois`)
        setMontantFrais(`${formatEuros(commissionMensuelle)}/mois`)
        setMontantMensuel(`${formatEuros(totalMensuel)}/mois`)
        setMontantTotal(formatEuros(premierPrelevement))
      }

      setRetourHref(`/contrat-location?match_id=${matchId}`)

      const { data: locataire } = await supabaseClient.from('users').select('prenom, nom, email').eq('id', user.id).single()

      let contratIdForPayment = contratIdParam
      let dateFin = null
      if (!contratIdForPayment) {
        const { data: contrat } = await supabaseClient.from('contrats').select('id, date_fin').eq('candidature_id', matchId).single()
        contratIdForPayment = contrat?.id || matchId
        dateFin = contrat?.date_fin || null
      } else {
        const { data: contrat } = await supabaseClient.from('contrats').select('date_fin').eq('id', contratIdForPayment).single()
        dateFin = contrat?.date_fin || null
      }

      const hoteId = candidature.annonces?.user_id || null
      let hoteEmail = ''
      if (hoteId) {
        const { data: hoteData } = await supabaseClient.from('users').select('email').eq('id', hoteId).single()
        hoteEmail = hoteData?.email || ''
      }

      paymentDataRef.current = {
        type: 'initial', contrat_id: contratIdForPayment,
        montant: estRenouvellement ? totalMensuel : (depot + totalMensuel),
        depot: estRenouvellement ? 0 : depot,
        loyer_mensuel: loyerMensuelVal, commission_mensuelle: commissionMensuelle,
        date_fin: dateFin,
        locataire_nom: locataire?.nom || '', locataire_prenom: locataire?.prenom || '',
        locataire_email: locataire?.email || '', locataire_id: user.id,
        hote_id: hoteId, hote_email: hoteEmail,
        annonce_titre: candidature.annonces?.titre || '', annonce_ville: candidature.annonces?.ville || '',
      }
    }

    chargerPaiement()
  }, [user, matchId, pageType, contratIdParam, moisParam, navigate])

  const togglePaiement = (checked) => {
    if (pageType === 'impaye') {
      setAcceptCGVImpaye(checked)
    } else {
      setAcceptCGV(checked)
    }
    setBtnPayerDisabled(!checked || !paymentDataRef.current.montant)
  }

  const lancerPaiementStripe = async () => {
    setBtnPayerDisabled(true)
    setBtnPayerText('Redirection...')
    setShowLoading(true)

    // Demo mode
    if (paymentDataRef.current.contrat_id === 'demo') {
      setTimeout(() => { navigate('/paiement/success?demo=true') }, 1500)
      return
    }

    try {
      const { data: { session: authSession } } = await supabaseClient.auth.getSession()
      if (!authSession) throw new Error('Vous devez etre connecte pour effectuer un paiement')

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({
            ...paymentDataRef.current,
            success_url: `${window.location.origin}/paiement/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: window.location.href,
          }),
        }
      )

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erreur lors de la creation du paiement')
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('URL de paiement non recue')
      }
    } catch (error) {
      console.error('Erreur paiement Stripe:', error)
      alert('Erreur lors de la creation du paiement : ' + error.message)
      setShowLoading(false)
      setBtnPayerDisabled(false)
      setBtnPayerText(pageType === 'impaye' ? 'Payer' : 'Mettre en place le prelevement')
    }
  }

  return (
    <>
      {/* LOADING OVERLAY */}
      <div className={`paiement-loading-overlay${showLoading ? ' active' : ''}`}>
        <div className="paiement-loading-spinner" />
        <div className="paiement-loading-overlay-text">{loadingText}</div>
      </div>

      <div className="paiement-page-container">
        <div className="paiement-page-header">
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>

        {/* IMPAYE ALERT */}
        {showAlertImpaye && (
          <div className="paiement-alert-impaye">
            <div className="paiement-alert-impaye-icon">
              <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div>
              <div className="paiement-alert-impaye-title">Loyer impaye</div>
              <div className="paiement-alert-impaye-text">{alertImpayeText}</div>
            </div>
          </div>
        )}

        {/* PROGRESS */}
        {showProgress && (
          <div className="card progress-card">
            <div className="progress-steps" style={{ gridTemplateColumns: `repeat(${progressSteps.length}, 1fr)` }}>
              {progressSteps.map((step) => (
                <div key={step.num} className={`progress-step ${step.status}`}>
                  <div className="step-number">{step.num}</div>
                  <div className="step-label">{step.label}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: progressWidth }} />
            </div>
          </div>
        )}

        {/* PAYMENT CARD */}
        <div className="card paiement-payment-card">
          <div className="paiement-payment-section">
            <div className="section-label">Recapitulatif</div>

            {showSummaryInitial && (
              <div>
                <div className="paiement-summary-items">
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Depot de garantie (2 mois) <span style={{ color: '#94A3B8', fontSize: 11 }}>&mdash; preleve une fois</span></span>
                    <span className="paiement-summary-value" style={cautionStyle}>{montantCaution}</span>
                  </div>
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Loyer mensuel</span>
                    <span className="paiement-summary-value">{montantLoyer}</span>
                  </div>
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Commission STERNY (10%)</span>
                    <span className="paiement-summary-value">{montantFrais}</span>
                  </div>
                </div>
                <div className="paiement-summary-total">
                  <div className="paiement-summary-total-label">Total mensuel</div>
                  <div className="paiement-summary-total-value">{montantMensuel}</div>
                </div>
              </div>
            )}

            {showSummaryImpaye && (
              <div>
                <div className="paiement-summary-items">
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Loyer du mois</span>
                    <span className="paiement-summary-value">{montantImpaye}</span>
                  </div>
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Commission STERNY (10%)</span>
                    <span className="paiement-summary-value">{commissionImpaye}</span>
                  </div>
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Mois concerne</span>
                    <span className="paiement-summary-value">{moisImpaye}</span>
                  </div>
                  <div className="paiement-summary-item">
                    <span className="paiement-summary-label">Logement</span>
                    <span className="paiement-summary-value">{logementImpaye}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="paiement-summary-total">
              <div className="paiement-summary-total-label">{totalLabel}</div>
              <div className="paiement-summary-total-value">{montantTotal}</div>
            </div>
          </div>

          {/* Legal + Security */}
          <div className="paiement-payment-section">
            {showLegalInitial && (
              <div className="paiement-legal-checkbox">
                <input type="checkbox" id="acceptCGV" checked={acceptCGV} onChange={(e) => togglePaiement(e.target.checked)} />
                <label htmlFor="acceptCGV">J&rsquo;ai lu et j&rsquo;accepte les <a href="/cgv" target="_blank" rel="noopener noreferrer">Conditions Generales de Vente</a> et la <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer">Politique de Confidentialite</a>. J&rsquo;autorise STERNY a prelever mon compte bancaire via prelevement SEPA pour le paiement de mes loyers mensuels.</label>
              </div>
            )}
            {showLegalImpaye && (
              <div className="paiement-legal-checkbox">
                <input type="checkbox" id="acceptCGVImpaye" checked={acceptCGVImpaye} onChange={(e) => togglePaiement(e.target.checked)} />
                <label htmlFor="acceptCGVImpaye">J&rsquo;ai lu et j&rsquo;accepte les <a href="/cgv" target="_blank" rel="noopener noreferrer">Conditions Generales de Vente</a> et la <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer">Politique de Confidentialite</a></label>
              </div>
            )}

            <div className="paiement-legal-mentions">
              <p>TVA non applicable, art. 293 B du CGI. Depot de garantie restitue en fin de contrat.</p>
              <p>Le prelevement SEPA est effectue chaque mois de maniere automatique. Vous pouvez le contester aupres de votre banque dans un delai de 8 semaines suivant le debit.</p>
              <p>Conformement a l&rsquo;article L221-2, 12 du Code de la consommation, le droit de retractation ne s&rsquo;applique pas aux contrats de location de logement a des fins residentielles.</p>
              <p>STERNY &mdash; Rennes, France &mdash; contact@sterny.co</p>
            </div>

            <div className="paiement-security-row" style={{ marginTop: 14 }}>
              <div className="paiement-security-badges">
                <span className="paiement-security-badge">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  SSL
                </span>
                <span className="paiement-security-badge">
                  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  {isImpayeMode ? '3D Secure' : 'Securise'}
                </span>
                {isImpayeMode ? (
                  <>
                    <span className="paiement-security-badge">VISA</span>
                    <span className="paiement-security-badge">MASTERCARD</span>
                  </>
                ) : (
                  <>
                    <span className="paiement-security-badge">SEPA</span>
                    <span className="paiement-security-badge">IBAN</span>
                  </>
                )}
              </div>
              <div className="paiement-stripe-mention">
                <span>Propulse par</span>
                <svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M60 12.8C60 8.55 57.95 5.18 54.02 5.18C50.07 5.18 47.68 8.55 47.68 12.77C47.68 17.71 50.45 20.33 54.38 20.33C56.3 20.33 57.75 19.87 58.85 19.22V16.12C57.75 16.7 56.48 17.05 54.88 17.05C53.32 17.05 51.93 16.47 51.77 14.55H59.97C59.97 14.35 60 13.37 60 12.8ZM51.72 11.82C51.72 10 52.82 9.27 53.99 9.27C55.13 9.27 56.17 10 56.17 11.82H51.72ZM41.28 5.18C39.7 5.18 38.68 5.93 38.12 6.45L37.9 5.4H34.38V24.5L38.08 23.72L38.1 19.27C38.68 19.7 39.52 20.33 40.95 20.33C43.85 20.33 46.48 18 46.48 12.62C46.45 7.7 43.78 5.18 41.28 5.18ZM40.35 16.97C39.37 16.97 38.78 16.62 38.38 16.17L38.35 9.62C38.78 9.12 39.4 8.8 40.35 8.8C41.88 8.8 42.93 10.52 42.93 12.87C42.93 15.27 41.9 16.97 40.35 16.97ZM29.18 4.17L32.9 3.37V0.22L29.18 1V4.17ZM29.18 5.42H32.9V20.1H29.18V5.42ZM25.08 6.58L24.83 5.42H21.38V20.1H25.08V9.77C25.95 8.62 27.43 8.85 27.88 9V5.42C27.4 5.25 25.95 4.97 25.08 6.58ZM17.45 1.62L13.83 2.4L13.82 16.32C13.82 18.6 15.5 20.35 17.78 20.35C19.03 20.35 19.95 20.12 20.45 19.85V16.67C19.97 16.87 17.45 17.62 17.45 15.35V9.05H20.45V5.42H17.45V1.62ZM5.55 9.62C5.55 9 6.08 8.75 6.93 8.75C8.18 8.75 9.75 9.12 11 9.77V6.17C9.65 5.62 8.32 5.4 6.93 5.4C3.52 5.4 1.25 7.17 1.25 10.05C1.25 14.55 7.45 13.87 7.45 15.82C7.45 16.55 6.8 16.8 5.9 16.8C4.53 16.8 2.78 16.25 1.4 15.5V19.15C2.93 19.8 4.48 20.1 5.9 20.1C9.4 20.1 11.8 18.4 11.8 15.47C11.75 10.6 5.55 11.45 5.55 9.62Z" fill="#635BFF" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="actions-card">
          <Link to={retourHref} className="btn-back">Retour</Link>
          <button className="btn-primary" disabled={btnPayerDisabled} onClick={lancerPaiementStripe}>
            <span>{btnPayerText}</span>
          </button>
        </div>
      </div>
    </>
  )
}
