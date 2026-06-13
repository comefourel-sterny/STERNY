// InvitationModal — invitation à créer un compte, affichée sur /recherche pour
// les visiteurs non-connectés (décision conv 55). Patron repris de
// RhythmRequiredPopup (createPortal + overlay clic-dehors + Échap). Classes inv-*
// scopées dans InvitationModal.css (jamais .modal-overlay global, DETTE #86).

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from './auth-wizard/PrimaryButton'
import './InvitationModal.css'

export default function InvitationModal({ open, onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.()
  }

  return createPortal(
    <div className="inv-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Créer un compte Sterny">
      <div className="inv-panel">
        <button className="inv-close" aria-label="Fermer" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <h3 className="inv-title">Un logement à ton rythme</h3>
        <p className="inv-body">Crée ton compte pour voir les logements compatibles avec ton emploi du temps d&apos;alternance.</p>
        <PrimaryButton onClick={() => navigate('/inscription')}>Créer mon compte</PrimaryButton>
        <button className="inv-link-secondary" onClick={() => navigate('/connexion')}>J&apos;ai déjà un compte — <span className="inv-link-cta">Me connecter</span></button>
      </div>
    </div>,
    document.body
  )
}
