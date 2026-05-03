import './OAuthButton.css'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M14.94 13.71c-.27.62-.59 1.2-.96 1.74-.51.74-.93 1.25-1.25 1.53-.5.46-1.04.69-1.62.71-.41 0-.91-.12-1.49-.36-.58-.24-1.12-.36-1.61-.36-.51 0-1.07.12-1.67.36-.6.24-1.09.37-1.46.38-.55.02-1.1-.22-1.65-.71-.35-.31-.79-.85-1.31-1.61-.56-.81-1.02-1.76-1.38-2.83-.39-1.16-.58-2.29-.58-3.38 0-1.25.27-2.33.81-3.24a4.74 4.74 0 0 1 1.7-1.72c.71-.42 1.48-.64 2.32-.65.43 0 1.01.13 1.74.4.72.27 1.18.4 1.39.4.15 0 .67-.16 1.55-.47.83-.29 1.53-.41 2.11-.36 1.55.13 2.71.74 3.49 1.85a4.4 4.4 0 0 0-2.07 4.05c.04 1.1.41 2.02 1.13 2.75.32.34.69.6 1.09.79-.09.25-.18.5-.28.73zM11.18 0c.04.95-.31 1.83-1.04 2.66-.88 .98-1.95 1.55-3.11 1.45-.02-.93.32-1.79 1.05-2.59C8.81 .85 9.5.42 10.36.16c.42-.13.81-.18 1.18-.16-.02.05-.03.1-.03.15v-.15z"
        fill="#000"
      />
    </svg>
  )
}

const PROVIDERS = {
  google: { Logo: GoogleLogo, defaultLabel: 'Continuer avec Google' },
  apple: { Logo: AppleLogo, defaultLabel: 'Continuer avec Apple' },
}

export default function OAuthButton({
  provider,
  onClick,
  label,
  className = '',
  style,
  ...rest
}) {
  const config = PROVIDERS[provider]
  if (!config) {
    return null
  }
  const { Logo, defaultLabel } = config
  return (
    <button
      type="button"
      className={`aw-oauth-button aw-oauth-button-${provider} ${className}`}
      style={style}
      onClick={onClick}
      {...rest}
    >
      <Logo />
      <span>{label ?? defaultLabel}</span>
    </button>
  )
}
