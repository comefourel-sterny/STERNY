# Spike #1 — pdf.js `getOperatorList()` sur Mathis.pdf et Plannig_Matthieu.pdf

| Champ | Valeur |
|---|---|
| **Date** | 28 avril 2026 |
| **Statut** | 🟢 Étape 1A close, validation visuelle Côme positive (verdict A — extraction fidèle) |
| **Étape** | 1A — extraction brute des fills (rectangles colorés) et textes positionnés |
| **Durée réelle étape 0** | ~15 min (setup projet + script + run + analyse) |
| **Durée réelle étape 1A** | ~50 min (1A.1 investigation 20 min + 1A.2 extraction 20 min + 1A.3 SVG 10 min) |
| **Coût** | 0 € (tout local, pdfjs-dist v5.7.284 OSS, pas d'API externe) |
| **Périmètre** | docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/ |
| **Référence cadrage** | ETAT-COURANT section 1er mai (plan parser Sterny, Spike #1), DETTE #37 |

---

## 1. Question à laquelle ce spike répond

**Question critique de la Famille 1 (PARSER-AXE-1 §F1)** : la couleur de fond de cellule est-elle extractible programmatiquement depuis un PDF vectoriel via pdf.js `getOperatorList()` ?

Toute la viabilité de l'approche F1 dépend de cette réponse. Si la donnée est accessible, on a la voie principale du pipeline pour les fixtures Mathis (Hyperplanning) et Matthieu (Master CCA). Si elle ne l'est pas — par exemple parce que les fonds de cellules sont rasterisés malgré le caractère vectoriel du texte — la Famille 1 tombe et on bascule sur la Famille 2 (classification visuelle) ou Famille 3 (Vision OCR + DocAI compute_style_info).

L'étape 0 du spike est **un préalable de coût-bénéfice** : avant d'investir 3-4 h dans les étapes 1-3 (extraction réelle + matching grille + sortie JSON), on vérifie en ~15 min que les bons opérateurs sont effectivement présents dans le flux PDF. Trois scénarios possibles :

- **Scénario A — fonds vectoriels** : présence de `setFillRGBColor` + `constructPath`/`rectangle`/`fill` en quantité significative dans la zone calendrier. Continuer vers étapes 1-3.
- **Scénario B — fonds rasterisés** : présence majoritaire de `paintImageXObject` ou `paintJpegXObject` couvrant la zone calendrier. Fermer le spike #1 et basculer sur le spike #2 Vision OCR.
- **Scénario C — hybride** : mélange des deux. Décision au cas par cas, à discuter avec Côme.

---

## 2. Méthode

- **Stack** : Node.js (ESM, `"type": "module"`) + `pdfjs-dist@^5.7.284` via le build legacy `pdfjs-dist/legacy/build/pdf.mjs` (compat Node, sinon erreur `DOMMatrix is not defined`).
- **Fixtures** : 2 PDFs copiés dans `fixtures/` depuis `test-plannings/` à la racine du repo. Sous-dossier `fixtures/` protégé par un `.gitignore` local qui exclut les `*.pdf` (données personnelles d'alternants réels — non commités, README local pointe vers la source canonique pour reconstitution).
  - `fixtures/Mathis.pdf` (Hyperplanning R_CA_A3, 1 groupe — fixture #2 du repo)
  - `fixtures/Plannig_Matthieu.pdf` (Master CCA, 2 pages : Master 1 + Master 2 — fixture #3 du repo, typo "Plannig" volontairement préservée)
- **Script** : `etape-0-audit-ops.mjs`. Pour chaque PDF, pour chaque page :
  1. `getDocument({ data }).promise` → `pdf`
  2. `pdf.getPage(pageNum).getOperatorList()` → `opList`
  3. Inverser `OPS` (name → code) en `OPS_NAMES` (code → name) pour rendre les counts lisibles
  4. Itérer sur `opList.fnArray` et compter par opérateur
  5. Output : JSON structuré avec `numPages`, `viewport` par page, `totalOps`, `counts` par opérateur
- **Pas dans le périmètre étape 0** : aucune extraction de couleur, aucun matching coordonnées → grille, aucune classification de cellule. Pure exploration statistique.
- **Warnings non bloquants observés** (capturés dans `etape-0-audit-stderr.log`) : `Ensure that the standardFontDataUrl API parameter is provided` + `TT: undefined function: 21`. Liés à des fonts standard non chargées en mode legacy Node, **sans impact sur l'audit OPS** (l'`fnArray` est complet, le rendu visuel n'est pas requis pour notre besoin). À traiter en étape 1+ si on voit que ça affecte une métadonnée nécessaire.

---

## 3. Résultats chiffrés (étape 0)

Source brute : `etape-0-audit-output.json`.

### 3.1 Mathis.pdf

- 1 page, viewport 841.92 × 595.32 (A4 paysage en points)
- **Total ops : 12 805**

Top 10 opérateurs par count :

| Rang | Opérateur | Count | Sens |
|---|---|---:|---|
| 1 | `constructPath` | 1 754 | Construction de chemins (englobe `OPS.rect` + autres path ops, regroupés depuis pdf.js v1.0.473) |
| 2 | `setFillRGBColor` | **1 380** | **Définition d'une couleur de remplissage RGB** ← signal couleur de fond |
| 3 | `save` | 995 | Push état graphique (`q`) |
| 4 | `restore` | 995 | Pop état graphique (`Q`) |
| 5 | `eoClip` | 870 | Clipping even-odd |
| 6 | `beginMarkedContentProps` | 833 | Tagged PDF / accessibilité |
| 7 | `endMarkedContent` | 833 | idem |
| 8 | `beginText` | 831 | Bloc texte ouvert |
| 9 | `setFont` | 831 | Police courante |
| 10 | `setTextMatrix` | 831 | Matrice texte |

Aussi présents : `showText` 831, `endText` 831, `setStrokeRGBColor` 831, `setFillColorN` 125 (couleurs nommées, color spaces), `setGState` 2, `dependency` 19, `setCharSpacing` 13.

**Opérateurs absents (recherchés explicitement)** : aucun `paintImageXObject`, aucun `paintJpegXObject`, aucun `paintInlineImageXObject`, aucun `paintFormXObject` qui couvrirait la zone calendrier en raster. **Le PDF est intégralement vectoriel.**

**Verdict Mathis = SCÉNARIO A (fonds vectoriels confirmés).** 1 380 `setFillRGBColor` couplés à 1 754 `constructPath` : signature massive de cellules vectorielles colorées, parfaitement compatible avec l'extraction couleur de fond via parsing de l'`fnArray` aux étapes 1-3.

### 3.2 Plannig_Matthieu.pdf

- 2 pages (Master 1 CCA + Master 2 CCA), viewport identique 841.68 × 595.20 (A4 paysage en points)

Page 1 — **Total ops : 4 322**

| Rang | Opérateur | Count |
|---|---|---:|
| 1 | `beginMarkedContentProps` | 701 |
| 2 | `endMarkedContent` | 701 |
| 3 | `showText` | 699 |
| 4 | `moveText` | 672 |
| 5 | `setWordSpacing` | 507 |
| 6 | `setCharSpacing` | 506 |
| 7 | `constructPath` | 258 |
| 8 | **`setFillRGBColor`** | **144** |
| 9 | `setTextMatrix` | 27 |
| 10 | `beginText` | 21 / `endText` 21 |

Aussi présents : `setFont` 19, `save` 13, `restore` 13, `clip` 13, `dependency` 7.

Page 2 — **Total ops : 4 386**

| Rang | Opérateur | Count |
|---|---|---:|
| 1 | `beginMarkedContentProps` | 709 |
| 2 | `endMarkedContent` | 709 |
| 3 | `showText` | 707 |
| 4 | `moveText` | 680 |
| 5 | `setWordSpacing` | 520 |
| 6 | `setCharSpacing` | 519 |
| 7 | `constructPath` | 265 |
| 8 | **`setFillRGBColor`** | **143** |
| 9 | `setTextMatrix` | 27 |
| 10 | `beginText` | 21 / `endText` 21 |

Aussi présents : `setFont` 19, `save` 13, `restore` 13, `clip` 13, `dependency` 7.

**Opérateurs absents (recherchés explicitement)** : aucun `paintImageXObject`, aucun `paintJpegXObject`, aucun `paintInlineImageXObject`, aucun `paintFormXObject`. **Le PDF est intégralement vectoriel sur les 2 pages.**

**Verdict Matthieu = SCÉNARIO A (fonds vectoriels confirmés).** ~144 `setFillRGBColor` par page couplés à ~260 `constructPath` par page, zéro opérateur de paint d'image. Volume nettement inférieur à Mathis (~10× moins de fills colorés), ce qui est **cohérent avec la description fixture #3** dans ETAT-COURANT : Matthieu est un calendrier civil avec une **majorité de cellules au fond neutre** (pas de remplissage vectoriel explicite) et seulement les **plages spéciales** (Examens, Révisions, Soutenance, Rattrapages, vacances) colorées. La conséquence opérationnelle pour les étapes 1-3 : sur Matthieu, l'absence de `setFillRGBColor` sur une cellule = "fond par défaut" (school ou company selon convention à acter), pas "fond non détecté". À documenter explicitement dans l'algo de l'étape 1.

### 3.3 Synthèse étape 0

| Fixture | Pages | `setFillRGBColor` total | `constructPath` total | `paintImage*` | Verdict |
|---|---:|---:|---:|---|---|
| Mathis.pdf | 1 | 1 380 | 1 754 | 0 | **Scénario A** |
| Plannig_Matthieu.pdf | 2 | 287 (144 + 143) | 523 (258 + 265) | 0 | **Scénario A** |

**Conclusion étape 0** : les 2 fixtures sont en Scénario A. La voie F1 via `getOperatorList()` est techniquement viable sur les 2. **L'investissement des étapes 1-3 (3-4 h) est justifié** par la donnée présente dans l'`fnArray`. Aucun signal de basculement vers Scénario B ou C.

**Nuance Matthieu à porter aux étapes 1-3** : la convention "absence de fill = couleur par défaut" doit être actée avant l'extraction. Sur Mathis, chaque cellule du calendrier a très probablement un fill explicite (1380 fills pour ~250 cellules attendues = ~5 fills par cellule, plausible avec hover/decorative + 1 fond + bordures). Sur Matthieu, la majorité des cellules n'aura aucun `setFillRGBColor` proche → algo doit gérer ce cas par défaut sans crasher.

---

## 3bis. Étape 1A — Extraction brute des fills et textes

**Objectif unique de 1A** : produire un dump brut, par fixture et par page, des rectangles fillés (couleur + position en coords PDF) ET des textes positionnés (bbox + chaîne) extraits depuis pdf.js. Format JSON exploitable directement par 1B (matching contre vérité terrain). Pas de reconstruction de grille, pas de mapping couleur→statut, pas de matching — c'est l'étape 1B.

### 3bis.1 Sous-étape 1A.1 — Investigation structure pdf.js v5

Avant de coder l'extraction, vérification empirique des hypothèses des notes techniques (`etape-1a-notes-techniques.md`) sur la structure réelle des opérateurs en pdf.js v5.7.284. Script : `etape-1a-1-explore-ops-structure.mjs`. Sortie : `etape-1a-1-explore-ops-output.txt`.

**Verdict : les 4 hypothèses des notes techniques sont contredites par la réalité observée.** Tableau de divergence :

| # | Notes techniques | Réalité pdf.js v5.7.284 |
|---|---|---|
| 1 | `OPS.setFillRGBColor` args = `[r, g, b]` (0..1 ou 0..255) | `OPS.setFillRGBColor` args = `["#rrggbb"]` — un seul string hex |
| 2 | `OPS.constructPath` args = `[opsArray, argsArray, minMax]` | `OPS.constructPath` args = `[actionCode, [Float32Array(pathData)], Float32Array(4) bbox]` |
| 3 | `OPS.transform` args = 6 nombres, à composer dans une CTM | **0 occurrence d'`OPS.transform`** sur les 3 pages des 2 fixtures. Pas de CTM à tracker. |
| 4 | `OPS.fill` / `OPS.eoFill` séparés après `OPS.constructPath` | **0 occurrence**. L'action est fusionnée dans `constructPath` args[0] (codes : 22 fill, 23 eoFill, 24 fillStroke, 25 eoFillStroke, 26 closeFillStroke, 27 closeEOFillStroke, 28 endPath/clipping) |

**Conséquences sur 1A.2** : machine à états radicalement simplifiée par rapport au plan initial. Plus besoin de pile save/restore, pas de multiplication matricielle CTM, pas de parsing manuel du path data — la bbox `args[2]` est déjà calculée par pdf.js et axis-aligned, exact pour les rectangles d'une grille de calendrier.

**Distribution observée des `constructPath` args[0]** :

| Fixture / page | endPath (clip seul) | fill | eoFill | total |
|---|---:|---:|---:|---:|
| Mathis p1 | 870 | 0 | 884 | 1 754 |
| Matthieu p1 | 13 | 88 | 157 | 258 |
| Matthieu p2 | 13 | 82 | 170 | 265 |

Pattern dominant Mathis : `save → eoClip → constructPath(28=endPath) → setFillRGBColor → constructPath(23=eoFill) → restore`. Les `endPath` correspondent à des paths purement de clipping (zone de découpe) sans peinture, à ignorer en 1A.2. Les `fill`/`eoFill` sont les rectangles colorés à extraire.

### 3bis.2 Sous-étape 1A.2 — Extraction principale (fills + texts)

Script : `etape-1a-2-extract-fills-and-text.mjs`. Sorties : `output-mathis-cells.json` (203 Ko), `output-matthieu-cells.json` (324 Ko). Résumé tabulé : `etape-1a-2-summary.txt`.

**Format JSON par page** :
```
{
  pageNum, viewport: { width, height },
  fills: [{ x, y, width, height, color, fillAction, page }, ...],
  texts: [{ x, y, width, height, str, page }, ...],
  unsupportedFillsCount, unsupportedFillsBecauseColorN, unsupportedFillsBecauseNullColor,
  setFillColorNOccurrences, ignoredEndPathCount
}
```

**Mathis.pdf — page 1** (viewport 841.92 × 595.32)

| Mesure | Valeur |
|---|---:|
| Fills extraits (RGB exploitable) | **634** |
| Couleurs distinctes | 8 |
| `#ffffff` | 284 |
| `#00ccff` (cyan dominant) | 170 |
| `#00ff00` (vert vif) | 89 |
| `#c0c0c0` (gris clair) | 47 |
| `#000000` | 32 |
| `#ff8080` (rose) | 10 |
| `#404040` | 1 |
| `#262626` | 1 |
| Fills non-RGB ignorés | 250 (tous colorN, 0 nullColor) |
| `setFillColorN` occurrences | 125 (TilingPattern — 2 fills par occurrence) |
| `endPath` ignorés (clipping) | 870 |
| Textes non-vides | 482 |
| `fillAction` distribution | `{ eoFill: 634 }` (Hyperplanning use exclusivement eoFill) |

**Plannig_Matthieu.pdf — page 1** (viewport 841.68 × 595.20)

| Mesure | Valeur |
|---|---:|
| Fills extraits (RGB exploitable) | **245** |
| Couleurs distinctes | 7 |
| `#bfbfbf` (gris bordure) | 89 |
| `#000000` | 76 |
| `#ffff00` (jaune) | 54 |
| `#ff0000` (rouge) | 15 |
| `#83e28e` (vert) | 9 |
| `#f7c7ac` (saumon) | 1 |
| `#c1f0c8` (vert clair) | 1 |
| Fills non-RGB ignorés | 0 |
| `endPath` ignorés (clipping) | 13 |
| Textes non-vides | 699 |
| `fillAction` distribution | `{ fill: 88, eoFill: 157 }` |

**Plannig_Matthieu.pdf — page 2** (viewport 841.68 × 595.20)

| Mesure | Valeur |
|---|---:|
| Fills extraits (RGB exploitable) | **252** |
| Couleurs distinctes | 7 |
| `#bfbfbf` | 89 |
| `#000000` | 76 |
| `#ffff00` | 58 |
| `#ff0000` | 18 |
| `#83e28e` | 9 |
| `#f7c7ac` | 1 |
| `#c1f0c8` | 1 |
| Fills non-RGB ignorés | 0 |
| `endPath` ignorés (clipping) | 13 |
| Textes non-vides | 707 |
| `fillAction` distribution | `{ fill: 82, eoFill: 170 }` |

**Vérification de cohérence avec 1A.1** :
- Mathis : 634 fills extraits + 250 unsupported = 884 = nombre exact d'eoFill comptés en 1A.1 ✅
- Matthieu p1 : 88 + 157 = 245 fills, p2 : 82 + 170 = 252 fills ✅

### 3bis.3 Sous-étape 1A.3 — Validation visuelle SVG

Script : `etape-1a-3-render-svg.mjs`. Sorties :

| Fichier | Taille |
|---|---:|
| `output-mathis-p1.svg` | 102.5 Ko |
| `output-matthieu-p1.svg` | 89.6 Ko |
| `output-matthieu-p2.svg` | 91.1 Ko |

Choix techniques : Y-axis option 2 (pré-calcul `y_svg = H - y_pdf - height` pour rectangles, `y_svg = H - y_pdf` pour texte baseline), ordre de rendu SVG = ordre dans le JSON pour préserver l'effet de superposition fond+couleur+bordure du PDF source.

**Verdict Côme : A — extraction fidèle pour les 2 fixtures.** Les grilles de calendrier sont reconnaissables, les cellules colorées sont à la bonne position, le texte est aligné sur les cellules. L'hypothèse `#000000`/`#bfbfbf` de Matthieu = bordures fines est confirmée visuellement (pas des fills de cellule pleins).

**Anomalie connue, sans impact métier** : sur Mathis, le titre du PDF (élément décoratif hors grille) est rendu en gris par défaut dans le SVG au lieu de sa vraie couleur. Cause : TilingPattern via `setFillColorN` (cohérent avec les 125 occurrences comptées en 1A.1, ignorées par l'extraction RGB). Aucun impact sur les cellules métier de la grille de calendrier.

**Pattern clipping save→eoClip→endPath→setFillRGBColor→eoFill→restore** : la validation visuelle confirme qu'il n'y a pas de surestimation visible des bbox des fills, malgré le fait que 1A.2 ignore la pile de clipping. Acceptable pour 1B.

---

## 4. Verdict 1A et décision suite (verdict global spike #1 reste en placeholder)

**Verdict 1A** : `pdf.js getOperatorList()` est confirmé comme voie viable pour extraire la structure d'une grille de calendrier sur PDF vectoriel (Hyperplanning + Word/PDF generator). L'extraction brute en JSON est fidèle visuellement (verdict A Côme), avec une couverture suffisante des cas courants pour passer à l'étape 1B.

**Étape suivante : 1B — matching contre vérité terrain.** Construction de la grille (clustering x/y des fills, détection de lignes, identification de cellules), classification cellule → semaine ISO, mapping couleur → statut school/company, puis comparaison avec un CSV vérité terrain rempli par Côme.

**Prérequis 1B** : CSV vérité terrain Matthieu (M1 + M2 CCA, statut school/company par semaine ISO) à rédiger par Côme avant le run 1B.

**Verdict global du spike #1** : reste en placeholder — sera complété après clôture de 1B (et 1C si nécessaire). Idem pour la décision globale F1 vs F2 vs F3 sur le pipeline parser Sterny.

---

## 5. Apprentissages à porter en mémoire

### 5.1 Divergences pdf.js v5 vs notes techniques (référence pour futurs spikes)

Tableau de divergence identifié en 1A.1 (cf. §3bis.1), à conserver comme référence pour tout futur travail sur pdf.js (parser, autre fixture, Edge Function) :

| # | Notes techniques disaient | Réalité pdf.js v5.7.284 |
|---|---|---|
| 1 | `setFillRGBColor` = `[r, g, b]` | `setFillRGBColor` = `["#rrggbb"]` |
| 2 | `constructPath` = `[opsArray, argsArray, minMax]` | `constructPath` = `[actionCode, [Float32Array(pathData)], Float32Array(4) bbox]` |
| 3 | `OPS.transform` à composer dans une CTM | 0 occurrence sur les 2 fixtures, pas de CTM à tracker |
| 4 | `OPS.fill` / `OPS.eoFill` séparés | Action fusionnée dans `constructPath` args[0] |

Conséquence pratique : la machine à états du parser est ~3× plus simple que ce qu'on planifiait initialement. Le coût total de 1A (~50 min) est très inférieur à la fourchette 3-4 h estimée en cadrage de spike.

### 5.2 Pattern clipping save→eoClip→endPath→setFillRGBColor→eoFill→restore

Observé massivement sur Mathis (870 endPath / 884 eoFill par page). Hypothèse en 1A.1 : risque de surestimation des bbox des fills si la zone de clip est plus petite que le path. **Verdict après validation visuelle 1A.3 : pas de surestimation visible, l'ignorance de la pile de clipping en 1A.2 est acceptable pour 1B.** À garder en tête pour le cas où une fixture future montrerait un défaut.

### 5.3 TilingPattern (setFillColorN) — limite connue, sans impact métier

| Fixture | `setFillColorN` occurrences | Origine probable |
|---|---:|---|
| Mathis p1 | 125 | Titre du PDF + éléments décoratifs Hyperplanning hors grille |
| Matthieu p1 | 0 | (aucun) |
| Matthieu p2 | 0 | (aucun) |

Conséquence : sur Mathis, le titre du PDF est rendu en gris par défaut dans le SVG (couleur Pattern non décodée par 1A.2). **Sans impact sur les cellules métier de la grille de calendrier.** À ne pas chercher à corriger en 1B sauf besoin métier explicite.

### 5.4 Warning `standardFontDataUrl` — cosmétique

Au load des PDFs, pdfjs-dist v5.7.284 émet un warning `Unable to load font data at: file://.../LiberationSans-Regular.ttf` malgré le `standardFontDataUrl` passé à `getDocument()`. **Le warning est cosmétique** : le texte est correctement extrait via `getTextContent()` — accents (`â é ê ô û`), mots métier (Toussaint, Examens, Révisions, Pâques, Rattrapages, Soutenance, noms de mois français complets), ponctuation, casse, le tout sans aucun caractère de contrôle ou substitution sur les 1 888 chaînes extraites. À ne pas creuser.

---

## 6. Fichiers produits par 1A

| Sous-étape | Fichier | Rôle |
|---|---|---|
| 1A.1 | `etape-1a-1-explore-ops-structure.mjs` | Script d'investigation empirique de la structure des opérateurs pdf.js v5 |
| 1A.1 | `etape-1a-1-explore-ops-output.txt` | Sortie texte de l'investigation (table OPS, samples, distribution args[0]) |
| 1A.2 | `etape-1a-2-extract-fills-and-text.mjs` | Script d'extraction principal (machine à états couleur + dump JSON) |
| 1A.2 | `output-mathis-cells.json` | Dump brut Mathis page 1 — 634 fills + 482 textes (203 Ko) |
| 1A.2 | `output-matthieu-cells.json` | Dump brut Matthieu pages 1-2 — 497 fills + 1 406 textes (324 Ko) |
| 1A.2 | `etape-1a-2-summary.txt` | Résumé tabulé des chiffres + échantillons texte (vérification qualité) |
| 1A.3 | `etape-1a-3-render-svg.mjs` | Script de rendu SVG depuis les outputs JSON (Y-axis option 2) |
| 1A.3 | `output-mathis-p1.svg` | Rendu visuel Mathis page 1 (102.5 Ko) — verdict A Côme |
| 1A.3 | `output-matthieu-p1.svg` | Rendu visuel Matthieu page 1 (89.6 Ko) — verdict A Côme |
| 1A.3 | `output-matthieu-p2.svg` | Rendu visuel Matthieu page 2 (91.1 Ko) — verdict A Côme |

À supprimer en clôture du spike #1 (avec `etape-1a-notes-techniques.md`) une fois la décision F1/F2/F3 actée.
