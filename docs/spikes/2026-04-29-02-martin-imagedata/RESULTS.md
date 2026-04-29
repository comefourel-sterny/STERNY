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

À compléter en clôture du spike.

Critères :
- ≥80% sur 45 semaines G1 = signal fort, plan A retenu, étape 2 robustesse engagée
- 50-80% = zone grise, envisager plan B sur même fixture pour comparaison
- <50% = plan A invalidé, bascule plan B obligatoire

## 5. Apprentissages

À compléter en clôture du spike.

Notes de cadrage (29 avril Claude.ai) à acter dans cette section au moment de la clôture :
- Divergence à réconcilier dans ETAT-COURANT : magick-wasm est candidate principale F2 dans PARSER-AXE-1 mais absente du bloc 28 avril ETAT-COURANT (citait "Florence-2 / Surya / algo manuel ImageData"). Cascade de candidates Martin réordonnancée 29 avril en plan A→B→C→C bis avec algo manuel en plan A et magick-wasm en plan B.
- Posture Python interdit pour le spike Martin (stack Sterny Deno/TS). À rouvrir uniquement si plan C avec exécution locale Florence-2/Surya devient nécessaire.
- Convention .gitignore par dossier fixtures/ (héritée commit 2cae874 du spike #1) à acter explicitement : chaque nouveau spike crée son propre fixtures/.gitignore avec *.pdf et *.csv au moment de la création du dossier.
- Le spike #2 mesure UNIQUEMENT la performance de classification couleur. La règle métier "alternant en vacances scolaires → company" (VISION §3) ne s'applique pas dans ce spike — le matching se fait sur statut_observe_martin (couleur réelle), pas sur statut_business.

## 6. Décision suite

À compléter en clôture du spike.

Sortie attendue : décision finale F1/F2/F3 sur le levier parser Sterny (DETTE #37), bloquée jusque-là par l'absence de signal Martin. Verdict probable : stratégie discriminante par format (PDFs vectoriels au pdf.js, images raster à la méthode retenue par ce spike, fallback saisie manuelle assistée pour le reste).
