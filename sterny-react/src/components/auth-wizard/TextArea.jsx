import './TextArea.css'

export default function TextArea({
  label,
  rows = 4,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  maxLength,
  name,
  id,
  ...rest
}) {
  const textareaId = id || (name ? `aw-ta-${name}` : undefined)
  return (
    <div className={`aw-textarea ${error ? 'has-error' : ''}`}>
      {label && (
        <label className="aw-textarea-label" htmlFor={textareaId}>
          {label}{required && <span className="aw-textarea-required" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        className="aw-textarea-input"
        rows={rows}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
      {error && <p className="aw-textarea-error">{error}</p>}
    </div>
  )
}
