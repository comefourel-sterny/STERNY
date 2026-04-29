# Spike #2 — Martin (image raster JPG) — algo manuel ImageData

**Date** : 29 avril 2026 (setup) — date de clôture à compléter
**Durée réelle vs estimation** : à compléter (estimation cadrage : 3-4h pour étape 0 + étape 1 ImageData)
**Coût réel vs estimation** : à compléter (estimation : 0€ plan A pure TS, ~0€ plan B magick-wasm, payant uniquement plan C)
**Statut** : 🟡 En cours — étape 0 audit faisabilité non encore exécutée
**Décision suite** : à compléter en clôture

---

## 1. Question à laquelle ce spike répond

L'algo manuel ImageData en pure TypeScript permet-il de classer la couleur de fond de chaque cellule du Planning_Martin.JPG (1 groupe FA CG2P G1, 45 semaines) avec une fiabilité ≥80% mesurée contre vérité terrain saisie main par Côme ?

Cible secondaire (si plan A validé) : robustesse sur les 3 autres groupes du même JPG (FA GC2F, FA GEMA LOG, FA GEMA MD).

Hypothèse de fond à valider ou réfuter : un algorithme déterministe (projection horizontale/verticale pour grille + échantillonnage couleur centre cellule + K-means K=3 ou K=4) est plus fiable qu'un LLM vision (GPT-4o 50%, Gemini 40%, Claude vision ~50% sur les mêmes 10 premières semaines, DETTE #37 statut 27 avril) sur la classification couleur à grande échelle.

## 2. Méthode

Cascade 4 candidates en plans successifs, ouverts uniquement si le plan précédent plafonne :

| Plan | Technique | Stack | Coût | Estimation |
|---|---|---|---|---|
| A | Algo manuel ImageData (F2 T3) | Pure TS + imagescript pour décodage JPG | 0€ | 3-4h |
| B | magick-wasm (F2 T1) | TS + ImageMagick WASM | 0€ | 6-10h |
| C | Florence-2 / Surya / Adobe Extract | API hostée payante | ~0.05$/page | 2-3h par option |
| C bis | OpenCV.js / TATR | Plan de réserve uniquement | variable | non chiffré |

**Étape 0 — Audit faisabilité (~30-45 min)** : 3 sous-points obligatoires avant d'investir le code algo manuel.
1. Faisabilité décodage JPG côté Deno via imagescript.
2. Extraction de la palette de couleurs effective sur 5-10 cellules échantillons.
3. Confirmation que les fonds de cellules sont colorés de manière distinguable au pixel près.

Critères de bascule étape 0 → étape 1 :
- Si décodage Deno OK + palette nette ≥3 clusters distincts : étape 1 algo manuel
- Si décodage Deno KO ou palette non nette : bascule plan B magick-wasm sans coder l'étape 1 plan A

**Étape 1 — Algo manuel sur 45 cellules FA CG2P G1** (à cadrer après étape 0 si plan A validé) : décodage JPG, projection horizontale/verticale pour détecter lignes de grille, reconstruction cellules, échantillonnage couleur centre cellule, K-means K=3 ou K=4, mapping cluster → statut métier (school/company), comparaison contre vérité terrain 45 lignes.

**Étape 2 — Robustesse 3 groupes restants** (conditionnelle à étape 1 ≥80% sur G1) : reprendre l'algo sur les 4 groupes, mesurer score consolidé.

## 3. Résultats chiffrés

### Tableau de mesures vs cible go/no-go

| Mesure | Cible | Étape 0 | Étape 1 G1 | Étape 2 robustesse |
|---|---|---|---|---|
| Faisabilité décodage Deno | binaire | à mesurer | — | — |
| Couleurs distinctes détectées | ≥3 | à mesurer | — | — |
| Score cell-par-cell vs vérité terrain | ≥80% | — | à mesurer | à mesurer |
| Couverture spike | 45 sem (G1) puis 180 sem (4 groupes) | — | à mesurer | à mesurer |

### Tableau vérité terrain

Vérité terrain saisie main par Côme dans fixtures/martin-ground-truth.csv (gitignored, hors repo). 45 lignes pour FA CG2P G1, 5 colonnes : groupe, week_start_iso, statut_observe_martin, statut_business, notes. Saisie achevée le 29 avril 2026 en regardant directement le JPG (mapping jaune=school, vert=company validé visuellement par Côme).

À compléter en clôture : table de comparaison cellule-par-cellule vérité terrain vs sortie algo, semaines en désaccord, pattern d'erreur observé.

## 4. Verdict go/no-go

**GO cascade A** — algo manuel ImageData en pure TypeScript Deno. Les 3 sous-points d'audit sont passés.

| Sous-point | Statut | Mesure |
|---|---|---|
| 1. Décodage JPG côté Deno via imagescript | PASS | Image décodée 720 × 1560 px, lecture 222 360 octets, format JPG. Pin `imagescript@1.2.17` requis pour stabilité. |
| 2. Palette de couleurs extraite sur 13 cellules échantillons | PASS | 13 hex récupérés sans crash. Gamme jaune `#ffff01` → `#e0de10`. Gamme vert `#91cf52` → `#7cb145`. |
| 3. Fonds de cellules distinguables au pixel près | PASS | 56/78 paires testées avec Δmax > 50 (palette nette inter-teintes). Aucune paire jaune↔vert sous le seuil de séparation 30. |

Plan B magick-wasm non engagé. Cascade C (Florence-2 / Surya / Adobe Extract via API hostée) et C bis (OpenCV.js / TATR) restent en réserve documentaire, non activées.

## 5. Apprentissages

**5.1 — Bruit de compression JPG sur les bords et le centre des cellules.** La palette n'est pas binaire jaune-pur / vert-pur comme on l'aurait attendu sur un PDF vectoriel. Au moins 3 nuances de jaune et 5 nuances de vert sont apparues sur 13 échantillons, dues au chroma subsampling JPG (blocs 8×8) qui dégrade la couleur selon la position du sample point. Pour un classifieur K-means K=2 (jaune→school / vert→company) c'est suffisant. Pour K=3 ou K=4 il faudrait un échantillonnage multi-pixel moyenné.

**5.2 — Échantillonnage 1-pixel central insuffisant en isolation.** 3 points sur 13 (~23%) ont retourné des valeurs très foncées (`#2c5e00`, `#0c3b00`, `#3d3900`) qui n'étaient ni jaune school ni vert company. Cause confirmée visuellement par Côme : ces points cliqués au centre visuel sont tombés sur une bordure de cellule ou un texte intra-cellule. Le code de l'étape 1 doit moyenner plusieurs pixels par cellule pour absorber ces artefacts.

**5.3 — Pin de version imagescript obligatoire.** L'import `https://deno.land/x/imagescript/mod.ts` sans version a échoué côté Deno. Pin `@1.2.17` requis. À documenter pour tous les futurs scripts Deno qui décodent des images raster.

## 6. Décision suite

Engager l'étape 1 du spike #2 (détection de grille par projection horizontale/verticale + extraction couleur cellule par cellule + classification K-means K=2 + matching contre la vérité terrain CSV de 45 lignes Côme). Périmètre : FA CG2P G1 uniquement. Échantillonnage multi-pixel obligatoire (apprentissage 5.2). Si étape 1 valide ≥80% cellule-par-cellule contre la vérité terrain, étape 2 robustesse sur les 3 autres groupes FA. Si étape 1 échoue, bascule plan B magick-wasm.
