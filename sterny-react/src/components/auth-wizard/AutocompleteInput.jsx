import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import './AutocompleteInput.css'

export default function AutocompleteInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  required = false,
  disabled = false,
  name,
  id,
  capitalizeFirst = true,
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 180 })
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const portalRef = useRef(null)
  const inputId = id || (name ? `aw-ac-${name}` : undefined)

  const filtered = useMemo(() => {
    const q = (value ?? '').toLowerCase().trim()
    if (!q) return suggestions
    return suggestions.filter(s => s.toLowerCase().includes(q))
  }, [value, suggestions])

  useEffect(() => {
    if (!open) return
    const handleClickOut = (e) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
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

  const positionPortal = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const DROPDOWN_MAX_HEIGHT = 140
    const OFFSET = 6
    const boundary = inputRef.current.closest('.aw-screen-card')
    const lowerBound = boundary
      ? boundary.getBoundingClientRect().bottom
      : window.innerHeight
    const spaceBelow = lowerBound - rect.bottom - OFFSET
    const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(0, spaceBelow))
    setCoords({
      top: rect.bottom + window.scrollY + OFFSET,
      left: rect.left + window.scrollX,
      width: rect.width,
      maxHeight,
    })
  }

  const handleFocus = () => {
    if (disabled) return
    positionPortal()
    setOpen(true)
  }

  const handleSelect = (suggestion) => {
    onChange?.({ target: { value: suggestion, name } })
    setOpen(false)
  }

  return (
    <div className="aw-autocomplete" ref={wrapperRef}>
      {label && (
        <label className="aw-autocomplete-label" htmlFor={inputId}>
          {label}{required && <span className="aw-autocomplete-required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        name={name}
        className="aw-autocomplete-input"
        type="text"
        value={value ?? ''}
        onChange={(e) => {
          const rawValue = e.target.value
          const transformed = capitalizeFirst && rawValue.length > 0
            ? rawValue.charAt(0).toUpperCase() + rawValue.slice(1)
            : rawValue
          onChange?.({ target: { value: transformed, name: e.target.name } })
          if (!open) setOpen(true)
          positionPortal()
        }}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && createPortal(
        <div
          ref={portalRef}
          className="aw-autocomplete-portal"
          style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.maxHeight }}
          role="listbox"
        >
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              className="aw-autocomplete-option"
              role="option"
              onClick={() => handleSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
