import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabaseClient } from '../../config/supabase'
import useAccountActions from '../../hooks/useAccountActions'
import { getInitials } from '../../utils/formatters'
import PasswordRevealButton from '../../components/PasswordRevealButton'
import './ParametresPage.css'

export default function ParametresPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)

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
    exporterDonnees
  } = useAccountActions()

  // States de visibilité LOCAUX (hors hook) pour l'œil afficher/masquer
  const [showPwdNew, setShowPwdNew] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  useEffect(() => {
    if (!user) return
    supabaseClient
      .from('users')
      .select('prenom, nom, email, telephone, type_user, photo_profil_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setUserData(data) })
  }, [user])

  if (!userData) return null

  const initials = getInitials(userData.prenom, userData.nom)
  const editPath = userData.type_user === 'proprietaire' ? '/profil/modifier-proprietaire' : '/profil/modifier'
  const roleLabel = userData.type_user === 'proprietaire' ? 'Proprietaire' : userData.type_user === 'hote' ? 'Hote' : userData.type_user === 'les_deux' ? 'Locataire & Hote' : 'Locataire'

  return (
    <div className="parametres-container">
      <h1>Parametres</h1>

      {/* Profil */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Mon profil</h2>
        </div>
        <div className="param-profil">
          <div className="param-avatar">
            {userData.photo_profil_url
              ? <img src={userData.photo_profil_url} alt="" />
              : initials
            }
          </div>
          <div className="param-profil-info">
            <div className="param-profil-name">{userData.prenom} {userData.nom}</div>
            <div className="param-profil-email">{userData.email}</div>
            {userData.telephone && <div className="param-profil-phone">{userData.telephone}</div>}
            <div className="param-profil-role">{roleLabel}</div>
          </div>
          <Link to={editPath} className="param-btn-edit">Modifier</Link>
        </div>
      </div>

      {/* Securite */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Securite</h2>
        </div>
        <div className="param-row" onClick={openPasswordModal}>
          <div className="param-row-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div className="param-row-text">
            <div className="param-row-label">Changer mon mot de passe</div>
            <div className="param-row-desc">Derniere modification inconnue</div>
          </div>
          <svg className="param-row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      {/* Donnees */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Mes donnees</h2>
        </div>
        <div className="param-row" onClick={exporterDonnees}>
          <div className="param-row-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div className="param-row-text">
            <div className="param-row-label">Exporter mes donnees</div>
            <div className="param-row-desc">Telecharge toutes tes donnees en JSON</div>
          </div>
          <svg className="param-row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      {/* Zone danger */}
      <div className="param-section param-section-danger">
        <div className="param-section-header">
          <h2>Zone danger</h2>
        </div>
        <div className="param-row param-row-danger" onClick={openDeleteModal}>
          <div className="param-row-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </div>
          <div className="param-row-text">
            <div className="param-row-label">Supprimer mon compte</div>
            <div className="param-row-desc">Cette action est irreversible</div>
          </div>
          <svg className="param-row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      {/* Deconnexion */}
      <button className="param-logout" onClick={() => { signOut(); navigate('/') }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Deconnexion
      </button>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false) }}>
          <div className="modal-pwd-card">
            <h3>Changer mon mot de passe</h3>
            {pwdMsg.text && <div className={`modal-pwd-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
            <div className="modal-pwd-group">
              <label>Nouveau mot de passe</label>
              <div className="pw-field">
                <input type={showPwdNew ? 'text' : 'password'} className="pw-has-reveal" placeholder="Minimum 8 caracteres" minLength="8" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
                <PasswordRevealButton visible={showPwdNew} onToggle={() => setShowPwdNew(v => !v)} />
              </div>
            </div>
            <div className="modal-pwd-group">
              <label>Confirmer le nouveau mot de passe</label>
              <div className="pw-field">
                <input type={showPwdConfirm ? 'text' : 'password'} className="pw-has-reveal" placeholder="Retape ton mot de passe" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
                <PasswordRevealButton visible={showPwdConfirm} onToggle={() => setShowPwdConfirm(v => !v)} />
              </div>
            </div>
            <div className="modal-pwd-buttons">
              <button className="modal-pwd-btn-cancel" onClick={() => setShowPasswordModal(false)}>Annuler</button>
              <button className="modal-pwd-btn-save" onClick={changerMotDePasse}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="modal-delete-card">
            <div className="modal-delete-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3>Supprimer ton compte ?</h3>
            <p>Cette action est <strong>irreversible</strong>. Toutes tes donnees seront definitivement supprimees.</p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>Tape <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer :</p>
            <input type="text" className="modal-delete-confirm-input" placeholder="SUPPRIMER" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            <div className="modal-delete-buttons">
              <button className="modal-delete-btn-cancel" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="modal-delete-btn-delete" disabled={deleteConfirm.trim() !== 'SUPPRIMER'} onClick={supprimerCompte}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
