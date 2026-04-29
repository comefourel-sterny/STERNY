// Étape 1B spike #2 — matching couleurs extraites vs vérité terrain CSV
// Périmètre : colonne FA CG2P G1 uniquement, 45 semaines.
//
// Inputs :
//   - output-1a-bis-couleurs-cellules.json (45 cellules avec hex et bucket)
//   - fixtures/martin-ground-truth.csv (45 lignes statut_observe_martin)
//
// Mapping : bucket "jaune" → "school", bucket "vert" → "company",
//           bucket "autre" → "unknown" (pas de match possible).
//
// Score = nombre de matchs / 45.

const COLOR_JSON_PATH = new URL("./output-1a-bis-couleurs-cellules.json", import.meta.url);
const CSV_PATH = new URL("./fixtures/martin-ground-truth.csv", import.meta.url);
const OUTPUT_JSON = new URL("./output-1b-matching.json", import.meta.url);

const BUCKET_TO_STATUT: Record<string, string> = {
  "jaune": "school",
  "vert": "company",
  "autre": "unknown",
};

interface Cell {
  week_index: number;
  hex: string;
  bucket: string;
}

interface TruthRow {
  groupe: string;
  week_start_iso: string;
  statut_observe_martin: string;
  statut_business: string;
  notes: string;
}

// ----------------------------------------------------------------
// Phase A — chargement des 45 couleurs extraites depuis le JSON 1A bis
// ----------------------------------------------------------------
async function loadColorCells(): Promise<Cell[]> {
  console.log("=== Phase A — chargement JSON 1A bis ===");
  const raw = await Deno.readTextFile(COLOR_JSON_PATH);
  const data = JSON.parse(raw);
  if (!Array.isArray(data.cells)) {
    throw new Error("STOP : champ 'cells' manquant ou non-array dans le JSON input");
  }
  const cells: Cell[] = data.cells;
  if (cells.length !== 45) {
    throw new Error(
      `STOP : attendu 45 cellules dans le JSON, trouvé ${cells.length}`,
    );
  }
  for (const c of cells) {
    if (
      typeof c.week_index !== "number" ||
      typeof c.hex !== "string" ||
      typeof c.bucket !== "string"
    ) {
      throw new Error(
        `STOP : cellule mal formée week_index=${c.week_index} (champs attendus: week_index, hex, bucket)`,
      );
    }
  }
  console.log(`  ${cells.length} cellules chargées (week_index 1 à ${cells[cells.length - 1].week_index})`);
  return cells;
}

// ----------------------------------------------------------------
// Phase B — chargement de la vérité terrain CSV (groupe FA_CG2P_G1)
// ----------------------------------------------------------------
async function loadTruthRows(): Promise<TruthRow[]> {
  console.log("\n=== Phase B — chargement CSV vérité terrain ===");
  const raw = await Deno.readTextFile(CSV_PATH);
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("STOP : CSV vide ou sans header");
  }
  // Header : groupe,week_start_iso,statut_observe_martin,statut_business,notes
  const header = lines[0].split(",").map((s) => s.trim());
  const expected = ["groupe", "week_start_iso", "statut_observe_martin", "statut_business", "notes"];
  for (let i = 0; i < expected.length; i++) {
    if (header[i] !== expected[i]) {
      throw new Error(
        `STOP : header CSV inattendu colonne ${i + 1} : "${header[i]}" (attendu "${expected[i]}")`,
      );
    }
  }
  // Lignes de données filtrées sur groupe commençant par FA_CG2P_G1
  const rows: TruthRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const cols = line.split(",").map((s) => s.trim());
    if (!cols[0].startsWith("FA_CG2P_G1")) continue;
    rows.push({
      groupe: cols[0],
      week_start_iso: cols[1],
      statut_observe_martin: cols[2],
      statut_business: cols[3],
      notes: cols[4] ?? "",
    });
  }
  if (rows.length !== 45) {
    throw new Error(
      `STOP : attendu 45 lignes FA_CG2P_G1 dans le CSV, trouvé ${rows.length}`,
    );
  }
  console.log(`  ${rows.length} lignes FA_CG2P_G1 chargées (du ${rows[0].week_start_iso} au ${rows[rows.length - 1].week_start_iso})`);
  return rows;
}

// ----------------------------------------------------------------
// Phase C — matching ligne par ligne
// ----------------------------------------------------------------
interface MatchDetail {
  week_index: number;
  week_start_iso: string;
  hex: string;
  bucket: string;
  statut_predit: string;
  statut_observe_martin: string;
  match: boolean;
}

function matchRows(cells: Cell[], rows: TruthRow[]): MatchDetail[] {
  console.log("\n=== Phase C — matching cellule-par-cellule ===");
  const details: MatchDetail[] = [];
  // L'ordre des 2 sources est censé être chronologique aligné. On indexe par
  // position : cell.week_index = i+1, row[i] = ligne i (1-indexée logiquement).
  for (let i = 0; i < 45; i++) {
    const cell = cells[i];
    const row = rows[i];
    if (cell.week_index !== i + 1) {
      throw new Error(
        `STOP : cell.week_index=${cell.week_index} attendu ${i + 1} (cellules pas dans l'ordre)`,
      );
    }
    const statut_predit = BUCKET_TO_STATUT[cell.bucket] ?? "unknown";
    const match = statut_predit === row.statut_observe_martin;
    details.push({
      week_index: cell.week_index,
      week_start_iso: row.week_start_iso,
      hex: cell.hex,
      bucket: cell.bucket,
      statut_predit,
      statut_observe_martin: row.statut_observe_martin,
      match,
    });
  }
  return details;
}

// ----------------------------------------------------------------
// Phase D — score + JSON + console
// ----------------------------------------------------------------
async function main() {
  const cells = await loadColorCells();
  const rows = await loadTruthRows();
  const details = matchRows(cells, rows);

  const matches = details.filter((d) => d.match).length;
  const errors = details.filter((d) => !d.match);
  const score_pct = Math.round((matches / 45) * 10000) / 100;

  console.log(`\n=== Phase D — écriture JSON + récap ===`);

  const output = {
    generated_at: new Date().toISOString(),
    input_color_json: "output-1a-bis-couleurs-cellules.json",
    input_csv: "fixtures/martin-ground-truth.csv",
    n_weeks: 45,
    n_matches: matches,
    score_pct,
    details,
    errors,
  };
  await Deno.writeTextFile(OUTPUT_JSON, JSON.stringify(output, null, 2));
  console.log(`JSON écrit : ${OUTPUT_JSON.pathname}`);

  // Tableau ASCII des 45 lignes
  console.log("\n=== Tableau matching ===");
  console.log("week  week_start_iso  hex        bucket   predit    observe   status");
  for (const d of details) {
    const wkIdx = String(d.week_index).padStart(2, " ");
    const stat = d.match ? "OK  " : "FAIL";
    console.log(
      `  ${wkIdx}    ${d.week_start_iso}      ${d.hex}    ${d.bucket.padEnd(6, " ")}   ${d.statut_predit.padEnd(8, " ")}  ${d.statut_observe_martin.padEnd(8, " ")}  ${stat}`,
    );
  }

  // Récap
  console.log("\n=== Score final ===");
  console.log(`Matches : ${matches} / 45`);
  console.log(`Score   : ${score_pct.toFixed(2)} %`);

  // Liste détaillée des erreurs
  console.log(`\n=== Erreurs (${errors.length}) ===`);
  if (errors.length === 0) {
    console.log("  (aucune erreur — score parfait)");
  } else {
    for (const e of errors) {
      console.log(
        `  week ${String(e.week_index).padStart(2, " ")}  ${e.week_start_iso}  ${e.hex}  bucket=${e.bucket}  predit=${e.statut_predit}  observe=${e.statut_observe_martin}`,
      );
    }
  }
}

if (import.meta.main) {
  await main();
}
