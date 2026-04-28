# Spike #1 — pdf.js `getOperatorList()` sur Mathis.pdf et Plannig_Matthieu.pdf

| Champ | Valeur |
|---|---|
| **Date** | 28 avril 2026 |
| **Statut** | 🟡 En cours — étape 0 close, en attente validation Côme avant étapes 1-3 |
| **Étape** | 0 — audit des opérateurs PDF (`OPS.*`) sur les 2 fixtures vectorielles |
| **Durée réelle étape 0** | ~15 min (setup projet + script + run + analyse) |
| **Coût** | 0 € (tout local, pdfjs-dist v5.7.284 OSS, pas d'API externe) |
| **Périmètre** | docs/spikes/2026-05-01-01-pdf-js-getoperatorlist/ |
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

## 4. Verdict global du spike

*(À compléter après validation Côme + étapes 1-3 si scénario A confirmé.)*

---

## 5. Apprentissages

*(À compléter après validation Côme + étapes 1-3.)*

---

## 6. Décision pour la suite (étape 1 et au-delà)

*(À compléter après validation Côme. L'étape 0 étant en Scénario A pour les 2 fixtures, la suite naturelle est l'étape 1 — extraction réelle des `(rectangle, fill_color)` avec coordonnées absolues — puis étape 2 reconstruction de grille, étape 3 mapping cellule → couleur → statut métier.)*
