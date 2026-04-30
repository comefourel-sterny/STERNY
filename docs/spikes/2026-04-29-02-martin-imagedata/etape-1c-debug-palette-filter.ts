// Spike #2 Martin — Étape 1C debug : approche B "filtre par distance à la palette".
//
// Objectif : remplacer le filtre luminance [80, 230] de l'étape 1A bis par un
// filtre palette qui extrait automatiquement les centroïdes jaune-école et
// vert-entreprise depuis les 42 cellules non-erronées (semaines 1..45 sauf
// {2, 5, 9}), puis classe chaque pixel comme "fond_jaune", "fond_vert" ou
// "rejeté" selon sa distance euclidienne RGB aux 2 centroïdes.
//
// Pas de modification de l'algo de production (etape-1a-bis-grille-uniforme.ts
// reste intact). Tout dans ce script est isolé.
//
// Pipeline en 4 phases :
//   1. Extraction palette : centroïdes jaune et vert depuis les pixels filtrés
//      luminance [80, 230] des 42 cellules non-erreur.
//   2. Définition du filtre palette : un pixel est "fond_jaune" si distance
//      RGB au centroïde jaune < RAYON_PALETTE, "fond_vert" si distance au
//      centroïde vert < RAYON_PALETTE, "rejeté" sinon.
//   3. Reclassification des 45 cellules avec le nouveau filtre, comparaison
//      cellule-par-cellule au CSV vérité terrain.
//   4. Score global + focus sur semaines {2, 5, 9} + sauvegarde JSON.

import { decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const FIXTURE_PATH = new URL("./fixtures/Planning_Martin.JPG", import.meta.url);
const TRUTH_CSV = new URL("./fixtures/martin-ground-truth.csv", import.meta.url);
const OUTPUT_JSON = new URL("./etape-1c-results.json", import.meta.url);

// Paramètres run 2 1A bis (reproduction exacte)
const COL_X_CENTER = 358;
const Y_FIRST = 537;
const Y_LAST = 1204;
const N_WEEKS = 45;
const WINDOW_HALF = 3;
const LUM_MIN = 80;
const LUM_MAX = 230;

// Cellules erronées du run 2 1B (à exclure de l'extraction palette)
const ERROR_WEEKS = new Set([2, 5, 9]);

// Seuil distance euclidienne RGB pour le filtre palette
// Initialisé à 80 selon le brief — paramètre d'expérimentation
const RAYON_PALETTE = 80;

// Score de référence du run 2 1B pour calculer le différentiel
const SCORE_REF_1B = { matches: 42, total: 45, pct: 93.33 };

// ----------------------------------------------------------------
// Helpers (calque du script 1A bis pour cohérence)
// ----------------------------------------------------------------

function rgbAt(image: any, x: number, y: number): { r: number; g: number; b: number } {
  const p = image.getPixelAt(x, y);
  return {
    r: (p >> 24) & 0xff,
    g: (p >> 16) & 0xff,
    b: (p >> 8) & 0xff,
  };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function distRGB(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// ----------------------------------------------------------------
// Lecture vérité terrain
// ----------------------------------------------------------------
async function loadTruth(): Promise<Map<number, { iso: string; observed: string }>> {
  const raw = await Deno.readTextFile(TRUTH_CSV);
  const lines = raw.split(/\r?\n/);
  const map = new Map<number, { iso: string; observed: string }>();
  let weekIdx = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const cols = line.split(",").map((s) => s.trim());
    if (!cols[0].startsWith("FA_CG2P_G1")) continue;
    weekIdx++;
    map.set(weekIdx, { iso: cols[1], observed: cols[2] });
  }
  return map;
}

// ----------------------------------------------------------------
// Échantillonnage fenêtre 7×7 avec filtre luminance [80, 230]
// (réutilisation EXACTE du filtre 1A bis pour la phase 1)
// ----------------------------------------------------------------
function sampleWindow7x7Luminance(image: any, xc: number, yc: number, W: number, H: number) {
  const pixels: Array<{ r: number; g: number; b: number }> = [];
  for (let dx = -WINDOW_HALF; dx <= WINDOW_HALF; dx++) {
    for (let dy = -WINDOW_HALF; dy <= WINDOW_HALF; dy++) {
      const x = xc + dx;
      const y = yc + dy;
      if (x < 1 || x > W || y < 1 || y > H) continue;
      const { r, g, b } = rgbAt(image, x, y);
      const lum = (r + g + b) / 3;
      if (lum < LUM_MIN || lum > LUM_MAX) continue;
      pixels.push({ r, g, b });
    }
  }
  return pixels;
}

// ----------------------------------------------------------------
// Échantillonnage fenêtre 7×7 SANS filtre (pour phase 3)
// ----------------------------------------------------------------
function sampleWindow7x7Raw(image: any, xc: number, yc: number, W: number, H: number) {
  const pixels: Array<{ r: number; g: number; b: number }> = [];
  for (let dx = -WINDOW_HALF; dx <= WINDOW_HALF; dx++) {
    for (let dy = -WINDOW_HALF; dy <= WINDOW_HALF; dy++) {
      const x = xc + dx;
      const y = yc + dy;
      if (x < 1 || x > W || y < 1 || y > H) continue;
      const { r, g, b } = rgbAt(image, x, y);
      pixels.push({ r, g, b });
    }
  }
  return pixels;
}

// ----------------------------------------------------------------
// Pipeline principal
// ----------------------------------------------------------------
async function main() {
  console.log("=== Spike #2 — Étape 1C : filtre palette par distance euclidienne ===\n");

  const bytes = await Deno.readFile(FIXTURE_PATH);
  const image = await decode(bytes);
  const W = image.width;
  const H = image.height;
  console.log(`Image décodée : ${W} × ${H} px`);

  const step = (Y_LAST - Y_FIRST) / (N_WEEKS - 1);
  console.log(`Paramètres : COL_X_CENTER=${COL_X_CENTER}, Y_FIRST=${Y_FIRST}, Y_LAST=${Y_LAST}, step=${step.toFixed(4)}`);
  console.log(`RAYON_PALETTE = ${RAYON_PALETTE} (seuil distance euclidienne RGB pour appartenance à un fond)`);
  console.log(`Cellules erronées exclues de la phase 1 : {${[...ERROR_WEEKS].join(", ")}}\n`);

  const truth = await loadTruth();

  // Calcul des 45 centres
  const centers: Array<{ week: number; x: number; y: number }> = [];
  for (let k = 0; k < N_WEEKS; k++) {
    const y = Math.round(Y_FIRST + k * step);
    centers.push({ week: k + 1, x: COL_X_CENTER, y });
  }

  // ===========================================================
  // PHASE 1 — Extraction des centroïdes palette
  // ===========================================================
  console.log("=== Phase 1 — extraction palette sur les 42 cellules non-erreur ===\n");

  const jaunePixels: Array<{ r: number; g: number; b: number }> = [];
  const vertPixels: Array<{ r: number; g: number; b: number }> = [];

  for (const c of centers) {
    if (ERROR_WEEKS.has(c.week)) continue;
    const t = truth.get(c.week);
    if (!t) continue;
    const px = sampleWindow7x7Luminance(image, c.x, c.y, W, H);
    if (t.observed === "school") {
      jaunePixels.push(...px);
    } else if (t.observed === "company") {
      vertPixels.push(...px);
    }
  }

  const centroidJaune = {
    r: median(jaunePixels.map((p) => p.r)),
    g: median(jaunePixels.map((p) => p.g)),
    b: median(jaunePixels.map((p) => p.b)),
    n_pixels: jaunePixels.length,
  };
  const centroidVert = {
    r: median(vertPixels.map((p) => p.r)),
    g: median(vertPixels.map((p) => p.g)),
    b: median(vertPixels.map((p) => p.b)),
    n_pixels: vertPixels.length,
  };

  console.log(`Centroïde jaune_palette  : RGB(${centroidJaune.r}, ${centroidJaune.g}, ${centroidJaune.b}) = ${toHex(centroidJaune.r, centroidJaune.g, centroidJaune.b)}  (n=${centroidJaune.n_pixels} pixels)`);
  console.log(`Centroïde vert_palette   : RGB(${centroidVert.r}, ${centroidVert.g}, ${centroidVert.b}) = ${toHex(centroidVert.r, centroidVert.g, centroidVert.b)}  (n=${centroidVert.n_pixels} pixels)\n`);

  // ===========================================================
  // PHASE 2 — Définition du filtre palette
  // ===========================================================
  console.log(`=== Phase 2 — filtre palette défini avec RAYON_PALETTE=${RAYON_PALETTE} ===\n`);

  function classifyPixel(r: number, g: number, b: number): "fond_jaune" | "fond_vert" | "rejeté" {
    const dJ = distRGB(r, g, b, centroidJaune.r, centroidJaune.g, centroidJaune.b);
    const dV = distRGB(r, g, b, centroidVert.r, centroidVert.g, centroidVert.b);
    if (dJ < RAYON_PALETTE && dJ <= dV) return "fond_jaune";
    if (dV < RAYON_PALETTE && dV < dJ) return "fond_vert";
    return "rejeté";
  }

  // ===========================================================
  // PHASE 3 — Reclassification des 45 cellules
  // ===========================================================
  console.log("=== Phase 3 — reclassification des 45 cellules avec filtre palette ===\n");

  type Verdict = "school" | "company" | "ambigu" | "indéterminé";
  type CellResult = {
    week: number;
    week_start_iso: string;
    center: { x: number; y: number };
    n_fond_jaune: number;
    n_fond_vert: number;
    n_rejeté: number;
    verdict: Verdict;
    observed: string;
    match: boolean;
  };

  const results: CellResult[] = [];

  for (const c of centers) {
    const t = truth.get(c.week);
    const observed = t?.observed ?? "(unknown)";
    const px = sampleWindow7x7Raw(image, c.x, c.y, W, H);
    let n_fond_jaune = 0, n_fond_vert = 0, n_rejeté = 0;
    for (const p of px) {
      const cls = classifyPixel(p.r, p.g, p.b);
      if (cls === "fond_jaune") n_fond_jaune++;
      else if (cls === "fond_vert") n_fond_vert++;
      else n_rejeté++;
    }

    let verdict: Verdict;
    if (n_fond_jaune + n_fond_vert < 5) {
      verdict = "indéterminé";
    } else if (n_fond_jaune > n_fond_vert) {
      verdict = "school";
    } else if (n_fond_vert > n_fond_jaune) {
      verdict = "company";
    } else {
      verdict = "ambigu";
    }

    const match = verdict === observed;
    results.push({
      week: c.week,
      week_start_iso: t?.iso ?? "(unknown)",
      center: { x: c.x, y: c.y },
      n_fond_jaune,
      n_fond_vert,
      n_rejeté,
      verdict,
      observed,
      match,
    });
  }

  // ===========================================================
  // PHASE 4 — Affichage + JSON
  // ===========================================================
  console.log(`=== Phase 4 — résultats ===\n`);
  console.log("week  iso          x,y          n_jaune  n_vert  n_rejeté  verdict       observed     match");
  for (const r of results) {
    const wk = String(r.week).padStart(2);
    const xy = `(${r.center.x}, ${r.center.y})`.padEnd(12);
    const nj = String(r.n_fond_jaune).padStart(2);
    const nv = String(r.n_fond_vert).padStart(2);
    const nr = String(r.n_rejeté).padStart(2);
    const v = r.verdict.padEnd(13);
    const o = r.observed.padEnd(11);
    const m = r.match ? "OK  " : "FAIL";
    const errMark = ERROR_WEEKS.has(r.week) ? " ←" : "";
    console.log(`  ${wk}  ${r.week_start_iso}   ${xy}    ${nj}/49    ${nv}/49   ${nr}/49     ${v}  ${o}  ${m}${errMark}`);
  }

  const matches = results.filter((r) => r.match).length;
  const score_pct = Math.round((matches / N_WEEKS) * 10000) / 100;

  console.log(`\n=== Score global ===`);
  console.log(`Run 1C : ${matches}/${N_WEEKS} (${score_pct.toFixed(2)}%)`);
  console.log(`Run 2 1B (référence) : ${SCORE_REF_1B.matches}/${SCORE_REF_1B.total} (${SCORE_REF_1B.pct}%)`);
  const delta = matches - SCORE_REF_1B.matches;
  console.log(`Différentiel : ${delta > 0 ? "+" : ""}${delta} cellules`);

  console.log(`\n=== Focus sur les 3 semaines précédemment erronées (2, 5, 9) ===`);
  for (const wk of [...ERROR_WEEKS].sort((a, b) => a - b)) {
    const r = results.find((x) => x.week === wk);
    if (!r) continue;
    const status = r.match ? "✅ RÉSOLUE" : "❌ TOUJOURS EN ERREUR";
    console.log(`  Week ${String(wk).padStart(2)} (${r.week_start_iso}) : verdict=${r.verdict}, observed=${r.observed}, n_jaune=${r.n_fond_jaune}/49, n_vert=${r.n_fond_vert}/49, n_rejeté=${r.n_rejeté}/49 → ${status}`);
  }

  // Sauvegarde JSON
  const output = {
    generated_at: new Date().toISOString(),
    params: {
      COL_X_CENTER,
      Y_FIRST,
      Y_LAST,
      step,
      WINDOW_HALF,
      LUM_MIN,
      LUM_MAX,
      RAYON_PALETTE,
    },
    centroides: {
      jaune_palette: { ...centroidJaune, hex: toHex(centroidJaune.r, centroidJaune.g, centroidJaune.b) },
      vert_palette: { ...centroidVert, hex: toHex(centroidVert.r, centroidVert.g, centroidVert.b) },
    },
    error_weeks_excluded_from_phase_1: [...ERROR_WEEKS].sort((a, b) => a - b),
    score: {
      run_1c_matches: matches,
      run_1c_total: N_WEEKS,
      run_1c_pct: score_pct,
      run_2_1b_ref: SCORE_REF_1B,
      delta_cells: delta,
    },
    cells: results,
  };
  await Deno.writeTextFile(OUTPUT_JSON, JSON.stringify(output, null, 2));
  console.log(`\nJSON écrit : ${OUTPUT_JSON.pathname}`);
}

if (import.meta.main) {
  await main();
}
