import { currentMondayISO } from '../../utils/academicYear'
import { formatWeekRangeFR } from '../../utils/formatters'
import './RythmeCarousel.css'

const WINDOW = 3 // semaines de chaque côté du centre (lever pour remplir une carte large)

export default function RythmeCarousel({ weeks }) {
  const sorted = Array.isArray(weeks)
    ? [...weeks].filter(w => w && w.week_start).sort((a, b) => a.week_start.localeCompare(b.week_start))
    : []

  if (sorted.length === 0) {
    return (
      <div className="rythme-card">
        <div className="rythme-title">Ton rythme</div>
        <p className="rythme-empty">Tu n'as pas encore renseigné ton rythme d'alternance.</p>
      </div>
    )
  }

  const lundiCourant = currentMondayISO()
  let centerIndex = sorted.findIndex(w => w.week_start >= lundiCourant)
  if (centerIndex === -1) centerIndex = sorted.length - 1

  const center = sorted[centerIndex]
  const ecoleCentre = center.status === 'school'
  const estSemaineEnCours = center.week_start === lundiCourant

  const slots = []
  for (let d = -WINDOW; d <= WINDOW; d++) {
    if (d === 0) { slots.push({ type: 'center' }); continue }
    const idx = centerIndex + d
    if (idx >= 0 && idx < sorted.length) {
      slots.push({ type: 'week', week: sorted[idx], dist: Math.abs(d) })
    } else {
      slots.push({ type: 'placeholder', dist: Math.abs(d) })
    }
  }

  return (
    <div className={`rythme-card ${ecoleCentre ? 'is-ecole' : 'is-entreprise'}`}>
      <div className="rythme-title">Ton rythme</div>
      <div className="rythme-row">
        {slots.map((s, i) => {
          if (s.type === 'center') {
            return (
              <div key="center" className={`rythme-center ${ecoleCentre ? 'is-ecole' : 'is-entreprise'}`}>
                <span className="rythme-eyebrow">{estSemaineEnCours ? 'Cette semaine' : 'Prochaine semaine'}</span>
                <span className="rythme-statut">{ecoleCentre ? 'École' : 'Entreprise'}</span>
                <span className="rythme-dates">{formatWeekRangeFR(center.week_start)}</span>
              </div>
            )
          }
          if (s.type === 'placeholder') {
            return <div key={`p${i}`} className={`rythme-tile is-past ${s.dist === 1 ? 'rythme-tile--md' : 'rythme-tile--sm'}`} />
          }
          const ecole = s.week.status === 'school'
          return (
            <div key={s.week.week_start} className={`rythme-tile ${s.dist === 1 ? 'rythme-tile--md' : 'rythme-tile--sm'} ${ecole ? 'is-ecole' : 'is-entreprise'}`}>
              {s.dist === 1 && <span>{formatWeekRangeFR(s.week.week_start, { tight: true })}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
