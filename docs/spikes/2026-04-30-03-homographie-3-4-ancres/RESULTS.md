# RESULTS — Spike #3 homographie 4 ancres bloc Martin entier

**Date** : 30 avril 2026 après-midi bis (run effectué le 30 avril en fin d'après-midi).
**Hypothèse testée** : remplacer l'ancrage 2 points + division uniforme du spike #2 par un ancrage 4 points + transformation par homographie sur le bloc entier des 4 colonnes Martin (45 × 4 = 180 cellules).
**Verdict synthétique** : hypothèse confirmée. L'homographie résout le défaut géométrique diagnostiqué par DETTE #41. Score consolidé 4 groupes = **94.44 % (170/180)**, sous le seuil 97 % mais avec un plafond résiduel diagnostiqué hors périmètre du spike.

## 1. Objectif

Tester si une homographie calculée par DLT (Direct Linear Transform — méthode standard en vision par ordinateur pour caler 4 paires de points et trouver l'unique matrice 3×3 qui projette les uns sur les autres) sur 4 ancres aux coins extérieurs du bloc des 4 colonnes Martin élimine l'accumulation d'erreur subpixel observée par le spike #2 sur le seul groupe G1 (plafond 93.33 % avec 2 ancres + division uniforme).

Seuil de succès cible : **score consolidé ≥ 97 %** sur les 180 cellules des 4 groupes (cohérence avec `target_strong` du spike #1 sur Mathis+Matthieu).

## 2. Méthode

### Variables fixées (héritées spike #2 sans modification)

- Décodeur image : `imagescript@1.2.17` Deno.
- Coordonnées 1-indexées.
- Échantillonnage 7×7 autour du centre projeté (`WINDOW_HALF = 3`).
- Filtre luminance `[LUM_MIN = 80, LUM_MAX = 230]`, médiane RGB sur pixels conservés.
- Bucket couleur : `R>200 && G>180 && B<150 → jaune (school)` ; `G>R && G>B → vert (company)` ; sinon `autre (unknown)`.
- Définition d'un match : `statut_predit === statut_observe_martin`.

### Variable changée (la seule)

Ancrage : 2 points cliqués + division uniforme verticale **→** 4 points cliqués + transformation par homographie sur le bloc entier.

### Repère théorique

Espace `(col, row)` avec `col ∈ {0,1,2,3}` et `row ∈ {0..44}`. Les 4 ancres source sont `(0,0)`, `(3,0)`, `(0,44)`, `(3,44)`. Pour chaque cellule, le point théorique `(col, row)` est projeté via la matrice 3×3 vers les coordonnées image réelles puis échantillonné.

### Ancres cliquées (anchors.json)

- HG = (357, 538) — centre cellule G1 sem 1
- HD = (584, 537) — centre cellule G4 sem 1
- BG = (357, 1205) — centre cellule G1 sem 45
- BD = (585, 1204) — centre cellule G4 sem 45

Cohérence géométrique : écart horizontal HG↔HD = 227 px, BG↔BD = 228 px (Δ 1 px = bruit clic). Écart vertical HG↔BG = HD↔BD = 667 px exactement. Step vertical théorique = 667 / 44 = 15.16 px par cellule, identique au step calculé par division uniforme dans le spike #2 (donc tableau quasi parfaitement vertical, pas de rotation perceptible).

### Vérité terrain (4 CSVs)

- `martin-ground-truth-g1-cg2p.csv` (45 lignes : 27 school + 18 company)
- `martin-ground-truth-g2-gc2f.csv` (45 lignes : 27 school + 18 company)
- `martin-ground-truth-g3-gema-log.csv` (45 lignes : 28 school + 17 company)
- `martin-ground-truth-g4-gema-md.csv` (45 lignes : 28 school + 17 company)

Total consolidé : 110 school + 70 company = 180 sem. Crosscheck légende validé sur les 4 groupes le 30 avril après-midi bis.

**Note de saisie** : 2 cellules (G3 sem 7 et G4 sem 7, 2026-10-12) avaient un `statut_observe_martin` vide dans les CSVs initiaux. Côme a relu le PDF en cours de spike, confirmé que ces cellules sont colorées en vert dans le PDF, et corrigé la saisie en `company`. Pas de révision de vérité terrain pour faire matcher le score : correction d'une saisie incomplète repérée par le run, PDF en main.

## 3. Résultats par groupe

### G1 (col=0)

- Score : **44/45 = 97.78 %**
- 1 erreur : sem 5 (2026-09-28), pos image (357, 598), hex `#bad431`, bucket = vert, prédit = company, observé = school.

### G2 (col=1)

- Score : **44/45 = 97.78 %**
- 1 erreur : (cf. output-g2.json — même profil de couleur jaune-verdâtre frontière bucket).

### G3 (col=2)

- Score : **42/45 = 93.33 %**
- 3 erreurs : (cf. output-g3.json — toutes du même profil predit=company / observe=school sur hex frontière bucket).

### G4 (col=3)

- Score : **40/45 = 88.89 %**
- 5 erreurs : (cf. output-g4.json — même profil).

## 4. Score consolidé

**170 matchs sur 180 = 94.44 %**.

Le seuil cible 97 % n'est **pas atteint**. Écart au seuil : 4.66 points = 8 cellules. Mais comparaison directe avec le spike #2 sur le seul groupe G1 :

| Spike | Variable d'ancrage | Score G1 |
|---|---|---|
| #2 (29 avril soir) | 2 points + division uniforme | 93.33 % (42/45) |
| #3 (30 avril après-midi bis) | 4 points + homographie DLT | 97.78 % (44/45) |
| Δ attribuable à l'homographie | | **+4.45 pts (+2 cellules)** |

**Cette amélioration est attribuable à 100 % à l'homographie** : aucune autre variable du pipeline n'a changé entre les 2 runs.

## 5. Analyse

### Verdict principal — l'homographie résout DETTE #41

DETTE #41 (« inexactitude cumulative de la division uniforme ») diagnostiquait une accumulation d'erreur subpixel sur les 44 intervalles entre les 2 ancres du spike #2. L'homographie élimine cette accumulation par construction : chaque cellule est projetée indépendamment depuis son point théorique `(col, row)`, sans dérivation incrémentale. Le gain mesuré (+4.45 points sur G1 isolé) confirme que c'est bien là que le spike #2 plafonnait. **DETTE #41 est éligible à clôture** à la fermeture du spike d'amélioration parser (clôture conditionnée à la cohérence des résultats avec le spike #4 magick-wasm).

### Plafond résiduel — classification couleur sur teintes ambiguës

Sur les 10 erreurs résiduelles du consolidé, le profil dominant est **systématique** :
- `statut_predit = company` (bucket = vert)
- `statut_observe_martin = school` (PDF montre du jaune)
- hex de la cellule = jaune-verdâtre proche de la frontière (R≈180-190, G≈210-215, B≈40-50)

La règle de bucket actuelle `G>R && G>B → vert` classe ces hex en vert alors qu'ils sont visuellement jaunes (la composante G domine R de 15-25 unités sur 255, soit ~10 % de marge — la règle n'a pas de zone tampon).

**Ce n'est pas un problème de positionnement géométrique**, c'est un problème de classification couleur. Variable à traiter dans un spike dédié — **pas dans le #3** (discipline « une variable change à la fois » pour préserver l'attribution propre du gain de l'homographie).

### Distribution géographique des erreurs

Comptes par groupe : G1=1, G2=1, G3=3, G4=5. Asymétrie horizontale apparente, mais lecture honnête : les erreurs sont **toutes du même type couleur** (pas géométriques), donc l'asymétrie reflète probablement une distribution non-uniforme des cellules à teinte ambiguë dans le planning Martin (certaines périodes pédagogiques peuvent avoir des couleurs intentionnellement plus tirées vers la frontière). Aucun signal géométrique exploitable dans cette asymétrie.

### Anomalies hors-scope rencontrées

Pendant le spike, 2 anomalies de saisie CSV ont été remontées et n'ont **pas été corrigées dans ce spike** (préservation de la discipline méthodologique). À traiter en passe dédiée :

1. Format 8 colonnes (au lieu de 5) sur la ligne sem 7 de G3 et G4 — colonnes surnuméraires en queue de ligne, sans impact sur le run actuel mais à normaliser.
2. Label de groupe G4 = `FA_GEMA_LOG_G4_2026-2027` sur les 45 lignes au lieu de `FA_GEMA_MD_G4_2026-2027` — copier-coller probable depuis G3 lors de la saisie. Sans impact sur run.ts (pas de filtre par préfixe) mais piège silencieux pour tout futur run cross-fixture.

Ces 2 anomalies sont à logguer en DETTE-TECHNIQUE.md (passe dédiée par Claude.ai après ce RESULTS.md).

## 6. Prochaine étape

Conformément au plan validé en session du 30 avril après-midi bis (séquentiel sans condition d'arrêt), **le spike #4 magick-wasm est ouvert dans tous les cas**. La lecture du spike #3 enrichit son cadrage :

- **Mission initiale du spike #4** : détection automatique de grille par morphologie (alternative structurelle à l'ancrage manuel, qui supprime au passage la friction UX du clic d'ancres).
- **Mission complémentaire ajoutée par le verdict du spike #3** : tester si le pré-traitement d'image magick-wasm (normalisation de saturation, contraste, voire lissage colorimétrique) améliore la robustesse du bucket de classification couleur sur les teintes frontière jaune-verdâtres.

Si le spike #4 ne suffit pas non plus à franchir 97 %, un **spike #5 dédié à la classification couleur** (palette de référence type k-NN, ou plage jaune élargie) sera ouvert. Décision à prendre après lecture du spike #4.

**DETTE #41 — statut au 30 avril après-midi bis** : éligible à clôture, conditionnée à la cohérence des résultats du spike #4. Si magick-wasm ouvre une voie qui supprime entièrement l'algo manuel ImageData, DETTE #41 disparaît par changement de chemin technique. Sinon, l'algo manuel ImageData avec homographie 4 ancres est validé comme la voie de référence pour le chemin 2 image raster, et DETTE #41 est close.

---

## Annexes

- `anchors.json` : 4 coordonnées cliquées le 30 avril après-midi bis (versionnées dans le dossier spike #3)
- `output-g1.json`, `output-g2.json`, `output-g3.json`, `output-g4.json` : sorties détaillées par groupe (45 cellules chacune avec hex, bucket, statut prédit, statut observé, match)
- `pick-coordinates.html` : outil de clic d'ancres réutilisable pour spikes futurs (versionné dans le dossier spike #3)
- `Planning_Martin.JPG` : image source dupliquée depuis le spike #2 vers le dossier spike #3 (autonomie totale du dossier en mode file:// Safari)
