import './PasswordRevealButton.css'

// Œil afficher/masquer pour les <input type="password"> NATIFS (hors TextInput).
// Composant CONTRÔLÉ : la page détient l'état visible/masqué et le passe en props.
// Convention identique à TextInput : masqué (visible=false) → œil OUVERT ;
// affiché (visible=true) → œil BARRÉ. SVG copiés verbatim depuis TextInput.jsx.
function PasswordRevealButton({ visible, onToggle, disabled }) {
  return (
    <button
      type="button"
      className="pw-reveal"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={visible}
      aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
    >
      {visible ? (
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
  )
}

export default PasswordRevealButton
