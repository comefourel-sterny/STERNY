import './InfoBox.css'

export default function InfoBox({ children, variant = 'info', className = '', style }) {
  return (
    <div className={`aw-infobox aw-infobox-${variant} ${className}`} style={style}>
      {children}
    </div>
  )
}
