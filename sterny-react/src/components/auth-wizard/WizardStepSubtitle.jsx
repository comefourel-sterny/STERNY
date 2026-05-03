import './WizardStepSubtitle.css'

export default function WizardStepSubtitle({ children, className = '', style }) {
  return (
    <p className={`aw-wizard-step-subtitle ${className}`} style={style}>{children}</p>
  )
}
