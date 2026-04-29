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

**GO cascade A confirmé empiriquement** — algo manuel ImageData en pure TypeScript Deno valide sur image raster JPG. Score final **93.33% (42/45)** sur Martin FA CG2P G1, ≥ seuil cible ≥80% largement dépassé.

| Étape | Mesure | Statut |
|---|---|---|
| 0. Audit faisabilité (3 sous-points) | Décodage JPG OK, palette extraite OK, distinguabilité jaune↔vert nette | PASS |
| 1A. Détection grille par gradient vertical | Sur-segmentation hors grille, sous-segmentation intra-grille (49 cellules vs 45) | FAIL → bypass |
| 1A bis. Division uniforme entre 2 ancrages cliqués | 45 cellules sur 45, 0 low_confidence, 0 bucket "autre" | PASS |
| 1B. Matching contre vérité terrain CSV | 42 matchs sur 45 = 93.33% | PASS (≥80%) |

Plan B magick-wasm non engagé. Cascade C (Florence-2 / Surya / API hostée) et C bis (OpenCV.js / TATR) restent en réserve documentaire, non activées.

## 5. Apprentissages

**5.1 — Bruit de compression JPG sur les bords et le centre des cellules.** La palette n'est pas binaire jaune-pur / vert-pur comme on l'aurait attendu sur un PDF vectoriel. Au moins 3 nuances de jaune et 5 nuances de vert sur 13 échantillons étape 0, dues au chroma subsampling JPG (compression qui dégrade la couleur en blocs 8×8 pixels). Pour un classifieur K-means K=2 (jaune→school / vert→company) c'est suffisant. Pour K=3 ou K=4 il faudrait un échantillonnage multi-pixel moyenné.

**5.2 — Échantillonnage 1-pixel central insuffisant en isolation.** 3 points sur 13 (~23%) ont retourné des valeurs très foncées (`#2c5e00`, `#0c3b00`, `#3d3900`) à l'étape 0. Cause confirmée visuellement : ces points cliqués au centre visuel sont tombés sur une bordure de cellule ou un texte intra-cellule. Conséquence : le code des étapes ultérieures doit moyenner plusieurs pixels par cellule. Implémenté en 1A puis 1A bis avec fenêtre 7×7 et filtrage luminance [80, 230], résultat 0 cellule low_confidence sur 45.

**5.3 — Pin de version imagescript obligatoire.** L'import `https://deno.land/x/imagescript/mod.ts` sans version échoue côté Deno. Pin `@1.2.17` requis. À documenter pour tous les futurs scripts Deno qui décodent des images raster.

**5.4 — La détection automatique de grille par gradient vertical échoue sur ce type de planning.** Étape 1A originale : le gradient vertical sur-segmente l'extérieur de la grille (en-têtes, légende confondus avec des cellules) et sous-segmente l'intérieur (2 cellules de même couleur consécutives n'ont pas de saut RGB fort entre elles, bordure ratée). 49 cellules détectées au lieu de 45. Conclusion : sur ce type d'image raster, abandonner la détection automatique au profit d'une **division uniforme entre 2 ancrages saisis manuellement** (centres semaine 1 et semaine 45). Plus robuste, plus simple, score parfait sur la détection.

**5.5 — Précision de l'ancrage manuel critique pour l'extrémité haute.** Recalibrage entre 1A bis run 1 (Y_FIRST=535) et run 2 (Y_FIRST=537) a fait passer le score 1B de 84.44% à 93.33%, soit +4 cellules pour un décalage de 2 pixels seulement. La grille calendrier amplifie les erreurs d'ancrage : 1 px d'erreur en haut se propage cumulativement sur 44 cellules, créant des erreurs systématiques sur les premières semaines. Implication production : si l'utilisateur Sterny doit cliquer manuellement les ancrages, l'UI doit prévoir un zoom élevé (×3 ou ×4) au moment du clic et un mode de validation visuelle avec markers superposés avant confirmation.

**5.6 — Erreurs résiduelles concentrées sur cellules à hex verdâtre ambigu.** Les 3 erreurs résiduelles à 93.33% portent sur des hex `#cdd72e`, `#bad431`, `#b7d332` dont les composantes R et G sont très proches (vert-citron / jaune-vert ambigu). Cause non tranchée en fin de session : peut être bruit JPG localisé, ambiguïté visuelle réelle, ou défaut d'alignement vertical résiduel non résolu (Côme observe que tous les markers semblent légèrement décalés vers le haut malgré le recalibrage). Voir DETTE-TECHNIQUE #41 pour suivi.

## 6. Décision suite

**Décision DETTE #37 prête à formaliser** : stratégie discriminante par format. PDFs vectoriels au pdf.js getOperatorList (validé spike #1, score 99.1% consolidé sur Mathis + Matthieu). Images raster à l'algo manuel ImageData en pure TypeScript Deno avec ancrage manuel UI (validé spike #2, score 93.33% sur Martin). Composant de saisie manuelle assistée comme fallback pour tout le reste (Levier 3 DETTE #37, à concevoir séparément).

**Étape 2 du spike #2 (robustesse 3 autres groupes FA Martin) reportée** : non bloquante pour la décision DETTE #37 (verdict cascade A déjà acquis sur G1). À engager si et quand le pipeline production a besoin de couvrir la fixture Martin complète.

**Implication produit** : l'UI de saisie d'ancrage utilisateur (clic semaine 1 + clic semaine 45 dans le planning) devient un composant à concevoir, pas un détail technique. Critères : zoom ×3/×4 obligatoire au clic, validation visuelle par markers superposés avant confirmation, fallback saisie manuelle assistée si l'utilisateur ne reconnaît pas la structure du planning.
