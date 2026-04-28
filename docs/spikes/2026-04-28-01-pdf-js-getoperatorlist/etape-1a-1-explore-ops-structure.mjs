// Exploration empirique de la structure des opérateurs pdf.js v5
// Run 2 — investigation approfondie après découverte que les hypothèses des notes
// techniques sont contredites :
//   - setFillRGBColor reçoit ["#rrggbb"] et non [r,g,b]
//   - constructPath a un format Path API moderne, pas [opsArray, argsArray, minMax]
//   - args[0] semble être un code action (fill/stroke/clip merged) — à confirmer
//
// Ce run dumpe :
//   1. La table OPS complète (nom ↔ code) pour pouvoir nommer 23, 28, etc.
//   2. Les 50 premiers opérateurs détaillés
//   3. Une analyse exhaustive des constructPath sur toute la page :
//      distribution des args[0], shapes des pathData
//   4. Tous les OPS.transform de la page
//   5. Un échantillon de tous les OPS.fill / OPS.eoFill / OPS.stroke
//      (pour confirmer s'ils existent encore en v5)

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(__dirname, 'fixtures/Mathis.pdf');
const OUTPUT_TXT = resolve(__dirname, 'etape-1a-1-explore-ops-output.txt');

function summarizeArg(arg, depth = 0) {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (Array.isArray(arg) || ArrayBuffer.isView(arg)) {
    const arr = Array.isArray(arg) ? arg : Array.from(arg);
    const head = arr.slice(0, 6).map((v) => {
      if (typeof v === 'number') return v.toFixed(4);
      if (Array.isArray(v) || ArrayBuffer.isView(v)) {
        const sub = Array.isArray(v) ? v : Array.from(v);
        return `Array(${sub.length})`;
      }
      return typeof v;
    });
    const ctor = arg.constructor && arg.constructor.name ? arg.constructor.name : 'Array';
    return `${ctor}(${arr.length}) [${head.join(', ')}${arr.length > 6 ? ', ...' : ''}]`;
  }
  if (typeof arg === 'number') return `Number(${arg.toFixed(4)})`;
  if (typeof arg === 'string') {
    return `String("${arg.length > 30 ? arg.slice(0, 30) + '...' : arg}")`;
  }
  if (typeof arg === 'object') {
    const keys = Object.keys(arg);
    if (keys.length <= 6 && depth < 2) {
      const inner = keys
        .map((k) => `${k}=${summarizeArg(arg[k], depth + 1)}`)
        .join(', ');
      return `Object{${inner}}`;
    }
    return `Object(keys=${keys.slice(0, 6).join(',')}${keys.length > 6 ? '...' : ''})`;
  }
  return `${typeof arg}(${String(arg)})`;
}

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { getDocument, OPS } = pdfjs;
  const OPS_NAMES = Object.fromEntries(
    Object.entries(OPS).map(([name, code]) => [code, name])
  );

  const data = new Uint8Array(readFileSync(FIXTURE));
  const pdf = await getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const opList = await page.getOperatorList();

  const lines = [];
  lines.push('# Run 2 — investigation approfondie pdf.js v5');
  lines.push('');
  lines.push('## Table OPS complète (code → nom)');
  const sortedCodes = Object.keys(OPS_NAMES)
    .map((c) => parseInt(c, 10))
    .sort((a, b) => a - b);
  for (const code of sortedCodes) {
    lines.push(`  ${String(code).padStart(3, ' ')} → ${OPS_NAMES[code]}`);
  }
  lines.push('');

  // 50 premiers opérateurs
  lines.push(`## 50 premiers opérateurs (total page = ${opList.fnArray.length})`);
  for (let i = 0; i < Math.min(50, opList.fnArray.length); i++) {
    const code = opList.fnArray[i];
    const name = OPS_NAMES[code] ?? `UNKNOWN_${code}`;
    const args = opList.argsArray[i];
    const argsStr = Array.isArray(args)
      ? args.map((a) => summarizeArg(a)).join(' | ')
      : summarizeArg(args);
    lines.push(`${String(i).padStart(3, ' ')}  [${code}] ${name.padEnd(30, ' ')} args=${argsStr}`);
  }
  lines.push('');

  // Analyse exhaustive constructPath
  lines.push('## constructPath — analyse exhaustive (toute la page)');
  const pathArg0Distribution = {};
  const pathDataLengthsHistogram = {};
  const pathFirstSamples = []; // 5 premiers en détail brut
  let constructPathCount = 0;
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === OPS.constructPath) {
      constructPathCount++;
      const a = opList.argsArray[i];
      if (Array.isArray(a)) {
        const arg0 = a[0];
        const arg0Key = typeof arg0 === 'number' ? String(arg0) : `non-num:${typeof arg0}`;
        pathArg0Distribution[arg0Key] = (pathArg0Distribution[arg0Key] ?? 0) + 1;

        // pathData = a[1] est un Array(1) qui contient un (Typed)Array de coords flat
        let pathData = a[1];
        if (Array.isArray(pathData) && pathData.length === 1) {
          pathData = pathData[0];
        }
        if (pathData && (Array.isArray(pathData) || ArrayBuffer.isView(pathData))) {
          const len = pathData.length;
          const bucket = len < 10 ? `len<10:${len}` : len < 50 ? `len<50` : len < 200 ? `len<200` : 'len≥200';
          pathDataLengthsHistogram[bucket] = (pathDataLengthsHistogram[bucket] ?? 0) + 1;
        }
        if (pathFirstSamples.length < 5) {
          pathFirstSamples.push({ idx: i, args: a });
        }
      }
    }
  }
  lines.push(`  total constructPath = ${constructPathCount}`);
  lines.push(`  args[0] distribution :`);
  for (const [k, v] of Object.entries(pathArg0Distribution).sort((x, y) => y[1] - x[1])) {
    const code = parseInt(k, 10);
    const name = !isNaN(code) ? OPS_NAMES[code] ?? `UNKNOWN_${code}` : '(non-numérique)';
    lines.push(`    ${k} (${name}) → ${v} occurrences`);
  }
  lines.push(`  pathData length histogram :`);
  for (const [k, v] of Object.entries(pathDataLengthsHistogram).sort((x, y) => y[1] - x[1])) {
    lines.push(`    ${k} → ${v}`);
  }
  lines.push('');
  lines.push('  ### 5 premiers samples décortiqués');
  for (const s of pathFirstSamples) {
    const a = s.args;
    lines.push(`  --- idx=${s.idx}, args.length=${a.length}`);
    lines.push(`      a[0] = ${summarizeArg(a[0])}  (peut-être un code action)`);
    let pathData = a[1];
    let unwrap = '';
    if (Array.isArray(pathData) && pathData.length === 1) {
      pathData = pathData[0];
      unwrap = ' (déballé du wrapper Array(1))';
    }
    if (pathData && (Array.isArray(pathData) || ArrayBuffer.isView(pathData))) {
      const arr = Array.isArray(pathData) ? pathData : Array.from(pathData);
      const ctor = pathData.constructor && pathData.constructor.name ? pathData.constructor.name : 'Array';
      lines.push(`      a[1] = ${ctor}(${arr.length})${unwrap} content :`);
      // Format brut
      lines.push(`        raw : [${arr.map((v) => (typeof v === 'number' ? v.toFixed(2) : String(v))).join(', ')}]`);
      // Tentative de décodage : verb + args (verbs supposés : 0=moveTo(2), 1=lineTo(2), 2=curveTo(6), 3=curveTo2(4), 4=closePath(0), 5=rectangle(4))
      const verbArgCount = { 0: 2, 1: 2, 2: 6, 3: 4, 4: 0, 5: 4 };
      const verbName = { 0: 'moveTo', 1: 'lineTo', 2: 'curveTo', 3: 'curveTo2/3', 4: 'closePath', 5: 'rectangle' };
      const decoded = [];
      let cursor = 0;
      let safety = 0;
      while (cursor < arr.length && safety < 100) {
        const v = arr[cursor];
        const argCount = verbArgCount[v];
        if (argCount === undefined) {
          decoded.push(`?VERB?${v}`);
          break;
        }
        const argsSlice = arr.slice(cursor + 1, cursor + 1 + argCount);
        decoded.push(`${verbName[v]}(${argsSlice.map((x) => x.toFixed(2)).join(',')})`);
        cursor += 1 + argCount;
        safety++;
      }
      lines.push(`        decoded (hypothèse verbs 0/1/2/3/4/5) : ${decoded.join(' → ')}`);
    } else {
      lines.push(`      a[1] = ${summarizeArg(a[1])}`);
    }
    lines.push(`      a[2] = ${summarizeArg(a[2])}  (probablement minMax ou bbox)`);
  }
  lines.push('');

  // OPS.transform exhaustif
  lines.push('## OPS.transform — toutes les occurrences (page entière)');
  let transformCount = 0;
  const transformSamples = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === OPS.transform) {
      transformCount++;
      if (transformSamples.length < 10) {
        transformSamples.push({ idx: i, args: opList.argsArray[i] });
      }
    }
  }
  lines.push(`  total OPS.transform = ${transformCount}`);
  for (const s of transformSamples) {
    const a = s.args;
    const ok = Array.isArray(a) && a.length === 6 && a.every((v) => typeof v === 'number');
    lines.push(`  idx=${s.idx} args=${JSON.stringify(a)} → ${ok ? '6 nombres OK' : 'INATTENDU'}`);
  }
  lines.push('');

  // setFillRGBColor exhaustif (sample)
  lines.push('## setFillRGBColor — échantillon');
  let fillRGBCount = 0;
  const fillRGBSamples = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === OPS.setFillRGBColor) {
      fillRGBCount++;
      if (fillRGBSamples.length < 8) {
        fillRGBSamples.push({ idx: i, args: opList.argsArray[i] });
      }
    }
  }
  lines.push(`  total OPS.setFillRGBColor = ${fillRGBCount}`);
  for (const s of fillRGBSamples) {
    lines.push(`  idx=${s.idx} args=${JSON.stringify(s.args)}`);
  }
  lines.push('');

  // Présence des opérateurs fill/eoFill/stroke
  lines.push('## Présence des opérateurs fill/eoFill/stroke en v5 ?');
  const checkOps = ['fill', 'eoFill', 'stroke', 'closeStroke', 'closeFillStroke', 'closeEOFillStroke', 'fillStroke', 'eoFillStroke'];
  for (const opName of checkOps) {
    const code = OPS[opName];
    if (code === undefined) {
      lines.push(`  OPS.${opName} = (n'existe pas dans cette version)`);
      continue;
    }
    let count = 0;
    for (const c of opList.fnArray) if (c === code) count++;
    lines.push(`  OPS.${opName} (code ${code}) → ${count} occurrences sur la page`);
  }

  const out = lines.join('\n') + '\n';
  writeFileSync(OUTPUT_TXT, out);
  console.log(out);
  console.log(`\n[écrit dans ${OUTPUT_TXT}]`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
