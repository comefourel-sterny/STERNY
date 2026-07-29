import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import useAccountActions from '../../hooks/useAccountActions'
import { getInitials } from '../../utils/formatters'
import PasswordRevealButton from '../../components/PasswordRevealButton'
import './GestionComptePage.css'

// Icônes SVG inline (style Feather, cohérent avec ParametresPage) — pas de lucide-react.
const IconInfos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
const IconEtudes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
)
const IconAlternance = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
)
const IconApropos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
)
const IconDocuments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
)
const IconGarant = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
const IconCompte = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)
const IconNotifications = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
)

// Catégories groupées, dans l'ordre validé (3 groupes / 8 catégories).
const GROUPES = [
  {
    label: 'Profil',
    items: [
      { id: 'infos', libelle: 'Infos personnelles', Icone: IconInfos },
      { id: 'etudes', libelle: 'Tes études', Icone: IconEtudes },
      { id: 'alternance', libelle: 'Ton alternance', Icone: IconAlternance },
      { id: 'apropos', libelle: 'À propos de toi', Icone: IconApropos },
    ],
  },
  {
    label: 'Dossier',
    items: [
      { id: 'documents', libelle: 'Tes documents', Icone: IconDocuments },
      { id: 'garant', libelle: 'Ton garant', Icone: IconGarant },
    ],
  },
  {
    label: 'Compte',
    items: [
      { id: 'compte', libelle: 'Compte', Icone: IconCompte },
      { id: 'notifications', libelle: 'Notifications', Icone: IconNotifications },
    ],
  },
]

// Préférences email portées de ModifierProfilPage (mêmes clés, mêmes libellés).
const PREFS_EMAIL = [
  { key: 'alertes', label: 'Alertes logement', desc: 'Nouveaux logements correspondant à tes critères' },
  { key: 'messages', label: 'Messages', desc: 'Notification quand tu reçois un message' },
  { key: 'candidatures', label: 'Candidatures', desc: 'Mises à jour sur tes candidatures' },
  { key: 'paiements', label: 'Paiements', desc: 'Reçus et rappels de paiement' },
  { key: 'baux', label: 'Baux', desc: 'Fin de bail, renouvellement' },
  { key: 'marketing', label: 'Actualités STERNY', desc: 'Nouveautés et offres de la plateforme' },
]

export default function GestionComptePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [categorieActive, setCategorieActive] = useState('infos')

  // Préférences email (portées de ModifierProfilPage) — autosave debounce 500 ms.
  const [prefs, setPrefs] = useState({ alertes: true, messages: true, candidatures: true, paiements: true, baux: true, marketing: true })
  const [prefsSaved, setPrefsSaved] = useState(false)
  const prefsSaveTimeout = useRef(null)

  // Actions de compte (mot de passe / suppression / export) + états visibilité de l'œil.
  const {
    showPasswordModal, setShowPasswordModal,
    pwdNew, setPwdNew,
    pwdConfirm, setPwdConfirm,
    pwdMsg,
    openPasswordModal,
    changerMotDePasse,
    showDeleteModal, setShowDeleteModal,
    deleteConfirm, setDeleteConfirm,
    openDeleteModal,
    supprimerCompte,
    exporterDonnees,
  } = useAccountActions()
  const [showPwdNew, setShowPwdNew] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  useEffect(() => {
    if (!user) return
    supabaseClient
      .from('users')
      .select('prenom, nom, email, telephone, type_user, photo_profil_url, preferences_email')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setUserData(data)
        if (data.preferences_email) {
          const pe = data.preferences_email
          setPrefs({ alertes: pe.alertes !== false, messages: pe.messages !== false, candidatures: pe.candidatures !== false, paiements: pe.paiements !== false, baux: pe.baux !== false, marketing: pe.marketing !== false })
        }
      })
  }, [user])

  // Autosave debounce 500 ms — comportement identique à ModifierProfilPage.sauvegarderPrefsEmail.
  function sauvegarderPrefsEmail(newPrefs) {
    setPrefs(newPrefs); setPrefsSaved(false)
    clearTimeout(prefsSaveTimeout.current)
    prefsSaveTimeout.current = setTimeout(async () => {
      const { error } = await supabaseClient.from('users').update({ preferences_email: newPrefs }).eq('id', user.id)
      if (!error) { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) }
    }, 500)
  }

  if (!user) return null

  const roleLabel = userData
    ? (userData.type_user === 'proprietaire' ? 'Proprietaire'
      : userData.type_user === 'hote' ? 'Hote'
      : userData.type_user === 'les_deux' ? 'Locataire & Hote'
      : 'Locataire')
    : ''

  const libelleActif = GROUPES
    .flatMap(g => g.items)
    .find(i => i.id === categorieActive)?.libelle || ''

  return (
    <div className="gc-page">
      <div className="gc-layout">
        <aside className="gc-sidebar">
          <div className="gc-identite">
            {userData?.photo_profil_url
              ? <img className="gc-avatar" src={userData.photo_profil_url} alt="" />
              : <div className="gc-avatar gc-avatar-initiales">{getInitials(userData?.prenom, userData?.nom)}</div>
            }
            <div className="gc-identite-texte">
              <div className="gc-identite-nom">{userData ? `${userData.prenom} ${userData.nom}` : '...'}</div>
              <div className="gc-identite-role">{roleLabel}</div>
            </div>
          </div>

          {GROUPES.map(groupe => (
            <div key={groupe.label} className="gc-groupe">
              <div className="gc-groupe-label">{groupe.label}</div>
              {groupe.items.map(({ id, libelle, Icone }) => (
                <button
                  key={id}
                  type="button"
                  className={`gc-item ${categorieActive === id ? 'gc-item-actif' : ''}`}
                  onClick={() => setCategorieActive(id)}
                >
                  <Icone />
                  <span>{libelle}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="gc-panel">
          <div className="gc-panel-titre">{libelleActif}</div>

          {categorieActive === 'compte' && (
            <>
              <div className="gc-ligne">
                <div><div className="gc-ligne-label">Adresse email</div></div>
                <div className="gc-ligne-valeur">{userData?.email}</div>
              </div>
              <div className="gc-ligne">
                <div><div className="gc-ligne-label">Type de compte</div></div>
                <div className="gc-ligne-valeur">{roleLabel}</div>
              </div>

              <div className="gc-sous-titre">Sécurité</div>
              <div className="gc-ligne gc-ligne-cliquable" onClick={openPasswordModal}>
                <div>
                  <div className="gc-ligne-label">Changer mon mot de passe</div>
                </div>
                <span className="gc-ligne-action">Modifier</span>
              </div>

              <div className="gc-sous-titre">Tes données</div>
              <div className="gc-ligne gc-ligne-cliquable" onClick={exporterDonnees}>
                <div>
                  <div className="gc-ligne-label">Exporter mes données</div>
                  <div className="gc-ligne-desc">Télécharge toutes tes données en JSON</div>
                </div>
                <span className="gc-ligne-action">Exporter</span>
              </div>

              <div className="gc-sous-titre gc-sous-titre-danger">Zone danger</div>
              <div className="gc-ligne gc-ligne-cliquable" onClick={openDeleteModal}>
                <div>
                  <div className="gc-ligne-label">Supprimer mon compte</div>
                  <div className="gc-ligne-desc">Cette action est irréversible</div>
                </div>
                <span className="gc-ligne-action gc-ligne-action-danger">Supprimer</span>
              </div>

              <button className="gc-logout" onClick={() => { signOut(); navigate('/') }}>Se déconnecter</button>
            </>
          )}

          {categorieActive === 'notifications' && (
            <>
              {PREFS_EMAIL.map(p => (
                <div className="gc-ligne" key={p.key}>
                  <div>
                    <div className="gc-ligne-label">{p.label}</div>
                    <div className="gc-ligne-desc">{p.desc}</div>
                  </div>
                  <label className="gc-toggle">
                    <input type="checkbox" checked={prefs[p.key]} onChange={e => sauvegarderPrefsEmail({ ...prefs, [p.key]: e.target.checked })} />
                    <span className="gc-toggle-slider" />
                  </label>
                </div>
              ))}
              <div className={`gc-prefs-saved${prefsSaved ? ' gc-prefs-saved-visible' : ''}`}>Préférences sauvegardées</div>
            </>
          )}

          {categorieActive !== 'compte' && categorieActive !== 'notifications' && (
            <div className="gc-placeholder">Cette section arrive au prochain patch.</div>
          )}
        </section>
      </div>

      {/* Modale mot de passe (balisage repris de ParametresPage, classes scopées gc-) */}
      {showPasswordModal && (
        <div className="gc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false) }}>
          <div className="gc-modal-pwd-card">
            <h3>Changer mon mot de passe</h3>
            {pwdMsg.text && <div className={`gc-modal-pwd-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
            <div className="gc-modal-pwd-group">
              <label>Nouveau mot de passe</label>
              <div className="pw-field">
                <input type={showPwdNew ? 'text' : 'password'} className="pw-has-reveal" placeholder="Minimum 8 caractères" minLength="8" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
                <PasswordRevealButton visible={showPwdNew} onToggle={() => setShowPwdNew(v => !v)} />
              </div>
            </div>
            <div className="gc-modal-pwd-group">
              <label>Confirmer le nouveau mot de passe</label>
              <div className="pw-field">
                <input type={showPwdConfirm ? 'text' : 'password'} className="pw-has-reveal" placeholder="Retape ton mot de passe" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
                <PasswordRevealButton visible={showPwdConfirm} onToggle={() => setShowPwdConfirm(v => !v)} />
              </div>
            </div>
            <div className="gc-modal-pwd-buttons">
              <button className="gc-modal-pwd-btn-cancel" onClick={() => setShowPasswordModal(false)}>Annuler</button>
              <button className="gc-modal-pwd-btn-save" onClick={changerMotDePasse}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale suppression (balisage repris de ParametresPage, classes scopées gc-) */}
      {showDeleteModal && (
        <div className="gc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="gc-modal-delete-card">
            <div className="gc-modal-delete-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3>Supprimer ton compte ?</h3>
            <p>Cette action est <strong>irréversible</strong>. Toutes tes données seront définitivement supprimées.</p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input type="text" className="gc-modal-delete-confirm-input" placeholder="SUPPRIMER" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            <div className="gc-modal-delete-buttons">
              <button className="gc-modal-delete-btn-cancel" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="gc-modal-delete-btn-delete" disabled={deleteConfirm.trim() !== 'SUPPRIMER'} onClick={supprimerCompte}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
