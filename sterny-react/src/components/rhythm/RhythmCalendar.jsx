import './RhythmCalendar.css';
import {
  weeksForAcademicYear,
  groupByMonth,
  academicYearForMonday,
  computeDefaultAcademicYear,
} from '../../utils/academicYear';

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

// Même construction de date que les helpers ci-dessus (pas de seconde façon de lire
// une date). getDay() : 0 = dimanche, 1 = lundi. Une semaine rhythm_calendar doit
// démarrer un lundi ISO, sinon elle ne correspond à aucune case du squelette.
function isMonday(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  return d.getDay() === 1;
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

export default function RhythmCalendar({ weeks, groupLabel, documentMeta, className = '', annee }) {
  // État vide
  if (!Array.isArray(weeks) || weeks.length === 0) {
    return (
      <div className={`rc-card ${className}`}>
        <div className="rc-empty">Aucune semaine disponible pour ce groupe.</div>
      </div>
    );
  }

  // Année scolaire du squelette : prop `annee` si fournie, sinon déduite du premier
  // week_start reçu, sinon année courante. Source unique : academicYear.js.
  const anneeEffective =
    annee ??
    (() => {
      const premiere = weeks.find((w) => isValidWeekStart(w.week_start));
      return premiere ? academicYearForMonday(premiere.week_start) : computeDefaultAcademicYear();
    })();

  // Index des semaines reçues : week_start -> status. Seules les entrées valides
  // (date valide, statut connu, lundi ISO) sont indexées. Toute semaine reçue qui
  // n'entre pas dans l'index est signalée : sur rhythm_calendar, source de vérité
  // unique, une donnée anormale ne doit pas disparaître en silence dans une case grise.
  const statutParSemaine = new Map();
  weeks.forEach((w) => {
    if (!isValidWeekStart(w.week_start)) {
      console.warn('[RhythmCalendar] Semaine ignorée — date invalide:', w);
      return;
    }
    if (!isValidStatus(w.status)) {
      console.warn('[RhythmCalendar] Semaine ignorée — statut inconnu:', w);
      return;
    }
    if (!isMonday(w.week_start)) {
      console.warn(
        "[RhythmCalendar] Semaine ignorée — date valide mais pas un lundi ISO, n'entrera dans aucune case:",
        w
      );
      return;
    }
    statutParSemaine.set(w.week_start, w.status);
  });

  // Squelette complet des 12 mois (SEP → AOÛT), même géométrie que PlancheCouverture
  // et RhythmManualBuilder. groupByMonth fournit déjà le label en 3 lettres majuscules.
  const monthsGrouped = groupByMonth(weeksForAcademicYear(anneeEffective));

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
        <span className="rc-legend-item">
          <span className="rc-legend-swatch rc-neutre" />
          Non renseigné
        </span>
      </div>

      <div className="rc-grid">
        {monthsGrouped.map((month) => (
          <div key={month.key} className="rc-month-column">
            <div className="rc-month-label">{month.label}</div>
            {month.weeks.map((week, idx) => {
              // Garde défensive : les dates du squelette sont toujours valides, mais on
              // conserve le traitement d'erreur pour dates invalides.
              if (!isValidWeekStart(week.weekStart)) {
                return (
                  <div
                    key={`invalid-${month.key}-${idx}`}
                    className="rc-cell rc-invalid"
                    title="Date invalide"
                  >
                    ?
                  </div>
                );
              }

              const status = statutParSemaine.get(week.weekStart);
              const stateClass =
                status === 'school'
                  ? 'rc-school'
                  : status === 'company'
                  ? 'rc-company'
                  : 'rc-neutre';

              const title = status
                ? `Semaine du ${week.weekStart} — ${status === 'school' ? 'École' : 'Entreprise'}`
                : `Semaine du ${week.weekStart}`;

              return (
                <div key={week.weekStart} className={`rc-cell ${stateClass}`} title={title}>
                  {getDayOfMonth(week.weekStart)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {documentMeta && <DocumentMetaFooter meta={documentMeta} />}
    </div>
  );
}
