import OAuthButton from './OAuthButton'

export default function AppleSignInButton({
  onClick,
  label = 'Continuer avec Apple',
  className,
  style,
  ...rest
}) {
  return (
    <OAuthButton
      provider="apple"
      onClick={onClick}
      label={label}
      className={className}
      style={style}
      {...rest}
    />
  )
}
