import './RhythmCalendarPreview.css'

function formatDateFr(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function RhythmCalendarPreview({ rhythm_calendar, className = '', style }) {
  const weeks = Array.isArray(rhythm_calendar) ? rhythm_calendar : []
  const totalCount = weeks.length
  const schoolCount = weeks.filter(w => w?.status === 'school').length
  const companyCount = weeks.filter(w => w?.status === 'company').length
  const startDate = weeks[0]?.week_start
  const endDate = weeks[totalCount - 1]?.week_start

  if (!totalCount) {
    return (
      <div className={`aw-rcp-empty ${className}`} style={style}>
        Aucun calendrier renseigné
      </div>
    )
  }

  return (
    <div className={`aw-rcp ${className}`} style={style}>
      <div className="aw-rcp-grid" role="img" aria-label={`${totalCount} semaines : ${schoolCount} école, ${companyCount} entreprise`}>
        {weeks.map((w, i) => (
          <span
            key={`${w.week_start}-${i}`}
            className={`aw-rcp-week aw-rcp-week-${w.status === 'school' ? 'school' : 'company'}`}
            title={`Semaine du ${formatDateFr(w.week_start)} — ${w.status === 'school' ? 'école' : 'entreprise'}`}
          />
        ))}
      </div>
      <div className="aw-rcp-meta">
        <span>Du {formatDateFr(startDate)} au {formatDateFr(endDate)}</span>
        <span className="aw-rcp-meta-sep" aria-hidden="true">·</span>
        <span>{totalCount} semaines</span>
      </div>
      <div className="aw-rcp-legend">
        <span className="aw-rcp-legend-item">
          <span className="aw-rcp-swatch aw-rcp-swatch-school" aria-hidden="true" />
          École ({schoolCount})
        </span>
        <span className="aw-rcp-legend-item">
          <span className="aw-rcp-swatch aw-rcp-swatch-company" aria-hidden="true" />
          Entreprise ({companyCount})
        </span>
      </div>
    </div>
  )
}
