import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './RenouvellementPage.css'

export default function RenouvellementPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const contratId = searchParams.get('contrat_id')

  const [pageSubtitle, setPageSubtitle] = useState('Prolongez votre location en toute simplicit\u00e9')
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState(false)

  // States for each view
  const [activeView, setActiveView] = useState(null) // 'form', 'proprio', 'attente', 'accepte', 'refuse'

  // Progress
  const [progressSteps, setProgressSteps] = useState([
    { num: 1, label: 'Renouvellement', status: 'active' },
    { num: 2, label: 'Contrat', status: '' },
    { num: 3, label: 'Paiement', status: '' },
  ])
  const [progressWidth, setProgressWidth] = useState('17%')

  // Form state
  const [annonceTitle, setAnnonceTitle] = useState('-')
  const [annonceVille, setAnnonceVille] = useState('-')
  const [bailPeriode, setBailPeriode] = useState('-')
  const [bailDuree, setBailDuree] = useState('-')
  const [bailLoyer, setBailLoyer] = useState('-')
  const [bailProprio, setBailProprio] = useState('-')
  const [countdownHtml, setCountdownHtml] = useState(null)
  const [newDateDebut, setNewDateDebut] = useState('')
  const [newDateFin, setNewDateFin] = useState('')
  const [newDateFinMax, setNewDateFinMax] = useState('')
  const [newDateFinMin, setNewDateFinMin] = useState('')
  const [newLoyer, setNewLoyer] = useState('')
  const [messageLocataire, setMessageLocataire] = useState('')
  const [btnEnvoyerDisabled, setBtnEnvoyerDisabled] = useState(false)
  const [btnEnvoyerText, setBtnEnvoyerText] = useState('Envoyer ma demande de renouvellement')
  const [retourHref, setRetourHref] = useState('/dashboard/locataire')

  // Proprio view
  const [locAvatar, setLocAvatar] = useState('-')
  const [locNom, setLocNom] = useState('-')
  const [locEmail, setLocEmail] = useState('-')
  const [demandePeriode, setDemandePeriode] = useState('-')
  const [demandeDuree, setDemandeDuree] = useState('-')
  const [demandeLoyer, setDemandeLoyer] = useState('-')
  const [loyerActuel, setLoyerActuel] = useState('-')
  const [loyerAjuste, setLoyerAjuste] = useState('')
  const [messageLocataireTexte, setMessageLocataireTexte] = useState('-')
  const [showMessageLocataire, setShowMessageLocataire] = useState(false)
  const [showRefusField, setShowRefusField] = useState(false)
  const [motifRefus, setMotifRefus] = useState('')

  // Attente view
  const [attentePeriode, setAttentePeriode] = useState('-')
  const [attenteDuree, setAttenteDuree] = useState('-')
  const [attenteLoyer, setAttenteLoyer] = useState('-')
  const [attenteDate, setAttenteDate] = useState('-')

  // Accepte view
  const [acceptePeriode, setAcceptePeriode] = useState('-')
  const [accepteDuree, setAccepteDuree] = useState('-')
  const [accepteLoyer, setAccepteLoyer] = useState('-')
  const [accepteDepot, setAccepteDepot] = useState('Conserv\u00e9')
  const [nouveauContratHref, setNouveauContratHref] = useState('#')

  // Refuse view
  const [motifRefusTexte, setMotifRefusTexte] = useState('-')
  const [showMotifRefus, setShowMotifRefus] = useState(false)

  // Refs
  const contratDataRef = useRef(null)
  const renouvellementDataRef = useRef(null)
  const isLocataireRef = useRef(false)

  useEffect(() => {
    async function chargerRenouvellement() {
      try {
        if (!user) { navigate('/connexion'); return }

        const dashboardUrl = user.user_metadata?.type_user === 'proprietaire'
          ? '/dashboard/proprietaire'
          : '/dashboard/locataire'
        setRetourHref(dashboardUrl)

        // Demo mode
        if (!contratId) {
          setLoading(false)
          afficherFormulaire(
            { date_debut: '2026-03-01', date_fin: '2026-08-31', loyer_mensuel: 95, proprietaire_id: 'demo' },
            { titre: 'Chambre lumineuse centre-ville', ville: 'Lyon' },
            { prenom: 'Jean', nom: 'Dupont' }
          )
          return
        }

        const { data: contrat, error: contratError } = await supabaseClient.from('contrats').select('*').eq('id', contratId).single()
        if (contratError) throw contratError
        contratDataRef.current = contrat

        const { data: annonce } = await supabaseClient.from('annonces').select('*').eq('id', contrat.annonce_id).single()
        const { data: locataire } = await supabaseClient.from('users').select('*').eq('id', contrat.locataire_id).single()
        const { data: proprietaire } = await supabaseClient.from('users').select('*').eq('id', contrat.proprietaire_id).single()

        isLocataireRef.current = (user.id === contrat.locataire_id)

        const { data: renouvellement } = await supabaseClient
          .from('renouvellements')
          .select('*')
          .eq('contrat_original_id', contratId)
          .in('statut', ['demande_locataire', 'acceptee', 'refusee', 'contrat_genere'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        renouvellementDataRef.current = renouvellement
        setLoading(false)

        if (!renouvellement) {
          afficherFormulaire(contrat, annonce, proprietaire)
          if (!isLocataireRef.current) {
            setPageSubtitle('Aucune demande de renouvellement en cours')
          }
        } else if (renouvellement.statut === 'demande_locataire') {
          if (isLocataireRef.current) {
            afficherAttente(renouvellement)
          } else {
            afficherVueProprio(renouvellement, locataire, contrat)
          }
        } else if (renouvellement.statut === 'acceptee' || renouvellement.statut === 'contrat_genere') {
          afficherAccepte(renouvellement)
        } else if (renouvellement.statut === 'refusee') {
          afficherRefuse(renouvellement)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setLoading(false)
        setLoadingError(true)
      }
    }

    function afficherFormulaire(contrat, annonce, proprietaire) {
      setActiveView('form')
      setAnnonceTitle(annonce?.titre || 'Logement')
      setAnnonceVille(annonce?.ville || '')

      const dateDebut = new Date(contrat.date_debut)
      const dateFin = new Date(contrat.date_fin)
      setBailPeriode(`${dateDebut.toLocaleDateString('fr-FR')} \u2192 ${dateFin.toLocaleDateString('fr-FR')}`)
      const mois = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + (dateFin.getMonth() - dateDebut.getMonth())
      setBailDuree(`${mois} mois`)
      setBailLoyer(`${contrat.loyer_mensuel}\u20ac/sem`)
      setBailProprio(proprietaire ? `${proprietaire.prenom} ${proprietaire.nom}` : '-')

      const today = new Date()
      const joursRestants = Math.ceil((dateFin - today) / (1000 * 60 * 60 * 24))
      if (joursRestants > 30) {
        setCountdownHtml(<div className="ren-countdown-badge ok">&#128994; Votre bail se termine dans {joursRestants} jours</div>)
      } else if (joursRestants > 0) {
        setCountdownHtml(<div className="ren-countdown-badge urgent">&#9888;&#65039; Votre bail se termine dans {joursRestants} jours</div>)
      } else {
        setCountdownHtml(<div className="ren-countdown-badge expired">&#128308; Votre bail est termin&eacute;</div>)
      }

      const newDebut = new Date(dateFin)
      newDebut.setDate(newDebut.getDate() + 1)
      setNewDateDebut(newDebut.toISOString().split('T')[0])
      setNewDateFinMin(newDebut.toISOString().split('T')[0])

      const maxFin = new Date(newDebut)
      maxFin.setMonth(maxFin.getMonth() + 9)
      setNewDateFinMax(maxFin.toISOString().split('T')[0])

      const newFin = new Date(newDebut)
      newFin.setMonth(newFin.getMonth() + mois)
      newFin.setDate(newFin.getDate() - 1)
      if (newFin <= maxFin) {
        setNewDateFin(newFin.toISOString().split('T')[0])
      }

      setNewLoyer(String(contrat.loyer_mensuel))
    }

    function afficherVueProprio(renouvellement, locataire, contrat) {
      setActiveView('proprio')
      const initiales = `${(locataire.prenom || '')[0] || ''}${(locataire.nom || '')[0] || ''}`.toUpperCase()
      setLocAvatar(initiales)
      setLocNom(`${locataire.prenom} ${locataire.nom}`)
      setLocEmail(locataire.email)

      const dateDebut = new Date(renouvellement.date_debut)
      const dateFin = new Date(renouvellement.date_fin)
      const mois = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + (dateFin.getMonth() - dateDebut.getMonth())
      setDemandePeriode(`${dateDebut.toLocaleDateString('fr-FR')} \u2192 ${dateFin.toLocaleDateString('fr-FR')}`)
      setDemandeDuree(`${mois} mois`)
      setDemandeLoyer(`${renouvellement.loyer_mensuel}\u20ac/sem`)
      setLoyerActuel(`${contrat.loyer_mensuel}\u20ac/sem`)
      setLoyerAjuste(String(renouvellement.loyer_mensuel))

      if (renouvellement.message_locataire) {
        setShowMessageLocataire(true)
        setMessageLocataireTexte(renouvellement.message_locataire)
      }
    }

    function afficherAttente(renouvellement) {
      setActiveView('attente')
      const dateDebut = new Date(renouvellement.date_debut)
      const dateFin = new Date(renouvellement.date_fin)
      const mois = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + (dateFin.getMonth() - dateDebut.getMonth())
      setAttentePeriode(`${dateDebut.toLocaleDateString('fr-FR')} \u2192 ${dateFin.toLocaleDateString('fr-FR')}`)
      setAttenteDuree(`${mois} mois`)
      setAttenteLoyer(`${renouvellement.loyer_mensuel}\u20ac/sem`)
      setAttenteDate(new Date(renouvellement.created_at).toLocaleDateString('fr-FR'))
    }

    function afficherAccepte(renouvellement) {
      setActiveView('accepte')
      const dateDebut = new Date(renouvellement.date_debut)
      const dateFin = new Date(renouvellement.date_fin)
      const mois = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + (dateFin.getMonth() - dateDebut.getMonth())
      setAcceptePeriode(`${dateDebut.toLocaleDateString('fr-FR')} \u2192 ${dateFin.toLocaleDateString('fr-FR')}`)
      setAccepteDuree(`${mois} mois`)
      setAccepteLoyer(`${renouvellement.loyer_mensuel}\u20ac/sem`)

      if (contratDataRef.current && renouvellement.loyer_mensuel !== contratDataRef.current.loyer_mensuel) {
        const diff = renouvellement.loyer_mensuel - contratDataRef.current.loyer_mensuel
        setAccepteDepot(diff > 0 ? `Compl\u00e9ment de ${diff}\u20ac` : 'Conserv\u00e9')
      }

      if (renouvellement.nouveau_contrat_id) {
        supabaseClient.from('contrats').select('candidature_id').eq('id', renouvellement.nouveau_contrat_id).single()
          .then(({ data }) => {
            if (data) setNouveauContratHref(`/contrat-location?match_id=${data.candidature_id}`)
          })
      }

      setProgressSteps([
        { num: 1, label: 'Renouvellement', status: 'completed' },
        { num: 2, label: 'Contrat', status: 'active' },
        { num: 3, label: 'Paiement', status: '' },
      ])
      setProgressWidth('50%')
    }

    function afficherRefuse(renouvellement) {
      setActiveView('refuse')
      if (renouvellement.motif_refus) {
        setShowMotifRefus(true)
        setMotifRefusTexte(renouvellement.motif_refus)
      }
    }

    chargerRenouvellement()
  }, [user, contratId, navigate])

  // Actions
  const soumettreDemandeRenouvellement = async () => {
    if (!newDateDebut || !newDateFin || !newLoyer) { alert('Veuillez remplir tous les champs obligatoires'); return }
    const d1 = new Date(newDateDebut)
    const d2 = new Date(newDateFin)
    if (d2 <= d1) { alert('La date de fin doit \u00eatre apr\u00e8s la date de d\u00e9but'); return }
    const diffMois = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
    if (diffMois > 9) { alert('La dur\u00e9e ne peut pas exc\u00e9der 9 mois (bail \u00e9tudiant)'); return }

    setBtnEnvoyerDisabled(true)
    setBtnEnvoyerText('Envoi en cours...')

    try {
      const cd = contratDataRef.current
      const { error } = await supabaseClient.from('renouvellements').insert({
        contrat_original_id: contratId,
        locataire_id: cd.locataire_id, proprietaire_id: cd.proprietaire_id, annonce_id: cd.annonce_id,
        date_debut: newDateDebut, date_fin: newDateFin, loyer_mensuel: parseFloat(newLoyer),
        message_locataire: messageLocataire || null, statut: 'demande_locataire'
      }).select().single()

      if (error) throw error
      window.location.reload()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'envoi de la demande')
      setBtnEnvoyerDisabled(false)
      setBtnEnvoyerText('Envoyer ma demande de renouvellement')
    }
  }

  const accepterRenouvellement = async () => {
    if (!window.confirm('Accepter ce renouvellement ? Un nouveau contrat sera g\u00e9n\u00e9r\u00e9.')) return
    const loyerFinal = parseFloat(loyerAjuste)
    const cd = contratDataRef.current
    const rd = renouvellementDataRef.current

    try {
      const { data: newCandidature, error: candError } = await supabaseClient.from('candidatures').insert({
        annonce_id: cd.annonce_id, locataire_id: cd.locataire_id, statut: 'acceptee',
        est_renouvellement: true, renouvellement_id: rd.id
      }).select().single()
      if (candError) throw candError

      const { data: newContrat, error: contratError } = await supabaseClient.from('contrats').insert({
        candidature_id: newCandidature.id, locataire_id: cd.locataire_id, proprietaire_id: cd.proprietaire_id,
        annonce_id: cd.annonce_id, loyer_mensuel: loyerFinal,
        depot_garantie: loyerFinal !== cd.loyer_mensuel ? loyerFinal : cd.depot_garantie,
        date_debut: rd.date_debut, date_fin: rd.date_fin, statut: 'en_attente',
        contrat_parent_id: cd.id, est_renouvellement: true
      }).select().single()
      if (contratError) throw contratError

      await supabaseClient.from('renouvellements').update({
        statut: 'contrat_genere', loyer_mensuel: loyerFinal,
        nouveau_contrat_id: newContrat.id, date_reponse: new Date().toISOString()
      }).eq('id', rd.id)

      alert('Renouvellement accept\u00e9 ! Le nouveau contrat est pr\u00eat \u00e0 signer.')
      window.location.reload()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'acceptation du renouvellement')
    }
  }

  const refuserRenouvellement = async () => {
    if (!window.confirm('Confirmer le refus de ce renouvellement ?')) return
    try {
      await supabaseClient.from('renouvellements').update({
        statut: 'refusee', motif_refus: motifRefus || null, date_reponse: new Date().toISOString()
      }).eq('id', renouvellementDataRef.current.id)
      alert('Demande de renouvellement refus\u00e9e.')
      window.location.reload()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du refus')
    }
  }

  const annulerRenouvellement = async () => {
    if (!window.confirm('Annuler votre demande de renouvellement ?')) return
    try {
      await supabaseClient.from('renouvellements').update({ statut: 'annulee' }).eq('id', renouvellementDataRef.current.id)
      window.location.reload()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'annulation')
    }
  }

  const handleDateDebutChange = (value) => {
    setNewDateDebut(value)
    const d = new Date(value)
    const max = new Date(d)
    max.setMonth(max.getMonth() + 9)
    setNewDateFinMax(max.toISOString().split('T')[0])
    setNewDateFinMin(value)
  }

  return (
    <div className="renouvellement-page-container">
      <div className="renouvellement-page-header">
        <h1>Renouvellement de bail</h1>
        <p>{pageSubtitle}</p>
      </div>

      {/* PROGRESS */}
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

      {/* LOADING */}
      {loading && (
        <div className="card">
          <div className="ren-loading-container">
            <div className="ren-loading-spinner" />
            <p style={{ color: '#64748B', fontSize: 14 }}>Chargement des donn&eacute;es...</p>
          </div>
        </div>
      )}

      {loadingError && (
        <div className="card">
          <div className="ren-loading-container">
            <p style={{ color: '#EF4444', fontSize: 14 }}>Erreur lors du chargement des donn&eacute;es</p>
          </div>
        </div>
      )}

      {/* STATE: FORM */}
      {activeView === 'form' && (
        <>
          <div className="card">
            <div className="renewal-header">
              <h2>{annonceTitle}</h2>
              <p>{annonceVille}</p>
            </div>
            <div className="ren-section">
              <div className="ren-section-label">Bail actuel</div>
              {countdownHtml}
              <div className="ren-info-grid">
                <div className="ren-info-item"><div className="item-label">P&eacute;riode</div><div className="item-value">{bailPeriode}</div></div>
                <div className="ren-info-item"><div className="item-label">Dur&eacute;e</div><div className="item-value">{bailDuree}</div></div>
                <div className="ren-info-item"><div className="item-label">Loyer</div><div className="item-value">{bailLoyer}</div></div>
                <div className="ren-info-item"><div className="item-label">Propri&eacute;taire</div><div className="item-value">{bailProprio}</div></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="ren-section">
              <div className="ren-section-label">Nouvelle p&eacute;riode souhait&eacute;e</div>
              <div className="ren-form-row">
                <div className="ren-form-group">
                  <label htmlFor="newDateDebut">Date de d&eacute;but</label>
                  <input type="date" id="newDateDebut" value={newDateDebut} onChange={(e) => handleDateDebutChange(e.target.value)} />
                </div>
                <div className="ren-form-group">
                  <label htmlFor="newDateFin">Date de fin</label>
                  <input type="date" id="newDateFin" value={newDateFin} min={newDateFinMin} max={newDateFinMax} onChange={(e) => setNewDateFin(e.target.value)} />
                  <div className="ren-form-hint">Maximum 9 mois apr&egrave;s la date de d&eacute;but</div>
                </div>
              </div>
              <div className="ren-form-group">
                <label htmlFor="newLoyer">Loyer propos&eacute; (&euro;/semaine)</label>
                <input type="number" id="newLoyer" step="1" min="1" value={newLoyer} onChange={(e) => setNewLoyer(e.target.value)} />
                <div className="ren-form-hint">Pr&eacute;-rempli avec le loyer actuel. Modifiable comme suggestion.</div>
              </div>
              <div className="ren-form-group">
                <label htmlFor="messageLocataire">Message au propri&eacute;taire (optionnel)</label>
                <textarea id="messageLocataire" placeholder="Expliquez pourquoi vous souhaitez renouveler votre bail..." value={messageLocataire} onChange={(e) => setMessageLocataire(e.target.value)} />
              </div>
              <div className="ren-legal-note">
                <strong>Art. 25-7 de la loi du 6 juillet 1989 :</strong> Le bail meubl&eacute; &eacute;tudiant ne se renouvelle pas par reconduction tacite. Un nouveau contrat de location sera &eacute;tabli en cas d&rsquo;accord du propri&eacute;taire, pour une dur&eacute;e n&rsquo;exc&eacute;dant pas 9 mois.
              </div>
            </div>
          </div>

          <div className="card ren-actions-card">
            <Link to={retourHref} className="ren-btn-back">Retour</Link>
            <button className="ren-btn-primary" disabled={btnEnvoyerDisabled} onClick={soumettreDemandeRenouvellement}>{btnEnvoyerText}</button>
          </div>
        </>
      )}

      {/* STATE: PROPRIO */}
      {activeView === 'proprio' && (
        <>
          <div className="card">
            <div className="renewal-header">
              <h2>Demande de renouvellement</h2>
              <p>Un locataire souhaite prolonger son bail</p>
            </div>
            <div className="ren-section">
              <div className="ren-section-label">Locataire</div>
              <div className="ren-locataire-card">
                <div className="ren-loc-avatar">{locAvatar}</div>
                <div className="ren-loc-info">
                  <h3>{locNom}</h3>
                  <p>{locEmail}</p>
                </div>
              </div>
            </div>
            <div className="ren-section">
              <div className="ren-section-label">D&eacute;tails de la demande</div>
              <div className="ren-summary-grid">
                <div className="ren-summary-item"><div className="s-label">Nouvelle p&eacute;riode</div><div className="s-value">{demandePeriode}</div></div>
                <div className="ren-summary-item"><div className="s-label">Dur&eacute;e</div><div className="s-value">{demandeDuree}</div></div>
                <div className="ren-summary-item"><div className="s-label">Loyer propos&eacute;</div><div className="s-value">{demandeLoyer}</div></div>
                <div className="ren-summary-item"><div className="s-label">Loyer actuel</div><div className="s-value">{loyerActuel}</div></div>
              </div>
              {showMessageLocataire && (
                <div className="ren-message-box attente">
                  <h3>Message du locataire</h3>
                  <p>{messageLocataireTexte}</p>
                </div>
              )}
            </div>
            <div className="ren-section">
              <div className="ren-section-label">Ajuster le loyer (optionnel)</div>
              <div className="ren-form-group">
                <label htmlFor="loyerAjuste">Loyer final (&euro;/semaine)</label>
                <input type="number" id="loyerAjuste" step="1" min="1" value={loyerAjuste} onChange={(e) => setLoyerAjuste(e.target.value)} />
                <div className="ren-form-hint">Vous pouvez modifier le loyer avant d&rsquo;accepter</div>
              </div>
              <div className="ren-btn-group">
                <button className="ren-btn-primary" onClick={accepterRenouvellement}>Accepter le renouvellement</button>
                <button className="ren-btn-danger" onClick={() => setShowRefusField(!showRefusField)}>Refuser</button>
              </div>
              {showRefusField && (
                <div className="ren-refus-field visible">
                  <div className="ren-form-group" style={{ marginTop: 16 }}>
                    <label htmlFor="motifRefus">Motif du refus (optionnel)</label>
                    <textarea id="motifRefus" placeholder="Indiquez la raison de votre refus..." value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} />
                  </div>
                  <button className="ren-btn-danger" onClick={refuserRenouvellement} style={{ marginTop: 8 }}>Confirmer le refus</button>
                </div>
              )}
            </div>
          </div>
          <div className="card ren-actions-card">
            <Link to={retourHref} className="ren-btn-back">Retour au tableau de bord</Link>
            <div />
          </div>
        </>
      )}

      {/* STATE: ATTENTE */}
      {activeView === 'attente' && (
        <>
          <div className="card">
            <div className="renewal-header">
              <h2>Demande envoy&eacute;e</h2>
              <p>En attente de la r&eacute;ponse du propri&eacute;taire</p>
            </div>
            <div className="ren-section" style={{ textAlign: 'center' }}>
              <div className="ren-waiting-animation">
                <div className="ren-waiting-dots"><span /><span /><span /></div>
              </div>
              <span className="ren-status-badge ren-status-en-attente" style={{ fontSize: 14, padding: '8px 20px' }}>En attente de r&eacute;ponse</span>
            </div>
            <div className="ren-section">
              <div className="ren-section-label">R&eacute;sum&eacute; de votre demande</div>
              <div className="ren-summary-grid">
                <div className="ren-summary-item"><div className="s-label">Nouvelle p&eacute;riode</div><div className="s-value">{attentePeriode}</div></div>
                <div className="ren-summary-item"><div className="s-label">Dur&eacute;e</div><div className="s-value">{attenteDuree}</div></div>
                <div className="ren-summary-item"><div className="s-label">Loyer propos&eacute;</div><div className="s-value">{attenteLoyer}</div></div>
                <div className="ren-summary-item"><div className="s-label">Demand&eacute; le</div><div className="s-value">{attenteDate}</div></div>
              </div>
            </div>
          </div>
          <div className="card ren-actions-card">
            <Link to={retourHref} className="ren-btn-back">Retour</Link>
            <button className="ren-btn-secondary" onClick={annulerRenouvellement}>Annuler ma demande</button>
          </div>
        </>
      )}

      {/* STATE: ACCEPTE */}
      {activeView === 'accepte' && (
        <>
          <div className="card">
            <div className="renewal-header" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#127881;</div>
              <h2>Renouvellement accept&eacute; !</h2>
              <p>Le propri&eacute;taire a accept&eacute; votre demande de renouvellement</p>
            </div>
            <div className="ren-section">
              <div className="ren-section-label">Conditions du nouveau bail</div>
              <div className="ren-summary-grid">
                <div className="ren-summary-item"><div className="s-label">Nouvelle p&eacute;riode</div><div className="s-value">{acceptePeriode}</div></div>
                <div className="ren-summary-item"><div className="s-label">Dur&eacute;e</div><div className="s-value">{accepteDuree}</div></div>
                <div className="ren-summary-item"><div className="s-label">Loyer confirm&eacute;</div><div className="s-value">{accepteLoyer}</div></div>
                <div className="ren-summary-item"><div className="s-label">D&eacute;p&ocirc;t de garantie</div><div className="s-value">{accepteDepot}</div></div>
              </div>
              <div className="ren-message-box success">
                <h3>Prochaine &eacute;tape</h3>
                <p>Un nouveau contrat de location a &eacute;t&eacute; g&eacute;n&eacute;r&eacute;. Signez-le &eacute;lectroniquement pour finaliser votre renouvellement.</p>
              </div>
            </div>
          </div>
          <div className="card ren-actions-card">
            <Link to={retourHref} className="ren-btn-back">Retour</Link>
            <Link to={nouveauContratHref} className="ren-btn-primary" style={{ textDecoration: 'none' }}>Signer le nouveau contrat &rarr;</Link>
          </div>
        </>
      )}

      {/* STATE: REFUSE */}
      {activeView === 'refuse' && (
        <>
          <div className="card">
            <div className="renewal-header" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#128532;</div>
              <h2>Renouvellement refus&eacute;</h2>
              <p>Le propri&eacute;taire n&rsquo;a pas donn&eacute; suite &agrave; votre demande</p>
            </div>
            <div className="ren-section">
              {showMotifRefus && (
                <div className="ren-message-box refus">
                  <h3>Motif du refus</h3>
                  <p>{motifRefusTexte}</p>
                </div>
              )}
              <div className="ren-contrat-text">
                <p>Conform&eacute;ment &agrave; l&rsquo;article 25-7 de la loi du 6 juillet 1989, le propri&eacute;taire n&rsquo;est pas tenu de motiver son refus de renouvellement d&rsquo;un bail meubl&eacute; &eacute;tudiant.</p>
                <p>Votre bail actuel reste en vigueur jusqu&rsquo;&agrave; son terme. Vous pouvez rechercher un nouveau logement sur STERNY.</p>
              </div>
            </div>
          </div>
          <div className="card ren-actions-card">
            <Link to={retourHref} className="ren-btn-back">Retour</Link>
            <Link to="/recherche" className="ren-btn-primary" style={{ textDecoration: 'none' }}>Rechercher un logement</Link>
          </div>
        </>
      )}
    </div>
  )
}
