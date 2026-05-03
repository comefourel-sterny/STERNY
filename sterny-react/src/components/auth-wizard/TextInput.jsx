import './TextInput.css'

export default function TextInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  autoComplete,
  name,
  id,
  ...rest
}) {
  const inputId = id || (name ? `aw-ti-${name}` : undefined)
  return (
    <div className={`aw-textinput ${error ? 'has-error' : ''}`}>
      {label && (
        <label className="aw-textinput-label" htmlFor={inputId}>
          {label}{required && <span className="aw-textinput-required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        className="aw-textinput-input"
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
      {error && <p className="aw-textinput-error">{error}</p>}
    </div>
  )
}
