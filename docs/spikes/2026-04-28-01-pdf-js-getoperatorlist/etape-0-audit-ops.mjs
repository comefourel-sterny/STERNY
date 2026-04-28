import { readFileSync } from 'fs';
import { resolve } from 'path';

const FIXTURES = [
  'fixtures/Mathis.pdf',
  'fixtures/Plannig_Matthieu.pdf',
];

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { getDocument, OPS } = pdfjs;

  const OPS_NAMES = Object.fromEntries(
    Object.entries(OPS).map(([name, code]) => [code, name])
  );

  const report = {};

  for (const path of FIXTURES) {
    const fullPath = resolve(path);
    const data = new Uint8Array(readFileSync(fullPath));
    const pdf = await getDocument({ data }).promise;
    report[path] = { numPages: pdf.numPages, pages: [] };

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const opList = await page.getOperatorList();
      const counts = {};
      for (const code of opList.fnArray) {
        const name = OPS_NAMES[code] ?? `UNKNOWN_${code}`;
        counts[name] = (counts[name] ?? 0) + 1;
      }
      report[path].pages.push({
        pageNum,
        viewport: { width: viewport.width, height: viewport.height },
        totalOps: opList.fnArray.length,
        counts,
      });
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
