import './AuthScreenContainer.css'

export default function AuthScreenContainer({ children, className = '', style }) {
  return (
    <section className={`aw-screen ${className}`}>
      <div className="aw-screen-card" style={style}>
        {children}
      </div>
    </section>
  )
}
