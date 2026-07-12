// Helpers année académique — source unique partagée entre le builder de rythme
// (RhythmManualBuilder) et la page wizard (étape E-5), pour éviter toute
// divergence du défaut/format d'année. Format : "YYYY-YYYY+1" (1er sept → 31 août).

const DAY_MS = 24 * 60 * 60 * 1000;

// Année académique courante selon la date du jour réelle.
export function computeDefaultAcademicYear() {
  const now = new Date();
  const Y = now.getUTCFullYear();
  const M = now.getUTCMonth() + 1; // 1..12
  if (M >= 9) return `${Y}-${Y + 1}`;
  return `${Y - 1}-${Y}`;
}

export function nextAcademicYear(yearStr) {
  const [a, b] = yearStr.split('-').map((n) => parseInt(n, 10));
  return `${a + 1}-${b + 1}`;
}

// Symétrique de nextAcademicYear : recule d'une année académique.
export function previousAcademicYear(yearStr) {
  const [a, b] = yearStr.split('-').map((n) => parseInt(n, 10));
  return `${a - 1}-${b - 1}`;
}

// Premier lundi de l'année académique Y : lundi de la PREMIÈRE semaine dont le
// JEUDI est en septembre Y (règle ISO : une semaine appartient au mois de son
// jeudi). Ce lundi peut tomber fin août. Année académique = sept Y → août Y+1.
export function firstMondayForAcademicYear(yearStr) {
  const Y = parseInt(yearStr.split('-')[0], 10);
  const sept1Ts = Date.UTC(Y, 8, 1); // mois 8 = septembre (0-indexed)
  const dow = new Date(sept1Ts).getUTCDay(); // 0 dim .. 6 sam
  const isoDow = dow === 0 ? 7 : dow; // 1 lun .. 7 dim
  // Premier jeudi >= 1er septembre : si le 1er sept est lun→jeu (isoDow<=4), le
  // jeudi de cette semaine ; sinon (ven→dim) le jeudi de la semaine suivante.
  const offsetToThursday = isoDow <= 4 ? 4 - isoDow : 4 - isoDow + 7;
  const firstThursdayTs = sept1Ts + offsetToThursday * DAY_MS;
  return firstThursdayTs - 3 * DAY_MS; // lundi = jeudi − 3 jours
}

// Année académique "YYYY-YYYY+1" d'un lundi 'YYYY-MM-DD', classée par le mois du
// JEUDI de la semaine (lundi + 3 j), avec bascule septembre. Une semaine de fin
// août (jeudi en août) appartient à l'année dont elle est l'AOÛT DE FIN, càd
// l'année précédente "${ty-1}-${ty}".
export function academicYearForMonday(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map((n) => parseInt(n, 10));
  const t = new Date(Date.UTC(y, m - 1, d) + 3 * DAY_MS); // jeudi de la semaine
  const ty = t.getUTCFullYear();
  const tm = t.getUTCMonth() + 1; // 1..12
  if (tm >= 9) return `${ty}-${ty + 1}`;
  return `${ty - 1}-${ty}`;
}

// Lundi de la semaine ISO en cours, au format "YYYY-MM-DD" (date seule, heure locale).
// Sert à repérer la tuile centrale du carrousel rythme.
export function currentMondayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0=dimanche .. 6=samedi
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Format 'YYYY-MM-DD' (UTC) d'un timestamp.
export function formatISO(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Semaines d'une année scolaire (sept Y → août Y+1) : depuis son 1er lundi, tant que
// la semaine appartient encore à cette année (classement par le mois du jeudi).
export function weeksForAcademicYear(yearStr) {
  const weeks = [];
  let mondayTs = firstMondayForAcademicYear(yearStr);
  while (academicYearForMonday(formatISO(mondayTs)) === yearStr) {
    weeks.push({ weekStart: formatISO(mondayTs), thursdayTs: mondayTs + 3 * DAY_MS });
    mondayTs += 7 * DAY_MS;
  }
  return weeks;
}

// Regroupement par mois (mois qui contient le jeudi). 12 colonnes sept→août.
export function groupByMonth(weeks) {
  const months = [];
  const map = new Map();
  for (const w of weeks) {
    const t = new Date(w.thursdayTs);
    const key = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      const label = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))
        .toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
        .toUpperCase()
        .slice(0, 3);
      const bucket = { key, label, weeks: [] };
      map.set(key, bucket);
      months.push(bucket);
    }
    map.get(key).weeks.push(w);
  }
  return months;
}
