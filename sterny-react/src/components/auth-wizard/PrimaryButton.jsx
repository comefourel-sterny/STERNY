import { forwardRef } from 'react'
import './PrimaryButton.css'

const PrimaryButton = forwardRef(function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  style,
  ...rest
}, ref) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      type={type}
      className={`aw-primary-button ${className}`}
      style={style}
      disabled={isDisabled}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <svg className="aw-primary-button-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="10" />
        </svg>
      ) : children}
    </button>
  )
})

export default PrimaryButton
