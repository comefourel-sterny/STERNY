import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './ProfilPage.css'

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function genStars(note) {
  const plein = Math.round(note)
  return '\u2605'.repeat(plein) + '\u2606'.repeat(5 - plein)
}

function calculerAge(dateNaissance) {
  const today = new Date()
  const birthDate = new Date(dateNaissance)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

function getCategoryLabels(typeUser) {
  if (typeUser === 'proprietaire' || typeUser === 'hote') {
    return { communication: 'Communication', categorie2: '\u00c9tat du logement', categorie3: 'Rapport qualit\u00e9-prix' }
  }
  return { communication: 'Communication', categorie2: 'Propret\u00e9', categorie3: 'Respect du logement' }
}

export default function ProfilPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [profileData, setProfileData] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null)
  const [avisList, setAvisList] = useState([])
  const [avisLoading, setAvisLoading] = useState(true)
  const [annonces, setAnnonces] = useState([])
  const [moyenneData, setMoyenneData] = useState(null)
  const [categoryAvgs, setCategoryAvgs] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  // Signal modal
  const [showSignalModal, setShowSignalModal] = useState(false)
  const [signalMotif, setSignalMotif] = useState('')
  const [signalDesc, setSignalDesc] = useState('')
  const [signalMsg, setSignalMsg] = useState(null)

  useEffect(() => {
    if (!user) return

    const init = async () => {
      const { data: adminCheck } = await supabaseClient.from('users').select('is_admin').eq('id', user.id).single()
      const isAdmin = adminCheck?.is_admin === true

      let userId = searchParams.get('user_id')

      if (!userId && isAdmin) {
        userId = user.id
      } else if (!userId) {
        alert('Utilisateur non sp\u00e9cifi\u00e9')
        navigate('/')
        return
      }

      if (userId === user.id && !isAdmin) {
        navigate('/profil/modifier')
        return
      }

      setProfileUserId(userId)
      setIsOwnProfile(userId === user.id)
    }

    init()
  }, [user, searchParams, navigate])

  useEffect(() => {
    if (!profileUserId) return

    const chargerProfil = async () => {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', profileUserId)
        .single()

      if (error || !data) {
        alert('Profil introuvable')
        navigate('/')
        return
      }

      setProfileData(data)

      // Annonces
      if (data.type_user === 'proprietaire' || data.type_user === 'hote') {
        const { data: annoncesData } = await supabaseClient
          .from('annonces')
          .select('id, titre, ville, type_logement, surface, prix_semaine, photos')
          .eq('proprietaire_id', profileUserId)
          .eq('statut', 'active')
        if (annoncesData && annoncesData.length > 0) setAnnonces(annoncesData)
      }

      // Moyenne
      const { data: avisData } = await supabaseClient
        .from('avis')
        .select('note, note_communication, note_categorie_2, note_categorie_3')
        .eq('profil_evalue_id', profileUserId)

      if (avisData && avisData.length > 0) {
        const moy = avisData.reduce((sum, a) => sum + a.note, 0) / avisData.length
        setMoyenneData({ moy: Math.round(moy * 10) / 10, count: avisData.length })

        const labels = getCategoryLabels(data.type_user)
        const catData = { communication: [], categorie2: [], categorie3: [] }
        for (const a of avisData) {
          if (a.note_communication) catData.communication.push(a.note_communication)
          if (a.note_categorie_2) catData.categorie2.push(a.note_categorie_2)
          if (a.note_categorie_3) catData.categorie3.push(a.note_categorie_3)
        }

        if (catData.communication.length > 0) {
          const avgs = {}
          for (const [key, label] of Object.entries(labels)) {
            const arr = catData[key]
            if (arr.length > 0) {
              const avg = arr.reduce((a, b) => a + b, 0) / arr.length
              avgs[key] = { label, avg: Math.round(avg * 10) / 10 }
            }
          }
          if (Object.keys(avgs).length > 0) setCategoryAvgs(avgs)
        }
      } else {
        setMoyenneData({ moy: 0, count: 0 })
      }
    }

    const chargerAvis = async () => {
      setAvisLoading(true)
      const { data } = await supabaseClient
        .from('avis')
        .select(`
          id, note, note_communication, note_categorie_2, note_categorie_3, commentaire, created_at,
          evaluateur: users!avis_evaluateur_id_fkey(id, prenom, nom, photo_profil_url)
        `)
        .eq('profil_evalue_id', profileUserId)
        .order('created_at', { ascending: false })

      setAvisList(data || [])
      setAvisLoading(false)
    }

    chargerProfil()
    chargerAvis()
  }, [profileUserId, navigate])

  const envoyerSignalement = async () => {
    if (!signalMotif) {
      setSignalMsg({ type: 'error', text: 'Choisis un motif.' })
      return
    }
    try {
      const { error } = await supabaseClient.from('signalements').insert({
        reporter_id: user.id,
        type: 'utilisateur',
        target_id: profileUserId,
        motif: signalMotif,
        description: signalDesc || null
      })
      if (error) throw error
      setSignalMsg({ type: 'success', text: 'Signalement envoy\u00e9. Merci !' })
      setTimeout(() => { setShowSignalModal(false); setSignalMsg(null) }, 1500)
    } catch (e) {
      console.error('Erreur signalement:', e)
      setSignalMsg({ type: 'error', text: "Erreur lors de l'envoi." })
    }
  }

  if (!profileData) {
    return <div className="profil-wrapper"><div className="loading">Chargement...</div></div>
  }

  const roleLabels = { locataire: 'Locataire', proprietaire: 'Propri\u00e9taire', hote: 'H\u00f4te' }
  const role = roleLabels[profileData.type_user] || ''
  let roleDetails = role
  if (profileData.date_naissance) {
    const age = calculerAge(profileData.date_naissance)
    roleDetails += roleDetails ? ` \u00b7 ${age} ans` : `${age} ans`
  }
  if (profileData.ville_origine) {
    roleDetails += roleDetails ? ` \u00b7 ${profileData.ville_origine}` : profileData.ville_origine
  }

  const initials = profileData.prenom && profileData.nom
    ? `${profileData.prenom[0]}${profileData.nom[0]}`
    : '?'

  return (
    <div className="profil-wrapper">
      <div className="profil-card">

        {/* En-t\u00eate */}
        <div className="profil-top">
          <div className="profil-avatar">
            {profileData.photo_profil_url ? (
              <img src={profileData.photo_profil_url} alt="Photo" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="profil-name">{profileData.prenom} {profileData.nom}</div>
          <div className="profil-role">{roleDetails}</div>
          <div className="profil-badge-row">
            {profileData.identite_verifiee === 'verifiee' && (
              <span className="badge-verifie">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
                Identit\u00e9 v\u00e9rifi\u00e9e
              </span>
            )}
            {profileData.identite_verifiee === 'documents_fournis' && (
              <span className="badge-documents">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                Documents fournis
              </span>
            )}
          </div>

          <div className="profil-rating" style={{ display: moyenneData ? 'flex' : 'none' }}>
            <span className="profil-stars">
              {moyenneData && moyenneData.count > 0 ? genStars(moyenneData.moy) : '\u2606\u2606\u2606\u2606\u2606'}
            </span>
            <span className="profil-rating-text">
              {moyenneData && moyenneData.count > 0
                ? `${moyenneData.moy}/5 \u2014 ${moyenneData.count} avis`
                : 'Aucun avis encore'}
            </span>
          </div>

          <div className="profil-actions">
            <Link to={`/conversation?user_id=${profileUserId}`} className="btn-action primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Envoyer un message
            </Link>
            <a href={`/avis?user_id=${profileUserId}`} className="btn-action">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Laisser un avis
            </a>
          </div>
        </div>

        {/* Badges confiance */}
        <div className="trust-badges">
          <div className="trust-badge verified">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            Email v\u00e9rifi\u00e9
          </div>
          {profileData.telephone && (
            <div className="trust-badge verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              T\u00e9l\u00e9phone v\u00e9rifi\u00e9
            </div>
          )}
          {profileData.identite_verifiee === 'verifiee' && (
            <div className="trust-badge verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
              Identit\u00e9 v\u00e9rifi\u00e9e
            </div>
          )}
        </div>

        {/* \u00c0 propos */}
        {profileData.description && (
          <div className="profil-section">
            <div className="profil-section-title">\u00c0 propos</div>
            <p className="about-text">{profileData.description}</p>
          </div>
        )}

        {/* Infos */}
        {(profileData.ecole || profileData.annee_etudes || profileData.rythme_alternance || profileData.ville_ecole || profileData.ville_entreprise) && (
          <div className="profil-section">
            <div className="profil-section-title">Informations</div>
            <div className="info-compact">
              {profileData.ecole && (
                <span className="info-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1 4 3 6 3s6-2 6-3v-5" /></svg>
                  {profileData.ecole}{profileData.filiere ? ` \u00b7 ${profileData.filiere}` : ''}
                </span>
              )}
              {profileData.annee_etudes && (
                <span className="info-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {profileData.annee_etudes}
                </span>
              )}
              {profileData.rythme_alternance && (
                <span className="info-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  {profileData.rythme_alternance}
                </span>
              )}
              {profileData.ville_ecole && (
                <span className="info-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {profileData.ville_ecole}
                </span>
              )}
              {profileData.ville_entreprise && (
                <span className="info-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                  {profileData.ville_entreprise}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Annonces */}
        {annonces.length > 0 && (
          <div className="profil-section">
            <div className="profil-section-title">Annonces</div>
            {annonces.map((a) => {
              const photo = a.photos && a.photos.length > 0 ? a.photos[0] : ''
              return (
                <Link key={a.id} to={`/logement?id=${a.id}`} className="annonce-mini">
                  {photo ? (
                    <img className="annonce-mini-photo" src={photo} alt={a.titre} loading="lazy" />
                  ) : (
                    <div className="annonce-mini-photo" />
                  )}
                  <div className="annonce-mini-info">
                    <div className="annonce-mini-titre">{a.titre}</div>
                    <div className="annonce-mini-detail">
                      {a.ville || ''}{a.type_logement ? ` \u00b7 ${a.type_logement}` : ''}{a.surface ? ` \u00b7 ${a.surface} m\u00b2` : ''}
                    </div>
                    <div className="annonce-mini-prix">{a.prix_semaine}\u20ac/sem</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Avis re\u00e7us */}
        <div className="profil-section">
          <div className="profil-section-title">Avis re\u00e7us</div>

          {categoryAvgs && (
            <div className="category-averages">
              {Object.values(categoryAvgs).map((cat) => (
                <div className="cat-avg-item" key={cat.label}>
                  <div className="cat-avg-label">{cat.label}</div>
                  <div className="cat-avg-stars">{genStars(cat.avg)}</div>
                  <div className="cat-avg-value">{cat.avg}/5</div>
                </div>
              ))}
            </div>
          )}

          {avisLoading ? (
            <div className="loading">Chargement des avis...</div>
          ) : avisList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{'\u2b50'}</div>
              <div className="empty-title">Pas encore d'avis</div>
              <div className="empty-text">Les premiers avis appara\u00eetront ici apr\u00e8s des s\u00e9jours.</div>
            </div>
          ) : (
            <div className="avis-list">
              {avisList.map((avis) => {
                const eval_ = avis.evaluateur
                const nom = eval_ ? `${eval_.prenom} ${eval_.nom}` : 'Utilisateur'
                const photo = eval_?.photo_profil_url
                const initials2 = eval_ ? `${eval_.prenom[0]}${eval_.nom[0]}` : '?'
                const date = new Date(avis.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                const stars = genStars(avis.note)
                const labels = profileData ? getCategoryLabels(profileData.type_user) : {}

                return (
                  <div className="avis-item" key={avis.id}>
                    <div className="avis-avatar">
                      {photo ? <img loading="lazy" src={photo} alt={nom} /> : initials2}
                    </div>
                    <div className="avis-content">
                      <div className="avis-header">
                        <span className="avis-name">{nom}</span>
                        <span className="avis-date">{date}</span>
                      </div>
                      <div className="avis-stars">{stars}</div>
                      {(avis.note_communication || avis.note_categorie_2 || avis.note_categorie_3) && (
                        <div className="avis-categories">
                          {avis.note_communication && <span className="avis-cat-tag">{labels.communication} {genStars(avis.note_communication)}</span>}
                          {avis.note_categorie_2 && <span className="avis-cat-tag">{labels.categorie2} {genStars(avis.note_categorie_2)}</span>}
                          {avis.note_categorie_3 && <span className="avis-cat-tag">{labels.categorie3} {genStars(avis.note_categorie_3)}</span>}
                        </div>
                      )}
                      {avis.commentaire && <div className="avis-comment">{avis.commentaire}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Signaler */}
        <div className="signaler-zone">
          {!isOwnProfile && profileUserId && (
            <button onClick={() => setShowSignalModal(true)}>Signaler cet utilisateur</button>
          )}
        </div>
      </div>

      {/* Modale signalement */}
      {showSignalModal && (
        <div className="signal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSignalModal(false) }}>
          <div className="signal-modal">
            <h3>Signaler cet utilisateur</h3>
            {signalMsg && (
              <div className="signal-msg" style={{
                background: signalMsg.type === 'error' ? 'rgba(232,98,42,0.08)' : '#D1FAE5',
                color: signalMsg.type === 'error' ? '#E8622A' : '#065F46'
              }}>
                {signalMsg.text}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 5 }}>Motif</label>
              <select value={signalMotif} onChange={(e) => setSignalMotif(e.target.value)}>
                <option value="">-- Choisir un motif --</option>
                <option value="faux_profil">Faux profil</option>
                <option value="comportement_suspect">Comportement suspect</option>
                <option value="harcelement">Harc\u00e8lement</option>
                <option value="arnaque">Tentative d'arnaque</option>
                <option value="discrimination">Discrimination</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 5 }}>Description (optionnel)</label>
              <textarea value={signalDesc} onChange={(e) => setSignalDesc(e.target.value)} rows="3" placeholder="D\u00e9cris le probl\u00e8me..." />
            </div>
            <div className="signal-modal-actions">
              <button className="signal-cancel-btn" onClick={() => setShowSignalModal(false)}>Annuler</button>
              <button className="signal-submit-btn" onClick={envoyerSignalement}>Signaler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
