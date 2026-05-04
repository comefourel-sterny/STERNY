import { forwardRef } from 'react'
import './TextInput.css'

const TextInput = forwardRef(function TextInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hasError = false,
  disabled = false,
  autoComplete,
  name,
  id,
  ...rest
}, ref) {
  const inputId = id || (name ? `aw-ti-${name}` : undefined)
  const showErrorState = hasError || Boolean(error)
  return (
    <div className={`aw-textinput ${showErrorState ? 'has-error' : ''}`}>
      {label && (
        <label className="aw-textinput-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        ref={ref}
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
        aria-invalid={showErrorState ? 'true' : undefined}
        {...rest}
      />
      {error && <p className="aw-textinput-error">{error}</p>}
    </div>
  )
})

export default TextInput
