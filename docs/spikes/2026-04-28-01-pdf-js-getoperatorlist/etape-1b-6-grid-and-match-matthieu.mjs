// Étape 1B.6.2 — Reconstruction de grille Matthieu + matching contre vérité terrain.
//
// Inputs :
//   - output-matthieu-cells.json : extraction pdf.js des 2 pages (1A.2)
//   - fixtures/matthieu-ground-truth.csv : vérité terrain saisie main par Côme
//
// Outputs :
//   - output-matthieu-grid.json       (squelettes M1 + M2)
//   - output-matthieu-match-report.md (rapport 5 sections)
//   - output-matthieu-grid-p1.svg     (visualisation M1)
//   - output-matthieu-grid-p2.svg     (visualisation M2)
//
// Pipeline (10 étapes alignées avec la spec 1B.6.2) :
//   1.  Boucle 2 pages, 2 squelettes accumulateurs distincts (M1, M2)
//   2.  Filtrage fills métier (jaune/rouge/vert saturé, width ≤ 700)
//   3.  Table dynamique des centres x des mois (textes en-têtes)
//   4.  Dépliage des fills width > 150 → 1 vote par mois traversé
//   5.  Table dynamique des positions y des rangées jour-du-mois (1 à 31)
//   6.  (mois, jour) → date civile UTC (année académique 2025-2026)
//   7.  Date civile → lundi de la semaine ISO 8601
//   8.  Politique majorité 3/5 avec déduplication par jour unique
//   9.  Lecture CSV vérité terrain (skip lignes vides ou statut_business vide)
//   10. Comparaison squelette.status vs csv.statut_business
//
// Convention PDF utilisée : axe Y croît vers le HAUT (jour 1 du mois = Y le plus
// grand, jour 31 = Y le plus petit). Convention SVG inversée (Y croît vers le bas).

import { readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const INPUT_JSON = resolve(__dirname, 'output-matthieu-cells.json');
const GROUND_TRUTH_CSV = resolve(__dirname, 'fixtures/matthieu-ground-truth.csv');
const OUTPUT_GRID_JSON = resolve(__dirname, 'output-matthieu-grid.json');
const OUTPUT_REPORT_MD = resolve(__dirname, 'output-matthieu-match-report.md');
const OUTPUT_SVG_P1 = resolve(__dirname, 'output-matthieu-grid-p1.svg');
const OUTPUT_SVG_P2 = resolve(__dirname, 'output-matthieu-grid-p2.svg');

const DAY_MS = 86_400_000;

// ------------------------------------------------------------------
// Mois français ↔ numéros + année académique
// ------------------------------------------------------------------
const MONTH_NAMES = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août',
];
const MONTH_TO_NUM = {
  Septembre: 9, Octobre: 10, Novembre: 11, Décembre: 12,
  Janvier: 1, Février: 2, Mars: 3, Avril: 4, Mai: 5, Juin: 6, Juillet: 7, Août: 8,
};
function yearForMonth(monthName) {
  // Année académique 2025-2026 : sept→déc en 2025, jan→août en 2026
  return MONTH_TO_NUM[monthName] >= 9 ? 2025 : 2026;
}

// ------------------------------------------------------------------
// Couleurs métier (toutes mappées sur "school" lors de l'agrégation)
// ------------------------------------------------------------------
const BUSINESS_COLORS = new Set(['#ffff00', '#ff0000', '#83e28e']);

// ------------------------------------------------------------------
// Helpers date
// ------------------------------------------------------------------
function dateToIso(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Lundi de la semaine ISO 8601 contenant la date passée.
// Convention ISO : lundi = 1, dimanche = 7. JS getUTCDay() : dimanche = 0.
function mondayOfISOWeek(d) {
  const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return new Date(d.getTime() - (isoDow - 1) * DAY_MS);
}

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

// Crée une date civile UTC ; retourne null si combinaison (mois, jour) invalide
// (ex: 31 février → JS overflow vers mars, on détecte ça en relisant la date).
function safeDateUTC(year, monthNum, day) {
  const d = new Date(Date.UTC(year, monthNum - 1, day));
  if (d.getUTCMonth() !== monthNum - 1 || d.getUTCDate() !== day) return null;
  return d;
}

// ------------------------------------------------------------------
// Construction des tables géométriques par page
// ------------------------------------------------------------------
function buildMonthCenters(texts) {
  // En-têtes mois : y entre 520 et 540 d'après inspection 1B.6.1
  const headers = texts.filter(
    (t) => MONTH_NAMES.includes(t.str) && t.y >= 520 && t.y <= 540
  );
  return headers
    .map((h) => ({
      name: h.str,
      cx: h.x + h.width / 2,
      year: yearForMonth(h.str),
    }))
    .sort((a, b) => a.cx - b.cx);
}

function buildDayRows(texts) {
  const dayTexts = texts.filter(
    (t) =>
      /^([1-9]|[12][0-9]|3[01])$/.test(t.str) &&
      t.x < 100 &&
      t.y >= 150 &&
      t.y <= 530
  );
  // Plusieurs textes peuvent partager le même y (ex: textes à x=10 et x=80
  // pour le même numéro). On garde le premier rencontré.
  const rows = {};
  for (const t of dayTexts) {
    const day = parseInt(t.str, 10);
    if (rows[day] === undefined) rows[day] = t.y;
  }
  return rows;
}

// Trouve le numéro de jour-du-mois dont la baseline est la plus proche du
// centre vertical du fill (offset observé : baseline ≈ fill.y + 3.6).
function findNearestDay(dayRows, fillY) {
  let bestDay = null;
  let bestDist = Infinity;
  const target = fillY + 4;
  for (const [day, y] of Object.entries(dayRows)) {
    const d = Math.abs(y - target);
    if (d < bestDist) {
      bestDist = d;
      bestDay = parseInt(day, 10);
    }
  }
  return bestDay;
}

// ------------------------------------------------------------------
// Mapping fill → cellules-vote (avec dépliage width > 150)
// ------------------------------------------------------------------
function fillToVotes(fill, monthCenters, dayRows) {
  const votes = [];
  const dayNum = findNearestDay(dayRows, fill.y);
  if (dayNum === null) return votes;

  if (fill.width <= 150) {
    // Cellule simple : 1 vote dans le mois dont le centre x est le plus proche
    const xc = fill.x + fill.width / 2;
    const month = monthCenters.reduce((best, m) =>
      Math.abs(m.cx - xc) < Math.abs(best.cx - xc) ? m : best
    );
    if (!month) return votes;
    votes.push({
      monthName: month.name,
      year: month.year,
      day: dayNum,
      multiCell: false,
      color: fill.color,
      x: fill.x,
      y: fill.y,
    });
  } else {
    // Fill multi-mois : 1 vote par mois dont le centre x tombe dans le
    // rectangle [fill.x, fill.x + fill.width]
    for (const m of monthCenters) {
      if (m.cx >= fill.x && m.cx <= fill.x + fill.width) {
        votes.push({
          monthName: m.name,
          year: m.year,
          day: dayNum,
          multiCell: true,
          color: fill.color,
          x: fill.x,
          y: fill.y,
        });
      }
    }
  }
  return votes;
}

// ------------------------------------------------------------------
// Pipeline page → squelette
// ------------------------------------------------------------------
const ALL_MONDAYS = listMondaysBetween('2025-09-01', '2026-09-07');

function processPage(page, groupName) {
  const monthCenters = buildMonthCenters(page.texts);
  const dayRows = buildDayRows(page.texts);

  const businessFills = page.fills.filter(
    (f) => BUSINESS_COLORS.has(f.color) && f.width <= 700
  );

  // Génère toutes les cellules-vote (avec doublons éventuels par dépliage)
  const allVotes = [];
  let unfoldedFillsCount = 0;
  let invalidDateCount = 0;

  for (const f of businessFills) {
    const cellVotes = fillToVotes(f, monthCenters, dayRows);
    if (cellVotes.length > 1) unfoldedFillsCount++;
    for (const v of cellVotes) {
      const date = safeDateUTC(v.year, MONTH_TO_NUM[v.monthName], v.day);
      if (!date) {
        invalidDateCount++;
        continue;
      }
      const dateIso = dateToIso(date);
      const monday = mondayOfISOWeek(date);
      allVotes.push({
        dateIso,
        mondayIso: dateToIso(monday),
        color: v.color,
        x: v.x,
        y: v.y,
        multiCell: v.multiCell,
      });
    }
  }

  // Déduplication par jour civil : un jour ne peut recevoir qu'un seul vote.
  // Si plusieurs fills tombent sur le même jour, on conserve le premier vu
  // mais on remonte le flag multiCell si au moins un vote était multiCell
  // (signal qualité plus prudent).
  const dedupByDate = new Map();
  for (const v of allVotes) {
    const existing = dedupByDate.get(v.dateIso);
    if (!existing) {
      dedupByDate.set(v.dateIso, v);
    } else if (v.multiCell && !existing.multiCell) {
      dedupByDate.set(v.dateIso, v);
    }
  }

  // Pré-génération du squelette : 54 entrées (lundis 2025-09-01 → 2026-09-07)
  // Format conforme au contrat VISION §4 (pattern accumulateur)
  const skeleton = ALL_MONDAYS.map((iso) => ({
    weekStartISO: iso,
    status: null,
    confidence: null,
    votes: [],
    anchorX: null,
    anchorY: null,
    groupe: groupName,
  }));

  const skeletonByWeek = new Map(skeleton.map((s) => [s.weekStartISO, s]));

  // Dépose les votes uniques (par date) dans la semaine ISO correspondante.
  // Borne dure : on n'ajoute qu'un vote par jour ouvré (lun-ven), max 5 par
  // semaine ; les week-ends sont écartés.
  for (const v of dedupByDate.values()) {
    const d = new Date(`${v.dateIso}T00:00:00Z`);
    const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (isoDow < 1 || isoDow > 5) continue;
    const week = skeletonByWeek.get(v.mondayIso);
    if (!week) continue; // semaine hors plage 2025-09-01 → 2026-09-07
    week.votes.push({
      color: v.color,
      x: v.x,
      y: v.y,
      source: 'pdfjs',
      // métadonnées internes au calcul (non incluses dans le contrat VISION
      // mais utiles pour le rapport)
      _date: v.dateIso,
      _multiCell: v.multiCell,
    });
  }

  // Politique majorité 3/5
  for (const w of skeleton) {
    const count = w.votes.length;
    if (count >= 3) {
      w.status = 'school';
      w.confidence = count / 5;
    } else if (count === 0) {
      w.status = 'company';
      w.confidence = 1.0;
    } else {
      w.status = 'unknown';
      w.confidence = count / 5;
    }
  }

  return { skeleton, businessFills, unfoldedFillsCount, invalidDateCount };
}

// ------------------------------------------------------------------
// Parser CSV (split par virgule, gère les guillemets simples)
// ------------------------------------------------------------------
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ',') {
        out.push(cur);
        cur = '';
      } else if (c === '"') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseGroundTruth(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  if (lines.length === 0) return rows;
  const header = parseCsvLine(lines[0]).map((s) => s.trim());
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === '' || raw == null) continue; // ligne vide (artefact éditeur)
    const cols = parseCsvLine(raw);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cols[j] ?? '').trim();
    }
    // Skip si statut_business est vide (semaine hors PDF, à ignorer pour le matching)
    if (!row.statut_business) continue;
    rows.push(row);
  }
  return rows;
}

// ------------------------------------------------------------------
// SVG (Y-axis option 2 : pré-calcul y_svg = H - y_pdf - height)
// ------------------------------------------------------------------
function renderSvg({ viewport, fillsRetained, skeleton, matchByWeek, score, monthCenters, groupName }) {
  const W = viewport.width;
  const H = viewport.height;
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
  );
  lines.push(`  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // Fills métier (semi-transparents pour mieux lire)
  lines.push(`  <!-- ${fillsRetained.length} fills métier retenus -->`);
  for (const f of fillsRetained) {
    const ySvg = H - f.y - f.height;
    lines.push(
      `  <rect x="${f.x}" y="${ySvg}" width="${f.width}" height="${f.height}" fill="${f.color}" fill-opacity="0.5"/>`
    );
  }

  // Marqueurs sur les en-têtes mois : 1 cercle par semaine, positionné au centre
  // x du mois et à la hauteur de la rangée d'en-tête. Vert = match, rouge =
  // mismatch, gris = pas de comparaison (vérité terrain absente pour cette
  // semaine).
  // Note : on ne peut pas afficher 1 marqueur par semaine sur un calendrier
  // mensuel (les semaines ISO ne sont pas une dimension visuelle de la grille).
  // On affiche donc les marqueurs en colonne à droite de chaque en-tête mois,
  // empilés verticalement par semaine commençant dans ce mois.
  lines.push(`  <!-- marqueurs match par semaine, regroupés par mois -->`);
  for (const m of monthCenters) {
    const weeksOfMonth = skeleton.filter((s) => {
      const d = new Date(`${s.weekStartISO}T00:00:00Z`);
      return d.getUTCFullYear() === m.year && d.getUTCMonth() + 1 === MONTH_TO_NUM[m.name];
    });
    const ySvgHeader = H - 524; // approx ligne d'en-tête mois
    let yOffset = 0;
    for (const w of weeksOfMonth) {
      const status = matchByWeek[`${w.groupe}|${w.weekStartISO}`];
      const color =
        status === 'match' ? '#1a8e3a' :
        status === 'mismatch' ? '#c1272d' :
        '#888888';
      lines.push(
        `  <circle cx="${m.cx}" cy="${ySvgHeader + 14 + yOffset * 6}" r="2.5" fill="${color}" stroke="white" stroke-width="0.3"/>`
      );
      yOffset++;
    }
  }

  // Légende
  lines.push(`  <g font-family="sans-serif" font-size="10" fill="#222">`);
  lines.push(`    <text x="10" y="20">Étape 1B.6.2 — Matthieu ${groupName}</text>`);
  lines.push(`    <circle cx="14" cy="36" r="3" fill="#1a8e3a"/>`);
  lines.push(`    <text x="22" y="40">match</text>`);
  lines.push(`    <circle cx="14" cy="50" r="3" fill="#c1272d"/>`);
  lines.push(`    <text x="22" y="54">mismatch</text>`);
  lines.push(`    <circle cx="14" cy="64" r="3" fill="#888888"/>`);
  lines.push(`    <text x="22" y="68">no truth</text>`);
  lines.push(`  </g>`);

  // Score
  lines.push(`  <g font-family="sans-serif" fill="#222" text-anchor="end">`);
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
  // 1. Charger les inputs
  const data = JSON.parse(readFileSync(INPUT_JSON, 'utf8'));
  const csvContent = readFileSync(GROUND_TRUTH_CSV, 'utf8');
  const truthRows = parseGroundTruth(csvContent);

  // Indexer la vérité terrain par (groupe, weekStartISO)
  const truthIndex = new Map();
  for (const r of truthRows) {
    truthIndex.set(`${r.groupe}|${r.week_start_iso}`, r);
  }

  // 2. Pipeline par page
  const r1 = processPage(data.pages[0], 'M1_CCA_2025-2026');
  const r2 = processPage(data.pages[1], 'M2_CCA_2025-2026');

  // 3. Comparaison squelette vs vérité terrain
  function compareGroup(skeleton) {
    let matched = 0;
    let unmatched = 0;
    let unknownInSkeleton = 0;
    const mismatches = [];
    const unknowns = [];
    const matchByWeek = {};

    for (const w of skeleton) {
      const truth = truthIndex.get(`${w.groupe}|${w.weekStartISO}`);
      if (!truth) continue; // pas de vérité terrain (semaine hors saisie)

      // Stats unknown du squelette (collectées AVANT score)
      if (w.status === 'unknown') {
        unknownInSkeleton++;
        unknowns.push({
          weekStartISO: w.weekStartISO,
          votes: w.votes.length,
          confiance_proposition: truth.confiance_proposition,
          notes: truth.notes,
          statut_business_attendu: truth.statut_business,
          statut_observe_pdf: truth.statut_observe_pdf,
        });
      }

      // Score brut : status squelette vs statut_business CSV
      // unknown compte comme INCORRECT (politique stricte)
      if (w.status === truth.statut_business) {
        matched++;
        matchByWeek[`${w.groupe}|${w.weekStartISO}`] = 'match';
      } else {
        unmatched++;
        matchByWeek[`${w.groupe}|${w.weekStartISO}`] = 'mismatch';
        mismatches.push({
          weekStartISO: w.weekStartISO,
          predicted: w.status,
          confidence: w.confidence,
          votes: w.votes.length,
          voteColors: w.votes.map((v) => v.color),
          expected: truth.statut_business,
          observedPdf: truth.statut_observe_pdf,
          confiance_proposition: truth.confiance_proposition,
          notes: truth.notes,
        });
      }
    }

    return { matched, unmatched, mismatches, unknownInSkeleton, unknowns, matchByWeek };
  }

  const cmpM1 = compareGroup(r1.skeleton);
  const cmpM2 = compareGroup(r2.skeleton);

  // Score consolidé
  const totalMatched = cmpM1.matched + cmpM2.matched;
  const totalUnmatched = cmpM1.unmatched + cmpM2.unmatched;
  const totalCompared = totalMatched + totalUnmatched;
  const matchRate = totalCompared > 0 ? totalMatched / totalCompared : 0;
  const verdict =
    matchRate >= 0.8 ? 'signal fort'
    : matchRate >= 0.5 ? 'zone grise'
    : 'pdf.js insuffisant';

  // Anomalie attendue Soutenance M2 (DETTE #40) : la semaine du 1er juin 2026
  // sur M2 est plafonnée à 3 votes au lieu de 5 (jours 4-5 juin manquants).
  // Si elle est en mismatch à cause de cette anomalie (3/5 = school OK puisque
  // ≥ 3, mais confidence 0.6 au lieu de 1), on note l'écart théorique.
  const SOUT_KEY = 'M2_CCA_2025-2026|2026-06-01';
  const soutTruth = truthIndex.get(SOUT_KEY);
  const soutWeek = r2.skeleton.find((w) => w.weekStartISO === '2026-06-01');
  const soutPredicted = soutWeek?.status ?? 'n/a';
  const soutExpected = soutTruth?.statut_business ?? 'n/a';
  const soutVotes = soutWeek?.votes.length ?? 0;
  const soutCountsAsMatch = soutPredicted === soutExpected;
  const soutAffectedByDette40 = soutVotes < 5; // signal indirect
  const m2Total = cmpM2.matched + cmpM2.unmatched;
  // Plafond théorique M2 : si la cellule Soutenance était correctement
  // classée (sans l'anomalie), combien de matches au lieu du compte actuel ?
  // En pratique avec 3 votes, w.status = "school" déjà → l'anomalie n'a PAS
  // empêché le match si truth.statut_business = "school". Donc le plafond
  // théorique n'est pas mécaniquement supérieur au score obtenu.
  const m2CeilingMatches = soutCountsAsMatch ? cmpM2.matched : cmpM2.matched + 1;
  const m2CeilingRate = m2Total > 0 ? m2CeilingMatches / m2Total : 0;

  // ----------------------------------------------------------------
  // Écriture des outputs
  // ----------------------------------------------------------------
  const generatedAt = new Date().toISOString();

  // 1. JSON grid (clés de groupe en notation crochet — les tirets dans les
  // noms de groupe rendent la notation pointée invalide en littéral JS).
  const finalJson = {
    fixture: data.fixture,
    generatedAt,
    groups: {},
    metaCounts: {
      M1: {
        fillsTotal: data.pages[0].fills.length,
        fillsRetained: r1.businessFills.length,
        unfoldedFillsCount: r1.unfoldedFillsCount,
        invalidDateCount: r1.invalidDateCount,
        monthsDetected: buildMonthCenters(data.pages[0].texts).length,
        dayRowsDetected: Object.keys(buildDayRows(data.pages[0].texts)).length,
      },
      M2: {
        fillsTotal: data.pages[1].fills.length,
        fillsRetained: r2.businessFills.length,
        unfoldedFillsCount: r2.unfoldedFillsCount,
        invalidDateCount: r2.invalidDateCount,
        monthsDetected: buildMonthCenters(data.pages[1].texts).length,
        dayRowsDetected: Object.keys(buildDayRows(data.pages[1].texts)).length,
      },
    },
    matchSummary: {
      M1: {
        matched: cmpM1.matched,
        unmatched: cmpM1.unmatched,
        total: cmpM1.matched + cmpM1.unmatched,
        unknownInSkeleton: cmpM1.unknownInSkeleton,
      },
      M2: {
        matched: cmpM2.matched,
        unmatched: cmpM2.unmatched,
        total: cmpM2.matched + cmpM2.unmatched,
        unknownInSkeleton: cmpM2.unknownInSkeleton,
        ceilingMatches: m2CeilingMatches,
        ceilingRate: m2CeilingRate,
      },
      consolidated: {
        matched: totalMatched,
        unmatched: totalUnmatched,
        total: totalCompared,
        matchRate,
        verdict,
      },
    },
  };
  finalJson.groups['M1_CCA_2025-2026'] = r1.skeleton;
  finalJson.groups['M2_CCA_2025-2026'] = r2.skeleton;
  writeFileSync(OUTPUT_GRID_JSON, JSON.stringify(finalJson, null, 2));

  // 2. Markdown report — 5 sections
  const md = [];
  md.push('# Spike #1 — Étape 1B.6.2 — Match report Matthieu');
  md.push('');
  md.push(`Generated: ${generatedAt}`);
  md.push('');

  // Section 1 — Score par groupe + consolidé
  md.push('## 1. Score par groupe + consolidé');
  md.push('');
  md.push(`- **M1 CCA** : ${cmpM1.matched} / ${cmpM1.matched + cmpM1.unmatched} (${(cmpM1.matched / (cmpM1.matched + cmpM1.unmatched) * 100).toFixed(1)}%)`);
  md.push(`- **M2 CCA** : ${cmpM2.matched} / ${cmpM2.matched + cmpM2.unmatched} (${(cmpM2.matched / (cmpM2.matched + cmpM2.unmatched) * 100).toFixed(1)}%)`);
  md.push(`- **Consolidé Matthieu** : **${totalMatched} / ${totalCompared} (${(matchRate * 100).toFixed(1)}%)**`);
  md.push('');
  md.push(`**Verdict cible cadrage 28 avril** : ≥80% = signal fort, 50-80% = zone grise, <50% = pdf.js insuffisant`);
  md.push(`**Verdict observé** : **${verdict}**`);
  md.push('');
  md.push('### Stats extraction');
  md.push('');
  md.push('| Mesure | M1 | M2 |');
  md.push('|---|---:|---:|');
  md.push(`| Fills total page | ${data.pages[0].fills.length} | ${data.pages[1].fills.length} |`);
  md.push(`| Fills métier retenus | ${r1.businessFills.length} | ${r2.businessFills.length} |`);
  md.push(`| Fills dépliés (width > 150) | ${r1.unfoldedFillsCount} | ${r2.unfoldedFillsCount} |`);
  md.push(`| Dates invalides ignorées | ${r1.invalidDateCount} | ${r2.invalidDateCount} |`);
  md.push(`| Semaines unknown squelette | ${cmpM1.unknownInSkeleton} | ${cmpM2.unknownInSkeleton} |`);
  md.push('');

  // Section 2 — Anomalie Soutenance M2
  md.push('## 2. Anomalie attendue — Soutenance M2 (DETTE #40)');
  md.push('');
  md.push(`Semaine du 1er juin 2026 (M2) : pdf.js a extrait **${soutVotes}/5 jours école** (jours 1, 2, 3 juin uniquement, jours 4-5 absents du JSON).`);
  md.push('');
  md.push(`- Status squelette obtenu : **${soutPredicted}** (confidence ${soutWeek?.confidence ?? 'n/a'})`);
  md.push(`- Statut attendu vérité terrain : **${soutExpected}**`);
  md.push(`- Match Soutenance : **${soutCountsAsMatch ? '✅ oui' : '❌ non'}**`);
  md.push('');
  md.push(`Score M2 obtenu : **${cmpM2.matched} / ${m2Total} (${(cmpM2.matched / m2Total * 100).toFixed(1)}%)**`);
  md.push(`Plafond théorique M2 (si Soutenance était correctement classée) : **${m2CeilingMatches} / ${m2Total} (${(m2CeilingRate * 100).toFixed(1)}%)**`);
  md.push('');
  if (soutCountsAsMatch) {
    md.push(`Note : malgré l'anomalie DETTE #40 (2 jours manquants), la politique 3/5 a tranché correctement (3 votes ≥ 3 → school = attendu). Le score M2 ne souffre donc PAS mécaniquement de la DETTE #40 ici. La confidence reste impactée (0.6 au lieu de 1.0).`);
  } else {
    md.push(`Note : l'anomalie DETTE #40 a fait basculer cette semaine en mismatch. Plafond théorique = score si on avait les 5 votes attendus.`);
  }
  md.push('');

  // Section 3 — Liste des mismatches
  md.push('## 3. Liste des mismatches');
  md.push('');
  for (const grpName of ['M1_CCA_2025-2026', 'M2_CCA_2025-2026']) {
    const cmp = grpName === 'M1_CCA_2025-2026' ? cmpM1 : cmpM2;
    md.push(`### ${grpName} — ${cmp.mismatches.length} mismatches`);
    md.push('');
    if (cmp.mismatches.length === 0) {
      md.push('_Aucun mismatch sur ce groupe._');
      md.push('');
      continue;
    }
    md.push('| week_start_iso | attendu | observé PDF (col 3) | status squelette | votes | confiance pre-saisie | notes |');
    md.push('|---|---|---|---|---:|---|---|');
    for (const m of cmp.mismatches) {
      const notes = (m.notes || '').replace(/\|/g, '\\|');
      const colorList = m.voteColors.length > 0 ? m.voteColors.join(' ') : '(aucun)';
      md.push(`| ${m.weekStartISO} | ${m.expected} | ${m.observedPdf || '(vide)'} | ${m.predicted} (${colorList}) | ${m.votes} | ${m.confiance_proposition || '(vide)'} | ${notes} |`);
    }
    md.push('');
  }

  // Section 4 — Section unknown
  md.push('## 4. Analyse des semaines unknown du squelette');
  md.push('');
  for (const grpName of ['M1_CCA_2025-2026', 'M2_CCA_2025-2026']) {
    const cmp = grpName === 'M1_CCA_2025-2026' ? cmpM1 : cmpM2;
    md.push(`### ${grpName} — ${cmp.unknowns.length} unknown`);
    md.push('');
    if (cmp.unknowns.length === 0) {
      md.push('_Aucun unknown sur ce groupe._');
      md.push('');
      continue;
    }
    md.push('| week_start_iso | votes (1 ou 2) | attendu CSV | observé PDF | confiance pré-saisie | notes |');
    md.push('|---|---:|---|---|---|---|');
    for (const u of cmp.unknowns) {
      const notes = (u.notes || '').replace(/\|/g, '\\|');
      md.push(`| ${u.weekStartISO} | ${u.votes} | ${u.statut_business_attendu} | ${u.statut_observe_pdf || '(vide)'} | ${u.confiance_proposition || '(vide)'} | ${notes} |`);
    }
    md.push('');

    // Mini-tableau de ventilation par confiance pré-saisie
    const ventilation = { haute: 0, moyenne: 0, basse: 0, autre: 0 };
    for (const u of cmp.unknowns) {
      const c = (u.confiance_proposition || '').toLowerCase();
      if (c === 'haute' || c === 'moyenne' || c === 'basse') ventilation[c]++;
      else ventilation.autre++;
    }
    md.push(`**Ventilation des unknown ${grpName} par confiance pré-saisie** :`);
    md.push('');
    md.push(`- haute  : ${ventilation.haute}`);
    md.push(`- moyenne: ${ventilation.moyenne}`);
    md.push(`- basse  : ${ventilation.basse}`);
    if (ventilation.autre > 0) md.push(`- autre  : ${ventilation.autre}`);
    md.push('');
    md.push(`Lecture : si les unknown se concentrent sur les semaines pré-flaguées \`basse\` à la génération du squelette, c'est un signal que le pré-screening était bien calibré. Sinon, problème de classification plus large à creuser.`);
    md.push('');
  }

  // Section 5 — Commentaires libres
  md.push('## 5. Commentaires libres');
  md.push('');
  md.push('_(à remplir manuellement après lecture du rapport)_');
  md.push('');

  writeFileSync(OUTPUT_REPORT_MD, md.join('\n'));

  // 3. SVGs (un par groupe)
  const m1Total = cmpM1.matched + cmpM1.unmatched;
  const scoreM1 = {
    matched: cmpM1.matched,
    total: m1Total,
    matchRate: m1Total > 0 ? cmpM1.matched / m1Total : 0,
    verdict: m1Total > 0 && cmpM1.matched / m1Total >= 0.8 ? 'signal fort' : 'à analyser',
  };
  const scoreM2 = {
    matched: cmpM2.matched,
    total: m2Total,
    matchRate: m2Total > 0 ? cmpM2.matched / m2Total : 0,
    verdict: m2Total > 0 && cmpM2.matched / m2Total >= 0.8 ? 'signal fort' : 'à analyser',
  };
  writeFileSync(
    OUTPUT_SVG_P1,
    renderSvg({
      viewport: data.pages[0].viewport,
      fillsRetained: r1.businessFills,
      skeleton: r1.skeleton,
      matchByWeek: cmpM1.matchByWeek,
      score: scoreM1,
      monthCenters: buildMonthCenters(data.pages[0].texts),
      groupName: 'M1 CCA',
    })
  );
  writeFileSync(
    OUTPUT_SVG_P2,
    renderSvg({
      viewport: data.pages[1].viewport,
      fillsRetained: r2.businessFills,
      skeleton: r2.skeleton,
      matchByWeek: cmpM2.matchByWeek,
      score: scoreM2,
      monthCenters: buildMonthCenters(data.pages[1].texts),
      groupName: 'M2 CCA',
    })
  );

  // ----------------------------------------------------------------
  // Stdout reporting
  // ----------------------------------------------------------------
  console.log('=== Étape 1B.6.2 — Matthieu ===');
  console.log('');
  console.log('--- Sanity ---');
  console.log(`Vérité terrain : ${truthRows.length} lignes saisies (col 4 non vide)`);
  console.log(`Fills retenus  : p1=${r1.businessFills.length}, p2=${r2.businessFills.length}`);
  console.log(`Fills dépliés  : p1=${r1.unfoldedFillsCount}, p2=${r2.unfoldedFillsCount}`);
  console.log(`Dates invalides ignorées : p1=${r1.invalidDateCount}, p2=${r2.invalidDateCount}`);
  console.log('');
  console.log('--- Score par groupe ---');
  console.log(`M1 CCA   : ${cmpM1.matched} / ${cmpM1.matched + cmpM1.unmatched} (${((cmpM1.matched / (cmpM1.matched + cmpM1.unmatched)) * 100).toFixed(1)}%)`);
  console.log(`M2 CCA   : ${cmpM2.matched} / ${cmpM2.matched + cmpM2.unmatched} (${((cmpM2.matched / (cmpM2.matched + cmpM2.unmatched)) * 100).toFixed(1)}%)`);
  console.log(`Consolidé: ${totalMatched} / ${totalCompared} (${(matchRate * 100).toFixed(1)}%)`);
  console.log(`Verdict cible : ${verdict}`);
  console.log('');
  console.log('--- Mismatches & unknown par groupe ---');
  console.log(`M1 : ${cmpM1.mismatches.length} mismatches, ${cmpM1.unknownInSkeleton} unknown`);
  console.log(`M2 : ${cmpM2.mismatches.length} mismatches, ${cmpM2.unknownInSkeleton} unknown`);
  console.log('');
  console.log('--- Anomalie Soutenance M2 (DETTE #40) ---');
  console.log(`Semaine 2026-06-01 : ${soutVotes}/5 votes, status=${soutPredicted}, attendu=${soutExpected}, match=${soutCountsAsMatch ? 'oui' : 'non'}`);
  console.log(`Plafond théorique M2 : ${m2CeilingMatches} / ${m2Total} (${(m2CeilingRate * 100).toFixed(1)}%)`);
  console.log('');
  console.log('--- Fichiers écrits ---');
  for (const p of [OUTPUT_GRID_JSON, OUTPUT_REPORT_MD, OUTPUT_SVG_P1, OUTPUT_SVG_P2]) {
    const sz = statSync(p).size;
    console.log(`  ${p.split('/').pop()} : ${(sz / 1024).toFixed(1)} Ko`);
  }
}

main();
