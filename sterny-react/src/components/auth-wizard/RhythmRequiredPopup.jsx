import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PrimaryButton from './PrimaryButton'
import './RhythmRequiredPopup.css'

export default function RhythmRequiredPopup({ open, onClose, onConfirm }) {
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

  const handleConfirm = () => {
    onConfirm?.()
    onClose?.()
  }

  return createPortal(
    <div className="aw-rrp-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="aw-rrp-panel">
        <div className="aw-rrp-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h3 className="aw-rrp-title">Ton calendrier est indispensable</h3>
        <div className="aw-rrp-body">
          <p>
            Sterny te trouve des logements seulement pour les semaines où tu en as besoin. Sans ton calendrier, on ne peut pas savoir quelles semaines tu cherches ni quelles semaines tu proposes.
          </p>
          <p>
            Renseigner ton calendrier prend environ 2 minutes. Tu peux le modifier plus tard si ton planning change.
          </p>
        </div>
        <PrimaryButton onClick={handleConfirm}>
          Renseigner mon calendrier
        </PrimaryButton>
      </div>
    </div>,
    document.body
  )
}
