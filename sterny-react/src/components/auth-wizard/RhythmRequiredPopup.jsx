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
        <h3 className="aw-rrp-title">Complète ton calendrier</h3>
        <div className="aw-rrp-body">
          <p>Ça permet à Sterny de te mettre en relation.</p>
          <p>Tu pourras le modifier plus tard.</p>
        </div>
        <PrimaryButton onClick={handleConfirm}>
          Renseigner mon calendrier
        </PrimaryButton>
      </div>
    </div>,
    document.body
  )
}
