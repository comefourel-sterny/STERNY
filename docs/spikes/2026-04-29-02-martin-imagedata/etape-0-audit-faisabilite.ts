// Spike #2 Martin — étape 0 audit faisabilité
// Exécution : deno run --allow-read --allow-net etape-0-audit-faisabilite.ts
//
// 3 sous-points à valider AVANT d'investir le code algo manuel ImageData :
// 1. Décodage JPG côté Deno via imagescript fonctionne ?
// 2. Palette de couleurs effective extraite sur 5-10 cellules échantillons ?
// 3. Fonds de cellules distinguables au pixel près ?
//
// Si l'un des 3 échoue : STOP, bascule plan B magick-wasm sans coder l'étape 1.

import { decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const FIXTURE_PATH = new URL("./fixtures/Planning_Martin.JPG", import.meta.url);

// Coordonnées (x, y) approximatives de 5-10 cellules échantillons.
// Cliquées au centre visuel des cellules via pick-coordinates.html (29 avril 2026).
// `label` rendu optionnel pour pouvoir coller des paires { x, y } seules ;
// fallback `pt-N` côté audit functions.
const SAMPLE_POINTS: Array<{ label?: string; x: number; y: number }> = [
  { x: 356, y: 537 },
  { x: 366, y: 575 },
  { x: 361, y: 647 },
  { x: 360, y: 697 },
  { x: 358, y: 727 },
  { x: 358, y: 739 },
  { x: 358, y: 792 },
  { x: 356, y: 828 },
  { x: 356, y: 839 },
  { x: 356, y: 903 },
  { x: 359, y: 964 },
  { x: 356, y: 1008 },
  { x: 358, y: 1051 },
];

async function audit1_decoding() {
  console.log("\n=== SOUS-POINT 1 — Décodage JPG via imagescript ===");
  try {
    const bytes = await Deno.readFile(FIXTURE_PATH);
    console.log(`Fichier lu : ${bytes.length} octets`);
    const image = await decode(bytes);
    console.log(`Décodage OK : ${image.width} × ${image.height} px`);
    return image;
  } catch (err) {
    console.error("Décodage KO :", err);
    console.error("→ Tester npm:@napi-rs/canvas en fallback, ou basculer plan B magick-wasm");
    Deno.exit(1);
  }
}

function audit2_palette(image: any) {
  console.log("\n=== SOUS-POINT 2 — Palette de couleurs sur cellules échantillons ===");
  if (SAMPLE_POINTS.length === 0) {
    console.warn("⚠️  SAMPLE_POINTS vide — remplir manuellement avant exécution");
    return;
  }
  SAMPLE_POINTS.forEach((pt, i) => {
    const lbl = pt.label ?? `pt-${i + 1}`;
    const pixel = image.getPixelAt(pt.x, pt.y);
    const r = (pixel >> 24) & 0xff;
    const g = (pixel >> 16) & 0xff;
    const b = (pixel >> 8) & 0xff;
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    console.log(`  ${lbl.padEnd(40)} (${pt.x}, ${pt.y}) → RGB(${r}, ${g}, ${b}) ${hex}`);
  });
}

function audit3_distinguability(image: any) {
  console.log("\n=== SOUS-POINT 3 — Distinguabilité au pixel près ===");
  if (SAMPLE_POINTS.length < 2) {
    console.warn("⚠️  Au moins 2 SAMPLE_POINTS de couleurs différentes nécessaires");
    return;
  }
  const rgbs = SAMPLE_POINTS.map((pt, i) => {
    const p = image.getPixelAt(pt.x, pt.y);
    return { label: pt.label ?? `pt-${i + 1}`, r: (p >> 24) & 0xff, g: (p >> 16) & 0xff, b: (p >> 8) & 0xff };
  });
  for (let i = 0; i < rgbs.length; i++) {
    for (let j = i + 1; j < rgbs.length; j++) {
      const a = rgbs[i], b = rgbs[j];
      const dr = Math.abs(a.r - b.r), dg = Math.abs(a.g - b.g), db = Math.abs(a.b - b.b);
      const maxDelta = Math.max(dr, dg, db);
      console.log(`  ${a.label} ↔ ${b.label}  ΔR=${dr} ΔG=${dg} ΔB=${db}  max=${maxDelta}`);
    }
  }
  console.log("\n  Critère : max delta > 50 entre paires distinctes → palette nette");
  console.log("  Si max delta < 30 entre paires censées distinctes → palette floue");
}

if (import.meta.main) {
  const image = await audit1_decoding();
  audit2_palette(image);
  audit3_distinguability(image);
  console.log("\n=== Audit terminé. Lecture des résultats par Côme avant décision étape 1. ===");
}
