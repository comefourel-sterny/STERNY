import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './CustomSelect.css'

function normalizeOptions(options) {
  return (options || []).map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )
}

export default function CustomSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Sélectionner',
  required = false,
  disabled = false,
  name,
  id,
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef(null)
  const portalRef = useRef(null)
  const selectId = id || (name ? `aw-cs-${name}` : undefined)
  const opts = normalizeOptions(options)
  const current = opts.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const handleClickOut = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        portalRef.current && !portalRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOut)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOut)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const openDropdown = () => {
    if (disabled) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
      width: rect.width,
    })
    setOpen(true)
  }

  const handleSelect = (opt) => {
    onChange?.({ target: { value: opt.value, name } })
    setOpen(false)
  }

  return (
    <div className="aw-customselect">
      {label && (
        <label className="aw-customselect-label" htmlFor={selectId}>
          {label}{required && <span className="aw-customselect-required" aria-hidden="true">*</span>}
        </label>
      )}
      <button
        id={selectId}
        ref={triggerRef}
        type="button"
        className={`aw-customselect-trigger ${open ? 'open' : ''} ${!current ? 'placeholder' : ''}`}
        disabled={disabled}
        onClick={openDropdown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="aw-customselect-value">
          {current ? current.label : placeholder}
        </span>
        <svg className="aw-customselect-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1l5 5 5-5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={portalRef}
          className="aw-customselect-portal"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          role="listbox"
        >
          {opts.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`aw-customselect-option ${opt.value === value ? 'selected' : ''}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
