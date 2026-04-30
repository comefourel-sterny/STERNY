// Spike #2 Martin — Script de debug pour DETTE #41
// Périmètre : investigation des 3 erreurs résiduelles du run 2 1B (semaines 2, 5, 9).
// N'altère pas l'algo de production. Sortie pure : 1 PNG annotée + 1 JSON couleurs.
//
// 2 sorties produites :
//
//   1. debug-dette-41-markers.png — Planning_Martin.JPG avec :
//      - 1 croix rouge 5×5 px sur chaque centre de cellule calculé (45 markers)
//      - 1 carré rouge 3×3 px en (x+12, y) pour servir de repère du numéro de
//        semaine (la lib imagescript@1.2.17 ne fait pas de drawing texte simple
//        sur image, voir ci-dessus). La correspondance numéro ↔ position du
//        carré est imprimée dans la sortie console + sauvegardée dans le JSON.
//
//   2. debug-dette-41-colors.json — pour chaque cellule erronée (semaines 2,
//      5, 9), 14 hex échantillonnés à 14 positions différentes (centre, 8
//      voisins ±5 px, 4 voisins ±10 px) + le hex moyen filtré sur la fenêtre
//      7×7 (réutilisation EXACTE de la fonction du run 2 1A bis) + verdict.

import { decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const FIXTURE_PATH = new URL("./fixtures/Planning_Martin.JPG", import.meta.url);
const OUTPUT_PNG = new URL("./debug-dette-41-markers.png", import.meta.url);
const OUTPUT_JSON = new URL("./debug-dette-41-colors.json", import.meta.url);
const TRUTH_CSV = new URL("./fixtures/martin-ground-truth.csv", import.meta.url);

// Paramètres run 2 1A bis (reproduction exacte)
const COL_X_CENTER = 358;
const Y_FIRST = 537;
const Y_LAST = 1204;
const N_WEEKS = 45;
const WINDOW_HALF = 3;
const LUM_MIN = 80;
const LUM_MAX = 230;

// Cellules erronées à investiguer (DETTE #41)
const ERROR_WEEKS = [2, 5, 9];

// Couleur des annotations sur le PNG : rouge pur opaque
// imagescript@1.2.17 attend uint32 RGBA (R<<24 | G<<16 | B<<8 | A)
const RED_RGBA = (255 << 24) | (0 << 16) | (0 << 8) | 0xff;

// ----------------------------------------------------------------
// Helpers (calques du script 1A bis)
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

function classifyBucket(r: number, g: number, b: number): "jaune" | "vert" | "autre" {
  if (r > 200 && g > 180 && b < 150) return "jaune";
  if (g > r && g > b) return "vert";
  return "autre";
}

function bucketToStatut(b: string): "school" | "company" | "unknown" {
  if (b === "jaune") return "school";
  if (b === "vert") return "company";
  return "unknown";
}

// Échantillonnage 1 pixel
function sample1(image: any, x: number, y: number, W: number, H: number): { hex: string; r: number; g: number; b: number } | null {
  if (x < 1 || x > W || y < 1 || y > H) return null;
  const { r, g, b } = rgbAt(image, x, y);
  return { hex: toHex(r, g, b), r, g, b };
}

// Échantillonnage médiane filtrée sur fenêtre 7×7 (reproduction EXACTE du run 2 1A bis)
function sample7x7Filtered(image: any, xc: number, yc: number, W: number, H: number) {
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let dx = -WINDOW_HALF; dx <= WINDOW_HALF; dx++) {
    for (let dy = -WINDOW_HALF; dy <= WINDOW_HALF; dy++) {
      const x = xc + dx;
      const y = yc + dy;
      if (x < 1 || x > W || y < 1 || y > H) continue;
      const { r, g, b } = rgbAt(image, x, y);
      const lum = (r + g + b) / 3;
      if (lum < LUM_MIN || lum > LUM_MAX) continue;
      rs.push(r); gs.push(g); bs.push(b);
    }
  }
  const n_used = rs.length;
  const r_med = median(rs);
  const g_med = median(gs);
  const b_med = median(bs);
  return {
    hex: toHex(r_med, g_med, b_med),
    r: r_med, g: g_med, b: b_med,
    n_pixels_used: n_used,
    bucket: classifyBucket(r_med, g_med, b_med),
  };
}

// Dessine 1 pixel rouge sur l'image (1-indexed)
function setRed(image: any, x: number, y: number, W: number, H: number) {
  if (x < 1 || x > W || y < 1 || y > H) return;
  image.setPixelAt(x, y, RED_RGBA);
}

// Dessine une croix rouge 5×5 (rayon 2 dans chaque direction depuis le centre)
function drawCross(image: any, x: number, y: number, W: number, H: number) {
  for (let d = -2; d <= 2; d++) {
    setRed(image, x + d, y, W, H);
    setRed(image, x, y + d, W, H);
  }
}

// Dessine un petit carré 3×3 px plein
function drawSquare(image: any, x: number, y: number, W: number, H: number) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      setRed(image, x + dx, y + dy, W, H);
    }
  }
}

// ----------------------------------------------------------------
// Lecture vérité terrain pour récupérer le statut observed
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
// Main
// ----------------------------------------------------------------
async function main() {
  console.log("=== Spike #2 — Debug DETTE #41 ===\n");

  const bytes = await Deno.readFile(FIXTURE_PATH);
  const image = await decode(bytes);
  const W = image.width;
  const H = image.height;
  console.log(`Image décodée : ${W} × ${H} px\n`);

  const step = (Y_LAST - Y_FIRST) / (N_WEEKS - 1);
  console.log(`Paramètres run 2 : COL_X_CENTER=${COL_X_CENTER}, Y_FIRST=${Y_FIRST}, Y_LAST=${Y_LAST}, step=${step.toFixed(4)} px\n`);

  const truth = await loadTruth();

  // Calcul des 45 centres
  const centers: Array<{ week: number; x: number; y: number }> = [];
  for (let k = 0; k < N_WEEKS; k++) {
    const y = Math.round(Y_FIRST + k * step);
    centers.push({ week: k + 1, x: COL_X_CENTER, y });
  }

  // ---------------------------------------------------
  // SORTIE B — JSON couleurs sur les cellules erronées
  // ⚠️ ÉCHANTILLONNAGE FAIT EN PREMIER, AVANT TOUTE ÉCRITURE SUR L'IMAGE.
  // Sinon les pixels rouges des croix contaminent la fenêtre 7×7 et faussent
  // les médianes (bug détecté au run précédent : 9 pixels rouges sur 49 dans
  // la fenêtre dx ∈ [-3,+3], dy ∈ [-3,+3], faisaient basculer le bucket
  // vert → jaune).
  // ---------------------------------------------------
  console.log(`=== Échantillonnage couleurs sur les semaines erronées ${ERROR_WEEKS.join(", ")} ===\n`);

  // 13 offsets : centre + 8 voisins ±5 + 4 voisins ±10
  const OFFSETS_5: Array<[number, number, string]> = [
    [0, 0, "centre"],
    [-5, -5, "(-5,-5)"], [-5, 0, "(-5, 0)"], [-5, +5, "(-5,+5)"],
    [0, -5, "(0,-5)"], [0, +5, "(0,+5)"],
    [+5, -5, "(+5,-5)"], [+5, 0, "(+5,0)"], [+5, +5, "(+5,+5)"],
  ];
  const OFFSETS_10: Array<[number, number, string]> = [
    [-10, 0, "(-10,0)"], [+10, 0, "(+10,0)"],
    [0, -10, "(0,-10)"], [0, +10, "(0,+10)"],
  ];

  const debugEntries: Array<any> = [];

  for (const wk of ERROR_WEEKS) {
    const c = centers.find((x) => x.week === wk);
    if (!c) continue;
    const t = truth.get(wk);

    const samples_5: Record<string, any> = {};
    for (const [dx, dy, label] of OFFSETS_5) {
      const s = sample1(image, c.x + dx, c.y + dy, W, H);
      samples_5[label] = s ? { hex: s.hex, r: s.r, g: s.g, b: s.b } : null;
    }
    const samples_10: Record<string, any> = {};
    for (const [dx, dy, label] of OFFSETS_10) {
      const s = sample1(image, c.x + dx, c.y + dy, W, H);
      samples_10[label] = s ? { hex: s.hex, r: s.r, g: s.g, b: s.b } : null;
    }

    const window7x7 = sample7x7Filtered(image, c.x, c.y, W, H);
    const predicted = bucketToStatut(window7x7.bucket);
    const observed = t?.observed ?? "(unknown)";
    const match = predicted === observed;

    const entry = {
      week_index: wk,
      week_start_iso: t?.iso ?? "(unknown)",
      center: { x: c.x, y: c.y },
      samples_radius_5: samples_5,
      samples_radius_10: samples_10,
      window_7x7_filtered_median: window7x7,
      verdict: {
        predicted,
        observed,
        match,
      },
    };
    debugEntries.push(entry);

    // Résumé console pour la semaine
    console.log(`--- Week ${wk} (${entry.week_start_iso}) — center (${c.x}, ${c.y}) ---`);
    console.log(`  Window 7×7 filtré médiane : ${window7x7.hex}  R=${window7x7.r} G=${window7x7.g} B=${window7x7.b}  bucket=${window7x7.bucket}  (n_used=${window7x7.n_pixels_used}/49)`);
    console.log(`  Verdict : predicted=${predicted}, observed=${observed}, match=${match ? "OK" : "FAIL"}`);
    console.log(`  Échantillons 1-pixel à rayon 5 :`);
    for (const [, , label] of OFFSETS_5) {
      const s = samples_5[label];
      console.log(`    ${label.padEnd(8)} → ${s ? s.hex : "(hors image)"}`);
    }
    console.log(`  Échantillons 1-pixel à rayon 10 :`);
    for (const [, , label] of OFFSETS_10) {
      const s = samples_10[label];
      console.log(`    ${label.padEnd(8)} → ${s ? s.hex : "(hors image)"}`);
    }
    console.log("");
  }

  await Deno.writeTextFile(OUTPUT_JSON, JSON.stringify({
    generated_at: new Date().toISOString(),
    params: { COL_X_CENTER, Y_FIRST, Y_LAST, step, WINDOW_HALF, LUM_MIN, LUM_MAX },
    error_weeks: ERROR_WEEKS,
    cells: debugEntries,
  }, null, 2));
  console.log(`JSON écrit : ${OUTPUT_JSON.pathname}\n`);

  // ---------------------------------------------------
  // SORTIE A — annotation PNG des 45 markers
  // (drawing fait APRÈS l'échantillonnage pour ne pas contaminer)
  // ---------------------------------------------------
  console.log(`=== Annotation PNG ===`);
  console.log(`Pour chaque marker : croix rouge 5×5 centrée sur (x, y), petit carré 3×3 en (x+12, y) comme repère du numéro de semaine.\n`);
  console.log(`Table de correspondance (week → x_marker, y_marker, x_carre_repere, y_carre_repere) :`);
  for (const c of centers) {
    drawCross(image, c.x, c.y, W, H);
    drawSquare(image, c.x + 12, c.y, W, H);
    if (c.week <= 5 || c.week >= 41 || ERROR_WEEKS.includes(c.week)) {
      console.log(`  week ${String(c.week).padStart(2)} → marker (${c.x}, ${c.y}), carré (${c.x + 12}, ${c.y})`);
    }
  }
  console.log(`  (les autres markers sont aux mêmes x=358 avec y régulièrement espacés de ~15.16 px)\n`);

  const png = await image.encode(); // PNG par défaut en imagescript
  await Deno.writeFile(OUTPUT_PNG, png);
  console.log(`PNG annoté écrit : ${OUTPUT_PNG.pathname}`);
}

if (import.meta.main) {
  await main();
}
