import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './MatchConfirmationPage.css'

export default function MatchConfirmationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const matchId = searchParams.get('match_id')

  const [annonce, setAnnonce] = useState({ titre: 'Chargement...', tags: [], thumb: null })
  const [details, setDetails] = useState({ ville: '\u2014', prix: '\u2014', debut: '\u2014', fin: '\u2014' })
  const [participants, setParticipants] = useState([
    { name: 'Chargement...', role: 'Locataire', email: '', tel: '', avatarClass: 'p1' },
    { name: 'Chargement...', role: 'Proprietaire', email: '', tel: '', avatarClass: 'p2' },
  ])
  const [ownerNote, setOwnerNote] = useState(null)
  const [continuerHref, setContinuerHref] = useState('/dossier-locataire')

  useEffect(() => {
    async function chargerMatch() {
      if (!user) return

      const { data: adminCheck } = await supabaseClient.from('users').select('is_admin').eq('id', user.id).single()
      const isAdmin = adminCheck?.is_admin === true

      if (!matchId) {
        // Mode demo
        setParticipants([
          { name: 'Lucas Martin', role: 'Etudiant', email: 'lucas@exemple.com', tel: '07 98 76 54 32', avatarClass: 'p1' },
          { name: 'Emma Lefevre', role: 'Etudiant', email: 'emma@exemple.com', tel: '06 45 67 89 01', avatarClass: 'p2' },
        ])
        setOwnerNote('Marie Dupont')
        setAnnonce({ titre: 'Chambre lumineuse centre Lyon', tags: ['Lyon', 'Chambre', '14 m\u00b2', '95 \u20ac/sem'], thumb: null })
        setDetails({ ville: 'Lyon', prix: '95 \u20ac/sem', debut: '01/09/2026', fin: '30/06/2027' })
        setContinuerHref('/dossier-locataire')
        return
      }

      try {
        const { data: candidature, error } = await supabaseClient
          .from('candidatures')
          .select('id, annonce_id, locataire_id, statut, created_at, annonces (id, titre, ville, prix, user_id, date_debut, date_fin, photos, type_logement, surface), users!candidatures_locataire_id_fkey (id, nom, prenom, email, telephone)')
          .eq('id', matchId)
          .single()

        if (error) throw error
        if (!candidature || candidature.statut !== 'acceptee') {
          alert("Ce match n'est pas valide ou n'a pas ete accepte")
          navigate('/dashboard/locataire')
          return
        }

        const isLocataire = user.id === candidature.locataire_id
        const isProprietaire = user.id === candidature.annonces?.user_id
        if (!isLocataire && !isProprietaire && !isAdmin) {
          alert('Acces non autorise a ce match.')
          navigate('/')
          return
        }

        const { data: proprietaire } = await supabaseClient
          .from('users')
          .select('id, nom, prenom, email, telephone')
          .eq('id', candidature.annonces.user_id)
          .single()

        const loc = candidature.users
        const ann = candidature.annonces

        const { data: propProfile } = await supabaseClient.from('users').select('type_user').eq('id', proprietaire.id).single()
        const propEstHote = propProfile?.type_user === 'hote'

        if (propEstHote) {
          setParticipants([
            { name: `${loc.prenom} ${loc.nom}`, role: 'Locataire temporaire', email: loc.email, tel: loc.telephone, avatarClass: 'p1' },
            { name: `${proprietaire.prenom} ${proprietaire.nom}`, role: 'Alternant hote', email: proprietaire.email, tel: proprietaire.telephone, avatarClass: 'p2' },
          ])
          setOwnerNote(`${proprietaire.prenom} ${proprietaire.nom}`)
        } else {
          setParticipants([
            { name: `${loc.prenom} ${loc.nom}`, role: 'Locataire', email: loc.email, tel: loc.telephone, avatarClass: 'p1' },
            { name: `${proprietaire.prenom} ${proprietaire.nom}`, role: 'Proprietaire', email: proprietaire.email, tel: proprietaire.telephone, avatarClass: 'p2' },
          ])
        }

        const tags = []
        if (ann.ville) tags.push(ann.ville)
        if (ann.type_logement) tags.push(ann.type_logement)
        if (ann.surface) tags.push(ann.surface + ' m\u00b2')
        if (ann.prix) tags.push(ann.prix + ' \u20ac/sem')
        setAnnonce({ titre: ann.titre || 'Annonce', tags, thumb: ann.photos?.[0] || null })
        setDetails({
          ville: ann.ville || '\u2014',
          prix: ann.prix ? `${ann.prix} \u20ac/sem` : '\u2014',
          debut: ann.date_debut || '\u2014',
          fin: ann.date_fin || '\u2014',
        })
        setContinuerHref(`/dossier-locataire?match_id=${matchId}`)
      } catch (error) {
        console.error('Erreur chargement match:', error)
      }
    }

    chargerMatch()
  }, [user, matchId, navigate])

  const userIcon = <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>

  return (
    <div className="match-confirm-page">
      {/* HERO */}
      <div className="match-confirm-hero">
        <div className="hero-badge">
          <div className="hero-badge-dot">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <span>Match confirme</span>
        </div>
        <h1>Votre logement est trouve !</h1>
        <p>Vous pouvez maintenant lancer les demarches de location.</p>
      </div>

      <div className="mc-page-container">
        {/* Annonce Card */}
        <div className="mc-card">
          <div className="mc-card-section">
            <div className="annonce-row">
              <div className="annonce-thumb" style={annonce.thumb ? { backgroundImage: `url(${annonce.thumb})` } : {}}></div>
              <div>
                <div className="annonce-title">{annonce.titre}</div>
                <div className="annonce-tags">
                  {annonce.tags.map((t, i) => <span key={i} className="annonce-tag">{t}</span>)}
                </div>
              </div>
            </div>
          </div>
          <div className="mc-card-section">
            <div className="details-row">
              <div className="detail-col">
                <div className="detail-col-label">Ville</div>
                <div className="detail-col-value">{details.ville}</div>
              </div>
              <div className="detail-col">
                <div className="detail-col-label">Loyer / sem</div>
                <div className="detail-col-value accent">{details.prix}</div>
              </div>
              <div className="detail-col">
                <div className="detail-col-label">Debut</div>
                <div className="detail-col-value">{details.debut}</div>
              </div>
              <div className="detail-col">
                <div className="detail-col-label">Fin</div>
                <div className="detail-col-value">{details.fin}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Card */}
        <div className="mc-card">
          <div className="mc-card-section">
            <div className="mc-card-label">Participants</div>
            <div className="participants-list">
              {participants.map((p, i) => (
                <div key={i} className="participant-row">
                  <div className={`participant-avatar ${p.avatarClass}`}>{userIcon}</div>
                  <div className="participant-main">
                    <div className="participant-name">{p.name}</div>
                    <div className="participant-role-tag">{p.role}</div>
                  </div>
                  <div className="participant-contact-inline">
                    {p.email && (
                      <div className="contact-item">
                        <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <span>{p.email}</span>
                      </div>
                    )}
                    {p.tel && (
                      <div className="contact-item">
                        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        <span>{p.tel || 'Non renseigne'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {ownerNote && (
              <div className="owner-note">
                <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: '#22C55E', fill: 'none', strokeWidth: 2 }}>
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Logement appartenant a <strong>{ownerNote}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mc-info-line">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <span>Confirmation envoyee par email &mdash; conservez-le precieusement.</span>
        </div>

        {/* Actions */}
        <div className="mc-actions-row">
          <button className="mc-btn mc-btn-secondary" onClick={() => navigate('/messages')}>
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Envoyer un message
          </button>
          <Link to={continuerHref} className="mc-btn mc-btn-orange">
            Continuer les demarches
            <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
