# Recherche parser rhythm_calendar — Axe 1 : état de l'art académique et open source

Document de recherche vivant. Construit séance par séance dans le cadre du plan en 4 axes documenté dans `ETAT-COURANT.md` section 0 du 27 avril 2026, lui-même conséquence du report de décision sur le parser (DETTE #37 statut au 27 avril 2026).

**Objectif** : cartographier les techniques existantes pour extraction de tableaux structurés (PDF vectoriel et raster), classification de couleur de fond de cellule, OCR couplé à analyse de mise en page, et reconnaissance de structure de calendrier — afin d'éclairer la décision d'architecture du parser Sterny.

**Contraintes fermes** :
- Stack Edge Function Deno / TypeScript. Pas de Python (sauf discussion explicite et documentation de la barrière d'entrée).
- Aucune implémentation de code dans la session de recherche — pure cartographie.
- Aucune décision d'architecture tant que les 4 axes du plan ne sont pas suffisamment couverts.

**Méthodologie par famille** : shortlist des techniques candidates en 5-10 lignes → validation par Côme → recherche détaillée des techniques retenues → commit d'ajout de la famille au doc (`docs(recherche): add family X to PARSER-AXE-1`).

**Dernière mise à jour** : 28 avril 2026 — ajout de la Famille 1 (extraction structurée depuis PDF vectoriel).

---

## Table des matières prévisionnelle

1. **Famille 1 — Extraction structurée depuis PDF vectoriel** *(en cours)*. Couvre Mathis (PDF Hyperplanning, légende textuelle, 1 groupe) et Matthieu (PDF Master CCA, calendrier civil jour-par-jour, encodage hybride couleur+texte, 2 pages), soit 2 fixtures sur 3.
2. **Famille 2 — Classification visuelle de couleur de fond de cellule** *(à venir)*. Couvre Martin (JPG, image raster, 4 groupes, légende couleur seule) et le cas de fallback où les fonds de cellules de Matthieu ne seraient pas extractibles programmatiquement malgré le caractère vectoriel du texte.
3. **Famille 3 — OCR couplé à analyse de mise en page** *(à venir)*. Couvre principalement les images raster (Martin) où le texte doit être relu, et tout cas où l'extraction PDF directe ne donne pas le texte intra-cellule.
4. **Famille 4 — ML appliqué aux documents (LayoutLM, DETR, Donut, etc.)** *(à venir)*. Famille la plus ambitieuse, explorée en dernier pour identifier ce que les approches plus simples n'auraient pas couvert.
5. **Acteurs marché cloud, en transversal** *(à venir)*. Adobe Extract, Microsoft Azure Document Intelligence, Google Document AI, AWS Textract — examinés famille par famille pour voir comment chaque acteur traite chaque problème, et notamment s'ils restituent ou non la couleur de fond.

---

## Famille 1 — Extraction structurée depuis PDF vectoriel

**Périmètre** : Mathis (PDF Hyperplanning, légende textuelle, 1 groupe) et Matthieu (PDF Master CCA, calendrier civil jour-par-jour, encodage hybride couleur+texte). Soit 2 fixtures sur 3.

**Question critique de la famille** : la couleur de fond de cellule est-elle extractible programmatiquement depuis un PDF vectoriel ? Toute la viabilité de l'approche dépend de cette réponse. Si oui, on a accès à la donnée principale. Si non, la famille tombe et on bascule sur la Famille 2 (classification visuelle).

**Statut au 28 avril 2026** : la réponse théorique est oui — `pdf.js` expose le flux complet d'opérateurs PDF via `page.getOperatorList()`, qui inclut `OPS.rectangle` (coordonnées x, y, w, h) + `OPS.fill` + `OPS.setFillRGBColor` / `OPS.setFillGray` / `OPS.setFillCMYKColor` + `OPS.save` / `OPS.restore` pour la stack d'état graphique. **Cette extraction théorique reste à valider par un spike technique sur les fixtures Mathis et Matthieu** — il y a un écart connu entre "les opérateurs sont accessibles" et "le PDF généré par Hyperplanning/Word/Excel utilise effectivement des rectangles + fill plutôt que des images embarquées ou des chemins complexes". Ce spike est explicitement noté comme prérequis avant toute décision d'architecture.

### Technique 1 — pdf.js via `getOperatorList()` (candidate principale)

Parser le flux d'opérateurs PDF directement, sans rendu graphique. On itère sur `operatorList.fnArray`, on maintient une stack d'état (push sur `OPS.save`, pop sur `OPS.restore`), on enregistre la dernière couleur de remplissage déclarée (`OPS.setFillRGBColor` etc.), puis quand on rencontre un `OPS.constructPath` contenant `OPS.rect` suivi d'un `OPS.fill`, on associe les coordonnées du rectangle à la couleur courante.

- **Stack** : pdfjs-dist (npm) ou pdfjs-serverless (build edge-compatible importable via `https://esm.sh/pdfjs-serverless`).
- **Runtime** : Node.js, navigateur, Deno, Cloudflare Workers, Supabase Edge Functions. Confirmé par doc unpdf et issue GitHub #3 d'unpdf (un dev a fait tourner ce build dans une Supabase Edge Function — avec des frictions à documenter).
- **Maturité** : pdf.js est maintenu par Mozilla, base de code de référence pour parser PDF en JS, version 5.6.x au 28 avril 2026. pdfjs-serverless v4.6.x.
- **Signaux extractibles** : texte (avec coordonnées et police), rectangles (coordonnées), couleurs de remplissage, transformations matricielles, courbes, lignes, images embarquées, sauf-restauration d'état graphique. Soit l'ensemble du contenu vectoriel d'une page.
- **Signaux non couverts** : tout contenu rasterisé (images de fond utilisées comme cellules colorées, scans intégrés). Si Hyperplanning ou Word ont rasterisé certaines parties, on ne les voit pas.
- **Pièges connus à anticiper** :
  - Système de coordonnées PDF (origine bas-gauche, unités points 1/72 inch) à convertir vers un repère utilisable. Issue mozilla/pdf.js #16184 documente ce piège : les coordonnées de `OPS.rect` sortent parfois en unités internes pré-multipliées par scale factor, il faut appliquer `viewport.transform`.
  - Stack d'état graphique (`OPS.save` / `OPS.restore` correspondant aux opérateurs PDF `q` / `Q`) : la couleur courante doit être suivie via une stack push/pop, pas une simple variable.
  - Plusieurs opérateurs de couleur de remplissage : `OPS.setFillRGBColor`, `OPS.setFillGray`, `OPS.setFillCMYKColor`, `OPS.setFillColor`, `OPS.setFillColorN` (color spaces nommés). Le code doit normaliser tous ces cas en RGB pour comparaison ultérieure.
  - L'opérateur `re` (rectangle) du PDF est wrappé dans `OPS.constructPath` depuis pdf.js v1.0.473 (regroupement pour optimisation). Il faut donc inspecter le tableau `args[0]` du `constructPath` pour voir si `OPS.rect` y figure, plutôt que chercher un `OPS.rect` au top niveau.
  - Hyperplanning, Word et Excel peuvent générer des PDFs avec des structures différentes (rectangles vs paths avec `moveTo`+`lineTo`+`closePath`+`fill`). Le parser doit gérer les deux formes.

- **Faisabilité Deno** : haute. pdfjs-serverless est conçu pour ça. Une issue ouverte (unpdf #3) montre un cas concret de dev sur Supabase Edge Functions, avec des frictions ; à reproduire dans un spike Deno local pour mesurer.
- **Coût d'implémentation** : moyen. La stack d'état + matching coordonnées rectangle → cellule du calendrier représente probablement 200-400 lignes de TS. Pas trivial mais isolable.
- **Verdict provisoire pour Sterny** : candidate principale à valider par spike. Si OK sur Mathis et Matthieu, c'est la base du pipeline pour les PDFs vectoriels.

### Technique 2 — pdf.js via interception canvas (plan B conceptuellement plus simple)

Approche alternative documentée par Gary Sieling (2013-2020). Au lieu de parser les opérateurs, on appelle `page.render({ canvasContext })` sur un canvas dont on a wrappé les méthodes `fillRect`, `setFillStyle`, `save`, `restore`. Pdf.js gère lui-même la stack d'état graphique pendant le rendu, et on n'a qu'à logger les rectangles peints avec leur couleur effective.

- **Avantage conceptuel** : on ne réimplémente pas la stack d'état, pdf.js le fait. Code plus court (50-150 lignes).
- **Inconvénient majeur en stack Deno** : nécessite un canvas. En Edge Function Deno, les options sont skia-canvas ou @napi-rs/canvas, qui alourdissent le bundle (plusieurs Mo) et peuvent ne pas tourner sur tous les runtimes Edge. À mesurer.
- **Risque de fidélité** : pdf.js peut fusionner ou pré-composer certains rendus (par exemple un fill sur un path complexe peut produire un seul `fill` canvas), masquant des cellules individuelles si elles sont peintes ensemble.
- **Verdict provisoire pour Sterny** : à creuser uniquement si T1 échoue ou si le code de T1 devient trop complexe à maintenir. Pas la première piste.

### Technique 3 — MuPDF-wasm (alternative à pdf.js comme moteur)

MuPDF (Artifex) est un moteur PDF C historiquement plus robuste que pdf.js sur les PDFs complexes. Il existe en build WASM importable en Deno : `mupdf-js` ou `mupdf-wasm`.

- **Avantage** : potentiellement plus précis sur les cas où pdf.js peine (PDFs mal formés, fonts exotiques, structures non standard).
- **Inconvénient** : bundle WASM lourd (5-15 Mo selon build), à valider qu'il tourne dans Supabase Edge Functions (limite de 10 Mo par fonction au moment de la rédaction, à vérifier).
- **API** : différente de pdf.js, propose une abstraction "drawing operations" qui pourrait être plus directe pour notre cas.
- **Verdict provisoire pour Sterny** : à comparer en deuxième temps si T1 échoue sur certaines fixtures. Pas prioritaire pour le premier spike.

### Technique 4 — Inspiration algorithmique pdfplumber (port TS depuis Python)

pdfplumber est la lib Python de référence pour l'extraction de tableaux. Elle ne tourne pas en Deno (Python), mais son algorithme est public et portable. Elle expose nativement `page.rects` et `page.lines` avec coordonnées + propriété `non_stroking_color` (couleur de remplissage), et elle a une stratégie `vertical_strategy: "lines"` qui utilise les rectangles dessinés comme bordures de cellules pour reconstruire la grille.

- **Intérêt** : si pdf.js expose les bons opérateurs (T1) mais qu'on doit reconstruire la grille du calendrier à partir des rectangles isolés, l'algorithme pdfplumber montre la voie. Lecture du code source `pdfplumber/page.py` recommandée pour comprendre la stratégie de "snap_tolerance" et "join_tolerance" qui permettent de reconstruire un tableau cohérent à partir de rectangles légèrement désalignés.
- **Coût de port** : moyen. L'algorithme de table inference fait 200-300 lignes de Python, transposable en TS.
- **Verdict provisoire pour Sterny** : ne pas porter aveuglément. À utiliser comme référence quand on devra écrire la logique de "rectangle → cellule de la grille" en TS.

### Repoussoirs (mentionnés pour traçabilité, à ne pas creuser)

- **camelot, tabula-py** (Python) : extraient structure + texte des tableaux, mais **ne restituent pas la couleur de fond**. Non pertinents pour notre cas où la couleur est l'information principale.
- **pdf.js-extract** (npm) : wrapper Node.js de pdf.js qui propose une option `includeColors: true`, mais qui ne capture que la **couleur du texte** (par corrélation avec l'operator list), pas la couleur de fond de cellule. Utile comme code de référence pour voir comment ils corrélent operator list et text content, pas comme solution directe.

### Acteurs marché cloud — réponse pour cette famille

**Question critique commune aux 4 acteurs** : restituent-ils la couleur de fond de cellule dans leur sortie JSON, ou seulement structure + texte ?

- **Adobe Extract API** : à vérifier. Sortie JSON avec structure et texte, présence d'un champ couleur de fond non documentée publiquement.
- **Microsoft Azure Document Intelligence (modèle "layout")** : à vérifier. Documentation orientée structure + texte, pas de mention couleur de fond.
- **Google Document AI** : à vérifier. Idem.
- **AWS Textract** : à vérifier. Idem, et de plus Textract est connu pour être orienté texte.

**Hypothèse de travail** : aucun des 4 services ne restitue la couleur de fond de cellule dans son output standard, ce qui les ferait tomber dans le même piège que les LLM vision actuels (ignorer la donnée principale). À confirmer dans une session dédiée Acteurs cloud — pour l'instant, on les met de côté.

### Recommandation pour la suite (hors doc — à arbitrer avec Côme)

Spike technique sur **Technique 1** : implémenter une preuve de concept de 100-200 lignes Deno qui charge `Planning_Mathis.pdf` et `Plannig_Matthieu.pdf` via pdfjs-serverless, parse le flux d'opérateurs, extrait la liste des rectangles colorés avec leurs coordonnées, et produit un export JSON. Pas de matching coordonnées → calendrier dans ce premier spike — l'objectif est uniquement de répondre à la question critique : "est-ce que la couleur de fond est bien extractible sur ces 2 PDFs ?". Durée estimée 2-4 heures.

Si succès : on passe à la Famille 2 puis on revient sur la grille du calendrier.
Si échec partiel (extrait certains PDFs et pas d'autres) : on documente ce qu'on a, on passe à T2 ou T3 selon la nature de l'échec.
Si échec total : on bascule directement sur la Famille 2 (classification visuelle) et la Famille 1 reste en plan B.

---

## Famille 2 — Classification visuelle de couleur de fond de cellule

*(À venir.)*

---

## Famille 3 — OCR couplé à analyse de mise en page

*(À venir.)*

---

## Famille 4 — ML appliqué aux documents

*(À venir.)*

---

## Acteurs marché cloud — synthèse transversale

*(À venir, alimentée famille par famille.)*

---

## Domaines connexes à explorer ultérieurement

Liste vivante de pistes tangentielles croisées en cours de recherche, à explorer dans une session bonus dédiée si la recherche principale ne suffit pas. Une phrase par piste, sans la suivre dans le moment.

- **Extraction de couleur de fond de cellule en PyMuPDF (Python)** : forum MuPDF, fil https://forum.mupdf.com/t/how-can-i-extract-the-background-color-of-a-rect-with-specific-coordinates/170 — un dev a exactement notre cas d'usage, à lire en entier pour voir comment il s'en sort, et comparer avec ce qu'on construit en JS. À explorer après le spike Famille 1.
- **Interception canvas pendant rendu pdf.js** (Gary Sieling, blog 2013-2020) : technique alternative documentée pour T2 ci-dessus, intéressante au-delà du parser de calendrier (extraction de tableaux, OCR de formulaires, etc.). À garder en tête comme pattern réutilisable.

---

*Document de recherche vivant. Mis à jour à chaque famille validée. Versionné par commits successifs pour permettre la relecture pas à pas.*
