import './IntentCardRadio.css'

export default function IntentCardRadio({
  name,
  value,
  checked = false,
  onChange,
  label,
  description,
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
      <div className="aw-intent-card-content">
        <div className="aw-intent-card-label">{label}</div>
        {description && <div className="aw-intent-card-desc">{description}</div>}
      </div>
      <div className="aw-intent-card-check" aria-hidden="true">{'✓'}</div>
    </label>
  )
}
