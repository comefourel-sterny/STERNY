# Recherche parser rhythm_calendar — Axe 1 : état de l'art académique et open source

Document de recherche vivant. Construit séance par séance dans le cadre du plan en 4 axes documenté dans `ETAT-COURANT.md` section 0 du 27 avril 2026, lui-même conséquence du report de décision sur le parser (DETTE #37 statut au 27 avril 2026).

**Objectif** : cartographier les techniques existantes pour extraction de tableaux structurés (PDF vectoriel et raster), classification de couleur de fond de cellule, OCR couplé à analyse de mise en page, et reconnaissance de structure de calendrier — afin d'éclairer la décision d'architecture du parser Sterny.

**Contraintes fermes** :
- Stack Edge Function Deno / TypeScript. Pas de Python (sauf discussion explicite et documentation de la barrière d'entrée).
- Aucune implémentation de code dans la session de recherche — pure cartographie.
- Aucune décision d'architecture tant que les 4 axes du plan ne sont pas suffisamment couverts.

**Méthodologie par famille** : shortlist des techniques candidates en 5-10 lignes → validation par Côme → recherche détaillée des techniques retenues → commit d'ajout de la famille au doc (`docs(recherche): add family X to PARSER-AXE-1`).

**Dernière mise à jour** : 30 avril 2026 — ajout de la Famille 5 (acteurs marché cloud, synthèse transversale). Axe 1 complet. Découverte F5 : Google DocAI OCR Processor + `compute_style_info` expose `backgroundColor` au niveau token, candidate non testée à intégrer au spike F2 cloud déjà prévu (parallèle direct d'Azure DI STYLE_FONT, ~2× moins cher). Périmètre des spikes cloud Sterny fermé.

---

## Table des matières prévisionnelle

1. **Famille 1 — Extraction structurée depuis PDF vectoriel** *(commitée)*. Couvre Mathis (PDF Hyperplanning, légende textuelle, 1 groupe) et Matthieu (PDF Master CCA, calendrier civil jour-par-jour, encodage hybride couleur+texte, 2 pages), soit 2 fixtures sur 3.
2. **Famille 2 — Classification visuelle de couleur de fond de cellule** *(commitée)*. Couvre Martin (JPG, image raster, 4 groupes, légende couleur seule) et le cas de fallback où les fonds de cellules de Matthieu ne seraient pas extractibles programmatiquement malgré le caractère vectoriel du texte.
3. **Famille 3 — OCR couplé à analyse de mise en page** *(commitée)*. Couvre principalement les images raster (Martin) où le texte doit être relu, et tout cas où l'extraction PDF directe ne donne pas le texte intra-cellule. Sert aussi de signal redondant pour Mathis et Matthieu si on rastérise.
4. **Famille 4 — ML appliqué aux documents** *(commitée)*. Couvre l'évaluation de modèles ML pré-entraînés ou fine-tunables (LayoutLMv3, Donut, Pix2Struct, Florence-2, Surya/Marker) en tant que compléments potentiels à F1/F2/F3, ainsi qu'un rappel sur TATR sous l'angle composant pipeline.
5. **Famille 5 — Acteurs marché cloud, synthèse transversale** *(commitée)*. Synthèse cross-familles des 4 acteurs cloud Document AI majeurs (Google DocAI, Azure DI, AWS Textract, Adobe Extract) + rappel Google Vision OCR. Consolide ce qui a été dit en F2 T5 et F3 T4, ferme les zones grises (Azure Read seul, AWS DetectDocumentText, distinction des 3 processeurs Google DocAI, ambiguïté Adobe couleur de fond), produit le tableau comparatif final.

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

**Périmètre** : modèles ML pré-entraînés ou fine-tunables sur tâches de Document AI — extraction de structure de tableau, OCR + layout, image → texte structuré. Famille la plus ambitieuse en complexité de mise en œuvre. Tous les candidats sont des modèles Python/PyTorch ou similaires, donc consommés par Sterny via API externe ou microservice séparé (cf. section "Modes de consommation" en fin de famille).

**Question critique de la famille — angle Sterny** : aucun de ces modèles ne fait directement de la classification de couleur de fond de cellule. Ils font de l'OCR, du layout analysis, de la détection de structure tabulaire, ou du image-to-text. **F4 n'est donc pas une alternative à F2** (couleur) — c'est un complément potentiel à F1 (extraction PDF) et F3 (OCR + pattern spatial), avec deux apports distincts à évaluer :

1. **Détection de structure de table sans coder de morphologie OpenCV/ImageMagick** (apport principal pour Martin, raster). Si TATR ou un équivalent ML donne directement les bounding boxes des lignes/colonnes/cellules, ça simplifie l'extraction de la grille en aval.
2. **OCR alternative à Google Vision F3** (zero-shot pour Florence-2, fine-tuné pour les autres). Apport si la qualité française dépasse Vision OCR ou si la décorrélation provider devient stratégique.

**Question secondaire — zero-shot ou fine-tuning ?** Sterny n'a pas de dataset annoté de calendriers d'alternance. Tout candidat qui exige un fine-tuning sur N centaines/milliers d'exemples est de facto hors-jeu en première intention. Cette contrainte écarte d'avance la majorité des modèles Document AI classiques.

**Contraintes** :
- Stack Edge Function Deno / TypeScript. Aucun de ces modèles ne tourne nativement en Deno — tous sont consommés via API HTTP externe ou microservice Python séparé.
- Aucune implémentation dans la session de recherche — pure cartographie.
- ⚠️ **Avertissement spécifique F4** : les modèles ML sont le terrain où les hypothèses non vérifiées prolifèrent (latence, qualité zero-shot, capacité réelle en français, support PDF natif vs image-only). Chaque chiffre ou capacité non confirmée par la doc officielle est explicitement marqué ⚠️.

### Technique 1 — LayoutLMv3 (Microsoft)

**Architecture** : encoder transformer multi-modal qui prend en entrée trois modalités fusionnées — texte (depuis OCR externe), layout (coordonnées de chaque mot, fournies par l'OCR), image (patches ViT). Sortie : représentation par token, à brancher sur une tête de classification (`LayoutLMv3ForTokenClassification`) ou de question answering (`LayoutLMv3ForQuestionAnswering`) selon la tâche downstream.

> Glossaire technique inline : *encoder transformer* = la moitié "compréhension" d'un transformer, qui produit une représentation interne riche du document. *Token* = unité de découpage du texte (mot ou sous-mot). *ViT (Vision Transformer)* = architecture qui découpe une image en patches carrés et les traite comme des tokens visuels. *Tête de classification* = petite couche ajoutée en sortie de l'encoder pour produire le label final. *Fine-tuning* = ré-entraîner le modèle sur un dataset spécifique à la tâche.

- **Stack** : PyTorch + Hugging Face Transformers. Modèle base : `microsoft/layoutlmv3-base`. Modèles fine-tunés publics : FUNSD (formulaires), CORD (tickets de caisse), DocLayNet (layout analysis), PubLayNet (articles scientifiques) — aucun sur calendriers d'alternance.
- **Runtime** : Python uniquement. Pas de port JS/TS connu. Conséquence : consommation obligatoirement via API externe ou microservice Python séparé.
- **Maturité** : modèle CVPR/ACM MM 2022, largement utilisé en Document AI. État de l'art sur ses benchmarks d'origine, dépassé sur certaines tâches par modèles plus récents (Donut, Pix2Struct, Florence-2). Stable.
- **Signaux extractibles si fine-tuné** : labels par token (entités nommées, classes de cellules, types de blocs), réponses à des questions sur le document. ⚠️ **Sans fine-tuning, le modèle base produit uniquement des embeddings non interprétables — pas exploitable directement par Sterny.**
- **Faisabilité Deno** : sans objet directement. Microservice Python avec HF Transformers loadé en mémoire, exposé en HTTP. Edge Function Deno appelle le microservice par fetch. Latence dépend du déploiement (cf. "Modes de consommation").
- **Coût d'implémentation** : très élevé. (1) annoter un dataset Sterny (au minimum quelques dizaines de plannings annotés cellule par cellule), (2) fine-tuner le modèle (script disponible mais demande GPU pendant des heures), (3) déployer le microservice. Au total, 3-5 jours/homme minimum, hors annotation.
- **Verdict provisoire pour Sterny** : **disqualifié en première intention** — le coût d'annotation de dataset bloque l'approche tant que Sterny n'a pas de volume utilisateur réel pour générer des annotations en exploitation. À rouvrir uniquement si Sterny a un jour 500+ plannings réels avec rythme validé manuellement, et si le pipeline non-ML (F1+F2+F3) n'arrive pas à dépasser un plafond de fiabilité.

### Technique 2 — Donut (NAVER)

**Architecture** : encoder-decoder OCR-free. Encoder = Swin Transformer (vision), decoder = BART (génération de texte). L'image entre en pixels bruts, le modèle produit en sortie une chaîne de texte structuré — typiquement du XML ou JSON sérialisé en string. Pas d'OCR externe : Donut "lit" l'image directement via son encoder visuel, sans étape OCR séparée.

> *OCR-free* = le modèle remplace la chaîne classique [OCR → parsing] par une lecture directe pixel → texte. *Encoder-decoder* = architecture où un module compresse l'entrée (encoder) et un autre génère la sortie token par token (decoder). *BART* = decoder de langue générative pré-entraîné par Facebook AI. *Swin Transformer* = ViT à fenêtres glissantes, plus efficace pour les images haute résolution.

- **Stack** : PyTorch + HF Transformers, classe `VisionEncoderDecoderModel`. Modèle base : `naver-clova-ix/donut-base`. Modèles fine-tunés publics : DocVQA, RVL-CDIP, CORD.
- **Runtime** : Python uniquement.
- **Maturité** : ECCV 2022, repo NAVER CLOVA AI maintenu. Référence parmi les modèles OCR-free.
- **Signaux extractibles** : si fine-tuné, JSON structuré directement à partir de l'image. Cas typique en demo : facture → JSON `{vendor, items, total}`. ⚠️ **La page HF du modèle de base indique explicitement "This model is meant to be fine-tuned on a downstream task" — donc pas de zero-shot exploitable.**
- **Faisabilité Deno** : sans objet directement. Microservice Python à exposer.
- **Coût d'implémentation** : élevé, similaire à LayoutLMv3 — fine-tuning sur dataset annoté requis.
- **Verdict provisoire pour Sterny** : **disqualifié en première intention** pour les mêmes raisons que LayoutLMv3 (fine-tuning requis sur dataset Sterny inexistant). Architecturellement plus séduisant que LayoutLMv3 (pas d'OCR externe à orchestrer), mais ça ne change pas le verdict tant que le dataset manque.

### Technique 3 — Pix2Struct (Google)

**Architecture** : encoder-decoder image-to-text basé sur ViT, pré-entraîné sur 80M screenshots de pages web avec un objectif de "screenshot parsing" (apprendre à reconstituer la structure HTML simplifiée d'une page à partir de sa capture). Innovation principale : variable-resolution input — pas de redimensionnement carré obligatoire, ce qui préserve les ratios extrêmes des documents.

- **Stack** : PyTorch + HF Transformers (`Pix2StructForConditionalGeneration`). Code original Google en JAX/T5X. Modèle base : `google/pix2struct-base` (282M params), `google/pix2struct-large` (1.3B params). Modèles fine-tunés publics : `pix2struct-docvqa-large`, `pix2struct-chartqa-base`, `pix2struct-screen2words-base`, etc.
- **Runtime** : Python uniquement.
- **Maturité** : ICML 2023, code ouvert mais entretenu de manière limitée (la doc dans le repo Google Research mentionne une dépendance JAX/T5X qui rebute en pratique — la plupart des utilisateurs passent par HF Transformers).
- **Signaux extractibles** : variable selon le checkpoint utilisé. Le modèle base produit du HTML simplifié sur screenshot — pas utile pour un calendrier d'alternance. Les checkpoints fine-tunés produisent des réponses VQA, des captions, des transcriptions de chart. ⚠️ **Aucun checkpoint Pix2Struct connu pour la classification cellule par cellule de calendrier de planning** — il faudrait fine-tuner.
- **Faisabilité Deno** : sans objet directement.
- **Coût d'implémentation** : élevé. Fine-tuning requis pour notre tâche, et la conversion de la pipeline JAX vers PyTorch puis vers HF Transformers ajoute de la friction.
- **Verdict provisoire pour Sterny** : **disqualifié en première intention** pour les mêmes raisons que LayoutLMv3 et Donut. Atout différenciant (variable-resolution input préservant les ratios extrêmes) intéressant si un jour Sterny attaque les screenshots WhatsApp en photo très allongée — mais ça ne lève pas le bloc fine-tuning.

### Technique 4 — Florence-2 (Microsoft, 2024)

**Architecture** : VLM (Vision-Language Model) sequence-to-sequence multi-tâche. Encoder = DaViT (Dual Attention Vision Transformer), decoder = transformer texte. **Tâches activées par prompts textuels spécifiques** (`<CAPTION>`, `<OD>` pour object detection, `<OCR>`, `<OCR_WITH_REGION>`, `<DENSE_REGION_CAPTION>`, `<REGION_TO_CATEGORY>`, etc.). Pré-entraîné sur FLD-5B (5.4 milliards d'annotations sur 126 millions d'images), conçu pour zero-shot.

> *VLM (Vision-Language Model)* = modèle qui prend image + texte en entrée et produit du texte. *Sequence-to-sequence* = transforme une séquence d'entrée (image-en-tokens + prompt) en séquence de sortie (texte). *Zero-shot* = utilisable directement sur une tâche sans ré-entraînement, en variant juste le prompt.

- **Stack** : PyTorch + HF Transformers (`AutoModelForCausalLM` avec `trust_remote_code=True`). Modèles publics : `microsoft/Florence-2-base` (~230M params), `microsoft/Florence-2-large` (~770M params), variantes `-ft` (généralistes fine-tunés sur tâches downstream).
- **Runtime** : Python uniquement. Conversions disponibles : OpenVINO (Intel CPU/iGPU), ONNX (à confirmer ⚠️).
- **Maturité** : CVPR 2024, MIT license. Adopté en production par Roboflow comme modèle standard de leur stack inference. Repo officiel Microsoft maintenu.
- **Signaux extractibles en zero-shot** :
  - `<OCR>` : transcription brute de tout le texte de l'image.
  - `<OCR_WITH_REGION>` : transcription + bounding boxes au niveau ligne (équivalent fonctionnel à Google Vision OCR sur ce point).
  - `<OD>` : détection d'objets ouverts avec bounding boxes.
  - `<CAPTION_TO_PHRASE_GROUNDING>` : repérage spatial d'un texte dans l'image (ex : "find the cell labeled Examens").
- **Performance vérifiée (sources Roboflow et HF discussions)** :
  - Sur **NVIDIA T4 GPU** : ~1 seconde par image pour les tâches courantes.
  - Sur **CPU** : "several seconds" — pas d'ordre de grandeur précis fourni officiellement. ⚠️ Un thread HF (#57) rapporte 15 min pour un batch séquentiel sur **M1 Mac** (≈ inférence CPU/MPS), soit 1.5-2 s/image dans l'hypothèse d'un batch de quelques centaines d'images, **non confirmé** en mesure ciblée.
- **Capacité française** : ⚠️ **non vérifiée explicitement par la doc Microsoft**. Le dataset FLD-5B est principalement anglophone. Risque de qualité OCR dégradée sur le français — à mesurer en spike.
- **Faisabilité Deno** : sans objet directement. Microservice Python ou consommation via API tiers (Roboflow, HF Spaces, microservice maison).
- **Coût d'implémentation** :
  - **Avec API Roboflow ou équivalent** : faible. Quelques dizaines de lignes pour l'intégration côté Edge Function.
  - **En self-host** : moyen-élevé. Microservice Python avec poids à charger (~3 GB pour Florence-2-large), GPU recommandé, monitoring à mettre en place.
- **Verdict provisoire pour Sterny** : **candidate intéressante en zero-shot** — c'est le seul modèle de la famille qui ne demande pas de fine-tuning. Apport potentiel : alternative à Google Vision OCR de F3 (point T1 de F3), avec en bonus la capacité de grounding spatial (`<CAPTION_TO_PHRASE_GROUNDING>` permet potentiellement de demander "trouve les cellules contenant Examens" et de récupérer leurs bounding boxes — utile pour Matthieu où le texte intra-cellule est métier-pertinent). À comparer en spike avec Vision OCR sur Martin et Matthieu : qualité de transcription FR + coût + latence. Si Florence-2 perd nettement face à Vision OCR sur la qualité française, à ranger.

### Technique 5 — Surya / Marker (datalab.to)

**Architecture** : Surya = pipeline ML d'OCR + layout analysis + reading order + table recognition. Marker = couche de plus haut niveau qui s'appuie sur Surya pour produire du Markdown / JSON / HTML à partir de PDFs ou images. Marker peut optionnellement appeler un LLM (Gemini 2.0 Flash par défaut, configurable) pour résoudre des cas ambigus (fusion de tables sur plusieurs pages, correction OCR).

- **Stack** : Python / PyTorch. Surya disponible en `pip install surya-ocr`. Marker en `pip install marker-pdf`.
- **Runtime** : Python uniquement, GPU recommandé.
- **Maturité** : projet en développement actif (datalab.to est une startup avec API hostée commerciale). Versions publiées régulièrement. Benchmarks publics affichés contre Tesseract et Google Cloud Vision.
- **Licensing** :
  - Code Surya : **GPL** — incompatible avec une intégration directe en propriétaire fermé. Acceptable uniquement via API hostée ou via microservice isolé qui parle HTTP à Sterny (la séparation par le réseau évite la contamination GPL du code Sterny).
  - Weights Surya : "modified AI Pubs Open Rail-M license" — free pour startups <2M$ funding/revenue. **Sterny rentre dans ce cadre** (solo founder bootstrapped). À reconfirmer juridiquement avant prod.
  - Marker : voir repo (probablement même schéma).
- **Signaux extractibles via la stack complète Marker** :
  - Conversion PDF → Markdown / JSON structuré.
  - **Détection de tables** avec structure ligne/colonne préservée.
  - OCR multi-langues (90+ langues, dont français).
  - Reading order (utile pour les documents multi-colonnes).
  - Détection de blocks layout (titres, paragraphes, tables, équations).
- **Capacité française** : ⚠️ **annoncée par la doc dans la liste des 90+ langues**, qualité spécifique non mesurée par benchmark public clair. À mesurer en spike sur Mathis et Matthieu.
- **Faisabilité Deno** : sans objet directement.
  - **Option A (API hostée datalab.to)** : appel HTTP depuis Edge Function. Pas de souci de licensing GPL. ⚠️ Pricing à vérifier — la doc parle d'une API hostée mais le tarif et les quotas n'ont pas été investigués cette session.
  - **Option B (self-host)** : microservice Python avec Surya + Marker, isolé du reste de Sterny par le réseau, GPU recommandé.
- **Coût d'implémentation** :
  - **Option API** : faible. Quelques lignes d'intégration.
  - **Option self-host** : élevé. Containerisation, GPU à provisionner, monitoring, mise à jour des poids.
- **Verdict provisoire pour Sterny** : **candidate sérieuse à mesurer en spike** côté API hostée. Apport potentiel double : (a) extraction de la **structure de table de Martin** sans coder de morphologie (Surya fait du table recognition end-to-end), (b) conversion de Mathis et Matthieu en Markdown structuré utilisable en aval. Risque principal : opacité sur la fiabilité spécifique de la détection couleur de fond (Surya/Marker ne le mentionnent pas explicitement — probablement absent comme la majorité des outils OCR). ⚠️ **Hypothèse non vérifiée : Surya ne donne pas la couleur de fond, comme la quasi-totalité des outils OCR** — à confirmer en spike.

### Rappel — Table Transformer / TATR (Microsoft)

**Préambule explicite** : TATR a déjà été cartographié en F2 Technique 4 sous l'angle "solution autonome pour grille + couleur" et disqualifié à ce titre car il ne fournit pas la couleur de fond. **F4 le rouvre sous un angle distinct non tranché en F2 : composant ML d'extraction de grille pour Martin (image raster) en alternative aux approches morphologiques non-ML de F2 (magick-wasm, OpenCV.js, algo manuel ImageData)**.

**Angle F4** : si les approches morphologiques de F2 échouent sur des fixtures dégradées (photos floues, qualité variable type screenshot WhatsApp), TATR peut être consulté comme fallback ML pour produire la grille — bounding boxes des lignes, des colonnes et des cellules. Une fois la grille extraite, F2 reprend la main pour la classification couleur de chaque cellule à partir des bounding boxes fournies par TATR.

**Caractéristiques rapides (déjà détaillées en F2 T4)** :
- Architecture DETR (Detection Transformer) fine-tuné par Microsoft sur PubTables-1M.
- Stack PyTorch + HF Transformers, modèle `microsoft/table-transformer-structure-recognition`.
- Zero-shot exploitable sur le domaine "tables de documents" — pas de fine-tuning Sterny requis.
- Sortie : bounding boxes au format COCO pour chaque ligne, colonne et cellule détectée.

**Verdict provisoire pour Sterny côté F4** : **fallback à garder en réserve**. Pas une candidate primaire — l'algo manuel ImageData ou magick-wasm de F2 sont nettement plus simples à intégrer si la grille se laisse extraire morphologiquement. À rouvrir en spike uniquement si F2 plafonne sur des fixtures dégradées dans la suite de la recherche.

### Repoussoirs

Modèles ou familles cités fréquemment dans le domaine Document AI mais hors-scope pour Sterny et fermés explicitement ici pour traçabilité.

- **MarkupLM (Microsoft)** : encoder pour HTML/XML, cible documents structurés en markup. Hors scope — Sterny ne traite pas du HTML/XML.
- **Nougat (Meta)** : OCR-free pour articles scientifiques (formules LaTeX, tables académiques). Domaine d'entraînement très éloigné des plannings d'alternance.
- **GraphDoc / FormNet** : networks orientés formulaires textuels avec graphes relationnels. Cible cas d'usage "formulaires administratifs" — pas un calendrier.
- **DiT seul (Document Image Transformer)** : encoder de pré-entraînement, pas une tâche utilisable telle quelle. Brique d'autres modèles, pas un candidat autonome.
- **TableMaster, TableFormer (IBM)** : alternatives à TATR, mêmes limites côté couleur de fond. Pas de gain identifié à les rouvrir séparément si TATR est déjà en réserve.

### Modes de consommation (transversal)

Aucun des modèles ci-dessus ne tourne nativement en Deno. La question pratique pour Sterny est : **comment Edge Function → modèle ML ?**

#### A. Hugging Face Inference Providers (serverless)

**Principe** : appel HTTP depuis Edge Function vers `api-inference.huggingface.co`, HF route la requête vers le provider underlying (HF Inference, Replicate, Together, Fireworks, etc.) selon le modèle.

- **Pricing** : pay-per-second sur le hardware du provider, sans markup HF. Crédits mensuels inclus avec les comptes (PRO 9$/mois donne 20× plus de crédits).
- **Latence** : variable selon le modèle et le provider. Cold starts possibles si le modèle n'est pas pré-chauffé chez le provider.
- ⚠️ **Limite documentée juillet 2025** : "hf-inference focuses mostly on CPU inference (e.g. embedding, text-ranking, text-classification, or smaller LLMs that have historical importance like BERT or GPT-2)". Conséquence : **les modèles ML lourds de F4 (Donut, Pix2Struct, Florence-2, LayoutLMv3 fine-tuné) ne sont en général pas servis en serverless HF** — il faut soit utiliser un autre provider routé par HF, soit un Inference Endpoint dédié.
- **Pour Sterny** : peu praticable pour la majorité des candidats F4. À vérifier modèle par modèle si un provider routé est dispo.

#### B. Hugging Face Inference Endpoints (dédié)

**Principe** : déploiement du modèle sur une instance HF dédiée (CPU ou GPU), facturée à l'heure pendant la durée de vie de l'endpoint. Scale-to-zero possible mais avec cold start.

- **Pricing** : ⚠️ pricing horaire par instance, ordres de grandeur cités sur le marché (cf. point C ci-dessous) — non vérifié spécifiquement sur la page HF Endpoints au moment de cette session.
- **Latence** : faible quand l'endpoint est warm. Cold start de quelques secondes à quelques minutes selon la taille du modèle.
- **Pour Sterny** : viable mais coûteux si l'endpoint reste warm 24/7 alors que Sterny a peu de trafic. Scale-to-zero atténue mais introduit cold starts visibles côté utilisateur.

#### C. Replicate

**Principe** : modèles publics ou privés exposés en REST API. Pricing par seconde GPU.

- **Pricing observé sur le marché** : ⚠️ ~5$/h pour A100 80GB selon une source secondaire (blaxel.ai, février 2026), à comparer à ~2.50$/h sur Modal pour la même carte. **Pricing non vérifié sur la page officielle Replicate cette session.**
- **Latence** : modèles publics pre-warmed → cold start faible. Modèles custom → cold starts plus longs.
- **Pour Sterny** : viable pour Florence-2 si un modèle public Replicate l'expose (à vérifier ⚠️). Pour Donut/Pix2Struct/LayoutLMv3 fine-tunés sur Sterny, déploiement custom requis avec Cog (l'outil de packaging Replicate).

#### D. Modal

**Principe** : SDK Python pour déployer des fonctions GPU serverless. Sterny écrirait un microservice Python avec `@app.function(gpu="T4")` et appellerait l'endpoint depuis l'Edge Function.

- **Pricing** : pay-per-second GPU. ⚠️ ~2.50$/h pour A100 80GB selon source secondaire — non vérifié page officielle Modal cette session.
- **Latence** : cold start documenté à 2-4s sur warm pool, pouvant atteindre plus d'une minute pour gros modèles selon une source secondaire ⚠️ (spheron.network, mars 2026).
- **Pour Sterny** : viable si l'équipe est à l'aise avec Python + Modal SDK. Plus de contrôle qu'avec Replicate, plus d'efforts d'intégration.

#### E. RunPod Serverless

**Principe** : containers Docker custom ou templates pré-faits, pricing par seconde GPU.

- **Pricing observé** : ⚠️ A100 40GB ~1.89$/h, A100 80GB ~2.17$/h, H100 ~4.47$/h (introl.com, décembre 2025) — non vérifié page officielle.
- **Latence** : 48% des cold starts sous 200ms d'après leur communication marketing (source RunPod direct, à pondérer), jusqu'à 60s pour gros containers customs.
- **Pour Sterny** : viable, avec une learning curve plus importante (Docker custom).

#### F. Self-host microservice Python (Cloud Run / Railway / Fly.io)

**Principe** : Sterny héberge son propre microservice Python avec le modèle chargé en mémoire, exposé en HTTP, derrière un load balancer ou autoscaler.

- **Pricing** : variable selon le provider, généralement par instance/heure ou par requête.
- **Latence** : maîtrisée si l'instance reste warm, cold starts importants si scale-to-zero (un modèle de 770M params à charger depuis le disque prend plusieurs secondes).
- **Pour Sterny** : option la plus flexible et la plus maîtrisée, mais demande un effort ops significatif (CI/CD du microservice, monitoring, mise à jour des poids, dimensionnement). À évaluer uniquement si un candidat F4 est confirmé comme indispensable et qu'aucune des options A-E ne convient.

#### Synthèse modes de consommation pour Sterny

Pour la majorité des candidats F4, le chemin le plus court côté implémentation est **HF Inference Endpoints dédié (B) ou Replicate (C)** si un modèle public est dispo. **Modal (D)** est le plan B le plus flexible si on doit packager du custom. **Self-host (F)** est la cible si Sterny industrialise un candidat sur la durée. **HF Inference Providers serverless (A)** est en général pas applicable aux modèles ML lourds de F4 selon la doc HF de juillet 2025.

### Recommandation pour la suite

**Reco principale : un seul candidat F4 mérite un spike rapide, c'est Florence-2 en zero-shot.** Tous les autres candidats demandent un fine-tuning sur dataset Sterny inexistant — ils restent documentés mais ne sont pas actionables tant que le pipeline non-ML (F1+F2+F3) n'est pas déjà en place et que Sterny n'a pas de volume de plannings réels annotés.

**Phase 1 — Spike Florence-2 sur Martin** : ~2-3h. Comparer la transcription `<OCR>` et `<OCR_WITH_REGION>` de Florence-2-large à Google Vision OCR de F3 sur la même fixture. Mesures à produire : (a) qualité de transcription du texte présent dans l'image (en-têtes, légende, noms de groupes), (b) qualité spécifique sur le français, (c) bounding boxes au niveau ligne ou cellule, (d) latence sur l'option choisie (Replicate, HF Endpoints, ou Roboflow API). Si Florence-2 fait jeu égal ou mieux que Vision OCR sur le français, c'est une option B documentée pour Sterny ; sinon, on referme et Vision OCR reste la candidate primaire de F3.

**Phase 2 — Spike Surya / Marker via API hostée datalab.to sur les 3 fixtures** : ~2h. Soumettre Martin, Mathis, Matthieu à l'API hostée et observer la sortie Markdown / JSON. Mesures : (a) qualité d'extraction du texte (FR), (b) qualité de la détection de structure de table (apport principal sur Martin), (c) capacité à exposer la couleur de fond (probablement non, mais à vérifier explicitement). Pricing API à clarifier en début de spike.

**Phase 3 — Spike TATR comme composant grille pour Martin** : ~2h. **Conditionnel** — à n'ouvrir que si l'algo manuel ImageData / magick-wasm / OpenCV.js de F2 plafonne sur des fixtures dégradées dans la suite de la recherche. Sinon, classer en réserve.

**Tous les autres candidats F4 (LayoutLMv3, Donut, Pix2Struct)** restent documentés ici pour traçabilité de l'état de l'art mais ne sont pas actionables dans le contexte Sterny actuel. À rouvrir uniquement si Sterny atteint un palier où un dataset annoté de plusieurs centaines de plannings devient disponible — situation qui n'arrivera pas avant des mois d'exploitation réelle.

---

## Famille 5 — Acteurs marché cloud, synthèse transversale

**Périmètre** : synthèse cross-familles des 4 acteurs cloud Document AI majeurs (Google DocAI, Microsoft Azure DI, AWS Textract, Adobe Extract) + rappel court de Google Vision OCR couvert en F3 T1. Une partie du périmètre a été couverte transversalement en F2 T5 (capacité couleur de fond) et F3 T4 (capacité OCR brut). F5 consolide sans réinventer, ferme les zones grises restantes et produit le tableau comparatif final lisible.

**Question critique commune** : pour chaque acteur, **quelles capacités sont confirmées par doc officielle**, lesquelles sont annoncées-non-vérifiées, et lesquelles sont absentes — sur les 4 axes pertinents pour Sterny : (1) extraction de structure tabulaire, (2) classification de couleur de fond de cellule, (3) qualité OCR français, (4) pricing à la page 2026.

**Posture méthodologique** : règle apprentissage F2 28 avril appliquée renforcée. Toute capacité annoncée doit être confirmée par doc officielle ou marquée ⚠️ explicitement. Pricing en USD/1000 pages avec date de la page consultée. EUR/FR pricing si dispo, sinon mention "tarification US, FR à confirmer".

> **Note importante — zone grise F2 comblée par F5.** F2 T5 (28 avril) avait correctement vérifié l'absence de backgroundColor sur Google DocAI **Layout Parser** et conclu à la disqualification de Google DocAI sur le critère couleur de fond. Cette conclusion reste vraie pour Layout Parser. Mais Google DocAI **OCR Processor** (Enterprise Document OCR) avec premium feature `compute_style_info` expose `backgroundColor` au niveau token, exactement comme Azure DI STYLE_FONT, à un coût ~2× moins cher. Découverte F5 (cf. sous-section Google DocAI OCR Processor ci-dessous) : DocAI OCR + `compute_style_info` est une candidate non testée à intégrer au spike F2 cloud déjà prévu pour Mathis et Matthieu, en parallèle d'Azure DI Layout + STYLE_FONT.

### Google Document AI — 3 processeurs distincts

Google DocAI propose **3 processeurs généralistes** distincts pour les besoins texte/structure (catégorie GENERAL au sens API `fetchProcessorTypes`) — auxquels s'ajoutent les processeurs spécialisés métier (Invoice, Bank Statement, etc.) hors scope Sterny. F2 T5 avait testé Layout Parser uniquement et conclu "pas de couleur de fond". F5 distingue proprement les 3 et complète les zones grises côté OCR Processor et Form Parser.

#### Google DocAI — OCR Processor (Enterprise Document OCR)

**Référence** : `OCR_PROCESSOR`, doc `cloud.google.com/document-ai/docs/enterprise-document-ocr` (last updated 2026-04-24 UTC), GA en EU + US.

- **Sortie** : hiérarchie page → block → paragraph → line → token avec bounding boxes, langues détectées par page, confidence par token. Équivalent fonctionnel direct de Google Vision OCR `DOCUMENT_TEXT_DETECTION` (F3 T1) en termes de structure de réponse, à un niveau de granularité comparable.
- **Add-ons activables via `OcrConfig`** : `enable_native_pdf_parsing` (texte embarqué de PDFs digitaux), `enable_image_quality_scores` (8 dimensions de qualité dont blurriness, glare, small fonts), `enable_symbol` (granularité symbol = lettre).
- **Premium features (facturées en sus)** : `compute_style_info` (font/style detection), `enable_math_ocr` (formules LaTeX), `enable_selection_mark_detection` (cases à cocher). Math OCR et selection_mark sont **mutuellement exclusifs**.
- **Couleur de fond exposée ?** **OUI, confirmé par doc officielle**, via `compute_style_info: true` qui ajoute `Document.pages[].tokens[].styleInfo` avec attributs `fontSize`, `pixelFontSize`, `fontType`, `bold`, `fontWeight`, `textColor` (RGB normalisé 0-1), `backgroundColor` (RGB normalisé 0-1). Exemple JSON officiel :

```json
  "tokens": [{
    "styleInfo": {
      "fontType": "SANS_SERIF",
      "textColor": { "red": 0.169, "green": 0.169, "blue": 0.169 },
      "backgroundColor": { "red": 0.980, "green": 0.988, "blue": 0.992 }
    }
  }]
```
- **Nuance importante (parallèle direct avec Azure DI STYLE_FONT)** : c'est la couleur de fond du **bounding box du token** (mot), pas de la cellule entière. Conséquences pour Sterny :
  - **Mathis (Hyperplanning, légende textuelle "Formation au centre" / "En Entreprise")** : potentiellement utilisable, le bounding box du token hérite de la couleur de fond cellule
  - **Matthieu (calendrier civil avec mots intra-cellule "Examens", "Révisions", "Soutenance")** : potentiellement utilisable, idem
  - **Martin (cellules colorées sans texte)** : aucun token détecté → aucun `styleInfo` retourné → pas de signal couleur. Hors scope.
- **Couverture FR** : ⚠️ Liste exhaustive des langues OCR Processor non vérifiée cette session sur la doc officielle. Le marketing comparatif Azure cite "Azure 300+ langues vs Textract 6 langues", DocAI n'apparaît pas dans cette comparaison faute de chiffre officiel public. À mesurer en spike sur les fixtures FR.
- **Pricing** (page consultée 27 avril 2026, source `cloud.google.com/document-ai/pricing`) :
  - Base Enterprise Document OCR : **$1.50 / 1000 pages** (premiers 5M pages/mois), $0.60 / 1000 pages au-delà
  - OCR add-ons (premium features dont `compute_style_info`) : **+$6.00 / 1000 pages**
  - Total avec `compute_style_info` activé : **$7.50 / 1000 pages**
  - Tarification US-East affichée. EU disponible, prix EUR non vérifié explicitement cette session. Tarification US, FR à confirmer.
- **Verdict Sterny** : **candidat sérieux à tester en spike** sur Mathis et Matthieu, en parallèle d'Azure DI Layout + STYLE_FONT (F2 T5). Apport double : (a) couleur de fond au niveau token (utile pour les fixtures avec texte intra-cellule), (b) OCR FR comme alternative ou redondance vs Vision OCR. Coût ~2× moins cher qu'Azure DI Layout+STYLE_FONT pour la même capacité backgroundColor (Azure = $16/1000, DocAI = $7.50/1000). Pas pertinent sur Martin (pas de tokens dans les cellules colorées). Le spike Famille 2 cloud déjà prévu doit inclure DocAI OCR + compute_style_info à côté d'Azure DI.

#### Google DocAI — Form Parser

**Référence** : `FORM_PARSER_PROCESSOR`, doc `cloud.google.com/document-ai/docs/form-parser` (last updated 2026-04-24 UTC), GA en EU + US, **8 régions** au total selon doc.

- **Sortie** : key-value pairs (KVP), tables, checkboxes (selection marks), generic entities, plus la sortie OCR équivalente Document OCR.
- **Form Parser 2.0 (version courante)** : supporte **200+ langues** (confirmé doc), tables simples extraites avec contenu de cellules + headers de lignes/colonnes, mais **pas de cellules avec span multi-lignes/colonnes** (limite documentée).
- **Couleur de fond exposée ?** ⚠️ **Non documenté clairement** sur la page Form Parser elle-même. Le proto `Document.pages[].tables.bodyRows[].cells[]` n'a pas d'attribut couleur natif. **Form Parser ne supporte pas le premium feature `compute_style_info`** d'après la doc des add-ons (cette feature est listée comme spécifique à Enterprise Document OCR, cf. note `[2]` page pricing : *"Only available for Enterprise Document OCR processor (v2)"*). Donc pas de chemin vers backgroundColor via Form Parser.
- **Couverture FR** : oui via support 200+ langues (Form Parser 2.0).
- **Pricing** (page consultée 27 avril 2026) :
  - **$30 / 1000 pages** (premiers 1M pages/mois), $20 / 1000 pages au-delà
  - 20× plus cher que Enterprise OCR pur, sans accès au backgroundColor.
- **Verdict Sterny** : **disqualifié** — pas de couleur de fond, et structure tabulaire pour notre cas (calendrier d'alternance) ne demande pas la richesse d'extraction KVP/checkbox du Form Parser. Coût injustifié vs Enterprise OCR.

#### Google DocAI — Layout Parser

**Référence** : `LAYOUT_PARSER_PROCESSOR`, doc `cloud.google.com/document-ai/docs/layout-parse-chunk` (last updated 2026-04-24 UTC), implémentation Gemini layout parser depuis fin 2025.

- **Cible métier** : préparation de documents pour pipelines RAG / Search. Génère un `DocumentLayout` proto structuré en arbre + chunks pré-découpés. Cible nominale = documents financiers / 10-K / rapports business.
- **Sortie** : blocs `text`/`table`/`list` avec annotations descriptives. En mode preview, annote tables et figures comme blocs de texte descriptifs (verbalize). Chunking automatique pour ingestion BigQuery / vector DB.
- **Couleur de fond exposée ?** **Non**, confirmé F2 T5 (avril 2026) : aucun attribut couleur dans le proto `DocumentLayout`, le `text style` peut contenir la couleur du texte mais pas du fond. Vérification F2 toujours valide en avril 2026, doc officielle inchangée sur ce point.
- **Couverture FR** : ⚠️ Non documenté précisément. La cible RAG suggère une couverture multilingue large mais aucun chiffre officiel.
- **Pricing** (page consultée 27 avril 2026) :
  - **$10 / 1000 pages** (chunking initial inclus), tarif flat sans tier de volume.
  - Re-chunking de documents déjà parsés : $0.02 / 1000 pages.
- **Verdict Sterny** : **disqualifié** — cible métier (RAG / Search) ne correspond pas au besoin Sterny (extraction structurée d'un calendrier visuel). Pas de backgroundColor. Le chunking automatique est inutile sur un calendrier. F2 T5 reste valide.

#### Régions Google DocAI

EU disponible (`eu` location ID) pour OCR Processor, Form Parser et Layout Parser confirmé doc `processors-list`. Hosting des données dans la région choisie. Pas de **France-specific region** pour DocAI, mais EU multi-region (Belgique / Pays-Bas) couvre les besoins RGPD pour Sterny.

### Microsoft Azure Document Intelligence — Read seul + Layout (rappel) + Custom Neural

**Référence** : `learn.microsoft.com/azure/ai-services/document-intelligence`, API version `2024-11-30` GA (v4.0), pages consultées 27 avril 2026 (last updated 2026-02-10 UTC pour add-on capabilities et model overview).

Azure DI propose plusieurs modèles distincts (`prebuilt-read`, `prebuilt-layout`, `prebuilt-document`, prebuilts métier, custom). F2 T5 a couvert `prebuilt-layout` + add-on `STYLE_FONT` (confirmé : `backgroundColor` au format `#rrggbb` au niveau spans dans le tableau `styles`). F5 ferme deux zones grises : **Read seul** côté OCR pur, et **Custom Neural** pour traçabilité.

#### Azure DI — Read API (prebuilt-read)

- **Sortie** : `pages` → `lines` → `words` avec `polygon` (bounding box) + `confidence` + `content`. Plus `styles[]` array contenant `isHandwritten` + confidence par span. Si add-on `styleFont` activé : extension du tableau `styles[]` avec `similarFontFamily`, `fontStyle`, `fontWeight`, `color`, `backgroundColor`. ⚠️ La doc Azure montre l'add-on `styleFont` activé sur exemples avec `prebuilt-layout`, **non vérifié explicitement sur `prebuilt-read` seul cette session** — la table model-overview indique que styleFont est dispo "for all models except business card model" mais sans démonstration sur Read pur. À confirmer en spike.
- **Couverture FR** : oui, **300+ langues** OCR pour texte imprimé (chiffre cité par doc comparative Microsoft, `learn.microsoft.com/azure/ai-services/document-intelligence/language-support`).
- **Pricing** (page consultée 27 avril 2026, source `azure.microsoft.com/en-us/pricing/details/document-intelligence/`) :
  - Read (OCR) : **$1.50 / 1000 pages** (premiers 1M pages/mois), $0.60 / 1000 pages au-delà
  - Layout / Prebuilt models : **$10 / 1000 pages**
  - Add-on Font/Style/HighRes/Formula : **+$6 / 1000 pages** (premium feature, facturé en sus)
  - Custom Neural inférence : $50 / 1000 pages
  - Combinaison F2 cible (Layout + STYLE_FONT) : **$16 / 1000 pages**
  - Régions : 60+ régions Azure dont **France Central** dispo (data residency FR possible). Tarification US affichée, FR à confirmer.
- **Verdict Sterny — Read seul** : doublon fonctionnel propre vs Vision OCR (F3 T1) côté OCR pur. Pas d'avantage net hors capacité multi-langues plus large (non-prioritaire pour Sterny qui ne fait que FR). À garder comme **option B documentée** mais pas à intégrer en première intention.
- **Verdict Sterny — Layout + STYLE_FONT** : déjà acté en F2 T5 comme candidate sérieuse à tester en spike pour Mathis et Matthieu. Inchangé en F5. Coût $16/1000 vs Google DocAI OCR + compute_style_info à $7.50/1000 pour la même capacité backgroundColor au niveau token — **DocAI OCR est ~2× moins cher**.

#### Azure DI — Custom Neural (traçabilité)

- **Principe** : fine-tuning sur dataset client annoté pour extraire des champs custom. Training : 10 heures gratuites puis $3/heure. Inférence : $50 / 1000 pages.
- **Verdict Sterny** : **non actionable aujourd'hui** — Sterny n'a pas de dataset annoté de plannings d'alternance (situation analogue aux modèles ML fine-tunés disqualifiés en F4). Documenté pour traçabilité de l'état de l'art uniquement, à rouvrir si Sterny atteint un palier de plusieurs centaines de plannings annotés.

### AWS Textract — DetectDocumentText vs AnalyzeDocument

**Référence** : `aws.amazon.com/textract/pricing/` et `aws.amazon.com/textract/faqs/`, pages consultées 27 avril 2026.

Textract propose plusieurs APIs distinctes selon le besoin. F2 T5 avait conclu "pas de couleur de fond exposée, disqualifié sur ce critère". F5 confirme et complète sur le pricing fin par API et la couverture FR.

- **DetectDocumentText (OCR pur)** : Block objects `PAGE` → `LINE` → `WORD` avec `Geometry` (bounding box), `Confidence`, `Text`. Hiérarchie comparable à Vision OCR `fullTextAnnotation`. Pricing : **$1.50 / 1000 pages** (premiers 1M), $0.60 / 1000 au-delà.
- **AnalyzeDocument** : 4 features activables (`TABLES`, `FORMS`, `QUERIES`, `SIGNATURES`, `LAYOUT`), avec OCR inclus dans tous les cas. Pricing par feature, additif :
  - Tables seul : **$15 / 1000 pages**
  - Forms seul : **$50 / 1000 pages**
  - Forms + Tables : **$65 / 1000 pages**
  - Queries (15-30 questions/page) : **$15 / 1000 pages** (basique) ou **$25 / 1000 pages** (Custom Queries fine-tunables)
  - Layout : free **uniquement** quand utilisé avec Tables (selon doc pricing — confirmé)
- **Couleur de fond exposée ?** **Non**, confirmé F2 T5 et reconfirmé doc Block objects 2026. Aucun attribut couleur dans `PAGE` / `LINE` / `WORD` / `TABLE` / `CELL` / `MERGED_CELL` / `SELECTION_ELEMENT`. Strictement orienté texte/structure.
- **Couverture FR** : **6 langues** supportées par Textract (English, Spanish, German, French, Italian, Portuguese), confirmé doc FAQ et page best-practices. **Français inclus depuis novembre 2020**. Bien plus restreint qu'Azure DI (300+) mais couvre le cas Sterny.
- **Régions** : EU disponibles (Ireland, London, **Paris**, Frankfurt). Pricing aligné US East depuis 2021 sur les 8 régions EU/Asia. Data residency FR possible.
- **Verdict Sterny — DetectDocumentText** : doublon fonctionnel propre vs Vision OCR (F3 T1) à coût identique. Avantage marginal = région Paris native, FR confirmé. Pas de gain net pour intégrer en première intention si Vision OCR est déjà branché. **Option B documentée**, à rouvrir uniquement si Vision OCR échoue qualitativement sur les fixtures.
- **Verdict Sterny — AnalyzeDocument** : disqualifié sur l'angle couleur de fond. Tables seul à $15/1000 pourrait extraire la grille du calendrier de Martin (image raster), mais sans backgroundColor le signal couleur de chaque cellule reste à extraire par un autre moyen (F2 algo manuel). Coût injustifié vs F2 T3 (algo manuel ImageData) qui ferait le même travail localement.

### Adobe Extract API — synthèse cross-F2/F3

**Référence** : `developer.adobe.com/document-services/docs/overview/pdf-extract-api/`, Adobe Technical Brief V1.0 du 26/10/2021 (URL `developer.adobe.com/.../Adobe_PDF_Extract_API_Technical_Brief.pdf`), pages consultées 27 avril 2026.

F2 T5 a noté l'**ambiguïté brief marketing vs doc technique** sur la capacité couleur de fond. F3 T4 a noté la même ambiguïté côté granularité OCR (paragraphe / mot / symbole). F5 tranche ce qui est tranchable par doc et explicite ce qui ne l'est pas.

- **Sortie** : `structuredData.json` avec `elements` (array ordonné de blocs sémantiques : headings, paragraphs, lists, tables, figures), `pages` (dimensions, rotation), `extended_metadata`, `version`. Chaque element a `Path` (XPath-like : `/Document/Sect/Table/TR/TD`), `Bounds` (rect en coord PDF), `Font`, `TextSize`, `Attributes` (line height, alignment), `Text`. Tables optionnellement exportées en CSV/XLSX, figures en PNG.
- **Couleur de fond exposée ?** ⚠️ **Ambiguïté non tranchée par doc seule, persiste après vérification F5**. Le Technical Brief 2021 mentionne explicitement *"text position within cell, border thickness, and background color"* dans les attributs de table extraite. La doc How-To 2026 (`developer.adobe.com/.../howtos/extract-pdf/`) liste les attributs reportés (`Font`, `TextSize`, `Attributes` line height/alignment, `Path`, `Bounds`) **sans mentionner backgroundColor**. Le JSON Schema officiel n'a pas été inspecté ligne par ligne cette session ⚠️. **Conclusion sobre** : soit la capacité a été annoncée en 2021 mais jamais shippée, soit elle existe mais n'est pas documentée publiquement. Sans test direct sur fixture, **on ne peut pas conclure**.
- **Couverture OCR FR** : ⚠️ **Liste des langues OCR non documentée publiquement**. Adobe Sensei AI traite "native and scanned PDFs" sans préciser les langues supportées par le mode OCR sur scans. À tester en spike sur Mathis (PDF natif) et sur une rastérisation de Martin pour mesurer.
- **Pricing** (page consultée 27 avril 2026, source `developer.adobe.com/document-services/pricing/`) :
  - **Free Tier** : 500 Document Transactions / mois (parfois communiqué comme 500 / mois pour 6 mois — terme exact ambigu, à vérifier au moment du spike). 1 Document Transaction Extract = jusqu'à 5 pages → 500 transactions = jusqu'à 2500 pages/mois.
  - **Tier payant** : ⚠️ **opaque** — pas de pricing à la page affiché publiquement en 2026. Forum Adobe Community 2024 documente un seuil minimum Enterprise de 500 000 transactions/an à $0.05/call ≈ **$25 000/an minimum**, sans plan intermédiaire startup/indie. Statut au 1er trimestre 2024 : "Enterprise agreements only", "we're working toward opening a new sales channel". État 2026 inchangé sur le pricing public officiel. Tarification US, FR non disponible.
- **Verdict Sterny** : **bloqueur structurel sur l'angle économique**. Free Tier suffisant pour spike (3 fixtures × spike répétés tiennent largement dans 2500 pages/mois), mais aucune trajectoire de mise en production viable — saut direct du Free Tier au minimum Enterprise ~$25k/an, prohibitif pour une startup au stade Sterny. Ambiguïté technique sur backgroundColor secondaire dans ce contexte. **Reco** : maintenir le spike Free Tier pour fermer définitivement la zone grise couleur de fond annoncée par le Technical Brief 2021 (intérêt académique pour l'état de l'art, et ça intéressera tout projet futur qui aurait besoin de parser des PDFs avec sémantique couleur — cf. note dans "Domaines connexes à explorer ultérieurement" du présent doc), mais **disqualifié comme candidate de mise en production** indépendamment du résultat technique.

### Rappel Google Vision OCR

Couvert intégralement en **F3 T1** comme candidate principale du pipeline OCR Sterny (`DOCUMENT_TEXT_DETECTION` via fetch direct depuis Edge Function Deno, SDK `@google-cloud/vision` exclu pour incompat Deno). Voir F3 T1 pour détails techniques (signaux extractibles, hiérarchie page→block→paragraph→word→symbol, bounding polygons + confidence + détection de langue, support FR confirmé). Pricing : $1.50 / 1000 features (`DOCUMENT_TEXT_DETECTION` = 1 feature/page), free tier 1000 features/mois (Google Cloud). Pas de re-cartographie en F5. Inclus dans le tableau comparatif final pour lisibilité du marché complet.

### Acteurs volontairement écartés du scope F5

Mentionnés pour traçabilité, à ne pas creuser cette session.

- **Mistral OCR** (Mistral AI, France) : challenger récent avec pricing aggressif annoncé fin 2024. Pertinent sous l'angle "souveraineté EU" mais hors des 4 acteurs cadrés en plan recherche du 27 avril. À rouvrir en session dédiée si la dimension souveraineté devient un critère produit pour Sterny.
- **Reducto / LlamaParse / Unstructured.io** : acteurs Document AI orientés ingestion RAG (chunking + Markdown + embeddings prep). Pas le bon match pour parser un calendrier visuel où la donnée critique (couleur de fond) n'est jamais transformée en texte exploitable par leurs pipelines.
- **Gemini File API (Google Vertex AI)** : OCR via LLM multimodal. Doublon stratégique avec Vision OCR côté Google + même limite structurelle que Claude vision démontrée empiriquement le 27 avril (Levier 1 éliminé : tous les LLM vision actuels échouent au même niveau sur la classification couleur de cellule à grande échelle). Réouverture conditionnelle si un benchmark public futur démontre une amélioration spécifique de Gemini sur cette tâche.

### Tableau comparatif synthétique

Synthèse des 4 acteurs cloud + rappel Vision OCR sur les 4 axes pertinents pour Sterny. Cellules `⚠️` marquent les capacités annoncées-non-vérifiées ou les zones grises persistantes après recherche doc seule. Pricing en USD / 1000 pages, tarification US, FR à confirmer sauf mention contraire. Pages consultées 27 avril 2026.

| Acteur — sous-produit | Extraction structure tableau | Couleur de fond cellule | OCR FR | Pricing | Verdict Sterny |
|---|---|---|---|---|---|
| **Google DocAI — OCR Processor + `compute_style_info`** | Non (granularité token, pas de table proto) | **Oui, confirmé** : `backgroundColor` au niveau token (bounding box du mot), pas de la cellule entière | ⚠️ Liste exhaustive non vérifiée doc, Sensei AI couvre large par défaut | $1.50 / 1000 base + $6 / 1000 add-on premium = **$7.50 / 1000** | **Candidate à tester en spike** sur Mathis et Matthieu (texte intra-cellule). Pas pertinent sur Martin. ~2× moins cher qu'Azure DI Layout+STYLE_FONT pour la même capacité |
| **Google DocAI — Form Parser** | Oui (tables simples sans span multi-cellules) | Non | Oui (200+ langues confirmé Form Parser 2.0) | **$30 / 1000** (premiers 1M), $20 au-delà | **Disqualifié** — pas de couleur, coût injustifié vs Enterprise OCR |
| **Google DocAI — Layout Parser** | Oui (cible RAG, chunking auto) | Non (confirmé F2 T5, doc inchangée 2026) | ⚠️ Non documenté précisément | **$10 / 1000** flat | **Disqualifié** — cible métier hors scope Sterny, pas de couleur |
| **Azure DI — Read seul** | Non (pages → lines → words seulement) | ⚠️ STYLE_FONT add-on dispo "for all models except business card" selon doc, mais **non vérifié explicitement sur Read seul** | Oui (300+ langues OCR) | $1.50 / 1000 base + $6 / 1000 si STYLE_FONT = **$1.50 ou $7.50** | **Option B documentée** — doublon fonctionnel vs Vision OCR. Région France Central dispo |
| **Azure DI — Layout + STYLE_FONT** *(rappel F2 T5)* | Oui | **Oui, confirmé** : `backgroundColor` au format `#rrggbb` au niveau spans (bounding box texte) | Oui | $10 / 1000 + $6 / 1000 = **$16 / 1000** | **Candidate à tester en spike** F2 cloud déjà prévu (inchangé F5) |
| **Azure DI — Custom Neural** | Oui (fine-tunable) | Selon mode parent (Layout+STYLE_FONT possible) | Oui | $50 / 1000 inférence + $3/h training (10h gratuites) | **Non actionable aujourd'hui** — pas de dataset annoté Sterny. Traçabilité état de l'art |
| **AWS Textract — DetectDocumentText** | Non (OCR pur, pages→lines→words) | Non (confirmé F2 T5 et reconfirmé 2026) | Oui (FR depuis nov 2020, 6 langues seulement) | **$1.50 / 1000** (premiers 1M), $0.60 au-delà | **Option B documentée** — doublon fonctionnel vs Vision OCR. Région Paris native, data residency FR |
| **AWS Textract — AnalyzeDocument Tables** | Oui (TABLE / CELL / MERGED_CELL avec span) | Non | Oui (mêmes 6 langues) | **$15 / 1000** | **Disqualifié** — sans couleur, coût injustifié vs F2 T3 algo manuel |
| **AWS Textract — AnalyzeDocument Forms** | Partiel (KVP, pas tables) | Non | Oui | **$50 / 1000** (Forms+Tables = $65) | **Disqualifié** — hors scope (formulaires, pas calendrier) |
| **Adobe Extract API** | Oui (tables avec span, export CSV/XLSX/PNG en option) | ⚠️ **Ambiguïté non tranchée** : Technical Brief 2021 annonce "background color", doc How-To 2026 ne l'expose pas dans le schema documenté. JSON Schema non inspecté ligne par ligne cette session | ⚠️ Liste OCR non documentée publiquement | Free Tier 500 transactions/mois (≈2500 pages Extract). **Tier payant opaque** : minimum Enterprise ~500k transactions/an ≈ **$25k/an** sans plan intermédiaire startup | **Bloqueur économique structurel** — Free Tier OK pour spike (intérêt académique pour fermer la zone grise couleur), aucune trajectoire viable de mise en prod pour Sterny |
| **Google Vision OCR** *(rappel F3 T1)* | Non (OCR pur, fullTextAnnotation hiérarchique) | Non | Oui (confirmé F3 T1) | **$1.50 / 1000** features (premiers 1000/mois gratuits) | **Candidate principale OCR** Sterny, déjà actée F3 T1. Inchangé F5 |

### Recommandation pour la suite

**1. Ajout au spike F2 cloud déjà prévu (DocAI OCR + `compute_style_info`)** : ~1h supplémentaire. Activer Free Tier Google Cloud (les 1000 features/mois Vision sont indépendantes du free tier DocAI), créer un OCR_PROCESSOR en région `eu`, envoyer Mathis et Matthieu avec `processOptions.ocrConfig.premiumFeatures.computeStyleInfo: true`, inspecter le `Document.pages[].tokens[].styleInfo.backgroundColor`. Mesures à produire : (a) couverture des cellules contenant du texte intra-cellule, (b) qualité de la couleur retournée vs vérité terrain visuelle, (c) latence comparée à Azure DI sur les mêmes fixtures. Comparaison directe Azure DI Layout+STYLE_FONT vs DocAI OCR+compute_style_info sur les mêmes fixtures, mêmes mesures, pour trancher entre les deux candidats équivalents fonctionnels au coût près (Azure $16 vs DocAI $7.50 / 1000 pages).

**2. Spike Adobe Extract Free Tier maintenu** (~2h, déjà prévu en F2 T5). Objectif révisé après recherche F5 : **fermer définitivement la zone grise couleur de fond annoncée par le Technical Brief 2021**, indépendamment de la disqualification économique de Adobe pour Sterny en production. Intérêt académique pour l'état de l'art, et information utile pour tout projet futur qui aurait besoin de parser des PDFs avec sémantique couleur. Si la capacité existe réellement dans le JSON, l'ajouter à la note "Domaines connexes à explorer ultérieurement" du présent doc avec une mention explicite "non actionable Sterny pour raison économique".

**3. Aucun nouveau spike cloud à ouvrir au-delà de ce qui précède.** Azure DI Read seul, AWS Textract DetectDocumentText, AWS Textract AnalyzeDocument Tables sont **tous documentés comme options B**, à rouvrir uniquement si Vision OCR (F3 T1) ou DocAI OCR + compute_style_info (F5) échouent qualitativement sur les fixtures. Pas de spike spéculatif sans signal d'échec préalable.

**4. Custom Neural Azure DI / Custom Extractor DocAI** : non actionables tant que Sterny n'a pas de dataset annoté de plusieurs centaines de plannings. Cohérent avec la disqualification F4 des modèles ML à fine-tuning requis. À rouvrir uniquement si Sterny atteint ce palier en exploitation réelle.

**Synthèse pour la phase spike technique à venir** : le périmètre des spikes cloud pour le pipeline Sterny est **fermé** par F5. Trois candidates testables, hiérarchisées par ordre de coût-bénéfice attendu :

1. **Google Vision OCR** (F3 T1) — candidate primaire OCR, à tester sur Martin + Mathis + Matthieu
2. **Google DocAI OCR + `compute_style_info`** (F5) — candidate primaire couleur de fond pour Mathis et Matthieu, $7.50/1000
3. **Azure DI Layout + STYLE_FONT** (F2 T5) — candidate alternative couleur de fond, $16/1000, à comparer directement avec #2

Le spike Adobe Extract reste prévu mais en mode académique (fermeture zone grise) sans dépendance produit Sterny. Tous les autres acteurs sont documentés en option B sans investissement spike initial.

---

*Famille 5 close. Axe 1 (état de l'art académique et open source + acteurs marché cloud) complet. Bascule en phase spike technique sur la base des 3 familles candidates ci-dessus + des recommandations Phase 1/2/3 de la Famille 4 (Florence-2 zero-shot, Surya/Marker via API hostée).*

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
