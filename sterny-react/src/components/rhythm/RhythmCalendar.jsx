import './RhythmCalendar.css';

function getMonthKey(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  return d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
}

function getDayOfMonth(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  return d.getDate();
}

function isValidStatus(status) {
  return status === 'school' || status === 'company';
}

function isValidWeekStart(weekStart) {
  if (typeof weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return false;
  const d = new Date(weekStart + 'T00:00:00');
  return !isNaN(d.getTime());
}

function groupWeeksByMonth(weeks) {
  const map = new Map();
  weeks.forEach(week => {
    if (!isValidWeekStart(week.week_start)) {
      if (!map.has('__invalid__')) {
        map.set('__invalid__', { key: '__invalid__', label: 'Semaines invalides', weeks: [] });
      }
      map.get('__invalid__').weeks.push(week);
      return;
    }
    const key = getMonthKey(week.week_start);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: getMonthLabel(week.week_start),
        weeks: []
      });
    }
    map.get(key).weeks.push(week);
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.key === '__invalid__') return 1;
    if (b.key === '__invalid__') return -1;
    return a.key.localeCompare(b.key);
  });
}

function DocumentMetaFooter({ meta }) {
  const items = [];

  // school_name : "École non identifiée" si null
  items.push({
    key: 'school',
    content: meta.school_name ?? 'École non identifiée',
    title: meta.school_name ? undefined : 'Champ non détecté dans le document source'
  });

  // program_name : masqué si null, badge "code technique" si pas d'espace + ≤ 12 chars.
  // Attrape les codes courts type "R_CA_A3", "BUT3-GEA-S5" sans flagger les vrais
  // libellés humains qui ont presque toujours des espaces (voir DETTE #20).
  if (meta.program_name) {
    const isTechnicalCode = !/\s/.test(meta.program_name) && meta.program_name.length <= 12;
    items.push({
      key: 'program',
      content: meta.program_name,
      title: isTechnicalCode ? 'Code programme — libellé non détecté dans le document' : undefined
    });
  }

  if (meta.academic_year) {
    items.push({
      key: 'year',
      content: meta.academic_year,
      title: undefined
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="rc-meta">
      {items.map((item, i) => (
        <span key={item.key}>
          {i > 0 && <span className="rc-meta-sep"> · </span>}
          <span className="rc-meta-item" title={item.title}>{item.content}</span>
        </span>
      ))}
    </div>
  );
}

export default function RhythmCalendar({ weeks, groupLabel, documentMeta, className = '' }) {
  // État vide
  if (!Array.isArray(weeks) || weeks.length === 0) {
    return (
      <div className={`rc-card ${className}`}>
        <div className="rc-empty">Aucune semaine disponible pour ce groupe.</div>
      </div>
    );
  }

  const monthsGrouped = groupWeeksByMonth(weeks);

  return (
    <div className={`rc-card ${className}`}>
      <div className="rc-legend">
        <span className="rc-legend-item">
          <span className="rc-legend-swatch rc-school" />
          École
        </span>
        <span className="rc-legend-item">
          <span className="rc-legend-swatch rc-company" />
          Entreprise
        </span>
      </div>

      <div className="rc-grid">
        {monthsGrouped.map(month => (
          <div key={month.key} className="rc-month-row">
            <div className="rc-month-label">{month.label}</div>
            <div className="rc-month-cells">
              {month.weeks.map((week, idx) => {
                const validStatus = isValidStatus(week.status);
                const validDate = isValidWeekStart(week.week_start);

                if (!validStatus || !validDate) {
                  if (typeof console !== 'undefined' && console.warn) {
                    console.warn('[RhythmCalendar] Invalid week:', week);
                  }
                  return (
                    <div
                      key={`invalid-${idx}-${week.week_start || 'nodate'}`}
                      className="rc-cell rc-invalid"
                      title={!validDate ? 'Date invalide' : 'Statut inconnu'}
                    >
                      ?
                    </div>
                  );
                }

                return (
                  <div
                    key={week.week_start}
                    className={`rc-cell rc-${week.status}`}
                    title={`Semaine du ${week.week_start} — ${week.status === 'school' ? 'École' : 'Entreprise'}`}
                  >
                    {getDayOfMonth(week.week_start)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {documentMeta && <DocumentMetaFooter meta={documentMeta} />}
    </div>
  );
}
