import './WizardTitle.css'

export default function WizardTitle({ children, className = '', style }) {
  return (
    <h2 className={`aw-wizard-title ${className}`} style={style}>{children}</h2>
  )
}
