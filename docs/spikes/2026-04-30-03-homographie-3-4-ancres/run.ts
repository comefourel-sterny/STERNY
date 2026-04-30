// Spike #3 — Run principal homographie 4 ancres sur le bloc Martin entier.
// Cf. CONCEPTION.md du même dossier pour l'hypothèse, le repère théorique
// et le pipeline complet. Pas de calcul de RESULTS.md ici — RESULTS.md est
// rédigé en passe Claude.ai après lecture des 4 outputs JSON par Claude.ai.

import { decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

// ----------------------------------------------------------------
// Chemins
// ----------------------------------------------------------------
const IMAGE_PATH = new URL("./Planning_Martin.JPG", import.meta.url);
const ANCHORS_PATH = new URL("./anchors.json", import.meta.url);
const CSV_BASE = new URL("../../fixtures-ground-truth/martin/", import.meta.url);

// ----------------------------------------------------------------
// Constantes héritées spike #2 — NE PAS MODIFIER
// (cf. etape-1a-bis-grille-uniforme.ts lignes 21-23, et CONCEPTION.md
// section "Variables fixées vs variables changées")
// ----------------------------------------------------------------
const WINDOW_HALF = 3; // fenêtre 7×7 = 49 pixels par cellule
const LUM_MIN = 80; // sous ce seuil = bordure/texte sombre, pixel exclu
const LUM_MAX = 230; // au-dessus = texte blanc/clair, pixel exclu

// ----------------------------------------------------------------
// Repère théorique — cf. CONCEPTION.md section "Repère théorique"
// ----------------------------------------------------------------
const N_GROUPS = 4; // col ∈ {0, 1, 2, 3}
const N_WEEKS = 45; // row ∈ {0, ..., 44}

const GROUPS = [
  { idx: 0, slug: "g1", csv: "martin-ground-truth-g1-cg2p.csv", groupe: "FA_CG2P_G1_2026-2027", output: "output-g1.json" },
  { idx: 1, slug: "g2", csv: "martin-ground-truth-g2-gc2f.csv", groupe: "FA_GC2F_G2_2026-2027", output: "output-g2.json" },
  { idx: 2, slug: "g3", csv: "martin-ground-truth-g3-gema-log.csv", groupe: "FA_GEMA_LOG_G3_2026-2027", output: "output-g3.json" },
  { idx: 3, slug: "g4", csv: "martin-ground-truth-g4-gema-md.csv", groupe: "FA_GEMA_MD_G4_2026-2027", output: "output-g4.json" },
];

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface Point {
  x: number;
  y: number;
}

interface TruthRow {
  groupe: string;
  week_start_iso: string;
  statut_observe_martin: string;
  statut_business: string;
  notes: string;
}

interface MatchDetail {
  week_index: number;
  week_start_iso: string;
  x_image: number;
  y_image: number;
  hex: string;
  bucket: "jaune" | "vert" | "autre";
  statut_predit: string;
  statut_observe_martin: string;
  match: boolean;
  n_pixels_used: number;
}

// ================================================================
// computeHomography(srcPoints, dstPoints)
//
// Calcule la matrice d'homographie 3×3 par DLT (Direct Linear Transform).
//
// Une homographie est une transformation qui projette un plan source sur
// un plan destination via une matrice H 3×3 appliquée en coordonnées
// homogènes : (x, y, 1) → H · (x, y, 1) → division par le 3e composant.
// Cette transformation gère simultanément translation, rotation, échelle
// anisotrope et perspective (keystone).
//
// 8 inconnues (h11..h32, on fixe h33 = 1 par convention pour normaliser),
// 4 paires de points → chaque paire donne 2 équations linéaires (une pour
// x', une pour y'). On obtient un système 8×8 résolu par élimination
// de Gauss-Jordan.
//
// Pour chaque paire (X, Y) → (x', y'), les 2 équations sont :
//   h11·X + h12·Y + h13 - h31·X·x' - h32·Y·x' = x'
//   h21·X + h22·Y + h23 - h31·X·y' - h32·Y·y' = y'
//
// Notation : X, Y = coords source (théorique), x', y' = coords dest (image).
// ================================================================
function computeHomography(
  srcPoints: Point[],
  dstPoints: Point[],
): number[][] {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    throw new Error("STOP : computeHomography attend exactement 4 paires de points");
  }

  // Étape 1 — construire la matrice 8×8 A et le vecteur 8×1 b tels que
  // A · h = b, où h = [h11, h12, h13, h21, h22, h23, h31, h32]^T
  // (8 inconnues, h33 fixé à 1).
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const X = srcPoints[i].x;
    const Y = srcPoints[i].y;
    const xp = dstPoints[i].x;
    const yp = dstPoints[i].y;
    // Équation pour x' :
    A.push([X, Y, 1, 0, 0, 0, -X * xp, -Y * xp]);
    b.push(xp);
    // Équation pour y' :
    A.push([0, 0, 0, X, Y, 1, -X * yp, -Y * yp]);
    b.push(yp);
  }

  // Étape 2 — résolution par élimination de Gauss-Jordan.
  // On augmente A avec b à droite (matrice 8×9), on triangule, puis on
  // back-substitue. Algorithme classique, pas de pivot partiel sophistiqué
  // car le système 8×8 sur 4 ancres bien réparties est très bien conditionné.
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  const n = 8;
  for (let i = 0; i < n; i++) {
    // Pivotage : si M[i][i] est ~0, on échange avec une ligne en dessous
    // qui a une valeur non nulle dans la colonne i. Évite la division par 0.
    if (Math.abs(M[i][i]) < 1e-12) {
      let swap = -1;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > 1e-12) {
          swap = k;
          break;
        }
      }
      if (swap === -1) {
        throw new Error(`STOP : système singulier à la ligne ${i}, ancres mal choisies`);
      }
      [M[i], M[swap]] = [M[swap], M[i]];
    }
    // Normalisation de la ligne pivot pour que M[i][i] = 1.
    const piv = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= piv;
    // Élimination de la colonne i dans toutes les autres lignes.
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const f = M[k][i];
      if (Math.abs(f) < 1e-15) continue;
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }

  // Étape 3 — extraction des 8 inconnues + recomposition en matrice 3×3.
  const h = M.map((row) => row[n]);
  const H = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
  return H;
}

// ================================================================
// applyHomography(point, matrix)
//
// Projette un point théorique (col, row) vers les coordonnées image
// réelles via produit matriciel + division par le 3e composant homogène.
//
// "Diviser par le 3e composant homogène" signifie : la matrice H produit
// un triplet (x', y', w) ; on récupère les coordonnées 2D classiques en
// faisant (x'/w, y'/w). C'est ce qui permet à l'homographie de gérer la
// perspective (un w différent de 1 traduit une compression ou expansion
// non-linéaire à cet endroit).
// ================================================================
function applyHomography(point: Point, matrix: number[][]): Point {
  const X = point.x;
  const Y = point.y;
  const xp = matrix[0][0] * X + matrix[0][1] * Y + matrix[0][2];
  const yp = matrix[1][0] * X + matrix[1][1] * Y + matrix[1][2];
  const w = matrix[2][0] * X + matrix[2][1] * Y + matrix[2][2];
  return { x: xp / w, y: yp / w };
}

// ================================================================
// extractColor(image, x, y)
//
// RÉUTILISÉ SPIKE #2 — adapté de etape-1a-bis-grille-uniforme.ts
// lignes 33-40 (rgbAt), 42-50 (median), 52-55 (toHex), 96-130 (boucle
// d'échantillonnage 7×7 + filtre luminance + médiane RGB).
//
// Échantillonne une fenêtre 7×7 autour du centre (x, y) en coordonnées
// image (entiers 1-indexés), applique le filtre luminance [80, 230],
// retourne la couleur médiane RGB des pixels conservés.
// ================================================================
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

function extractColor(
  image: any,
  x: number,
  y: number,
): { r: number; g: number; b: number; hex: string; n_pixels_used: number } {
  const W = image.width;
  const H = image.height;
  const xc = Math.round(x);
  const yc = Math.round(y);
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let dx = -WINDOW_HALF; dx <= WINDOW_HALF; dx++) {
    for (let dy = -WINDOW_HALF; dy <= WINDOW_HALF; dy++) {
      const xi = xc + dx;
      const yi = yc + dy;
      if (xi < 1 || xi > W || yi < 1 || yi > H) continue;
      const { r, g, b } = rgbAt(image, xi, yi);
      const lum = (r + g + b) / 3;
      if (lum < LUM_MIN || lum > LUM_MAX) continue;
      rs.push(r);
      gs.push(g);
      bs.push(b);
    }
  }
  const r = median(rs);
  const g = median(gs);
  const b = median(bs);
  return { r, g, b, hex: toHex(r, g, b), n_pixels_used: rs.length };
}

// ================================================================
// classify(r, g, b)
//
// RÉUTILISÉ SPIKE #2 — copie textuelle de classifyBucket dans
// etape-1a-bis-grille-uniforme.ts lignes 57-61.
// ================================================================
function classify(r: number, g: number, b: number): "jaune" | "vert" | "autre" {
  if (r > 200 && g > 180 && b < 150) return "jaune";
  if (g > r && g > b) return "vert";
  return "autre";
}

const BUCKET_TO_STATUT: Record<string, string> = {
  "jaune": "school",
  "vert": "company",
  "autre": "unknown",
};

// ================================================================
// loadGroundTruth(csvPath)
//
// RÉUTILISÉ SPIKE #2 — adapté de loadTruthRows dans
// etape-1b-matching.ts lignes 71-110, en paramétrant le chemin CSV
// et en retirant le filtre par préfixe (chaque CSV contient un seul
// groupe par convention spike #3, cf. CONCEPTION.md).
// ================================================================
async function loadGroundTruth(csvPath: URL): Promise<TruthRow[]> {
  const raw = await Deno.readTextFile(csvPath);
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error(`STOP : CSV vide ou sans header : ${csvPath.pathname}`);
  }
  const header = lines[0].split(",").map((s) => s.trim());
  const expected = ["groupe", "week_start_iso", "statut_observe_martin", "statut_business", "notes"];
  for (let i = 0; i < expected.length; i++) {
    if (header[i] !== expected[i]) {
      throw new Error(
        `STOP : header CSV inattendu colonne ${i + 1} : "${header[i]}" (attendu "${expected[i]}") dans ${csvPath.pathname}`,
      );
    }
  }
  const rows: TruthRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const cols = line.split(",").map((s) => s.trim());
    rows.push({
      groupe: cols[0],
      week_start_iso: cols[1],
      statut_observe_martin: cols[2],
      statut_business: cols[3],
      notes: cols[4] ?? "",
    });
  }
  if (rows.length !== N_WEEKS) {
    throw new Error(
      `STOP : attendu ${N_WEEKS} lignes dans ${csvPath.pathname}, trouvé ${rows.length}`,
    );
  }
  return rows;
}

// ================================================================
// matchAgainstGroundTruth(predictions, truth)
//
// RÉUTILISÉ SPIKE #2 — copie textuelle de matchRows dans
// etape-1b-matching.ts lignes 125-151.
// ================================================================
function matchAgainstGroundTruth(
  predictions: Array<{
    week_index: number;
    x_image: number;
    y_image: number;
    hex: string;
    bucket: "jaune" | "vert" | "autre";
    n_pixels_used: number;
  }>,
  truth: TruthRow[],
): { details: MatchDetail[]; n_matches: number; errors: MatchDetail[] } {
  const details: MatchDetail[] = [];
  for (let i = 0; i < N_WEEKS; i++) {
    const pred = predictions[i];
    const row = truth[i];
    if (pred.week_index !== i + 1) {
      throw new Error(
        `STOP : prediction.week_index=${pred.week_index} attendu ${i + 1}`,
      );
    }
    const statut_predit = BUCKET_TO_STATUT[pred.bucket] ?? "unknown";
    const match = statut_predit === row.statut_observe_martin;
    details.push({
      week_index: pred.week_index,
      week_start_iso: row.week_start_iso,
      x_image: pred.x_image,
      y_image: pred.y_image,
      hex: pred.hex,
      bucket: pred.bucket,
      statut_predit,
      statut_observe_martin: row.statut_observe_martin,
      match,
      n_pixels_used: pred.n_pixels_used,
    });
  }
  const n_matches = details.filter((d) => d.match).length;
  const errors = details.filter((d) => !d.match);
  return { details, n_matches, errors };
}

// ----------------------------------------------------------------
// Validation anchors.json (refus des placeholders)
// ----------------------------------------------------------------
async function loadAnchors(): Promise<Point[]> {
  const raw = await Deno.readTextFile(ANCHORS_PATH);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 4) {
    throw new Error("STOP : anchors.json doit contenir un tableau de 4 objets {x, y}");
  }
  for (let i = 0; i < 4; i++) {
    const a = parsed[i];
    if ("_comment" in a) {
      throw new Error(
        "STOP : anchors.json contient des placeholders, clique les 4 ancres via pick-coordinates.html avant de lancer le run",
      );
    }
    if (typeof a.x !== "number" || typeof a.y !== "number") {
      throw new Error(`STOP : anchors.json[${i}] : x et y doivent être des numbers`);
    }
    if (a.x === 0 && a.y === 0) {
      throw new Error(
        "STOP : anchors.json contient des placeholders, clique les 4 ancres via pick-coordinates.html avant de lancer le run",
      );
    }
  }
  return parsed.map((p) => ({ x: p.x, y: p.y }));
}

// ----------------------------------------------------------------
// Pipeline principal
// ----------------------------------------------------------------
async function main() {
  console.log("=== Spike #3 — Run homographie 4 ancres bloc Martin entier ===\n");

  // 1. Charger l'image
  console.log("Phase 1 — chargement image source");
  const bytes = await Deno.readFile(IMAGE_PATH);
  const image = await decode(bytes);
  console.log(`  Image décodée : ${image.width} × ${image.height} px`);
  console.log(`  Path : ${IMAGE_PATH.pathname}`);

  // 2. Charger anchors.json
  console.log("\nPhase 2 — chargement anchors.json");
  const dstPoints = await loadAnchors();
  const labels = ["HG (G1 sem 1)", "HD (G4 sem 1)", "BG (G1 sem 45)", "BD (G4 sem 45)"];
  for (let i = 0; i < 4; i++) {
    console.log(`  ${labels[i]} → x=${dstPoints[i].x}, y=${dstPoints[i].y}`);
  }

  // 3. Calculer la matrice d'homographie
  console.log("\nPhase 3 — calcul matrice d'homographie (DLT 8×8)");
  // Repère théorique : (col, row) avec col ∈ {0..3}, row ∈ {0..44}.
  // Ordre HG, HD, BG, BD (cf. CONCEPTION.md section "Repère théorique").
  const srcPoints: Point[] = [
    { x: 0, y: 0 },                         // HG
    { x: N_GROUPS - 1, y: 0 },              // HD = (3, 0)
    { x: 0, y: N_WEEKS - 1 },               // BG = (0, 44)
    { x: N_GROUPS - 1, y: N_WEEKS - 1 },    // BD = (3, 44)
  ];
  const H = computeHomography(srcPoints, dstPoints);
  console.log("  Matrice H 3×3 (ligne par ligne) :");
  for (let i = 0; i < 3; i++) {
    const row = H[i].map((v) => v.toFixed(6).padStart(12, " ")).join("  ");
    console.log(`    [ ${row} ]`);
  }

  // 4. Boucle par groupe
  console.log("\nPhase 4 — extraction + matching par groupe");
  const groupResults: Array<{ slug: string; n_matches: number }> = [];

  for (const G of GROUPS) {
    console.log(`\n  --- Groupe ${G.slug.toUpperCase()} (col = ${G.idx}) ---`);

    // Charger le CSV vérité terrain
    const csvPath = new URL(G.csv, CSV_BASE);
    const truth = await loadGroundTruth(csvPath);
    console.log(`  CSV chargé : ${truth.length} lignes (du ${truth[0].week_start_iso} au ${truth[truth.length - 1].week_start_iso})`);

    // Pour chaque semaine, projeter (col, row) → (x_image, y_image),
    // échantillonner et classifier.
    const predictions: Array<{
      week_index: number;
      x_image: number;
      y_image: number;
      hex: string;
      bucket: "jaune" | "vert" | "autre";
      n_pixels_used: number;
    }> = [];

    for (let row = 0; row < N_WEEKS; row++) {
      const projected = applyHomography({ x: G.idx, y: row }, H);
      const color = extractColor(image, projected.x, projected.y);
      const bucket = classify(color.r, color.g, color.b);
      predictions.push({
        week_index: row + 1,
        x_image: Math.round(projected.x),
        y_image: Math.round(projected.y),
        hex: color.hex,
        bucket,
        n_pixels_used: color.n_pixels_used,
      });
    }

    const { details, n_matches, errors } = matchAgainstGroundTruth(predictions, truth);
    const score_pct = Math.round((n_matches / N_WEEKS) * 10000) / 100;
    console.log(`  Score brut : ${n_matches}/${N_WEEKS} = ${score_pct.toFixed(2)} %`);
    console.log(`  Erreurs : ${errors.length}`);

    // Écrire output-g{n}.json
    const output = {
      generated_at: new Date().toISOString(),
      groupe: G.groupe,
      col_index: G.idx,
      n_weeks: N_WEEKS,
      n_matches,
      score_pct,
      params: {
        WINDOW_HALF,
        LUM_MIN,
        LUM_MAX,
      },
      anchors: {
        HG: dstPoints[0],
        HD: dstPoints[1],
        BG: dstPoints[2],
        BD: dstPoints[3],
      },
      homography_matrix: H,
      cells: details,
      errors,
    };
    const outPath = new URL(`./${G.output}`, import.meta.url);
    await Deno.writeTextFile(outPath, JSON.stringify(output, null, 2));
    console.log(`  Output écrit : ${outPath.pathname}`);

    groupResults.push({ slug: G.slug, n_matches });
  }

  // 5. Score consolidé
  console.log("\n=== Score consolidé sur les 4 groupes ===");
  let total = 0;
  for (const gr of groupResults) {
    console.log(`  ${gr.slug.toUpperCase()} : ${gr.n_matches}/${N_WEEKS}`);
    total += gr.n_matches;
  }
  const total_cells = N_GROUPS * N_WEEKS;
  const consolidated_pct = Math.round((total / total_cells) * 10000) / 100;
  console.log(`  TOTAL : ${total}/${total_cells} = ${consolidated_pct.toFixed(2)} %`);
  console.log(`  Seuil cible : 97.00 %`);
  console.log(`  Verdict : ${consolidated_pct >= 97 ? "✅ SEUIL FRANCHI" : "⚠️  Seuil non franchi (le spike #4 magick-wasm reste prévu en parallèle)"}`);
  console.log("\nRESULTS.md sera rédigé en passe Claude.ai après lecture des 4 outputs JSON.");
}

if (import.meta.main) {
  await main();
}
