# Recherche parser rhythm_calendar — Axe 1 : état de l'art académique et open source

Document de recherche vivant. Construit séance par séance dans le cadre du plan en 4 axes documenté dans `ETAT-COURANT.md` section 0 du 27 avril 2026, lui-même conséquence du report de décision sur le parser (DETTE #37 statut au 27 avril 2026).

**Objectif** : cartographier les techniques existantes pour extraction de tableaux structurés (PDF vectoriel et raster), classification de couleur de fond de cellule, OCR couplé à analyse de mise en page, et reconnaissance de structure de calendrier — afin d'éclairer la décision d'architecture du parser Sterny.

**Contraintes fermes** :
- Stack Edge Function Deno / TypeScript. Pas de Python (sauf discussion explicite et documentation de la barrière d'entrée).
- Aucune implémentation de code dans la session de recherche — pure cartographie.
- Aucune décision d'architecture tant que les 4 axes du plan ne sont pas suffisamment couverts.

**Méthodologie par famille** : shortlist des techniques candidates en 5-10 lignes → validation par Côme → recherche détaillée des techniques retenues → commit d'ajout de la famille au doc (`docs(recherche): add family X to PARSER-AXE-1`).

**Dernière mise à jour** : 28 avril 2026 — ajout de la Famille 2 (classification visuelle de couleur de fond de cellule), après vérification approfondie des services cloud et de la compat Deno.

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
- **Microsoft Table Transformer (TATR) via Hugging Face Inference API** : modèle ML pré-entraîné DETR pour détection de table et structure recognition. Pas dans le pipeline Sterny au stade actuel (stack Python, pas de classification couleur), mais à rouvrir si Sterny décide un jour de se doter d'un microservice ML pour la grille.
- **Algorithmes morphologiques OpenCV/ImageMagick pour extraction de tableaux** : `getStructuringElement` + `erode` + `dilate` (OpenCV) ou `morphology Rectangle:NxM` (ImageMagick) pour extraire les lignes horizontales et verticales d'un tableau. Pattern réutilisable au-delà du parser de calendrier.
- **Vectorisation par palette fixée** (imagetracerjs / VTracer avec option `pal`) : convertir une image raster en SVG avec palette personnalisée prédéfinie. Pattern intéressant pour tout problème de classification visuelle où le nombre de classes est connu.
- **Adobe Extract API "background color" — ambiguïté brief marketing vs doc technique** : le Technical Brief Adobe annonce explicitement l'extraction de la couleur de fond des cellules de table, mais la doc technique détaillée ne le confirme pas. À investiguer en spike pour clarifier la réalité de cette capacité, indépendamment de Sterny — ça intéressera tout projet futur qui aurait besoin de parser des PDFs avec sémantique couleur.

---

*Document de recherche vivant. Mis à jour à chaque famille validée. Versionné par commits successifs pour permettre la relecture pas à pas.*
