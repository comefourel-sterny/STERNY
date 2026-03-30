import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabaseClient } from '../../config/supabase';
import './AvisPage.css';

const starSvgPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function genStars(note) {
  const plein = Math.round(note);
  return '\u2605'.repeat(plein) + '\u2606'.repeat(5 - plein);
}

function getCategoryLabels(typeUser) {
  if (typeUser === 'proprietaire' || typeUser === 'hote') {
    return {
      communication: 'Communication',
      categorie2: '\u00C9tat du logement',
      categorie3: 'Rapport qualit\u00E9-prix',
    };
  }
  return {
    communication: 'Communication',
    categorie2: 'Propret\u00E9',
    categorie3: 'Respect du logement',
  };
}

function CategoryStars({ category, value, onSelect, onHover, hoveredValue }) {
  return (
    <div className="category-stars" data-category={category}>
      {[1, 2, 3, 4, 5].map((i) => {
        const isActive = hoveredValue != null ? i <= hoveredValue : i <= value;
        return (
          <button
            key={i}
            className={`cat-star-btn${isActive ? ' active' : ''}`}
            onClick={() => onSelect(category, i)}
            onMouseEnter={() => onHover(category, i)}
            onMouseLeave={() => onHover(category, null)}
            type="button"
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d={starSvgPath} /></svg>
          </button>
        );
      })}
    </div>
  );
}

export default function AvisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetTypeUser, setTargetTypeUser] = useState('locataire');

  // Profile hero state
  const [heroName, setHeroName] = useState('Chargement...');
  const [heroSchool, setHeroSchool] = useState('...');
  const [heroPhotoUrl, setHeroPhotoUrl] = useState(null);
  const [heroInitials, setHeroInitials] = useState('?');
  const [heroStarsText, setHeroStarsText] = useState('\u2606\u2606\u2606\u2606\u2606');
  const [heroRatingText, setHeroRatingText] = useState('Aucun avis');
  const [heroRatingVisible, setHeroRatingVisible] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('donner');
  const [showDonnerTab, setShowDonnerTab] = useState(true);

  // Form state
  const [annonces, setAnnonces] = useState([]);
  const [selectedAnnonce, setSelectedAnnonce] = useState('');
  const [categoryNotes, setCategoryNotes] = useState({ communication: 0, categorie2: 0, categorie3: 0 });
  const [hoveredStars, setHoveredStars] = useState({});
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  // Avis list
  const [avisList, setAvisList] = useState([]);
  const [avisLoading, setAvisLoading] = useState(false);

  // Computed global note
  const allRated = Object.values(categoryNotes).every((n) => n > 0);
  const globalNote = allRated
    ? Object.values(categoryNotes).reduce((a, b) => a + b, 0) / 3
    : 0;
  const noteSelectionnee = allRated ? Math.round(globalNote) : 0;

  const chargerMoyenne = useCallback(async (userId) => {
    const { data } = await supabaseClient
      .from('avis')
      .select('note')
      .eq('profil_evalue_id', userId);

    setHeroRatingVisible(true);
    if (data && data.length > 0) {
      const moy = data.reduce((sum, a) => sum + a.note, 0) / data.length;
      const moyArrondi = Math.round(moy * 10) / 10;
      setHeroStarsText(genStars(moy));
      setHeroRatingText(`${moyArrondi}/5 \u2014 ${data.length} avis`);
    } else {
      setHeroStarsText('\u2606\u2606\u2606\u2606\u2606');
      setHeroRatingText('Aucun avis encore');
    }
  }, []);

  // Init
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        navigate('/connexion');
        return;
      }
      setCurrentUser(user);

      let tuid = searchParams.get('user_id') || user.id;
      setTargetUserId(tuid);

      // Load profile
      const { data: profileData } = await supabaseClient
        .from('users')
        .select('prenom, nom, ecole, annee_etudes, photo_profil_url, type_user')
        .eq('id', tuid)
        .single();

      if (profileData) {
        setTargetTypeUser(profileData.type_user || 'locataire');
        setHeroName(`${profileData.prenom} ${profileData.nom}`);
        setHeroSchool(profileData.ecole ? `${profileData.ecole} \u2014 ${profileData.annee_etudes || ''}` : '');

        if (profileData.photo_profil_url) {
          setHeroPhotoUrl(profileData.photo_profil_url);
        } else {
          setHeroInitials(`${profileData.prenom[0]}${profileData.nom[0]}`);
        }
      }

      await chargerMoyenne(tuid);

      // Load annonces
      const { data: annoncesData } = await supabaseClient
        .from('annonces')
        .select('id, titre, ville')
        .eq('user_id', tuid)
        .order('created_at', { ascending: false });

      setAnnonces(annoncesData || []);

      // If same user, hide "donner" tab
      if (tuid === user.id) {
        setShowDonnerTab(false);
        setActiveTab('voir');
      }
    })();
  }, [searchParams, navigate, chargerMoyenne]);

  // Load avis when "voir" tab is active
  useEffect(() => {
    if (activeTab !== 'voir' || !targetUserId) return;

    (async () => {
      setAvisLoading(true);
      const { data } = await supabaseClient
        .from('avis')
        .select(`
          id, note, note_communication, note_categorie_2, note_categorie_3, commentaire, created_at, annonce_id,
          evaluateur: users!avis_evaluateur_id_fkey(id, prenom, nom, photo_profil_url)
        `)
        .eq('profil_evalue_id', targetUserId)
        .order('created_at', { ascending: false });

      setAvisList(data || []);
      setAvisLoading(false);
    })();
  }, [activeTab, targetUserId]);

  const handleCategorySelect = (cat, value) => {
    setCategoryNotes((prev) => ({ ...prev, [cat]: value }));
  };

  const handleHover = (cat, value) => {
    setHoveredStars((prev) => ({ ...prev, [cat]: value }));
  };

  const handleSubmit = async () => {
    if (noteSelectionnee === 0 || !currentUser) return;

    setSubmitting(true);

    const payload = {
      evaluateur_id: currentUser.id,
      profil_evalue_id: targetUserId,
      note: noteSelectionnee,
      note_communication: categoryNotes.communication || null,
      note_categorie_2: categoryNotes.categorie2 || null,
      note_categorie_3: categoryNotes.categorie3 || null,
      commentaire: commentaire.trim() || null,
    };
    if (selectedAnnonce) payload.annonce_id = selectedAnnonce;

    const { error } = await supabaseClient.from('avis').insert(payload);

    if (error) {
      console.error('Erreur insertion avis:', error);
      setSubmitting(false);
      alert("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }

    setSuccessVisible(true);

    setTimeout(() => {
      setCategoryNotes({ communication: 0, categorie2: 0, categorie3: 0 });
      setCommentaire('');
      setSelectedAnnonce('');
      setSubmitting(false);
      setSuccessVisible(false);
      chargerMoyenne(targetUserId);
    }, 2500);
  };

  const labels = getCategoryLabels(targetTypeUser);

  return (
    <div className="avis-page">
      {/* HEADER */}
      <div className="dashboard-header">
        <div className="container">
          <Link to="/" className="header-logo">STERNY</Link>
          <div className="header-actions">
            <button className="btn-logout" onClick={() => navigate(-1)}>&larr; Retour</button>
          </div>
        </div>
      </div>

      {/* BARRE PROFIL */}
      <div className="profile-hero">
        <div className="container">
          <div className="profile-photo">
            {heroPhotoUrl ? (
              <img src={heroPhotoUrl} alt="Photo" />
            ) : (
              <div className="initials">{heroInitials}</div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">{heroName}</div>
            <div className="profile-details">{heroSchool}</div>
            {heroRatingVisible && (
              <div className="hero-rating">
                <span className="hero-stars">{heroStarsText}</span>
                <span className="hero-rating-text">{heroRatingText}</span>
              </div>
            )}
          </div>
          <div className="profile-actions">
            <button className="btn-profile" onClick={() => navigate(-1)}>&larr; Retour</button>
            <Link to={`/profil?user_id=${targetUserId || ''}`} className="btn-profile">Voir le profil</Link>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="content-section">
        {/* TABS */}
        <div className="tabs">
          {showDonnerTab && (
            <button
              className={`tab-btn${activeTab === 'donner' ? ' active' : ''}`}
              onClick={() => setActiveTab('donner')}
            >
              Laisser un avis
            </button>
          )}
          <button
            className={`tab-btn${activeTab === 'voir' ? ' active' : ''}`}
            onClick={() => setActiveTab('voir')}
          >
            Avis re&ccedil;us
          </button>
        </div>

        {/* PANEL : DONNER UN AVIS */}
        {activeTab === 'donner' && (
          <div>
            <div className="avis-card">
              <div className="avis-card-header">
                <h3>Laisser un avis</h3>
                <p>&Eacute;value ton exp&eacute;rience de colocation</p>
              </div>

              <div className="avis-card-body">
                {/* SECTION 1 : ANNONCE */}
                <div className="form-section">
                  <div className="section-title">
                    <span className="section-title-icon">&#x1F3E0;</span>
                    Annonce concern&eacute;e
                  </div>
                  <select
                    className="field-select"
                    value={selectedAnnonce}
                    onChange={(e) => setSelectedAnnonce(e.target.value)}
                  >
                    <option value="">S&eacute;lectionnez une annonce</option>
                    {annonces.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.titre} &mdash; {a.ville || ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SECTION 2 : NOTES PAR CATEGORIE */}
                <div className="form-section">
                  <div className="section-title">
                    <span className="section-title-icon">&#x2B50;</span>
                    Tes notes
                  </div>
                  <div className="category-ratings">
                    {Object.entries(labels).map(([key, label]) => (
                      <div className="category-row" key={key}>
                        <span className="category-label">{label}</span>
                        <CategoryStars
                          category={key}
                          value={categoryNotes[key]}
                          onSelect={handleCategorySelect}
                          onHover={handleHover}
                          hoveredValue={hoveredStars[key]}
                        />
                      </div>
                    ))}
                  </div>
                  {allRated && (
                    <div className="note-global-preview">
                      Note globale : <strong>{(Math.round(globalNote * 10) / 10).toString()}</strong>/5
                    </div>
                  )}
                </div>

                {/* SECTION 3 : COMMENTAIRE */}
                <div className="form-section">
                  <div className="section-title">
                    <span className="section-title-icon">&#x1F4AC;</span>
                    Ton commentaire
                  </div>
                  <textarea
                    className="field-textarea"
                    placeholder="D&eacute;cris ton exp&eacute;rience (propret&eacute;, ambiance, communication...)"
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                  />
                </div>

                {/* BOUTON SUBMIT */}
                <button
                  className="btn-primary btn-submit-full"
                  onClick={handleSubmit}
                  disabled={!allRated || submitting}
                >
                  {submitting
                    ? (successVisible ? 'Avis envoy\u00E9' : 'Envoi en cours...')
                    : 'Envoyer mon avis'}
                </button>
                {successVisible && (
                  <div className="success-msg show">
                    Ton avis a bien &eacute;t&eacute; enregistr&eacute; !
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANEL : VOIR LES AVIS */}
        {activeTab === 'voir' && (
          <div className="avis-list">
            {avisLoading ? (
              <div className="loading">Chargement des avis...</div>
            ) : avisList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#x2B50;</div>
                <div className="empty-title">Pas encore d'avis</div>
                <div className="empty-text">Les premiers avis appara&icirc;tront ici apr&egrave;s des s&eacute;jours.</div>
              </div>
            ) : (
              avisList.map((avis) => {
                const eval_ = avis.evaluateur;
                const nom = eval_ ? `${eval_.prenom} ${eval_.nom}` : 'Utilisateur';
                const photo = eval_?.photo_profil_url;
                const initials = eval_ ? `${eval_.prenom[0]}${eval_.nom[0]}` : '?';
                const date = new Date(avis.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
                const stars = genStars(avis.note);

                const hasCatNotes = avis.note_communication || avis.note_categorie_2 || avis.note_categorie_3;

                return (
                  <div className="avis-item" key={avis.id}>
                    <div className="avis-avatar">
                      {photo ? (
                        <img loading="lazy" src={photo} alt={nom} />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="avis-content">
                      <div className="avis-header">
                        <span className="avis-name">{nom}</span>
                        <span className="avis-date">{date}</span>
                      </div>
                      <div className="avis-stars">{stars}</div>
                      {hasCatNotes && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {avis.note_communication && (
                            <span style={{ fontSize: '12px', color: '#6B7280', background: '#F4F5F7', padding: '3px 8px', borderRadius: '6px' }}>
                              {labels.communication} {genStars(avis.note_communication)}
                            </span>
                          )}
                          {avis.note_categorie_2 && (
                            <span style={{ fontSize: '12px', color: '#6B7280', background: '#F4F5F7', padding: '3px 8px', borderRadius: '6px' }}>
                              {labels.categorie2} {genStars(avis.note_categorie_2)}
                            </span>
                          )}
                          {avis.note_categorie_3 && (
                            <span style={{ fontSize: '12px', color: '#6B7280', background: '#F4F5F7', padding: '3px 8px', borderRadius: '6px' }}>
                              {labels.categorie3} {genStars(avis.note_categorie_3)}
                            </span>
                          )}
                        </div>
                      )}
                      {avis.commentaire && (
                        <div className="avis-comment">{avis.commentaire}</div>
                      )}
                      {avis.annonce_id && (
                        <div className="avis-annonce">Li&eacute;e &agrave; une annonce</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
