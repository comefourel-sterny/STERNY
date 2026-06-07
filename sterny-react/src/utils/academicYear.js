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
