import './AgendaCard.css'

const URGENCY_STYLES = {
  urgent: { bg: '#FEE2E2', color: '#DC2626' },
  warning: { bg: '#FEF3C7', color: '#92400E' },
  info: { bg: '#DBEAFE', color: '#3B82F6' },
  success: { bg: '#D1FAE5', color: '#059669' }
}

export default function AgendaCard({ items = [] }) {
  const activeItems = items.filter(item => item.count > 0 || item.alwaysShow)

  return (
    <div className="agenda-card">
      <div className="agenda-label">AUJOURD'HUI</div>
      {activeItems.length === 0 ? (
        <div className="agenda-empty">
          <div className="agenda-empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span>Tout est a jour</span>
        </div>
      ) : (
        <div className="agenda-items">
          {activeItems.map((item, i) => {
            const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.info
            return (
              <div
                key={i}
                className="agenda-item"
                onClick={item.onClick}
                style={{ cursor: item.onClick ? 'pointer' : 'default' }}
              >
                <div className="agenda-item-icon" style={{ background: style.bg, color: style.color }}>
                  {item.icon}
                </div>
                <span className="agenda-item-text" style={{ color: style.color }}>
                  {item.count > 0 && <strong>{item.count}</strong>} {item.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
