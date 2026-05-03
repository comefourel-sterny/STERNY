import './OrSeparator.css'

export default function OrSeparator({ label = 'ou', className = '', style }) {
  return (
    <div className={`aw-or-separator ${className}`} style={style}>
      <span>{label}</span>
    </div>
  )
}
