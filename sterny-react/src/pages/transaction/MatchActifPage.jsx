import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './MatchActifPage.css'

export default function MatchActifPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const matchId = searchParams.get('match_id')

  const [logement, setLogement] = useState({ adresse: 'Chargement...', ville: 'Chargement...', surface: '--m\u00b2', prix: '275\u20ac' })
  const [contact, setContact] = useState({ nom: 'Chargement...', role: 'Proprietaire', initiales: '' })
  const [dates, setDates] = useState({ debut: '01/03/2026', fin: '31/08/2026', joursRestants: '--' })
  const [showAlert, setShowAlert] = useState(false)
  const [showResiliation, setShowResiliation] = useState(false)
  const [showLitige, setShowLitige] = useState(false)
  const [motifResiliation, setMotifResiliation] = useState('')
  const [commentaireResiliation, setCommentaireResiliation] = useState('')
  const [categorieLitige, setCategorieLitige] = useState('')
  const [descriptionLitige, setDescriptionLitige] = useState('')
  const [litigeSelectOpen, setLitigeSelectOpen] = useState(false)
  const [resiliationSelectOpen, setResiliationSelectOpen] = useState(false)
  const [showGererRIB, setShowGererRIB] = useState(false)

  useEffect(() => {
    if (!matchId) {
      setLogement({ adresse: '12 rue de la Paix', ville: 'Paris', surface: '25m\u00b2', prix: '95\u20ac/sem' })
      setContact({ nom: 'Jean Dupont', role: 'Proprietaire', initiales: 'JD' })
      setDates({ debut: '01/03/2026', fin: '31/08/2026', joursRestants: '152' })
      return
    }

    async function chargerMatch() {
      if (!user) { navigate('/connexion'); return }

      try {
        const { data: candidature, error } = await supabaseClient
          .from('candidatures')
          .select('*, annonces (*), users!candidatures_locataire_id_fkey (*)')
          .eq('id', matchId).single()
        if (error) throw error

        const { data: proprietaire } = await supabaseClient
          .from('users').select('*').eq('id', candidature.annonces.user_id).single()

        const { data: contrat } = await supabaseClient
          .from('contrats').select('*').eq('candidature_id', matchId).single()

        const annonce = candidature.annonces
        setLogement({ adresse: annonce.adresse || 'Adresse', ville: annonce.ville || 'Ville', surface: (annonce.surface || '--') + 'm\u00b2', prix: annonce.prix + '\u20ac/sem' })

        const isLocataire = user.id === candidature.locataire_id
        const contactPerson = isLocataire ? proprietaire : candidature.users
        const initiales = ((contactPerson.prenom || '')[0] + (contactPerson.nom || '')[0]).toUpperCase()
        setContact({ nom: `${contactPerson.prenom} ${contactPerson.nom}`, role: isLocataire ? 'Proprietaire' : 'Locataire', initiales })

        if (contrat) {
          const d = contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : '01/03/2026'
          const f = contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : '31/08/2026'
          const now = new Date(); now.setHours(0,0,0,0)
          const fin = new Date(contrat.date_fin)
          const jours = Math.max(0, Math.ceil((fin.getTime() - now.getTime()) / (1000*60*60*24)))
          setDates({ debut: d, fin: f, joursRestants: String(jours) })
          if (jours <= 14) setShowAlert(true)
          if (user.id === candidature.locataire_id && contrat.stripe_customer_id) setShowGererRIB(true)
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    chargerMatch()
  }, [user, matchId, navigate])

  function telechargerDocument(type) {
    alert('Telechargement de document\n\nCette fonctionnalite sera bientot disponible.\nType: ' + type)
  }

  async function envoyerLitige() {
    if (!categorieLitige || descriptionLitige.trim().length < 10) return
    try {
      if (matchId && user) {
        await supabaseClient.from('litiges').insert({
          match_id: matchId, demandeur_id: user.id, categorie: categorieLitige, description: descriptionLitige, statut: 'ouvert'
        })
      }
      alert('Votre signalement a bien ete enregistre.')
      setShowLitige(false); setCategorieLitige(''); setDescriptionLitige('')
    } catch (error) {
      console.error('Erreur litige:', error)
      alert('Une erreur est survenue.')
    }
  }

  async function confirmerResiliation() {
    if (!motifResiliation) return
    if (!confirm('Etes-vous sur de vouloir resilier ce contrat ?')) return
    try {
      if (matchId) {
        await supabaseClient.from('candidatures').update({ statut: 'resilie', motif_resiliation: motifResiliation, commentaire_resiliation: commentaireResiliation, date_resiliation: new Date().toISOString() }).eq('id', matchId)
        await supabaseClient.from('contrats').update({ statut: 'resilie', date_resiliation: new Date().toISOString() }).eq('candidature_id', matchId)
      }
      alert('Votre demande de resiliation a ete enregistree.')
      setShowResiliation(false)
      navigate('/dashboard')
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const litigeCategories = [
    { value: 'logement_non_conforme', label: "Logement non conforme a l'annonce" },
    { value: 'equipement_defectueux', label: 'Equipement defectueux ou manquant' },
    { value: 'nuisances', label: 'Nuisances (bruit, voisinage...)' },
    { value: 'probleme_paiement', label: 'Probleme de paiement' },
    { value: 'comportement', label: 'Comportement inapproprie' },
    { value: 'securite', label: 'Probleme de securite' },
    { value: 'autre', label: 'Autre' },
  ]

  const resiliationMotifs = [
    { value: 'fin_alternance', label: 'Fin de mon alternance' },
    { value: 'changement_ville', label: 'Changement de ville' },
    { value: 'logement_non_conforme', label: 'Logement non conforme' },
    { value: 'probleme_proprietaire', label: 'Probleme avec le proprietaire' },
    { value: 'raison_personnelle', label: 'Raison personnelle' },
    { value: 'autre', label: 'Autre' },
  ]

  return (
    <div>
      {/* HERO */}
      <div className="match-hero">
        <div className="ma-hero-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          Logement actif
        </div>
        <h1>Votre logement est actif</h1>
        <p>Toutes les demarches sont terminees. Profitez de votre logement en toute serenite.</p>
        <div className="status-pills">
          <div className="status-pill">
            <span className="status-pill-label">Debut</span>
            <span className="status-pill-value">{dates.debut}</span>
          </div>
          <div className="status-pill">
            <span className="status-pill-label">Fin</span>
            <span className="status-pill-value">{dates.fin}</span>
          </div>
          <div className="status-pill">
            <span className="status-pill-label">Restant</span>
            <span className="status-pill-value">{dates.joursRestants} jours</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="ma-dashboard-container">
        {/* Alert */}
        {showAlert && (
          <div className="ma-alert-section">
            <div className="ma-alert-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </div>
            <div>
              <div className="ma-alert-title">Rappel : Etat des lieux de sortie</div>
              <div className="ma-alert-text">Votre contrat se termine bientot. N&apos;oubliez pas de planifier l&apos;etat des lieux de sortie avec le proprietaire au moins 2 semaines avant votre depart.</div>
            </div>
          </div>
        )}

        {/* LOGEMENT */}
        <div className="ma-section">
          <div className="ma-section-header">
            <div className="ma-section-title">
              <div className="ma-section-icon orange"><svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
              Votre logement
            </div>
            <div className="ma-section-description">Informations sur votre logement actuel</div>
          </div>
          <div className="ma-detail-grid">
            <div className="ma-detail-item"><span className="ma-detail-label">Adresse</span><span className="ma-detail-value">{logement.adresse}</span></div>
            <div className="ma-detail-item"><span className="ma-detail-label">Ville</span><span className="ma-detail-value">{logement.ville}</span></div>
            <div className="ma-detail-item"><span className="ma-detail-label">Surface</span><span className="ma-detail-value">{logement.surface}</span></div>
            <div className="ma-detail-item"><span className="ma-detail-label">Loyer hebdomadaire</span><span className="ma-detail-value" style={{ color: '#E8622A' }}>{logement.prix}</span></div>
          </div>
        </div>

        {/* CONTACT */}
        <div className="ma-section">
          <div className="ma-section-header">
            <div className="ma-section-title">
              <div className="ma-section-icon navy"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
              Votre {contact.role.toLowerCase()}
            </div>
          </div>
          <div className="ma-contact-row">
            <div className="ma-contact-avatar">{contact.initiales}</div>
            <div className="ma-contact-info-col">
              <div className="ma-contact-name">{contact.nom}</div>
              <div className="ma-contact-role">{contact.role}</div>
            </div>
            <Link to="/messages" className="ma-btn-contact">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Message
            </Link>
          </div>
        </div>

        {/* DOCUMENTS */}
        <div className="ma-section">
          <div className="ma-section-header">
            <div className="ma-section-title">
              <div className="ma-section-icon orange"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
              Documents
            </div>
            <div className="ma-section-description">Contrat, etat des lieux et quittances</div>
          </div>
          {['Contrat de location', "Etat des lieux d'entree", 'Quittances de loyer'].map((doc, i) => (
            <div key={i} className="ma-document-item" onClick={() => telechargerDocument(['contrat', 'etat-lieux', 'quittances'][i])}>
              <div className="ma-document-info">
                <div className="ma-document-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <span className="ma-document-name">{doc}</span>
              </div>
              <span className="ma-document-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </span>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="ma-section">
          <div className="ma-section-header">
            <div className="ma-section-title">
              <div className="ma-section-icon navy"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></div>
              Actions
            </div>
            <div className="ma-section-description">Gerez votre sejour et vos demarches</div>
          </div>
          <div className="ma-actions-grid">
            <button className="ma-action-btn" onClick={() => setShowLitige(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              Signaler un probleme
            </button>
            <button className="ma-action-btn" onClick={() => { if (matchId) navigate(`/logement?id=${matchId}`) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              Voir l&apos;annonce
            </button>
            {showGererRIB && (
              <button className="ma-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                Gerer mon RIB
              </button>
            )}
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="ma-danger-zone">
          <div className="ma-danger-zone-label">Zone dangereuse</div>
          <button className="ma-danger-zone-btn" onClick={() => setShowResiliation(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Resilier le contrat
          </button>
        </div>
      </div>

      {/* MODAL LITIGE */}
      <div className={`ma-modal-overlay ${showLitige ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setShowLitige(false) }}>
        <div className="ma-modal">
          <h3>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Signaler un probleme
          </h3>
          <p className="ma-modal-subtitle">Decrivez le probleme rencontre.</p>

          <label>Categorie du probleme *</label>
          <div className={`ma-custom-select ${litigeSelectOpen ? 'open' : ''}`}>
            <div className={`ma-custom-select-trigger ${categorieLitige ? 'has-value' : ''}`} onClick={() => setLitigeSelectOpen(!litigeSelectOpen)}>
              <span>{categorieLitige ? litigeCategories.find(c => c.value === categorieLitige)?.label : 'Choisir une categorie'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            <div className="ma-custom-select-options">
              {litigeCategories.map(c => (
                <div key={c.value} className={`ma-custom-select-option ${categorieLitige === c.value ? 'selected' : ''}`} onClick={() => { setCategorieLitige(c.value); setLitigeSelectOpen(false) }}>{c.label}</div>
              ))}
            </div>
          </div>

          <label htmlFor="descLitige">Description detaillee *</label>
          <textarea id="descLitige" rows="5" placeholder="Decrivez le probleme..." value={descriptionLitige} onChange={(e) => setDescriptionLitige(e.target.value)} />

          <div className="ma-modal-actions">
            <button className="ma-btn-confirm" disabled={!categorieLitige || descriptionLitige.trim().length < 10} onClick={envoyerLitige}>Envoyer le signalement</button>
            <button className="ma-btn-cancel" onClick={() => { setShowLitige(false); setCategorieLitige(''); setDescriptionLitige('') }}>Annuler</button>
          </div>
        </div>
      </div>

      {/* MODAL RESILIATION */}
      <div className={`ma-modal-overlay ${showResiliation ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setShowResiliation(false) }}>
        <div className="ma-modal">
          <div className="ma-modal-header">
            <h3>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              Resilier le contrat
            </h3>
            <p className="ma-modal-subtitle">Confirmez votre demande de resiliation</p>
          </div>

          <div className="ma-info-box">
            <strong style={{ color: '#FF6B6B' }}>Important :</strong> En cas de resiliation anticipee, des frais peuvent s&apos;appliquer. La resiliation sera envoyee a l&apos;autre partie pour validation.
          </div>

          <label>Motif de la resiliation *</label>
          <div className={`ma-custom-select ${resiliationSelectOpen ? 'open' : ''}`}>
            <div className={`ma-custom-select-trigger ${motifResiliation ? 'has-value' : ''}`} onClick={() => setResiliationSelectOpen(!resiliationSelectOpen)}>
              <span>{motifResiliation ? resiliationMotifs.find(m => m.value === motifResiliation)?.label : 'Choisir un motif'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            <div className="ma-custom-select-options">
              {resiliationMotifs.map(m => (
                <div key={m.value} className={`ma-custom-select-option ${motifResiliation === m.value ? 'selected' : ''}`} onClick={() => { setMotifResiliation(m.value); setResiliationSelectOpen(false) }}>{m.label}</div>
              ))}
            </div>
          </div>

          <label htmlFor="commentaireResiliation">Commentaire (optionnel)</label>
          <textarea id="commentaireResiliation" rows="3" placeholder="Expliquez brievement votre situation (optionnel)" value={commentaireResiliation} onChange={(e) => setCommentaireResiliation(e.target.value)} />

          <div className="ma-modal-actions">
            <button className="ma-btn-confirm" style={{ background: '#1E293B' }} disabled={!motifResiliation} onClick={confirmerResiliation}>Confirmer la resiliation</button>
            <button className="ma-btn-cancel" onClick={() => { setShowResiliation(false); setMotifResiliation(''); setCommentaireResiliation('') }}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  )
}
