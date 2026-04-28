// Étape 1A.2 — extraction brute des fills (rectangles colorés) et des textes positionnés
// pour chaque page de chaque fixture, dans un JSON exploitable directement par 1B.
//
// Format de sortie pdf.js v5.7.284 — confirmé en 1A.1, divergent des notes techniques :
//   - OPS.setFillRGBColor.args = ["#rrggbb"] (string hex unique, pas [r,g,b])
//   - OPS.constructPath.args = [actionCode, [Float32Array(pathData)], Float32Array(4) bbox]
//        actionCode = 22 fill | 23 eoFill | 24 fillStroke | 25 eoFillStroke
//                   | 26 closeFillStroke | 27 closeEOFillStroke | 28 endPath (clipping)
//        bbox = [minX, minY, maxX, maxY] déjà calculée par pdf.js
//   - OPS.fill / OPS.eoFill séparés : ABSENTS en v5 (fusionnés dans constructPath args[0])
//   - OPS.transform : 0 occurrence sur les 3 pages — pas de CTM à tracker
//
// Conséquences :
//   - On lit la bbox directement depuis args[2], pas besoin de parser le path data
//   - Pas de machine save/restore/transform/CTM
//   - State machine réduite à : currentFillColor (null | "#rrggbb" | {unsupported: 'colorN' | 'null'})
//
// Vigilance sur le pattern save→eoClip→endPath→setFillRGBColor→eoFill→restore observé
// sur Mathis : les fills sont contraints par la zone de clip qui les précède. Le bbox
// extrait est celui du path AVANT clip, donc potentiellement sur-estimé. La validation
// visuelle 1A.3 (rendu SVG sans clipping) confirmera si ça pose problème en pratique.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURES = [
  {
    pdfPath: 'fixtures/Mathis.pdf',
    fixtureName: 'Mathis.pdf',
    outputJson: 'output-mathis-cells.json',
  },
  {
    pdfPath: 'fixtures/Plannig_Matthieu.pdf',
    fixtureName: 'Plannig_Matthieu.pdf',
    outputJson: 'output-matthieu-cells.json',
  },
];

// Codes d'action constructPath qui produisent un remplissage visible.
// endPath (28) est exclu : c'est un path purement de clipping, sans peinture.
// stroke (20), closeStroke (21) sont exclus aussi : trait sans remplissage de fond.
const FILL_ACTION_NAMES = {
  22: 'fill',
  23: 'eoFill',
  24: 'fillStroke',
  25: 'eoFillStroke',
  26: 'closeFillStroke',
  27: 'closeEOFillStroke',
};

// Couleurs non-RGB / non-supportées : si l'une de ces ops est la dernière à avoir fixé
// la couleur de fill, on incrémente le compteur unsupported plutôt que d'inventer une couleur.
//   setFillColorN : couleur dans un espace nommé (TilingPattern, séparation, etc.)
//   setFillColor : valeurs dans l'espace courant (CMYK, séparation, indexé, etc.)
//   setFillCMYKColor / setFillGray : convertibles vers RGB en théorie, mais on reste strict
//                                    pour cette étape ; à reconsidérer en 1B si nécessaire.
function getUnsupportedFillReasonFromOpName(name) {
  if (name === 'setFillColorN') return 'colorN';
  if (name === 'setFillColor') return 'colorN';
  if (name === 'setFillCMYKColor') return 'cmyk';
  if (name === 'setFillGray') return 'gray';
  return null;
}

async function processPage({ page, pageNum, OPS, OPS_NAMES }) {
  const viewport = page.getViewport({ scale: 1 });
  const opList = await page.getOperatorList();
  const textContent = await page.getTextContent();

  // --- État machine fills ---
  // currentFillColor :
  //   - null         : aucune couleur encore fixée
  //   - "#rrggbb"    : couleur RGB exploitable
  //   - { unsupported: <reason> }
  let currentFillColor = null;

  const fills = [];
  let unsupportedFillsBecauseColorN = 0;
  let unsupportedFillsBecauseNullColor = 0;
  // Compteur d'occurrences de setFillColorN sur la page (peuvent être suivies d'un fill OU d'un endPath)
  let setFillColorNOccurrences = 0;
  // Compteur d'actions endPath ignorées (clipping) — utile pour valider la lecture du pattern
  let ignoredEndPathCount = 0;

  for (let i = 0; i < opList.fnArray.length; i++) {
    const code = opList.fnArray[i];
    const args = opList.argsArray[i];
    const name = OPS_NAMES[code];

    if (code === OPS.setFillRGBColor) {
      // args = ["#rrggbb"] — déjà au bon format, pas de conversion
      const hex = Array.isArray(args) ? args[0] : args;
      if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
        currentFillColor = hex.toLowerCase();
      } else {
        // Format inattendu : on logue mais on ne crashe pas
        console.warn(`[warn] setFillRGBColor avec args inattendu sur page ${pageNum} idx ${i}: ${JSON.stringify(args)}`);
        currentFillColor = { unsupported: 'malformed' };
      }
      continue;
    }

    if (code === OPS.setFillColorN) {
      setFillColorNOccurrences++;
      currentFillColor = { unsupported: 'colorN' };
      continue;
    }
    if (code === OPS.setFillColor) {
      currentFillColor = { unsupported: 'colorN' };
      continue;
    }
    if (code === OPS.setFillCMYKColor) {
      currentFillColor = { unsupported: 'cmyk' };
      continue;
    }
    if (code === OPS.setFillGray) {
      currentFillColor = { unsupported: 'gray' };
      continue;
    }

    if (code === OPS.constructPath) {
      // args[0] = code action, args[1] = [pathData], args[2] = Float32Array(4) bbox
      if (!Array.isArray(args) || args.length < 3) {
        console.warn(`[warn] constructPath args inattendu sur page ${pageNum} idx ${i}`);
        continue;
      }
      const actionCode = args[0];
      const bbox = args[2];

      // Si ce n'est pas une action de remplissage (endPath, stroke, ...), on ignore
      const fillActionName = FILL_ACTION_NAMES[actionCode];
      if (!fillActionName) {
        if (actionCode === OPS.endPath) ignoredEndPathCount++;
        continue;
      }

      // bbox attendue : Float32Array(4) [minX, minY, maxX, maxY]
      if (!bbox || bbox.length < 4) {
        console.warn(`[warn] constructPath bbox manquant page ${pageNum} idx ${i}`);
        continue;
      }
      const [minX, minY, maxX, maxY] = [bbox[0], bbox[1], bbox[2], bbox[3]];
      const width = maxX - minX;
      const height = maxY - minY;

      // Filtre dégénéré : zone vide ou négative (parfois généré par pdf.js sur path trivial)
      if (width <= 0 || height <= 0) continue;

      // Décision selon la couleur courante
      if (typeof currentFillColor === 'string') {
        fills.push({
          x: round(minX),
          y: round(minY),
          width: round(width),
          height: round(height),
          color: currentFillColor,
          fillAction: fillActionName,
          page: pageNum,
        });
      } else if (currentFillColor === null) {
        unsupportedFillsBecauseNullColor++;
      } else if (typeof currentFillColor === 'object' && currentFillColor.unsupported) {
        // colorN, cmyk, gray, malformed — tous regroupés ici
        if (currentFillColor.unsupported === 'colorN') {
          unsupportedFillsBecauseColorN++;
        } else {
          // Pour cmyk, gray, malformed on les compte aussi en colorN pour rester binaire,
          // mais on log au moins une fois pour info.
          unsupportedFillsBecauseColorN++;
        }
      }
      continue;
    }

    // Tous les autres opérateurs (save, restore, beginText, showText, setFont, ...) :
    // on n'a pas besoin de les traiter pour l'extraction fills + texts.
  }

  // --- Extraction texte via getTextContent (position absolue déjà résolue) ---
  const texts = [];
  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === '') continue;
    // transform = [a, b, c, d, e, f] — position baseline = (e, f) en coords PDF
    const tr = item.transform;
    if (!Array.isArray(tr) || tr.length < 6) continue;
    texts.push({
      x: round(tr[4]),
      y: round(tr[5]),
      width: round(item.width),
      height: round(item.height),
      str: item.str,
      page: pageNum,
    });
  }

  return {
    pageNum,
    viewport: { width: round(viewport.width), height: round(viewport.height) },
    fills,
    texts,
    unsupportedFillsCount: unsupportedFillsBecauseColorN + unsupportedFillsBecauseNullColor,
    unsupportedFillsBecauseColorN,
    unsupportedFillsBecauseNullColor,
    setFillColorNOccurrences,
    ignoredEndPathCount,
  };
}

function round(n) {
  // Arrondi à 4 décimales pour garder précision PDF tout en limitant la verbosité du JSON
  return Math.round(n * 10000) / 10000;
}

function summarizeColorPalette(fills) {
  const counts = {};
  for (const f of fills) {
    counts[f.color] = (counts[f.color] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count }));
}

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { getDocument, OPS } = pdfjs;
  const OPS_NAMES = Object.fromEntries(
    Object.entries(OPS).map(([name, code]) => [code, name])
  );

  // standardFontDataUrl : chemin trailing-slashed vers les fonts livrées par pdfjs-dist.
  // Sans ça, getTextContent() peut renvoyer des chaînes corrompues (caractères Unicode
  // mal mappés). Avec, le warning au load disparaît et le texte est cohérent.
  const standardFontDataUrl =
    'file://' + resolve(__dirname, 'node_modules/pdfjs-dist/standard_fonts/') + '/';

  for (const fx of FIXTURES) {
    const fullPath = resolve(__dirname, fx.pdfPath);
    const data = new Uint8Array(readFileSync(fullPath));
    const pdf = await getDocument({ data, standardFontDataUrl }).promise;

    const result = {
      fixture: fx.fixtureName,
      numPages: pdf.numPages,
      pages: [],
    };

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageResult = await processPage({ page, pageNum, OPS, OPS_NAMES });
      result.pages.push(pageResult);
    }

    const outputPath = resolve(__dirname, fx.outputJson);
    writeFileSync(outputPath, JSON.stringify(result, null, 2));

    // --- Console summary ---
    console.log(`\n=== ${fx.fixtureName} ===`);
    console.log(`Pages : ${result.numPages}`);
    for (const p of result.pages) {
      const palette = summarizeColorPalette(p.fills);
      console.log(`\n  Page ${p.pageNum} :`);
      console.log(`    viewport      : ${p.viewport.width} × ${p.viewport.height}`);
      console.log(`    fills         : ${p.fills.length}`);
      console.log(`    couleurs      : ${palette.length} distinctes`);
      for (const c of palette) {
        console.log(`      ${c.color} → ${c.count}`);
      }
      console.log(`    unsupportedFillsCount         : ${p.unsupportedFillsCount}`);
      console.log(`      └─ colorN (TilingPattern…)  : ${p.unsupportedFillsBecauseColorN}`);
      console.log(`      └─ nullColor (avant tout SF): ${p.unsupportedFillsBecauseNullColor}`);
      console.log(`    setFillColorN occurrences     : ${p.setFillColorNOccurrences}`);
      console.log(`    endPath ignorés (clipping)    : ${p.ignoredEndPathCount}`);
      console.log(`    textes non-vides              : ${p.texts.length}`);

      // Sanity check rapide sur le texte : afficher 5 premiers items pour repérer
      // d'éventuelles chaînes corrompues (caractères de contrôle, mojibake, etc.)
      const firstTexts = p.texts.slice(0, 5).map((t) => t.str.slice(0, 40));
      console.log(`    texte head    : ${JSON.stringify(firstTexts)}`);
    }
    console.log(`\n  → écrit ${outputPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
