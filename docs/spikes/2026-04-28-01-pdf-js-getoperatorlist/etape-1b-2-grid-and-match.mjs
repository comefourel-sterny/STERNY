// Étape 1B.2 — Reconstruction de grille Mathis et matching contre vérité terrain.
//
// Approche : ancrage par texte ISO. Les annotations "L XX (S YY)" présentes dans
// le PDF Mathis (lundi de chaque semaine) servent d'ancre pour caler les fills
// colorés sur le calendrier. La numérotation ISO permet de remonter à une date
// absolue même si le calendrier couvre 2 années (2025 + 2026).
//
// Pipeline :
//   1. Charger output-mathis-cells.json
//   2. Extraire ancres ISO depuis texts (~53 ancres attendues)
//   3. Convertir (semaine_iso, année) -> date du lundi (formule Wikipedia, pas
//      de date-fns dans le projet)
//   4. Filtrer les fills "métier" : cyan/vert/rose, dimensions ~jour ouvré
//   5. Pré-générer le squelette des 54 semaines du 2025-09-01 au 2026-09-07
//   6. Rattacher chaque fill à la semaine la plus proche (contrainte verticale)
//   7. Voter : couleur majoritaire sur les 5 jours ouvrés -> statut hebdo
//   8. Charger fixtures/mathis-ground-truth.csv
//   9. Comparer prédiction vs vérité terrain
//  10. Écrire 3 livrables (JSON, MD, SVG)

import { readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPIKE_DIR = __dirname;

const INPUT_JSON = resolve(SPIKE_DIR, 'output-mathis-cells.json');
const GROUND_TRUTH_CSV = resolve(SPIKE_DIR, 'fixtures/mathis-ground-truth.csv');
const OUTPUT_GRID_JSON = resolve(SPIKE_DIR, 'output-mathis-grid.json');
const OUTPUT_REPORT_MD = resolve(SPIKE_DIR, 'output-mathis-match-report.md');
const OUTPUT_GRID_SVG = resolve(SPIKE_DIR, 'output-mathis-grid.svg');

const DAY_MS = 86_400_000;

// ------------------------------------------------------------------
// Helpers date / ISO week
// ------------------------------------------------------------------

// Donne le lundi (Date UTC) d'une semaine ISO donnée.
// Formule Wikipedia : le 4 janvier appartient toujours à la semaine ISO 1.
// Lundi de la semaine 1 = jan 4 - (jour_de_la_semaine_de_jan4 - 1) jours.
// Lundi de la semaine N = lundi semaine 1 + (N - 1) * 7 jours.
function isoWeekToMonday(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7; // dimanche = 7 dans la convention ISO
  const week1Monday = new Date(jan4.getTime() - (jan4Dow - 1) * DAY_MS);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
}

// Format Date -> "YYYY-MM-DD" en UTC, pour matcher les week_start_iso du CSV.
function dateToIso(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Donne la liste des lundis ISO inclus entre fromIso et toIso (inclusifs).
function listMondaysBetween(fromIso, toIso) {
  const out = [];
  let cur = new Date(`${fromIso}T00:00:00Z`);
  const end = new Date(`${toIso}T00:00:00Z`);
  while (cur.getTime() <= end.getTime()) {
    out.push(dateToIso(cur));
    cur = new Date(cur.getTime() + 7 * DAY_MS);
  }
  return out;
}

// ------------------------------------------------------------------
// Étape 2-3 : extraction et résolution des ancres ISO
// ------------------------------------------------------------------
//
// Découverte 1B.2 : pdf.js rend "L 01 (S 36)" comme DEUX items texte distincts
// alignés sur le même Y, avec "(S 36)" juste à droite de "L 01". Il faut donc
// les apparier par proximité spatiale plutôt que de chercher une chaîne unique.
//
// Découverte 1B.2 : la grille Mathis est jour-par-jour, pas semaine-par-semaine.
// Chaque colonne = un mois, chaque ligne dans une colonne = un jour du mois.
// L'ancre "L XX (S YY)" est posée uniquement sur la cellule du lundi.
// Les fills mar/mer/jeu/ven sont sur la même rangée Y, à droite du lundi.

const L_DAY_RE = /^L\s+(\d{1,2})$/;       // "L 01", "L 02", ...
const ISO_WEEK_RE = /^\(S\s+(\d{1,2})\)$/; // "(S 36)", "(S 49)", ...

// Détermine l'année (2025 ou 2026) qui rend la combinaison (isoWeek, day) cohérente
// dans la fenêtre du calendrier Mathis 2025-09-01 → 2026-09-07. Utilise le jour
// du mois affiché par l'ancre comme contrainte déterministe : le lundi de la
// semaine ISO calculée doit avoir ce numéro de jour.
function resolveYearForAnchor(isoWeek, day) {
  for (const year of [2025, 2026]) {
    const monday = isoWeekToMonday(year, isoWeek);
    if (monday.getUTCDate() !== day) continue;
    const isoStr = dateToIso(monday);
    if (isoStr >= '2025-09-01' && isoStr <= '2026-09-07') {
      return { year, monday };
    }
  }
  return null;
}

function extractAnchors(texts) {
  // 1. Première passe : collecter séparément les "L XX" et les "(S YY)"
  const lDays = [];
  const isoWeeks = [];
  for (const t of texts) {
    const lm = t.str.match(L_DAY_RE);
    if (lm) {
      lDays.push({ day: parseInt(lm[1], 10), x: t.x, y: t.y });
      continue;
    }
    const wm = t.str.match(ISO_WEEK_RE);
    if (wm) {
      isoWeeks.push({ isoWeek: parseInt(wm[1], 10), x: t.x, y: t.y });
    }
  }

  // 2. Appariement : pour chaque "L XX", trouver le "(S YY)" le plus proche à
  //    droite sur la même rangée Y. Un "L XX" sans "(S YY)" associé n'est pas
  //    une ancre de lundi (peut-être un autre élément texte qui matcherait par
  //    accident, mais on n'en a pas vu en pratique).
  const anchors = [];
  const unresolvedDayMonth = []; // ancres dont l'année n'a pas pu être résolue
  for (const l of lDays) {
    let best = null;
    let bestDx = Infinity;
    for (const w of isoWeeks) {
      if (Math.abs(w.y - l.y) > 1) continue; // même rangée Y (tolérance 1pt)
      const dx = w.x - l.x;
      if (dx <= 0) continue; // (S YY) doit être à droite de "L XX"
      if (dx > 50) continue; // pas trop loin (la mention reste collée)
      if (dx < bestDx) {
        bestDx = dx;
        best = w;
      }
    }
    if (!best) continue;

    // 3. Résolution de l'année par le jour du mois
    const resolved = resolveYearForAnchor(best.isoWeek, l.day);
    if (!resolved) {
      unresolvedDayMonth.push({ day: l.day, isoWeek: best.isoWeek });
      continue;
    }
    anchors.push({
      weekStartISO: dateToIso(resolved.monday),
      isoWeek: best.isoWeek,
      year: resolved.year,
      x: l.x,
      y: l.y,
      labelDay: l.day,
    });
  }
  return { anchors, unresolvedDayMonth };
}

// ------------------------------------------------------------------
// Étape 4 : filtre des fills "métier"
// ------------------------------------------------------------------

const BUSINESS_COLORS = new Set(['#00ccff', '#00ff00', '#ff8080']);
const COLOR_TO_STATUS = {
  '#00ccff': 'company',
  '#00ff00': 'school',
  '#ff8080': 'vacation',
};

// Largeur typique d'un jour ouvré observée en 1A.2 : ~30.84 (médiane).
// On laisse une marge ±10% pour absorber le bruit pdf.js. Largeur 18.84 (week-end
// compacté) explicitement exclue.
function isBusinessDayFill(f) {
  if (!BUSINESS_COLORS.has(f.color)) return false;
  if (f.width < 28 || f.width > 33) return false;
  if (f.height < 8 || f.height > 10) return false;
  return true;
}

// ------------------------------------------------------------------
// Étape 6 : rattachement fill -> semaine du squelette
// ------------------------------------------------------------------

// Découverte 1B.2 (run 2) : la grille Mathis est jour-par-jour vertical.
// Chaque colonne X = un mois, chaque rangée Y = un jour-du-mois, pas Y entre
// jours consécutifs ≈ 9 unités (mesuré : L01 à y=460.9, L02 à y=452.02).
// Les 5 fills d'une semaine ouvrée (lundi à vendredi) sont donc sur 5 rangées
// Y consécutives DESCENDANTES (Y diminue vers le bas en convention PDF où
// Y croît vers le haut), TOUS dans la même colonne mois X que l'ancre du lundi.
//
// Fenêtre de rattachement d'un fill à une ancre lundi :
//   - dx = fill.cx - anchor.x  : le fill doit être à droite ou aligné avec l'ancre
//                                 (la zone couleur du fill est à offset ~17 du label)
//                                 plage acceptée : [-5, +50]
//   - dy = anchor.y - fill.cy  : le fill doit être dans la même cellule (lundi)
//                                 ou sur l'une des 4 lignes en dessous (mar-ven)
//                                 plage acceptée : [-3, +42]
//                                 (4 jours × 9 unités/jour + tolérance = 42)
function findClosestWeek(skeleton, fill) {
  const cx = fill.x + fill.width / 2;
  const cy = fill.y + fill.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const w of skeleton) {
    if (w.anchorX === null || w.anchorY === null) continue;
    const dx = cx - w.anchorX;
    const dy = w.anchorY - cy;
    if (dx < -5 || dx > 50) continue;
    if (dy < -3 || dy > 42) continue;
    // Score = distance euclidienne. Si plusieurs ancres satisfont, on prend la
    // plus proche (typiquement celle dont la cellule mensuelle commence juste
    // à gauche du fill).
    const score = Math.sqrt(dx * dx + dy * dy);
    if (score < bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return best;
}

// ------------------------------------------------------------------
// Étape 7 : agrégation des votes -> statut + confiance
// ------------------------------------------------------------------

function aggregateVotes(votes) {
  if (votes.length === 0) {
    return { status: 'unknown', confidence: 0 };
  }
  const counts = {};
  for (const v of votes) {
    counts[v.color] = (counts[v.color] ?? 0) + 1;
  }
  // Couleur majoritaire
  let topColor = null;
  let topCount = 0;
  for (const [color, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCount = count;
      topColor = color;
    }
  }
  const status = COLOR_TO_STATUS[topColor] ?? 'unknown';
  // Règle : si tous les votes sont d'accord ET au moins 4 votes (sur 5 ouvrés
  // attendus), on plafonne à 1. Sinon proportion.
  const allAgree = topCount === votes.length;
  const confidence = allAgree && votes.length >= 4 ? 1 : topCount / votes.length;
  return { status, confidence };
}

// ------------------------------------------------------------------
// Étape 8 : parsing CSV vérité terrain
// ------------------------------------------------------------------

// Parser CSV minimaliste : split par virgule, pas de quote-handling (le format
// Mathis est simple, pas de virgule dans les valeurs).
function parseGroundTruthCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split(',').map((s) => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((s) => s.trim());
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = cols[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

// ------------------------------------------------------------------
// Étape 12 : SVG
// ------------------------------------------------------------------

function renderSvg({ viewport, fillsRetained, skeleton, matchByWeek, score }) {
  const W = viewport.width;
  const H = viewport.height;
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
  );
  // Fond blanc
  lines.push(`  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
  // Fills métier (cyan/vert/rose) — Y inversé comme en 1A.3
  lines.push(`  <!-- ${fillsRetained.length} fills métier retenus -->`);
  for (const f of fillsRetained) {
    const ySvg = H - f.y - f.height;
    lines.push(
      `  <rect x="${f.x}" y="${ySvg}" width="${f.width}" height="${f.height}" fill="${f.color}" fill-opacity="0.5"/>`
    );
  }
  // Marqueurs sur les ancres : vert si match, rouge si mismatch, gris si unknown
  lines.push(`  <!-- ${skeleton.length} marqueurs ancres -->`);
  for (const w of skeleton) {
    if (w.anchorX === null || w.anchorY === null) continue;
    const ySvg = H - w.anchorY;
    const color =
      matchByWeek[w.weekStartISO] === 'match'
        ? '#1a8e3a'
        : matchByWeek[w.weekStartISO] === 'mismatch'
          ? '#c1272d'
          : '#888888';
    lines.push(
      `  <circle cx="${w.anchorX}" cy="${ySvg}" r="3" fill="${color}" stroke="white" stroke-width="0.5"/>`
    );
  }
  // Légende en haut à gauche
  lines.push(
    `  <g font-family="sans-serif" font-size="10" fill="#222">`
  );
  lines.push(`    <text x="10" y="20">Étape 1B.2 — Mathis grid &amp; match</text>`);
  lines.push(`    <circle cx="14" cy="36" r="3" fill="#1a8e3a"/>`);
  lines.push(`    <text x="22" y="40">match</text>`);
  lines.push(`    <circle cx="14" cy="50" r="3" fill="#c1272d"/>`);
  lines.push(`    <text x="22" y="54">mismatch</text>`);
  lines.push(`    <circle cx="14" cy="64" r="3" fill="#888888"/>`);
  lines.push(`    <text x="22" y="68">unknown</text>`);
  lines.push(`  </g>`);
  // Score en haut à droite
  lines.push(
    `  <g font-family="sans-serif" fill="#222" text-anchor="end">`
  );
  lines.push(
    `    <text x="${W - 10}" y="24" font-size="18" font-weight="bold">${score.matched} / ${score.total} (${(score.matchRate * 100).toFixed(1)}%)</text>`
  );
  lines.push(
    `    <text x="${W - 10}" y="42" font-size="11">Verdict : ${score.verdict}</text>`
  );
  lines.push(`  </g>`);
  lines.push(`</svg>`);
  return lines.join('\n') + '\n';
}

// ------------------------------------------------------------------
// Pipeline principal
// ------------------------------------------------------------------

function main() {
  // --- 1. Charger les outputs 1A.2
  const data = JSON.parse(readFileSync(INPUT_JSON, 'utf8'));
  const page = data.pages[0];
  const { fills, texts, viewport } = page;

  // --- 2-3. Ancres ISO -> dates absolues
  const { anchors, unresolvedDayMonth } = extractAnchors(texts);

  // Dictionnaire weekStartISO -> ancre
  const anchorByWeek = {};
  for (const a of anchors) {
    anchorByWeek[a.weekStartISO] = a;
  }

  // --- 4. Filtrer fills métier
  const fillsRetained = fills.filter(isBusinessDayFill);

  // --- 5. Squelette pré-rempli
  // Couvre 2025-09-01 (S36 2025) au 2026-09-07 (S37 2026 inclus pour bordure)
  const allMondays = listMondaysBetween('2025-09-01', '2026-09-07');
  const skeleton = allMondays.map((iso) => {
    const a = anchorByWeek[iso];
    return {
      weekStartISO: iso,
      status: a ? null : 'no_anchor',
      confidence: a ? null : 0,
      votes: [],
      anchorX: a ? a.x : null,
      anchorY: a ? a.y : null,
    };
  });

  // --- 6. Rattacher fills -> semaines
  let orphans = 0;
  for (const f of fillsRetained) {
    const w = findClosestWeek(skeleton, f);
    if (!w) {
      orphans++;
      continue;
    }
    w.votes.push({ color: f.color, x: f.x, y: f.y });
  }

  // --- 7. Agréger
  for (const w of skeleton) {
    if (w.status === 'no_anchor') continue;
    const { status, confidence } = aggregateVotes(w.votes);
    w.status = status;
    w.confidence = confidence;
  }

  // --- 8. Charger vérité terrain
  const csvContent = readFileSync(GROUND_TRUTH_CSV, 'utf8');
  const truthRows = parseGroundTruthCsv(csvContent);
  const truthByWeek = {};
  for (const r of truthRows) {
    truthByWeek[r.week_start_iso] = r;
  }

  // --- 9. Comparaison
  let matched = 0;
  let unmatched = 0;
  const mismatches = [];
  const matchByWeek = {}; // pour le SVG

  for (const w of skeleton) {
    const truth = truthByWeek[w.weekStartISO];
    // On ne compare que les semaines présentes dans la vérité terrain (54 lignes)
    if (!truth) continue;
    if (w.status === truth.statut_business) {
      matched++;
      matchByWeek[w.weekStartISO] = 'match';
    } else {
      unmatched++;
      matchByWeek[w.weekStartISO] = 'mismatch';
      mismatches.push({
        weekStartISO: w.weekStartISO,
        predicted: w.status,
        confidence: w.confidence,
        votes: w.votes.map((v) => v.color),
        expected: truth.statut_business,
        observedPdf: truth.statut_observe_pdf,
        notes: truth.notes ?? '',
      });
    }
  }

  const totalCompared = matched + unmatched;
  const matchRate = totalCompared > 0 ? matched / totalCompared : 0;
  const verdict =
    matchRate >= 0.8
      ? 'signal fort'
      : matchRate >= 0.5
        ? 'zone grise'
        : 'pdf.js insuffisant';

  // --- 10. JSON de sortie
  const output = {
    fixture: data.fixture,
    generatedAt: new Date().toISOString(),
    totalWeeks: skeleton.length,
    metaCounts: {
      fillsTotal: fills.length,
      fillsRetained: fillsRetained.length,
      fillsOrphan: orphans,
      anchorsFound: anchors.length,
    },
    skeleton,
    matchSummary: {
      matched,
      unmatched,
      matchRate,
    },
  };
  writeFileSync(OUTPUT_GRID_JSON, JSON.stringify(output, null, 2));

  // --- 11. Rapport markdown
  const distPredicted = { company: 0, school: 0, vacation: 0, unknown: 0, no_anchor: 0 };
  for (const w of skeleton) {
    if (w.status in distPredicted) distPredicted[w.status]++;
  }
  const distExpected = { company: 0, school: 0, vacation: 0 };
  for (const r of truthRows) {
    if (r.statut_business in distExpected) distExpected[r.statut_business]++;
  }

  const mdLines = [];
  mdLines.push('# Spike #1 — Étape 1B.2 — Match report Mathis');
  mdLines.push('');
  mdLines.push(`Generated: ${output.generatedAt}`);
  mdLines.push('');
  mdLines.push('## Score global');
  mdLines.push('');
  mdLines.push(`- **Match** : ${matched} / ${totalCompared} semaines (${(matchRate * 100).toFixed(1)}%)`);
  mdLines.push(`- **Critères go/no-go (cadrage 28 avril)** : ≥80% = signal fort, 50-80% = zone grise, <50% = pdf.js insuffisant`);
  mdLines.push(`- **Verdict** : **${verdict}**`);
  mdLines.push('');
  mdLines.push('## Détails extraction');
  mdLines.push('');
  mdLines.push(`- Fills retenus / total : ${fillsRetained.length} / ${fills.length}`);
  mdLines.push(`- Fills orphelins (sans ancre Y proche) : ${orphans}`);
  mdLines.push(`- Ancres ISO trouvées : ${anchors.length} / 54 attendues`);
  mdLines.push('');
  mdLines.push('## Tableau des erreurs');
  mdLines.push('');
  if (mismatches.length === 0) {
    mdLines.push('_Aucun mismatch — toutes les semaines de vérité terrain matchent la prédiction._');
  } else {
    mdLines.push('| Semaine | Prédit | Confiance | Attendu | Observé PDF | Votes | Notes |');
    mdLines.push('|---|---|---:|---|---|---|---|');
    for (const m of mismatches) {
      const conf = m.confidence !== null ? m.confidence.toFixed(2) : 'n/a';
      const votesStr = m.votes.length === 0 ? '(aucun)' : m.votes.join(', ');
      const notes = (m.notes || '').replace(/\|/g, '\\|');
      mdLines.push(
        `| ${m.weekStartISO} | ${m.predicted} | ${conf} | ${m.expected} | ${m.observedPdf} | ${votesStr} | ${notes} |`
      );
    }
  }
  mdLines.push('');
  mdLines.push('## Distribution des statuts');
  mdLines.push('');
  mdLines.push(
    `- **Prédit** : ${distPredicted.company} company / ${distPredicted.school} school / ${distPredicted.vacation} vacation / ${distPredicted.unknown} unknown / ${distPredicted.no_anchor} no_anchor`
  );
  mdLines.push(
    `- **Attendu (vérité terrain, 54 semaines)** : ${distExpected.company} company / ${distExpected.school} school / ${distExpected.vacation} vacation`
  );
  mdLines.push('');
  mdLines.push('## Apprentissages');
  mdLines.push('');
  mdLines.push('_(à remplir manuellement après lecture)_');
  mdLines.push('');

  writeFileSync(OUTPUT_REPORT_MD, mdLines.join('\n'));

  // --- 12. SVG
  const score = { matched, total: totalCompared, matchRate, verdict };
  writeFileSync(
    OUTPUT_GRID_SVG,
    renderSvg({ viewport, fillsRetained, skeleton, matchByWeek, score })
  );

  // --- Stdout reporting
  console.log('=== Étape 1B.2 — Mathis ===');
  console.log(`Fills total: ${fills.length}`);
  console.log(`Fills retenus (cyan/vert/rose, ~jour ouvré): ${fillsRetained.length}`);
  console.log(`Fills orphelins: ${orphans}`);
  console.log(`Ancres ISO trouvées: ${anchors.length} / 54`);
  if (unresolvedDayMonth.length > 0) {
    console.log(`Ancres avec (day, isoWeek) non résolus en date : ${unresolvedDayMonth.length}`);
    for (const u of unresolvedDayMonth.slice(0, 5)) {
      console.log(`  - day=${u.day} isoWeek=${u.isoWeek}`);
    }
  }
  console.log(`Score: ${matched} / ${totalCompared} (${(matchRate * 100).toFixed(1)}%)`);
  console.log(`Verdict cible: ${verdict}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`Fichiers écrits :`);
  for (const p of [OUTPUT_GRID_JSON, OUTPUT_REPORT_MD, OUTPUT_GRID_SVG]) {
    const sz = statSync(p).size;
    console.log(`  - ${p.split('/').pop()} (${(sz / 1024).toFixed(1)} Ko)`);
  }
}

main();
