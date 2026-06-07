import { forwardRef, useState } from 'react'
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
  const isPassword = type === 'password'
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const inputType = isPassword && isPasswordVisible ? 'text' : type
  return (
    <div className={`aw-textinput ${showErrorState ? 'has-error' : ''}`}>
      {label && (
        <label className="aw-textinput-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="aw-textinput-field">
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={`aw-textinput-input${isPassword ? ' has-reveal' : ''}`}
          type={inputType}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={showErrorState ? 'true' : undefined}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="aw-textinput-reveal"
            onClick={() => setIsPasswordVisible((v) => !v)}
            disabled={disabled}
            aria-pressed={isPasswordVisible}
            aria-label={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {isPasswordVisible ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.88 4.24A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.92" />
                <path d="M6.06 6.06A13.4 13.4 0 0 0 2 11s3.5 7 10 7a9.7 9.7 0 0 0 4.94-1.06" />
                <path d="M3 3l18 18" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="aw-textinput-error">{error}</p>}
    </div>
  )
})

export default TextInput
