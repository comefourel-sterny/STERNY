import './IntentCardRadio.css'

export default function IntentCardRadio({
  name,
  value,
  checked = false,
  onChange,
  label,
  subtitle,
  icon,
  className = '',
  style,
}) {
  const id = `aw-intent-${name}-${value}`
  return (
    <label
      className={`aw-intent-card ${checked ? 'selected' : ''} ${className}`}
      style={style}
      htmlFor={id}
      aria-checked={checked}
    >
      <input
        id={id}
        className="aw-intent-card-input"
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      {icon && <div className="aw-intent-card-icon">{icon}</div>}
      {subtitle ? (
        <div className="aw-intent-card-content">
          <div className="aw-intent-card-label">{label}</div>
          <div className="aw-intent-card-subtitle">{subtitle}</div>
        </div>
      ) : (
        <div className="aw-intent-card-label">{label}</div>
      )}
      <div className="aw-intent-card-check" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 -960 960 960" fill="currentColor">
          <path d="M389-227 165-451l64-64 160 160 388-388 64 64-452 452Z"/>
        </svg>
      </div>
    </label>
  )
}
