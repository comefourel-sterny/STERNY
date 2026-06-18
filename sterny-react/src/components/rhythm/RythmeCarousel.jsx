import { useState } from 'react'
import { Link } from 'react-router-dom'
import { currentMondayISO } from '../../utils/academicYear'
import { formatWeekRangeFR, formatWeekStartFR } from '../../utils/formatters'
import './RythmeCarousel.css'

const WINDOW = 3 // semaines de chaque côté du centre (lever pour remplir une carte large)

export default function RythmeCarousel({ weeks, lienCalendrier }) {
  const [offset, setOffset] = useState(0)

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
  let baseIndex = sorted.findIndex(w => w.week_start >= lundiCourant)
  if (baseIndex === -1) baseIndex = sorted.length - 1

  const effectiveCenter = Math.max(0, Math.min(sorted.length - 1, baseIndex + offset))
  const center = sorted[effectiveCenter]
  const ecoleCentre = center.status === 'school'
  const estSemaineEnCours = center.week_start === lundiCourant
  const showEyebrow = offset === 0
  const canPrev = baseIndex + offset > 0
  const canNext = baseIndex + offset < sorted.length - 1

  const slots = []
  for (let d = -WINDOW; d <= WINDOW; d++) {
    if (d === 0) { slots.push({ type: 'center' }); continue }
    const idx = effectiveCenter + d
    if (idx >= 0 && idx < sorted.length) {
      slots.push({ type: 'week', week: sorted[idx], dist: Math.abs(d) })
    } else {
      slots.push({ type: 'placeholder', dist: Math.abs(d) })
    }
  }

  return (
    <div className={`rythme-card ${ecoleCentre ? 'is-ecole' : 'is-entreprise'}`}>
      <div className="rythme-head">
        <div className="rythme-title">Ton rythme</div>
        {offset !== 0 ? (
          <button type="button" className="rythme-today" onClick={() => setOffset(0)}>Aujourd'hui</button>
        ) : lienCalendrier ? (
          <Link to={lienCalendrier} className="rythme-today" style={{ color: '#64748B', textDecoration: 'none' }}>
            Voir mon calendrier
          </Link>
        ) : null}
      </div>
      <div className="rythme-nav">
        <button type="button" className="rythme-arrow" onClick={() => canPrev && setOffset(o => o - 1)} disabled={!canPrev} aria-label="Semaines précédentes">‹</button>
        <div className="rythme-row">
          {slots.map((s, i) => {
            if (s.type === 'center') {
              return (
                <div key="center" className={`rythme-center ${ecoleCentre ? 'is-ecole' : 'is-entreprise'}`}>
                  {showEyebrow && <span className="rythme-eyebrow">{estSemaineEnCours ? 'Cette semaine' : 'Prochaine semaine'}</span>}
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
                {s.dist === 1 && <span>{formatWeekStartFR(s.week.week_start)}</span>}
              </div>
            )
          })}
        </div>
        <button type="button" className="rythme-arrow" onClick={() => canNext && setOffset(o => o + 1)} disabled={!canNext} aria-label="Semaines suivantes">›</button>
      </div>
    </div>
  )
}
