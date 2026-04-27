# Recherche parser rhythm_calendar — Axe 1 : état de l'art académique et open source

Document de recherche vivant. Construit séance par séance dans le cadre du plan en 4 axes documenté dans `ETAT-COURANT.md` section 0 du 27 avril 2026, lui-même conséquence du report de décision sur le parser (DETTE #37 statut au 27 avril 2026).

**Objectif** : cartographier les techniques existantes pour extraction de tableaux structurés (PDF vectoriel et raster), classification de couleur de fond de cellule, OCR couplé à analyse de mise en page, et reconnaissance de structure de calendrier — afin d'éclairer la décision d'architecture du parser Sterny.

**Contraintes fermes** :
- Stack Edge Function Deno / TypeScript. Pas de Python (sauf discussion explicite et documentation de la barrière d'entrée).
- Aucune implémentation de code dans la session de recherche — pure cartographie.
- Aucune décision d'architecture tant que les 4 axes du plan ne sont pas suffisamment couverts.

**Méthodologie par famille** : shortlist des techniques candidates en 5-10 lignes → validation par Côme → recherche détaillée des techniques retenues → commit d'ajout de la famille au doc (`docs(recherche): add family X to PARSER-AXE-1`).

**Dernière mise à jour** : 28 avril 2026 — ajout de la Famille 3 (OCR couplé à analyse de mise en page), après vérification de la compat Vision API en Deno Edge Function et du bundle Tesseract.js.

---

## Table des matières prévisionnelle

1. **Famille 1 — Extraction structurée depuis PDF vectoriel** *(commitée)*. Couvre Mathis (PDF Hyperplanning, légende textuelle, 1 groupe) et Matthieu (PDF Master CCA, calendrier civil jour-par-jour, encodage hybride couleur+texte, 2 pages), soit 2 fixtures sur 3.
2. **Famille 2 — Classification visuelle de couleur de fond de cellule** *(commitée)*. Couvre Martin (JPG, image raster, 4 groupes, légende couleur seule) et le cas de fallback où les fonds de cellules de Matthieu ne seraient pas extractibles programmatiquement malgré le caractère vectoriel du texte.
3. **Famille 3 — OCR couplé à analyse de mise en page** *(commitée)*. Couvre principalement les images raster (Martin) où le texte doit être relu, et tout cas où l'extraction PDF directe ne donne pas le texte intra-cellule. Sert aussi de signal redondant pour Mathis et Matthieu si on rastérise.
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

**Périmètre** : Martin (JPG, 4 groupes, ~180 cellules par groupe, légende couleur seule sans annotation textuelle). Sert aussi de fallback pour Mathis et Matthieu si le spike Famille 1 montre que leurs fonds de cellules sont rasterisés ou non extractibles depuis le flux d'opérateurs PDF.

**Question critique de la famille** : sur une image raster, comment classer fiablement la couleur de fond de chaque cellule d'un tableau ? Chaîne en 4 étapes : (1) détection de la grille, (2) échantillonnage de la couleur de fond de chaque cellule, (3) clustering des couleurs en classes, (4) mapping classes → statut métier (school/company). C'est aussi la famille où les LLM vision actuels échouent (~50% d'erreur, test 26 avril) — donc la solution doit être structurellement différente, pas un simple "autre LLM mais en mieux". Hypothèse de fond à étayer : un algorithme déterministe qui échantillonne le centre de chaque cellule et fait un K-means à 3-4 clusters est fondamentalement plus fiable qu'un LLM qui doit "regarder" 180 cellules en parallèle et hiérarchiser sa propre attention.

**Contraintes stack à acter avant tout** : Supabase Edge Functions tournent en Deno 1.46, n'acceptent **que des libs WASM ou pure TS** (pas de libs natives type `sharp` ou `@napi-rs/canvas`), avec une limite de **20 Mo par fonction après bundling** valable pour tous les plans incluant le free (vérifié sur la doc officielle). Mémoire 512 Mo, timeout idle 150 s. Toutes les techniques ci-dessous sont évaluées à la lumière de ces contraintes.

### Technique 1 — magick-wasm / ImageMagick WASM (candidate principale, officiellement supportée par Supabase)

ImageMagick est l'outil de référence en traitement d'image depuis 1987. La version WASM officielle est `@imagemagick/magick-wasm` (Dirk Lemstra). **Supabase recommande explicitement cette lib dans sa doc Image Manipulation pour Edge Functions** — c'est l'exemple de référence officiel.

Pipeline pour notre cas :
1. **Décodage de l'image** : `ImageMagick.read(uint8Array, ...)`. Gère JPG, PNG, WebP nativement.
2. **Extraction de grille par morphologie** : `image.morphology()` avec un kernel rectangulaire (ex: `Rectangle:20x1`) pour isoler les lignes horizontales. Pareil avec un kernel `Rectangle:1x20` pour les lignes verticales. Technique classique ImageMagick documentée par exemple dans le post "Reading tables from images with magick" (themockup.blog).
3. **Détection des intersections** : combinaison des deux résultats morphologiques pour obtenir les coordonnées des cellules.
4. **Échantillonnage couleur** : `image.crop()` au centre de chaque cellule + `image.statistics()` pour obtenir la couleur moyenne RGB.
5. **Clustering** : `image.kmeans()` est un opérateur ImageMagick natif qui fait du K-means sur les couleurs avec un nombre de clusters paramétrable. Combiné avec `-fuzz` (tolérance de couleur configurable de 0 à 100), permet de regrouper des couleurs proches.

- **Stack** : `@imagemagick/magick-wasm` (npm) ou `https://deno.land/x/imagemagick_deno/mod.ts` (port Deno maintenu par lumeland) ou `deno_imagemagick`. **Le port Deno officiel est recommandé** — la version npm a une issue connue de chargement WASM via `XMLHttpRequest` qui ne marche pas en Deno (cf. issue dlemstra/magick-wasm #81), résolue par les ports Deno.
- **Runtime** : Node.js, navigateur, **Deno** (avec port adapté), **Supabase Edge Functions** (officiellement validé par la doc Supabase elle-même).
- **Maturité** : ImageMagick existe depuis 1987, port WASM maintenu activement (releases mensuelles). magick-wasm npm publié il y a 2 semaines au moment de la rédaction.
- **Taille du bundle** : à mesurer en spike, mais ImageMagick complet en WASM est typiquement 10-15 Mo. Possibilité de builds custom plus légers en désactivant les modules inutilisés (comme pour OpenCV.js).
- **Couverture des fonctions du pipeline** : `morphology` ✅, `kmeans` ✅, `statistics` ✅, `crop` ✅, `fuzz` (tolérance couleur) ✅, support JPG/PNG/WebP ✅. **Tout le pipeline est couvert nativement.**
- **Pièges connus** :
  - Initialisation asynchrone obligatoire (`await initializeImageMagick()`) avant toute utilisation
  - L'API est différente d'OpenCV (callbacks `read(bytes, img => {...})` au lieu de `cv.imread()`)
  - Photos très de travers ou avec ombre : ImageMagick a `-distort` pour la correction de perspective, mais c'est moins direct qu'OpenCV `warpPerspective`
- **Faisabilité Supabase Edge Functions** : **OUI explicitement**, c'est l'exemple de référence dans la doc Supabase
- **Coût d'implémentation** : moyen. Pipeline ~250-400 lignes de TS. Le tuning des seuils morphologiques et du `fuzz` dépend des fixtures (4-8h de tuning sur Martin).
- **Verdict provisoire pour Sterny** : **candidate principale**. Officiellement supporté par Supabase, couvre toutes les fonctions nécessaires, écosystème ImageMagick mature. À tester en spike sur Martin.

### Technique 2 — OpenCV.js (candidate alternative à T1)

OpenCV est l'outil de référence en computer vision depuis 2000. Port WASM officiel maintenu par l'équipe OpenCV.

Pipeline classique :
1. Décodage image → `cv.Mat`
2. Conversion grayscale → `cv.adaptiveThreshold()` → morphologie (`cv.erode`, `cv.dilate` avec `cv.getStructuringElement`) ou Hough lines (`cv.HoughLinesP`)
3. Détection des intersections, extraction cellules
4. `cv.mean()` pour échantillonner couleur ROI au centre de chaque cellule
5. `cv.kmeans()` pour clustering

- **Stack** : 3 builds Deno-compatibles disponibles :
  - `https://deno.land/x/opencv@v4.3.0-10/mod.ts` (port officiel Deno par echamudi, OpenCV 4.3.0)
  - `@techstark/opencv-js` (npm, OpenCV 4.12.0 plus récent)
  - `fast-opencv-wasm` (npm, OpenCV 4.5.5)
- **Runtime** : Node.js, Deno, navigateur. **Supabase Edge Functions = aucun retour utilisateur public spécifique trouvé**, à valider en spike.
- **Maturité** : OpenCV maintenu depuis 25 ans, ports Deno stables mais maintenus par des tiers individuels (Cezary Daniel Nowak, Ezzat Chamudi, etc.) — risque de stagnation à terme.
- **Taille du bundle** : ~6-8 Mo build par défaut (vérifié sur openCV Q&A question/229032). Avec recompilation custom retirant les modules ML/DNN, descend à ~2-4 Mo. Sous la limite 20 Mo Supabase.
- **Pièges connus** :
  - Système de coordonnées et matrices de transformation à gérer
  - Initialisation asynchrone (`onRuntimeInitialized`)
  - Les builds Deno tiers peuvent diverger de l'OpenCV officiel sur certaines API
- **Faisabilité Supabase Edge Functions** : haute en théorie (WASM officiellement supporté), mais aucun cas concret documenté publiquement. Risque opérationnel à valider en spike avant tout investissement majeur.
- **Coût d'implémentation** : moyen. Pipeline ~200-400 lignes de TS.
- **Verdict provisoire pour Sterny** : **candidate alternative à T1**. Plus puissante en CV avancée (perspective warp, filtres avancés), mais moins de garantie de tourner dans Supabase Edge. Pertinente si T1 a des limites sur les cas dégradés (photos de travers, ombres).

### Technique 3 — Algo manuel sur ImageData (pur TypeScript, candidate légère)

Approche bas niveau, sans lib CV. Pipeline :
1. **Décodage du JPG** : via `imagescript` (pure TS, Deno-compatible) ou via magick-wasm pour la seule étape de décodage. Sortie : un `Uint8ClampedArray` de taille `width × height × 4` (RGBA).
2. **Détection de grille par projection** : technique classique en CV. Pour chaque ligne `y`, on compte le nombre de pixels foncés (luminance < seuil) sur toute la largeur — les lignes avec un compte élevé sont des **lignes horizontales de grille**. Pareil pour chaque colonne `x` → lignes verticales. Quelques dizaines de lignes de TS sans lib.
3. **Reconstruction cellules** : intersections des lignes horizontales et verticales.
4. **Échantillonnage couleur** : moyenne RGB des pixels au centre de chaque cellule.
5. **Clustering** : K-means simple en TS (50-80 lignes), ou dictionnaire de couleurs prédéfinies si la légende est connue.

- **Stack** : pur TypeScript + `imagescript` ou `magick-wasm` pour le décodage uniquement.
- **Runtime** : Node.js, Deno, **Supabase Edge Functions** (haute confiance, dépendances minimales).
- **Maturité** : la technique est mature (utilisée en CV depuis les années 90), pas de lib unique de référence — c'est du code applicatif.
- **Taille du bundle** : minimale (< 100 Ko de code applicatif + lib décodage, total ~2-3 Mo).
- **Pièges connus** : moins robuste qu'ImageMagick/OpenCV sur les cas dégradés (photo de travers, ombre, JPG très compressé). Si la photo est nickel, ça marche très bien. Si elle est sale, on bascule sur T1 ou T2.
- **Faisabilité Supabase Edge Functions** : très haute. Bundle léger, pas de WASM lourd.
- **Coût d'implémentation** : moyen-haut. Pipeline ~300-500 lignes de TS, dont 50-80 pour le K-means. Pas de tuning de seuils OpenCV/ImageMagick, mais nécessite de coder soi-même la projection et le K-means.
- **Verdict provisoire pour Sterny** : **alternative légère**, à creuser en parallèle. Stratégie possible : commencer par T3 (rapide à coder, dépendances minimales), basculer sur T1 (magick-wasm) si T3 a des limites sur certaines fixtures.

### Technique 4 — Modèles ML pré-entraînés via API (Table Transformer / DETR)

Microsoft Table Transformer (TATR) est un modèle DETR entraîné sur PubTables-1M. Deux variantes : `microsoft/table-transformer-detection` et `microsoft/table-transformer-structure-recognition`. Output : bounding boxes avec labels `table column`, `table row`, `table column header`, `table spanning cell`.

- **Stack** : Python (PyTorch + transformers HF). Inutilisable directement en Edge Function Deno.
- **Options pour s'en servir depuis Sterny** :
  - **Hugging Face Inference API** (HTTPS) : latence 1-3s, coût modéré, risque de cold start
  - **Self-hosting** (Replicate, Modal, RunPod) : ~30-100€/mois minimum, surdimensionné
- **Apport au pipeline Sterny** : **détection de la grille uniquement, pas la classification couleur**. Donc même si on l'utilise, on garde le problème principal entier — TATR nous donne où sont les cellules, on doit ensuite échantillonner et classer la couleur nous-mêmes (T1, T2 ou T3).
- **Verdict provisoire pour Sterny** : **disqualifié comme solution autonome**. Possiblement utile en composant d'un pipeline si la détection de grille en local échoue sur certaines fixtures — on délègue alors la grille à TATR via HF Inference API. Mais ajoute une dépendance externe payante avec latence réseau, sans avantage clair tant que T1/T2/T3 n'ont pas été éprouvés. Pas dans le premier spike.

### Technique 5 — Services cloud document AI

**Question critique commune** : restituent-ils la couleur de fond de cellule ? Vérification approfondie effectuée pour les 4 acteurs principaux.

#### Google Document AI Layout Parser

- **Output** : structure tabulaire avec `pages.tables.headerRows.cells` et `bodyRows.cells`, attributs `layout` (bounding poly), `rowSpan`, `colSpan`.
- **Couleur de fond exposée ?** **Non**, vérifié dans la doc officielle proto `Document` et `handle-response`. Aucun attribut couleur sur les cellules. Le `text style` peut contenir la couleur du texte mais pas du fond.
- **Verdict** : disqualifié pour notre cas.

#### Microsoft Azure Document Intelligence (modèle Layout)

- **Output** : structure tabulaire similaire (cellules avec bounding box, row/column index, span).
- **Couleur de fond exposée ?** **OUI**, via l'**add-on `STYLE_FONT`** activé avec `features=styleFont` dans la requête. Le retour contient un attribut `backgroundColor` au format `#rrggbb` (vérifié sur la doc add-on capabilities Microsoft Learn).
- **Mais nuance importante** : c'est la couleur du **fond du bounding box du texte**, pas de la cellule entière. Conséquences :
  - Pour Mathis et Matthieu (cellules contenant du texte) : potentiellement utilisable, le bounding box du texte hérite normalement de la couleur de fond de la cellule
  - Pour Martin (cellules colorées sans texte ou avec texte minimal) : probablement pas de span de texte détecté → pas de couleur retournée
- **Verdict** : **candidat sérieux à tester en spike** pour Mathis et Matthieu. Pas pertinent pour Martin a priori.
- **Coût** : Azure DI = ~1$ pour 1000 pages sur le tier S0. Free tier = 500 pages/mois.

#### AWS Textract

- **Output** : Block objects de types TABLE, CELL, MERGED_CELL, WORD, etc., avec attributs Geometry, Confidence, EntityTypes, RowIndex/ColumnIndex/Span.
- **Couleur de fond exposée ?** **Non**, vérifié dans la doc complète des Block objects. Aucun attribut couleur — Textract est strictement orienté texte/structure.
- **Verdict** : disqualifié pour notre cas.

#### Adobe Extract API

- **Output** : JSON avec elements (paragraphes, tables, figures, etc.), bounds, attributes.
- **Couleur de fond exposée ?** **Probablement oui** : le Technical Brief Adobe officiel (v1.0, 26/10/2021) mentionne explicitement, pour le parsing de tables : *"formatting (e.g., text position within cell, border thickness, and background color)"*. **Mais la doc technique détaillée (developer.adobe.com/document-services How Tos) ne confirme pas explicitement cet attribut dans le schéma JSON observable**, ce qui crée une ambiguïté : le brief marketing annonce la fonctionnalité, la doc technique reste muette dessus.
- **Verdict** : **à tester en spike**. Si Adobe expose réellement la couleur de fond, c'est une option propre (REST API standard, utilisable depuis Edge Function Deno). Free trial = 500 transactions/mois, suffisant pour évaluation.
- **Coût** : ~0.05 USD par page après free tier.

**Synthèse cloud** : 2 candidats sur 4 exposent potentiellement la couleur de fond (Azure DI confirmé pour bounding box texte, Adobe Extract probable mais à vérifier). À tester en spike avant disqualification définitive — cela aurait le mérite de couvrir les fixtures PDF (Mathis, Matthieu) avec une dépendance externe stable, en complément ou alternative au parsing local.

### Technique 6 — Vectorisation intermédiaire (imagetracerjs / VTracer)

Idée : convertir l'image raster en SVG avec une palette de couleurs forcée. Chaque cellule devient un polygone de couleur unique → on bascule sur la logique de la Famille 1 (parsing de polygones colorés).

- **Stack** :
  - `imagetracerjs` (Andras Jankovics) : pure JS, supporte une palette personnalisée via option `pal`. Compat Deno à valider.
  - `VTracer` (Rust + WASM) : plus précis, exposé par SVGcode et `@neplex/vectorizer` (lib Node native, donc pas Deno direct).
- **Pièges connus** :
  - Bordures fines de cellules (1-2 px) à risque de fusion lors de la posterization
  - Anti-aliasing aux bords → couleur d'une cellule peut "déborder" sur sa voisine
  - Choix de la palette : nécessite 2 passes (1ère pour clusterer les couleurs dominantes, 2e pour quantifier)
- **Verdict provisoire pour Sterny** : **piste créative à garder en réserve**. Plus laborieuse que T1/T2/T3 car ajoute une étape de vectorisation (avec ses propres risques) puis une étape de matching polygones → cellules. Pas dans le premier spike. À tester si T1, T2 et T3 échouent tous les trois.

### Recommandation pour la suite (hors doc — à arbitrer avec Côme)

**Phase 1 — Spike rapide sur T3 (algo manuel ImageData) sur Martin** : ~3-4h. Décode Planning_Martin.JPG, détecte la grille par projection, échantillonne la couleur centrale de chaque cellule, K-means K=3 ou K=4. Si ça marche sur les 4 groupes de Martin avec une fiabilité > 95%, c'est le cas le plus simple, le plus léger, et il valide ou invalide l'hypothèse de fond ("un algo déterministe est plus fiable qu'un LLM sur cette tâche") avec le code minimum.

**Phase 2 — Si T3 a des limites sur fixtures dégradées, bascule vers T1 (magick-wasm) ou T2 (OpenCV.js)** : ~6-10h. T1 prioritaire parce que officiellement supporté par Supabase, T2 si T1 a des limites en CV avancée (perspective warp, etc.).

**En parallèle si pertinent — Spike Azure DI sur Mathis et Matthieu** : ~2h. Activer le free tier, envoyer les 2 PDFs avec `features=styleFont`, voir si `backgroundColor` est bien retourné pour les cellules. Si oui, on a une option cloud propre pour les PDFs avec texte intra-cellule. Si non, hypothèse Azure tombe et on reste sur T1/T2/T3.

**Spike Adobe Extract** : ~2h. Activer le free trial, envoyer les fixtures, vérifier si la sortie JSON contient effectivement un attribut couleur de fond pour les cellules de table. Si oui, candidat sérieux. Si non, disqualifié.

T4 et T6 documentés mais hors spike initial.

---

## Famille 3 — OCR couplé à analyse de mise en page

**Périmètre** : Martin (JPG, 4 groupes, ~180 cellules par groupe, légende couleur seule sans annotation textuelle dans les cellules) pour les éléments textuels relisibles en raster (en-têtes, numéros de jours, noms de mois, libellés de groupes, légende), et tout cas futur où le document sera fourni en image (photo WhatsApp, scan, capture d'écran de mauvaise qualité). Sert aussi de **signal redondant** dans le pipeline multi-signaux pour Mathis et Matthieu si on rastérise leurs PDFs pour cross-check (la voie principale pour leur texte intra-cellule reste `pdf.js getTextContent()` cartographié en Famille 1).

**Question critique de la famille** : sur une image raster, comment extraire fiablement le texte présent (en-têtes, libellés, mots-clés intra-cellule type `Examens`/`Révisions`/`Soutenance`/`Rattrapages`) **avec ses coordonnées géométriques**, pour pouvoir ensuite rattacher chaque mot à une cellule de la grille du calendrier ? La sortie utile n'est pas seulement le texte plat, c'est le texte avec bounding boxes — sans ça, impossible de croiser avec la couleur de fond extraite par Famille 2 ni d'agréger jour → semaine ISO.

**Distinction nette à acter** : Google Vision OCR (`DOCUMENT_TEXT_DETECTION`) ≠ Google Document AI Layout Parser. Le premier est OCR brut + bounding boxes hiérarchiques (page/block/paragraph/word/symbol), c'est l'objet de cette famille. Le second est OCR + reconstruction de structure tabulaire (cellules, row/col span), traité en Famille 2 Technique 5 sous l'angle "couleur de fond" (disqualifié pour ce critère). Les deux APIs sont distinctes côté Google Cloud, avec endpoints, pricing et schémas de sortie séparés.

**Contraintes stack rappelées** : Supabase Edge Functions = Deno 1.46, WASM ou pure TS uniquement, bundle ≤ 20 Mo après build, mémoire 512 Mo, timeout idle 150 s. Reprises de la Famille 2 Question critique.

### Technique 1 — Google Vision OCR via DOCUMENT_TEXT_DETECTION (candidate principale)

API REST Google Cloud Vision, mode `DOCUMENT_TEXT_DETECTION` optimisé pour documents denses. Endpoint unique `POST https://vision.googleapis.com/v1/images:annotate`, JSON in/out. Le mode renvoie `fullTextAnnotation` avec hiérarchie complète page → block → paragraph → word → symbol, chaque niveau exposant un `boundingBox` exploitable pour rattacher les mots aux cellules de la grille en aval (Famille 3 Technique 3).

- **Stack** : appel `fetch()` direct depuis Deno. **Ne pas utiliser le SDK npm `@google-cloud/vision`** : une discussion publique Supabase (#36182) confirme que ce SDK provoque des timeouts inexpliqués dans le runtime Edge Function Deno, alors qu'un raw fetch sur le même endpoint fonctionne (réponse 401 si auth invalide, pas de timeout). Le SDK est donc à exclure dans cette stack, le fetch direct est la voie. Auth par API key préfixe `AIza` en query string `?key=AIza...` (Sterny a déjà cette clé en place pour `verify-document`).
- **Runtime** : Node.js, navigateur, Deno, Supabase Edge Functions. Compat Deno = appel HTTPS standard, aucune dépendance lourde côté client.
- **Maturité** : service Google Cloud production-grade, GA depuis 2016. API v1 stable.
- **Signaux extractibles** : texte avec hiérarchie complète (block, paragraph, word, symbol) + bounding box à chaque niveau + score de confiance par symbol + détection de langue + saut de ligne/break. Multi-langue natif. Support PDF natif (chaque page traitée comme une image individuelle, 1 unité chacune).
- **Signaux non couverts** : couleur de fond de cellule (déjà traitée par Famille 1 et 2), structure tabulaire reconstruite (c'est le rôle de Document AI, pas de Vision OCR — Sterny reconstruira la grille via Famille 2 morphologique ou via la grille déjà extraite Famille 1).
- **Pièges connus à anticiper** :
  - SDK `@google-cloud/vision` incompatible Deno Edge Function → utiliser `fetch()` direct.
  - Restriction de la clé API par référer/IP recommandée pour limiter le risque d'exposition (la clé `AIza` Sterny est probablement déjà restreinte, à vérifier).
  - Image envoyée en base64 inline OU via URL Cloud Storage publique. En Edge Function, base64 inline est le plus simple (pas de bucket public à gérer). Limite : 20 Mo de payload total par requête.
  - Pour les PDF multi-pages (Mathis, Matthieu), chaque page = 1 unité de facturation. Pour les fixtures Sterny en stade démo, c'est négligeable.
  - Coordonnées du `boundingPoly` sont des polygones à 4 vertices `(x, y)` en pixels image, origine top-left. Pas de transformation matricielle exotique à gérer (contrairement à pdf.js Famille 1).
- **Faisabilité Supabase Edge Functions** : haute. Fetch HTTPS standard, aucune dépendance native, payload base64 dans les limites Edge.
- **Coût** : tarification 2026 confirmée Google Cloud — 1000 unités gratuites par mois, 1001 à 5M unités à 1.50 USD / 1000 unités, > 5M à 0.60 USD / 1000. PDF multi-pages = chaque page comptée comme 1 unité. Pour Sterny au stade démo (estimation 100-500 plannings/mois), reste dans le free tier ou juste au-dessus. Coût marginal négligeable même en early production.
- **Qualité OCR français** : avantage structurel confirmé sur Tesseract pour les langues non-anglaises et les fonts variées (cf. comparaisons publiques Tesseract vs Google Vision sur factures et documents scolaires manuscrits). Pour Sterny dont la cible est 100% francophone et où certains plannings auront potentiellement des fonts Hyperplanning, Word, Excel exotiques, c'est le meilleur pari par défaut.
- **Coût d'implémentation** : faible. Wrapper fetch + base64 + parsing JSON ~80-150 lignes de TS. Pas de tuning de seuils.
- **Verdict provisoire pour Sterny** : **candidate principale**. Vérifiée techniquement (compat Deno via fetch direct), économiquement (coût marginal nul vu volume + clé déjà en place pour `verify-document`), et qualitativement (avantage français net). À tester en spike sur Martin pour mesurer ce qui sort effectivement (en-têtes, libellés, légende — rappel ETAT-COURANT : "légende couleur seule, pas d'annotation textuelle dans les cellules" pour Martin, ce qui limite par construction le texte exploitable, à mesurer concrètement).

### Technique 2 — Tesseract.js via fork Deno (alternative locale documentée)

OCR open source Tesseract 5 compilé en WebAssembly. Fork principal `naptha/tesseract.js` actif, fork Deno-spécifique `weston-b/tesseract.js-deno` existant mais ⚠️ **maintenance non vérifiée cette session** (à investiguer si on rouvre la piste : commits récents ? issues actives ? compat avec Tesseract 5 actuel ?).

- **Stack** : `tesseract.js` v5+ via npm (avec build WASM bundlé) ou fork Deno via `https://deno.land/x/...`. Charge un fichier `traineddata` par langue à l'initialisation.
- **Runtime** : navigateur (Web Workers), Node.js (worker_threads), Deno (statut Edge Function ⚠️ non démontré — voir Pièges).
- **Maturité** : Tesseract OCR existe depuis HP 1985, open-sourcé en 2005, soutenu par Google 2006-2018. Tesseract.js port WASM maintenu activement par naptha. Mais le fork Deno-spécifique a un statut moins clair, à vérifier.
- **Signaux extractibles** : texte avec hiérarchie similaire à Vision (page, block, paragraph, line, word, symbol), bounding boxes, confidence par mot. Comparable fonctionnellement à Google Vision OCR sur la sortie.
- **Pièges connus à anticiper** :
  - **Bundle lourd** : avec paramètres par défaut, ~15.34 Mo chargés au premier usage (tesseract-core-simd.wasm ~4.74 Mo + traineddata anglais ~10.4 Mo). Pour le français, `fra.traineddata` est dans le même ordre de grandeur (~10 Mo). **Frottement direct avec la limite 20 Mo de bundle Edge Function Supabase** — il faudrait soit bundler le traineddata dans le déploiement (alourdit le déploiement, mange la limite), soit le télécharger depuis CDN à chaque cold start (latence + dépendance externe à un CDN tiers comme jsDelivr).
  - **Compat Deno + Supabase Edge Function ⚠️ non démontrée** : aucun retour utilisateur public trouvé sur Tesseract.js tournant effectivement en Edge Function Supabase. Le pattern Web Workers + WASM + chargement asynchrone de traineddata est en zone grise du runtime Edge (V8 isolates avec contraintes CPU/mémoire spécifiques). À valider en spike avant toute conclusion.
  - Initialisation asynchrone obligatoire (`createWorker`, `loadLanguage`, `initialize`) avant toute reconnaissance.
  - Possibilité d'utiliser `tessdata_fast` au lieu de `tessdata_best` pour réduire le poids et le temps de calcul (compromis qualité acceptable selon naptha/tessdata).
- **Faisabilité Supabase Edge Functions** : ⚠️ **non démontrée**. Plausible techniquement vu que WASM est officiellement supporté, mais aucun cas concret documenté publiquement, et la limite 20 Mo de bundle plus le pattern Web Workers posent question. Risque opérationnel à valider en spike avant tout investissement majeur.
- **Coût opérationnel** : zéro côté licence (Apache 2.0). Côté compute : significatif à chaque exécution (initialisation Tesseract + reconnaissance ~2-10s par image selon densité, mémoire 100-300 Mo selon image et traineddata). Pas de quota externe à monitorer.
- **Qualité OCR français** : ⚠️ **non mesurée sur fixtures Sterny**. Benchmarks publics 2024-2026 placent Tesseract significativement en-dessous de Google Vision sur le manuscrit (20-40% vs 80-95% accuracy), et un peu en-dessous sur l'imprimé propre (écart variable selon document). Pour des plannings imprimés propres type Hyperplanning, l'ordre de grandeur attendu est 70-90% accuracy mots — utilisable mais inférieur à T1.
- **Coût d'implémentation** : moyen. Wrapper createWorker + recognize + parsing résultat ~150-250 lignes de TS, plus tuning éventuel de la stratégie de chargement traineddata.
- **Verdict provisoire pour Sterny** : **alternative locale documentée**, **pas viable comme candidate principale en l'état**. Trois raisons : (a) compat Deno Edge Function non démontrée, (b) bundle 15+ Mo en frottement direct avec la limite 20 Mo, (c) qualité OCR français inférieure à T1. Sa valeur stratégique reste la décorrélation d'un provider externe pour un workflow critique du parser, et l'ouverture vers un mode offline éventuel. À reconsidérer en sérieux si Sterny décide un jour de couper la dépendance Google Vision.

### Technique 3 — Pattern spatial OCR : assemblage applicatif (orchestration interne)

Pas une lib externe, mais le **code applicatif Sterny** qui transforme un output OCR brut (T1 ou T2 → liste de mots avec bounding boxes) en **annotations sur le squelette de calendrier** (pattern accumulateur posé en session 27 avril, ETAT-COURANT). Cette technique est l'élément de jonction entre OCR et structure de la grille.

Pipeline :
1. **Output OCR amont** : T1 retourne `[{text, boundingBox: {x, y, w, h}, confidence}]` au niveau word ou paragraph.
2. **Grille déjà connue** : soit produite par Famille 1 (PDF vectoriel) en coordonnées PDF, soit par Famille 2 (raster, détection morphologique) en coordonnées image. La grille fournit `[{cellId, weekStartISO, dayOfWeek, bounds: {x, y, w, h}}]` pour Mathis/Matthieu (jour-par-jour), ou `[{cellId, weekStartISO, bounds}]` pour Martin (semaine-par-semaine).
3. **Rattachement word → cellule** : pour chaque mot OCR, calcul de la cellule contenant son centre de masse (test "centre dans bounds" simple, ou IoU bounding-box ↔ cellule pour les mots qui chevauchent — paramètre seuil IoU 0.3-0.5 à régler).
4. **Pour Matthieu (calendrier civil jour-par-jour)** : agrégation jour → semaine ISO. Si tous les jours d'une semaine portent le même mot-clé `Examens`, la semaine est `school`. Si mixte, règle de majorité ou remontée à l'utilisateur.
5. **Matching mots-clés métier** : table de correspondance prédéfinie pour Sterny (`Examens`, `Révisions`, `Soutenance`, `Rattrapages`, `Cours`, `École`, `Entreprise`, `Formation au centre`, `En entreprise`, `Jours fériés`, etc.) → annotation `{status, source: 'ocr_text', confidence}` déposée dans le squelette accumulateur.
6. **Convergence multi-signaux** : si la couleur extraite par Famille 1 ou 2 sur la même cellule converge avec le mot-clé OCR, confiance haute. Si divergence, remontée ciblée à l'utilisateur sur cette cellule précise (cohérent avec l'architecture multi-signaux ETAT-COURANT 27 avril).

- **Stack** : pur TypeScript Deno, pas de dépendance externe.
- **Runtime** : universel (c'est du code applicatif, pas une lib).
- **Maturité** : technique géométrique élémentaire (test point-dans-rectangle, IoU). Pas de risque technologique.
- **Pièges connus** :
  - **Mots multi-cellules** : un mot peut chevaucher la frontière entre deux cellules (typographie débordante, cellules très étroites). Politique à acter : centre de masse + tolérance, ou IoU max.
  - **Mots multi-mots intra-cellule** : "Formation au centre" peut sortir comme 3 words distincts en T1, à recomposer côté Sterny via paragraph-level (pas word-level) ou via concaténation post-OCR par proximité spatiale.
  - **Casse, accents, ligatures** : la table de mots-clés doit normaliser (lowercase + suppression accents) avant matching pour ne pas rater "EXAMENS" vs "Examens" ou "École" vs "ECOLE".
  - **Faux positifs** : un mot `Cours` dans une légende NE doit PAS annoter une cellule de la zone "légende" comme `school`. La grille doit explicitement exclure les zones hors-tableau (en-têtes, légende, marges) avant matching.
- **Faisabilité Supabase Edge Functions** : très haute. Code applicatif léger, zéro dépendance.
- **Coût d'implémentation** : moyen. Pipeline ~250-400 lignes de TS dont la table de mots-clés métier (tuning au fil des fixtures) et la politique de rattachement word→cellule.
- **Verdict provisoire pour Sterny** : **bloc d'orchestration indispensable**, pas une option. Sa qualité de sortie dépend entièrement de la qualité de T1/T2 en amont et de la grille en aval. À écrire de toute façon dès qu'un OCR est en place.

### Repoussoirs (mentionnés pour traçabilité, à ne pas creuser)

- **PaddleOCR** (Baidu, Python + C++) : excellent OCR multilingue, mais **stack Python uniquement**, viole la contrainte Deno/TS actée. Disqualifié pour cette raison structurelle.
- **EasyOCR** (JaidedAI, Python) : idem, **Python uniquement**. Disqualifié.
- **Tesseract natif binaire** : nécessite l'installation du binaire système Tesseract (libre, mais pas un module JS/WASM). Incompatible Edge Function Deno qui ne peut exécuter de binaire système. Disqualifié structurellement.
- **ABBYY FineReader Cloud / Engine** : qualité OCR très élevée et leader historique du domaine, mais ⚠️ **tarification non investiguée cette session** (ordres de grandeur publics évoqués comme significativement supérieurs à Google Vision, **non vérifié**). Disqualifié par défaut au stade démo Sterny vu que T1 (Google Vision) couvre déjà le besoin avec un coût marginal négligeable. À rouvrir uniquement si T1 et T4 échouent tous.
- **AWS Textract `DetectDocumentText`** (mode OCR brut) : traité en T4 avec verdict spécifique (pas un repoussoir net car n'a pas été investigué cette session sur le critère "bounding boxes hiérarchiques pour pattern spatial").

### Technique 4 — Services cloud OCR concurrents

Vérification des trois acteurs cloud autres que Google (déjà traité en T1) sur leur capacité à fournir du texte avec bounding boxes hiérarchiques exploitables pour le pattern spatial T3.

#### Microsoft Azure Document Intelligence — modèle Read seul

- **Output** : ⚠️ **non investigué cette session**. Famille 2 a couvert l'angle structure tabulaire + couleur de fond via add-on `STYLE_FONT` du modèle Layout. Le mode `Read` seul (OCR brut sans reconstruction tabulaire) est documenté comme retournant pages → lines → words avec bounding polygons, comparable à Google Vision OCR. Ne pas en tirer de conclusion ferme tant que vérifié.
- **Coût** : ⚠️ tier S0 estimé ~1 USD pour 1000 pages, free tier 500 pages/mois (cohérent avec ce qui a été constaté en Famille 2 pour Layout, **non vérifié** spécifiquement pour Read seul).
- **Verdict** : **à vérifier en session suivante ou en spike**. Si confirmé, candidate sérieuse en alternative ou redondance à T1, surtout pour Sterny qui aurait alors le choix de provider sur cette brique critique.

#### AWS Textract `DetectDocumentText`

- **Output** : Block objects de types PAGE, LINE, WORD avec attributs Geometry (bounding box) et Confidence. Hiérarchie comparable à Google Vision OCR sur le mode "détection de texte de document". ⚠️ **Non investigué en détail cette session** sur la qualité française et la richesse géométrique vs Vision.
- **Coût** : tarification Textract DetectDocumentText ~1.50 USD / 1000 pages (cohérent avec marché). ⚠️ **Non vérifié 2026**.
- **Verdict** : **à vérifier en session suivante**. Probablement équivalent fonctionnel à T1 sur le besoin OCR brut + bounding boxes, sans avantage net pour Sterny tant que Google Vision est déjà branché. Doublon fonctionnel coûteux à intégrer (nouveau provider, nouvelle clé, nouveau monitoring) sans gain identifié → à rouvrir uniquement si T1 échoue qualitativement.

#### Adobe Extract API (mode OCR seul)

- **Output** : Famille 2 a noté Adobe Extract probable mais ambigu sur la couleur de fond. Sur le critère "OCR brut + bounding boxes hiérarchiques", la doc technique Adobe Extract évoque des elements text avec bounds, mais la granularité (paragraphe ? mot ? symbol ?) ⚠️ **non vérifiée cette session**.
- **Coût** : ~0.05 USD par page après free tier 500 transactions/mois (vérifié Famille 2).
- **Verdict** : **à vérifier en spike Famille 2** (déjà prévu pour la couleur de fond) — autant en profiter pour mesurer le retour OCR sur les 2 fixtures envoyées. Pas un investissement séparé.

**Synthèse cloud Famille 3** : Google Vision OCR (T1) reste la candidate principale, vérifiée. Azure Read et AWS Textract sont des doublons fonctionnels probables, à vérifier ponctuellement en spike pour avoir une option B documentée mais pas à intégrer en première intention. Adobe Extract est à mesurer en même temps que le spike Famille 2 sur Adobe.

### Recommandation pour la suite (hors doc — à arbitrer avec Côme)

**Phase 1 — Spike T1 sur Martin** : ~2-3h. Fetch direct vers `images:annotate` avec `DOCUMENT_TEXT_DETECTION`, image Planning_Martin.JPG en base64 inline, parsing du `fullTextAnnotation`. Mesures à produire : (a) liste exhaustive du texte récupéré et sa position (en-têtes ? numéros de jours ? noms de groupes ? légende couleur ?), (b) bounding boxes au niveau word et paragraph, (c) confidence par word. Sortie : un JSON et un overlay visuel sur l'image pour validation manuelle. Si la légende couleur sort propre, on a la passerelle légende → couleur → statut. Sinon, on documente ce qui sort vraiment.

**Phase 2 — Spike T1 sur Mathis et Matthieu en mode redondance** : ~1h. Mêmes appels mais sur les PDFs (Vision API supporte PDF natif, 1 page = 1 unité). Objectif : voir si le texte intra-cellule de Matthieu (`Examens`, `Révisions`, `Soutenance`, `Rattrapages`) sort proprement avec bounding boxes — ce qui validerait T3 (pattern spatial) sur la fixture la plus structurée de Sterny. Pour Mathis, cross-check de la légende textuelle "Formation au centre / En Entreprise / Jours fériés".

**Phase 3 — Spike T2 (Tesseract.js Deno Edge Function)** : ~3-4h, **uniquement si T1 a une limite identifiée** ou si la décorrélation provider externe devient un enjeu stratégique. Objectif : valider ou invalider la compat Deno Edge Function et mesurer la qualité française sur les fixtures.

**Spikes T4 (Azure Read, Textract, Adobe Extract OCR)** : à grouper avec les spikes Famille 2 cloud déjà prévus. Pas de session dédiée tant que T1 n'a pas révélé de limite.

T3 (pattern spatial) sera codé après le premier spike T1 réussi, en cohérence avec le squelette accumulateur (architecture ETAT-COURANT 27 avril).

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
- **Microsoft Table Transformer (TATR) via Hugging Face Inference API** : modèle ML pré-entraîné DETR pour détection de table et structure recognition. Pas dans le pipeline Sterny au stade actuel (stack Python, pas de classification couleur), mais à rouvrir si Sterny décide un jour de se doter d'un microservice ML pour la grille.
- **Algorithmes morphologiques OpenCV/ImageMagick pour extraction de tableaux** : `getStructuringElement` + `erode` + `dilate` (OpenCV) ou `morphology Rectangle:NxM` (ImageMagick) pour extraire les lignes horizontales et verticales d'un tableau. Pattern réutilisable au-delà du parser de calendrier.
- **Vectorisation par palette fixée** (imagetracerjs / VTracer avec option `pal`) : convertir une image raster en SVG avec palette personnalisée prédéfinie. Pattern intéressant pour tout problème de classification visuelle où le nombre de classes est connu.
- **Adobe Extract API "background color" — ambiguïté brief marketing vs doc technique** : le Technical Brief Adobe annonce explicitement l'extraction de la couleur de fond des cellules de table, mais la doc technique détaillée ne le confirme pas. À investiguer en spike pour clarifier la réalité de cette capacité, indépendamment de Sterny — ça intéressera tout projet futur qui aurait besoin de parser des PDFs avec sémantique couleur.

---

*Document de recherche vivant. Mis à jour à chaque famille validée. Versionné par commits successifs pour permettre la relecture pas à pas.*
