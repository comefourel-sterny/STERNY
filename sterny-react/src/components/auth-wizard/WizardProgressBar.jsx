import './WizardProgressBar.css'

export default function WizardProgressBar({
  progress = 0,
  stepLabel,
  stepNumber,
  className = '',
  style,
}) {
  const pct = Math.max(0, Math.min(1, progress))
  return (
    <div className={`aw-progressbar ${className}`} style={style}>
      <div className="aw-progressbar-label">
        {typeof stepNumber === 'number' && (
          <span className="aw-progressbar-step">Étape {stepNumber}</span>
        )}
        {stepLabel && (
          <>
            <span className="aw-progressbar-sep" aria-hidden="true">—</span>
            <span className="aw-progressbar-name">{stepLabel}</span>
          </>
        )}
      </div>
      <div className="aw-progressbar-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
        <div className="aw-progressbar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}
