import OAuthButton from './OAuthButton'

export default function GoogleSignInButton({
  onClick,
  label = 'Continuer avec Google',
  className,
  style,
  ...rest
}) {
  return (
    <OAuthButton
      provider="google"
      onClick={onClick}
      label={label}
      className={className}
      style={style}
      {...rest}
    />
  )
}
