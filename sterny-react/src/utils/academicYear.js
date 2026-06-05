// Helpers année académique — source unique partagée entre le builder de rythme
// (RhythmManualBuilder) et la page wizard (étape E-5), pour éviter toute
// divergence du défaut/format d'année. Format : "YYYY-YYYY+1" (1er sept → 31 août).

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
