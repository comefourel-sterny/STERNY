// Étape 1A bis spike #2 — extraction couleur 45 cellules par division uniforme
// Périmètre : colonne FA CG2P G1 uniquement, 45 semaines attendues.
//
// Ancrages cliqués manuellement par Côme dans pick-coordinates.html :
//   semaine 1  (2026-08-31) : (358, 537) — recalibré après vérif visuelle markers
//   semaine 45 (dernière)   : (357, 1204)
// Pas vertical entre 2 cellules consécutives = (1204 - 537) / 44 = 15.16 px
//
// Phase B (filtrage luminance + médiane RGB sur fenêtre 7x7) reprise telle quelle de 1A.

import { decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const FIXTURE_PATH = new URL("./fixtures/Planning_Martin.JPG", import.meta.url);
const OUTPUT_JSON = new URL("./output-1a-bis-couleurs-cellules.json", import.meta.url);

const COL_X_CENTER = 358;     // moyenne arrondie des 2 ancrages (358, 357)
const Y_FIRST = 537;          // ancrage clic semaine 1 (recalibré)
const Y_LAST = 1204;          // ancrage clic semaine 45
const N_WEEKS = 45;

const WINDOW_HALF = 3;        // fenêtre 7x7 = 49 pixels par cellule
const LUM_MIN = 80;           // sous ce seuil = bordure/texte sombre, pixel exclu
const LUM_MAX = 230;          // au-dessus = texte blanc/clair, pixel exclu

// imagescript@1.2.17 utilise des coordonnées 1-indexées (1 ≤ x ≤ W, 1 ≤ y ≤ H).
// Apprentissage 1A : on garde toutes les coords en 1-indexé pour rester cohérent
// avec les coords cliquées dans pick-coordinates.html (pixels naturels).

// ----------------------------------------------------------------
// Helpers
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
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
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

// ----------------------------------------------------------------
// Pipeline principal
// ----------------------------------------------------------------

async function main() {
  console.log("=== Étape 1A bis spike #2 Martin — division uniforme entre 2 ancrages ===");

  const bytes = await Deno.readFile(FIXTURE_PATH);
  const image = await decode(bytes);
  const W = image.width;
  const H = image.height;
  console.log(`Image décodée : ${W} × ${H} px`);

  // ===========================================================
  // PHASE A — calcul des 45 centres par division uniforme
  // ===========================================================
  const step = (Y_LAST - Y_FIRST) / (N_WEEKS - 1);
  console.log(`\n=== Phase A — division uniforme entre Y_FIRST et Y_LAST ===`);
  console.log(`Y_FIRST = ${Y_FIRST}, Y_LAST = ${Y_LAST}, N_WEEKS = ${N_WEEKS}`);
  console.log(`step = (${Y_LAST} - ${Y_FIRST}) / ${N_WEEKS - 1} = ${step.toFixed(4)} px`);

  const yCenters: number[] = [];
  for (let k = 0; k < N_WEEKS; k++) {
    yCenters.push(Math.round(Y_FIRST + k * step));
  }
  console.log(`5 premiers centres y : ${yCenters.slice(0, 5).join(", ")}`);
  console.log(`5 derniers centres y : ${yCenters.slice(-5).join(", ")}`);

  // ===========================================================
  // PHASE B — extraction couleur médiane par cellule (identique 1A)
  // ===========================================================
  console.log(`\n=== Phase B — extraction couleur médiane multi-pixel ===`);

  const cells = yCenters.map((yc, i) => {
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    for (let dx = -WINDOW_HALF; dx <= WINDOW_HALF; dx++) {
      for (let dy = -WINDOW_HALF; dy <= WINDOW_HALF; dy++) {
        const x = COL_X_CENTER + dx;
        const y = yc + dy;
        if (x < 1 || x > W || y < 1 || y > H) continue;
        const { r, g, b } = rgbAt(image, x, y);
        const lum = (r + g + b) / 3;
        if (lum < LUM_MIN || lum > LUM_MAX) continue;
        rs.push(r);
        gs.push(g);
        bs.push(b);
      }
    }
    const n_used = rs.length;
    const r_med = median(rs);
    const g_med = median(gs);
    const b_med = median(bs);
    return {
      week_index: i + 1,
      x_center: COL_X_CENTER,
      y_center: yc,
      hex: toHex(r_med, g_med, b_med),
      r: r_med,
      g: g_med,
      b: b_med,
      n_pixels_used: n_used,
      low_confidence: n_used < 10,
      bucket: classifyBucket(r_med, g_med, b_med),
    };
  });

  console.log(`Cellules extraites : ${cells.length}`);

  // ===========================================================
  // PHASE C — JSON output + sortie console
  // ===========================================================
  console.log(`\n=== Phase C — écriture JSON et stats ===`);

  const output = {
    generated_at: new Date().toISOString(),
    image_path: "fixtures/Planning_Martin.JPG",
    image_dimensions: { width: W, height: H },
    anchors: {
      week_1: { x: 358, y: 537 },
      week_45: { x: 357, y: 1204 },
    },
    params: {
      COL_X_CENTER,
      Y_FIRST,
      Y_LAST,
      step_px: Math.round(step * 100) / 100,
      WINDOW_HALF,
      LUM_MIN,
      LUM_MAX,
    },
    n_cellules: cells.length,
    cells,
  };

  await Deno.writeTextFile(OUTPUT_JSON, JSON.stringify(output, null, 2));
  console.log(`JSON écrit : ${OUTPUT_JSON.pathname}`);

  // Tableau ASCII
  console.log("\n=== Tableau des 45 cellules ===");
  console.log("week  y_center  hex        n_used  low_conf  bucket");
  for (const c of cells) {
    const wkIdx = String(c.week_index).padStart(2, " ");
    const yc = String(c.y_center).padStart(4, " ");
    const nu = String(c.n_pixels_used).padStart(2, " ");
    const lc = c.low_confidence ? "YES" : "—";
    console.log(`  ${wkIdx}    ${yc}      ${c.hex}    ${nu}/49   ${lc.padEnd(3, " ")}     ${c.bucket}`);
  }

  // Stats finales
  const buckets = { jaune: 0, vert: 0, autre: 0 };
  for (const c of cells) buckets[c.bucket]++;
  const lowConfCount = cells.filter((c) => c.low_confidence).length;

  console.log("\n=== Stats finales ===");
  console.log(`Distribution des buckets sur 45 cellules :`);
  console.log(`  jaune (R>200, G>180, B<150) : ${buckets.jaune}`);
  console.log(`  vert  (G>R et G>B, hors jaune) : ${buckets.vert}`);
  console.log(`  autre : ${buckets.autre}`);
  console.log(`Cellules low_confidence (n<10) : ${lowConfCount}`);

  // Détail bucket "autre" pour inspection
  const autres = cells.filter((c) => c.bucket === "autre");
  if (autres.length > 0) {
    console.log(`\n=== Détail des ${autres.length} cellule(s) bucket "autre" ===`);
    for (const c of autres) {
      console.log(
        `  week ${String(c.week_index).padStart(2, " ")} y=${c.y_center}  ${c.hex}  RGB(${c.r}, ${c.g}, ${c.b})  n=${c.n_pixels_used}/49`,
      );
    }
  }

  // Anomalies vs critères ACTION 4
  const anomalies: string[] = [];
  if (buckets.autre > 5) {
    anomalies.push(`Bucket "autre" > 5 : ${buckets.autre} cellule(s) ni jaune ni vert`);
  }
  if (lowConfCount > 5) {
    anomalies.push(`Cellules low_confidence > 5 : ${lowConfCount}`);
  }
  if (anomalies.length > 0) {
    console.log("\n⚠️  ANOMALIES DÉTECTÉES (critères ACTION 4) :");
    for (const a of anomalies) console.log(`  - ${a}`);
  } else {
    console.log("\n✅ Aucune anomalie détectée vs critères ACTION 4.");
  }
}

if (import.meta.main) {
  await main();
}
