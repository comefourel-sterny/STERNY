# Spike #3 — Homographie 4 ancres sur le bloc Martin entier

Passe de **conception uniquement**. Aucun code exécuté à ce stade. La passe d'implémentation (1A.2) suit après validation par Côme.

## Hypothèse testée

Le spike #2 a plafonné à **93.33 % sur le groupe G1 de Martin** (42 cellules correctes sur 45) en utilisant une stratégie d'ancrage à 2 points (centre semaine 1 + centre semaine 45) suivie d'une **division uniforme verticale** entre ces 2 points pour calculer les 43 centres intermédiaires. La DETTE #41 a diagnostiqué ce plafond comme un **défaut géométrique** : l'erreur de quantification subpixel s'accumule sur les 44 intervalles, et 1 px d'imprécision sur l'ancrage haut se propage cumulativement vers le bas, dégradant les premières semaines (cf. apprentissage 5.5 du `RESULTS.md` du spike #2 : passage de Y_FIRST=535 à Y_FIRST=537 a fait gagner +4 cellules pour 2 px de recalibrage).

L'hypothèse du spike #3 est qu'**augmenter la redondance de l'ancrage** (4 points au lieu de 2) et **remplacer la division uniforme par une transformation par homographie** (matrice 3×3 calculée par DLT — Direct Linear Transform — résolvant un système linéaire à 8 équations 8 inconnues qui projette 4 points théoriques d'un rectangle de référence vers les 4 points cliqués sur l'image) **élimine l'accumulation d'erreur subpixel** et **redresse simultanément les 4 colonnes de groupes du planning** avec une seule matrice partagée.

DLT (Direct Linear Transform) est la méthode standard en vision par ordinateur pour caler 4 paires de points et trouver l'homographie qui projette les uns sur les autres. La matrice obtenue gère simultanément translation, rotation, mise à l'échelle anisotrope et léger keystone (perspective) — elle absorbe donc les imperfections géométriques d'un planning légèrement non-aligné mieux qu'une simple division uniforme.

Si le score consolidé sur les 4 groupes (180 cellules total) atteint ou dépasse **97 %** (seuil `target_strong` consolidé Mathis+Matthieu spike #1), le chemin 2 est validé pour passer en production. Que le seuil soit franchi ou non, le spike #4 (magick-wasm — pré-traitement d'image par opérations morphologiques avant échantillonnage) sera ouvert dans tous les cas, conformément au plan validé en session du 30 avril après-midi bis (séquentiel sans condition d'arrêt). La comparaison à froid des 2 candidates informera l'arbitrage final pour la production.

## Fichiers d'entrée

- **Image source** : `docs/spikes/2026-04-30-03-homographie-3-4-ancres/Planning_Martin.JPG`
  Format : JPEG baseline, **720 × 1560 px**, 222 Ko, 3 canaux RGB. Décodée via `imagescript@1.2.17` exactement comme spike #2. Image dupliquée depuis le spike #2 vers le dossier spike #3 le 30 avril après-midi pour garantir le chargement de pick-coordinates.html en mode file:// sur Safari (qui restreint les chemins relatifs hors dossier en local). Surcoût : 217 Ko dupliqués, accepté pour autonomie totale du dossier spike #3.

- **Vérités terrain** : 4 fichiers CSV dans `docs/fixtures-ground-truth/martin/` (commit `c60a057` pour la création du dossier partagé, saisies G2/G3/G4 finalisées et crosscheckées en session du 30 avril après-midi bis).
  - `martin-ground-truth-g1-cg2p.csv` (45 lignes, 27 school + 18 company)
  - `martin-ground-truth-g2-gc2f.csv` (45 lignes, 27 school + 18 company)
  - `martin-ground-truth-g3-gema-log.csv` (45 lignes, 28 school + 17 company)
  - `martin-ground-truth-g4-gema-md.csv` (45 lignes, 28 school + 17 company)

  Total consolidé : 110 school + 70 company = 180 sem. Crosscheck légende validé sur les 4 groupes.

  Header uniforme : `groupe,week_start_iso,statut_observe_martin,statut_business,notes`. Stratégie de lecture retenue : un fichier par groupe loadé directement par chemin, pas de filtre par préfixe.

- **Ancres** : `anchors.json` à créer dans le dossier spike #3 après que Côme aura cliqué les 4 coins du bloc.
  Format JSON simple — tableau de 4 objets `{x: number, y: number}` dans l'ordre **haut-gauche, haut-droit, bas-gauche, bas-droit** :
  ```json
  [
    { "x": 358, "y": 537 },     // centre cellule G1 semaine 1
    { "x": ???, "y": ??? },     // centre cellule G4 semaine 1
    { "x": 357, "y": 1204 },    // centre cellule G1 semaine 45
    { "x": ???, "y": ??? }      // centre cellule G4 semaine 45
  ]
  ```
  Les 2 ancres G1 sem 1 / G1 sem 45 sont **héritées du spike #2** (recalibrées). Les 2 ancres G4 sem 1 / G4 sem 45 sont à cliquer.

  L'outil pick-coordinates.html est créé dans cette passe 1A.2.a et versionné dans le dossier spike #3 pour reproductibilité.

## Fichiers de sortie

- `output-g1.json`, `output-g2.json`, `output-g3.json`, `output-g4.json`
  Un fichier JSON par groupe, structure héritée du spike #2 (`output-1a-bis-couleurs-cellules.json` + `output-1b-matching.json` fusionnés en un seul output par groupe pour simplifier) :
  ```json
  {
    "generated_at": "...",
    "groupe": "FA_CG2P_G1_2026-2027",
    "n_weeks": 45,
    "n_matches": 44,
    "score_pct": 97.78,
    "params": { "..." },
    "anchors": { "..." },
    "homography_matrix": [[..],[..],[..]],
    "cells": [ /* 45 cellules avec x_image, y_image, hex, bucket, statut_predit, statut_observe_martin, match */ ],
    "errors": [ /* sous-liste des cellules en échec, pour analyse */ ]
  }
  ```

- `RESULTS.md` final avec **6 sections standard** (convention héritée du spike #1 et du spike #2) :
  1. **Objectif** — rappel de l'hypothèse testée et du seuil de succès (97 % consolidé).
  2. **Méthode** — paramètres exacts du run (4 ancres, ordre, dimensions image, paramètres échantillonnage repris du spike #2 : WINDOW_HALF=3, LUM_MIN=80, LUM_MAX=230).
  3. **Résultats par groupe** — 4 sous-sections G1/G2/G3/G4 avec score brut et liste des erreurs (week_index, hex, bucket, statut_predit vs statut_observe_martin).
  4. **Score consolidé** — `(matchs G1 + G2 + G3 + G4) / 180` en pourcentage, comparé au seuil 97 %.
  5. **Analyse** — ce que les erreurs révèlent (clustering géographique sur le bord du planning ? lié à une couleur de cellule dégradée ? cellule avec texte superposé ?).
  6. **Prochaine étape** — passage en production si seuil franchi, sinon ouverture spike #4 magick-wasm.

## Repère théorique de l'homographie

Le repère théorique source de la matrice d'homographie est l'**espace des indices (col, row)** :
- `col ∈ {0, 1, 2, 3}` désigne les 4 colonnes du bloc Martin (G1, G2, G3, G4 dans cet ordre)
- `row ∈ {0, 1, ..., 44}` désigne les 45 semaines empilées verticalement

Les 4 ancres source de la matrice sont donc :
- HG = (0, 0) — coin haut-gauche du bloc, théorique = G1 sem 1
- HD = (3, 0) — coin haut-droit du bloc, théorique = G4 sem 1
- BG = (0, 44) — coin bas-gauche du bloc, théorique = G1 sem 45
- BD = (3, 44) — coin bas-droit du bloc, théorique = G4 sem 45

Les 4 ancres destination sont les coordonnées image cliquées par Côme dans le même ordre, lues depuis `anchors.json`.

Pour chaque cellule à classifier, le point théorique injecté dans `applyHomography` est directement `(col, row)` sans mise à l'échelle intermédiaire. Choix justifié : lisibilité maximale, aucune transformation supplémentaire qui pourrait introduire une erreur ou une confusion.

## Fonctions principales du run.ts

Pour chaque fonction, signature résumée et rôle.

```ts
/**
 * Calcule la matrice d'homographie 3×3 par DLT (Direct Linear Transform).
 * Résout un système linéaire 8 équations 8 inconnues qui projette
 * 4 points sources (rectangle théorique) vers 4 points destination (image réelle).
 *
 * @param srcPoints - 4 points dans le repère théorique (rectangle unité ou
 *                    indices [col, row] normalisés). Ordre : HG, HD, BG, BD.
 * @param dstPoints - 4 points cliqués sur l'image dans le même ordre.
 * @returns matrice 3×3 stockée comme number[3][3]
 */
function computeHomography(srcPoints, dstPoints): number[][]
```

```ts
/**
 * Projette un point théorique (col ∈ {0,1,2,3}, row ∈ {0..44} normalisés
 * en coordonnées du rectangle théorique) vers les coordonnées image
 * réelles via produit matriciel + division par le 3e composant homogène.
 *
 * @param point - { x: number, y: number } dans le repère source
 * @param matrix - matrice 3×3 issue de computeHomography
 * @returns { x: number, y: number } en coordonnées image (à arrondir
 *          avant échantillonnage)
 */
function applyHomography(point, matrix): { x: number, y: number }
```

```ts
/**
 * Échantillonne une fenêtre 7×7 autour du centre projeté, applique
 * le filtre de luminance [80, 230] sur chaque pixel, retourne la
 * couleur médiane RGB des pixels conservés.
 *
 * RÉUTILISÉ SPIKE #2 — copie textuelle du bloc PHASE B de
 * etape-1a-bis-grille-uniforme.ts lignes 96-130.
 *
 * @param image - décodé par imagescript@1.2.17
 * @param x - centre cellule en coordonnées image (entier 1-indexé)
 * @param y - centre cellule en coordonnées image (entier 1-indexé)
 * @returns { r, g, b, hex, n_pixels_used }
 */
function extractColor(image, x, y): { ... }
```

```ts
/**
 * Bucket de classification couleur. Mapping héréditaire spike #2 :
 *   R>200 et G>180 et B<150 → "jaune" (= school)
 *   G>R et G>B (hors jaune) → "vert"  (= company)
 *   sinon                   → "autre" (unknown)
 *
 * RÉUTILISÉ SPIKE #2 — copie textuelle de classifyBucket
 * dans etape-1a-bis-grille-uniforme.ts lignes 57-61.
 *
 * @param r, g, b - composantes 0-255
 * @returns "jaune" | "vert" | "autre"
 */
function classify(r, g, b): "jaune" | "vert" | "autre"
```

```ts
/**
 * Charge le CSV vérité terrain d'un groupe et retourne un tableau
 * de 45 lignes typées. Header attendu strict :
 * groupe,week_start_iso,statut_observe_martin,statut_business,notes
 *
 * RÉUTILISÉ SPIKE #2 — adapté de loadTruthRows dans
 * etape-1b-matching.ts lignes 71-110, en paramétrant le chemin
 * et le préfixe de groupe à filtrer.
 *
 * @param csvPath - chemin absolu vers le CSV
 * @returns TruthRow[] de longueur 45
 */
function loadGroundTruth(csvPath): TruthRow[]
```

```ts
/**
 * Compare 45 prédictions à 45 lignes de vérité terrain, retourne
 * détails ligne-par-ligne et compte des matchs.
 *
 * RÉUTILISÉ SPIKE #2 — copie textuelle de matchRows dans
 * etape-1b-matching.ts lignes 125-151. Mapping bucket → statut :
 * "jaune" → "school", "vert" → "company", "autre" → "unknown".
 *
 * @param predictions - sorties de classify, alignées par index
 * @param truth - lignes du CSV alignées par position chronologique
 * @returns { details: MatchDetail[], n_matches: number, errors: MatchDetail[] }
 */
function matchAgainstGroundTruth(predictions, truth): { ... }
```

**Pipeline du `main()`** :
1. Charger l'image avec imagescript.
2. Charger `anchors.json` → 4 points cliqués.
3. Calculer la matrice d'homographie unique pour le bloc entier.
4. Pour chaque groupe G1, G2, G3, G4 (col = 0, 1, 2, 3) :
   - Pour chaque semaine row = 0..44, calculer le point théorique `(col, row)` puis projeter via homographie pour obtenir `(x_image, y_image)`.
   - Échantillonner la couleur via `extractColor`.
   - Classifier via `classify`.
   - Charger le CSV vérité terrain du groupe via `loadGroundTruth`.
   - Comparer via `matchAgainstGroundTruth`.
   - Écrire `output-g{n}.json`.
5. Calculer le score consolidé `(matchs total) / 180` et écrire les sections de `RESULTS.md`.

## Variables fixées vs variables changées

**Variable changée — la SEULE** :
- Ancrage : 2 points + division uniforme **→** 4 points + transformation par homographie sur le bloc entier des 4 colonnes.

**Variables strictement fixées (héritées spike #2 sans la moindre modification)** :
- Décodeur image : `imagescript@1.2.17` (apprentissage 5.3 spike #2 — version pinnée pour stabilité Deno).
- Coordonnées 1-indexées (apprentissage 5.4 spike #2).
- Fenêtre d'échantillonnage : 7×7 (`WINDOW_HALF = 3`).
- Filtre luminance : `[LUM_MIN = 80, LUM_MAX = 230]`.
- Statistique d'agrégation : médiane RGB sur pixels conservés.
- Classification : `R>200 && G>180 && B<150 → jaune ; G>R && G>B → vert ; sinon → autre`.
- Mapping métier : `jaune → school, vert → company, autre → unknown`.
- Définition d'un match : `statut_predit === statut_observe_martin` (colonne 3 du CSV).

C'est la condition impérative pour attribuer correctement à l'**ancrage** le gain (ou la perte) de score. Toute autre modification simultanée briserait l'expérience contrôlée et empêcherait de conclure sur l'efficacité de l'homographie. Si une autre amélioration est envisagée en cours de route (par exemple ajustement du filtre luminance), elle ouvre un nouveau spike, pas une modification au sein du #3.

## Convention de stockage

Tout le contenu du dossier spike #3 est **versionné**, sans exception. Cela inclut :

- `pick-coordinates.html` (outil de clic d'ancres, réutilisable pour spikes futurs)
- `anchors.json` (4 coordonnées cliquées par Côme)
- `run.ts` (script principal Deno + TypeScript)
- `output-g1.json`, `output-g2.json`, `output-g3.json`, `output-g4.json` (sorties par groupe)
- `RESULTS.md` (rapport final)
- `CONCEPTION.md` (présent fichier)

Justification : sans les ancres exactes utilisées, personne ne peut rejouer le spike et obtenir le même score. La reproductibilité d'un spike est un actif de l'équipe — `anchors.json` et les outputs JSON sont une partie de la trace de mesure, pas un déchet régénérable.

Les CSVs vérité terrain restent gitignored par la convention héritée du spike #2 (`docs/fixtures-ground-truth/**/*.csv` dans le `.gitignore` racine), pas de modification.

Aucun `.gitignore` local n'est créé dans le dossier spike #3.

## Validation gate

Aucun code n'est exécuté tant que :
1. **Côme valide cette conception** en passe Claude.ai.
2. **Côme clique les 4 ancres** via `pick-coordinates.html` et écrit `anchors.json`.
3. **Claude.ai valide `anchors.json`** en passe suivante (cohérence des coordonnées : x croissant gauche→droite, y croissant haut→bas, écart approximatif entre HG↔HD et BG↔BD du même ordre, écart entre HG↔BG et HD↔BD du même ordre).

Une fois ces 3 étapes franchies, la passe 1A.2.b lance le run sur les 4 groupes et produit `RESULTS.md`.
