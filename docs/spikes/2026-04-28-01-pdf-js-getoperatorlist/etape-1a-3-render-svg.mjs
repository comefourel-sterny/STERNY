// Étape 1A.3 — rendu SVG des outputs JSON de 1A.2 pour validation visuelle.
//
// Objectif : Côme ouvre les SVGs dans Aperçu, compare côté à côté avec les PDFs
// sources, et juge si la grille extraite correspond à ce qu'il voit dans le PDF.
//
// Choix techniques :
//   - Y-axis option 2 : pré-calcul y_svg pour chaque élément, plus simple à debug
//     que l'option 1 (wrap dans <g transform="translate(0,H) scale(1,-1)">).
//     - Rectangles  : y_svg = H - y_pdf - height_rect  (PDF (x,y) = coin bas-gauche)
//     - Texte       : y_svg = H - y_pdf                (PDF (x,y) = baseline)
//   - Ordre de rendu = ordre dans le JSON. Si une cellule est rendue plusieurs fois
//     (fill blanc puis coloré par-dessus, ou fill puis bordure), le dernier gagne
//     visuellement, comme dans le PDF source.
//   - Texte : font-family="sans-serif", fill="#333", font-size = height * 0.9
//     (height de getTextContent ≈ taille visuelle de la fonte en points PDF).

import { readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const INPUTS = [
  { json: 'output-mathis-cells.json', svgPrefix: 'output-mathis' },
  { json: 'output-matthieu-cells.json', svgPrefix: 'output-matthieu' },
];

// Échappement XML pour le contenu textuel des <text>
function escapeXmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderPageToSvg(page) {
  const W = page.viewport.width;
  const H = page.viewport.height;

  const out = [];
  out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  // viewBox en coords PDF (Y déjà inversé via option 2 ci-dessous, donc le SVG
  // apparaît avec l'origine en haut-gauche comme une page imprimée).
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
  );
  // Fond blanc explicite pour que les fills #ffffff ressortent par contraste avec
  // le fond gris d'Aperçu macOS quand on ouvre le SVG sans cadre.
  out.push(`  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // --- Rectangles fills ---
  // Attention : pour un rectangle PDF (x, y, w, h), (x, y) est le coin BAS-GAUCHE.
  // En SVG, (x, y) est le coin HAUT-GAUCHE. Donc :
  //   y_svg = H - y_pdf - h
  // (le -h soustrait la hauteur pour passer du coin bas au coin haut).
  out.push(`  <!-- ${page.fills.length} fills -->`);
  for (const f of page.fills) {
    const ySvg = H - f.y - f.height;
    out.push(
      `  <rect x="${f.x}" y="${ySvg}" width="${f.width}" height="${f.height}" fill="${f.color}"/>`
    );
  }

  // --- Textes ---
  // En PDF, transform[5] est la baseline (Y vers le haut). En SVG, l'attribut y
  // d'un <text> est aussi la baseline (par défaut, dominant-baseline="alphabetic").
  // Donc y_svg = H - y_pdf, sans soustraction de hauteur.
  out.push(`  <!-- ${page.texts.length} texts -->`);
  for (const t of page.texts) {
    const ySvg = H - t.y;
    // height de getTextContent ≈ taille visuelle de la fonte. font-size ~ height
    // donne un texte à la bonne taille. * 0.9 pour ne pas déborder visuellement
    // au cas où height inclut un peu d'air autour des glyphes.
    const fontSize = Math.max(t.height * 0.9, 4);
    const escaped = escapeXmlText(t.str);
    out.push(
      `  <text x="${t.x}" y="${ySvg}" font-family="sans-serif" font-size="${fontSize.toFixed(2)}" fill="#333">${escaped}</text>`
    );
  }

  out.push(`</svg>`);
  return out.join('\n') + '\n';
}

async function main() {
  const generated = [];
  for (const input of INPUTS) {
    const fullPath = resolve(__dirname, input.json);
    const data = JSON.parse(readFileSync(fullPath, 'utf8'));
    for (const page of data.pages) {
      const svgName = `${input.svgPrefix}-p${page.pageNum}.svg`;
      const svgPath = resolve(__dirname, svgName);
      const svgContent = renderPageToSvg(page);
      writeFileSync(svgPath, svgContent);
      const sizeBytes = statSync(svgPath).size;
      generated.push({ path: svgPath, sizeBytes });
    }
  }

  console.log('SVGs générés :');
  for (const g of generated) {
    console.log(`  ${g.path}`);
    console.log(`    taille : ${g.sizeBytes} octets (${(g.sizeBytes / 1024).toFixed(1)} Ko)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
