# Spike #4 — magick-wasm sur Martin entier (180 sem)

**Statut** : ouvert le 30 avril 2026 après-midi (post-spike #3, post-clôture DETTE #42).
**Plan parent** : étape 2 du plan validé en session du 30 avril après-midi bis (ETAT-COURANT.md).
**Score baseline à battre** : 94.44 % consolidé 4 groupes Martin (170/180), spike #3 homographie 4 ancres.
**Cible** : > 97 % consolidé 4 groupes Martin (175/180 ou plus).

---

## 1. Question à laquelle ce spike répond

Magick-wasm peut-il, sur le bloc Martin entier (4 groupes, 180 semaines, image JPG raster), apporter une amélioration significative sur deux fronts orthogonaux :

- **Mission (a) — détection automatique de grille** : remplacer l'ancrage manuel à 4 clics utilisateur (spike #3) par une détection programmatique des coins de cellule via opérations morphologiques. Objectif UX : supprimer la friction du clic d'ancres dans le pipeline production.
- **Mission (b) — pré-traitement couleur pour DETTE #43** : appliquer un pré-traitement d'image (saturation, contraste, lissage colorimétrique) en amont de l'échantillonnage couleur, pour résoudre le plafond classification couleur identifié par le spike #3 (10 erreurs systématiques sur hex jaune-verdâtres frontière, profil predit=company / observe=school).

Les deux missions sont techniquement orthogonales (géométrie vs classification couleur) et seront mesurées séparément pour isoler la contribution de chacune.

---

## 2. Méthode

### 2.1 Pipeline morphologique — mission (a)

Pipeline en 10 étapes pour détecter automatiquement la grille du calendrier sur Martin :

1. Charger l'image Martin (JPG) en RGB via magick-wasm.
2. Convertir en niveaux de gris (canal luminance).
3. Seuillage adaptatif → image binaire (1 = trait sombre, 0 = fond clair). Méthode candidate : Otsu global. Méthode de repli si Otsu échoue : seuillage adaptatif local (mean ou gaussian, fenêtre ~15px).
4. Érosion + dilatation avec **kernel horizontal long** (rectangle 1×40 px à tuner) → masque "lignes horizontales seules".
5. Érosion + dilatation avec **kernel vertical long** (rectangle 40×1 px à tuner) → masque "lignes verticales seules".
6. Intersection des 2 masques (logique ET) → masque "intersections = coins de cellule".
7. Détection de blobs (groupes de pixels connectés) sur le masque d'intersections → liste de coordonnées (x, y) des coins.
8. Tri et regroupement des coins par ligne et colonne du calendrier → matrice de coins ordonnés.
9. Centre de chaque cellule = milieu géométrique de ses 4 coins.
10. Échantillonnage couleur sur fenêtre 7×7 (héritage spike #2/#3) → classification school/company sur **bucket couleur strictement identique au spike #3** (préservation de la discipline « une variable change à la fois » — ici la variable change est la géométrie, pas la classification couleur).

### 2.2 Pipeline pré-traitement couleur — mission (b)

Avant l'étape 1 du pipeline morphologique (donc sur l'image RGB originale), insertion d'une passe magick-wasm de pré-traitement :

- `modulate` (ajuste teinte / saturation / luminance) — paramètres à tuner sur G1
- `level` (étire les niveaux RGB pour augmenter le contraste) — paramètres à tuner sur G1

Objectif : éloigner les hex jaune-verdâtres ambigus (R∈180-190, G∈210-215, B∈40-50) du centre du seuil de classification, en poussant les jaunes vers du jaune franc et les verts vers du vert franc.

### 2.3 Plan de mesures séquentielles

Trois mesures successives, chacune isolée, pour diagnostiquer la contribution propre de chaque mission :

| # | Configuration | Objectif diagnostic |
|---|---|---|
| (i) | Baseline = score spike #3 = 94.44 % | Rappel, pas une nouvelle mesure |
| (ii) | Mission (a) seule : magick-wasm pour grille, **sans** pré-traitement couleur | Mesure pure de la mission (a) |
| (iii) | Mission (a) + (b) : magick-wasm pour grille + pré-traitement couleur | Mesure du combiné |

Comparaison à froid des 3 scores en fin de spike → diagnostic de la contribution propre de chaque mission.

### 2.4 Périmètre de mesure

Cible inchangée vis-à-vis du spike #3 : 4 groupes Martin (G1 + G2 + G3 + G4), 180 semaines au total. Vérité terrain unique pour les 4 groupes (CSVs `docs/fixtures-ground-truth/martin/`, propres après clôture DETTE #42).

### 2.5 Discipline méthodologique

- **Tuning sur G1 uniquement** (référence connue : 97.78 % spike #3). Application sans nouveau tuning sur G2 + G3 + G4 pour éviter l'overfitting.
- **Crosscheck systématique** entre la sortie de l'algo et la vérité terrain à chaque étape, pas seulement en fin.
- **Aucune hypothèse non vérifiée livrée comme conclusion** (règle 28 avril). Si une hypothèse nécessite vérification, faire la vérification (script de debug) plutôt que présumer.
- **Vérité terrain sacrée** : si une mesure tombe sur un mismatch, on suspecte d'abord l'algo, pas la vérité terrain.

### 2.6 Stack technique

- Runtime : Deno + TypeScript (cohérent avec spike #3, run.ts).
- Librairie magick-wasm : import via URL ESM (à confirmer dans le prompt scaffold suivant). Versions explicites pour reproductibilité.
- Cible d'exécution : script local sur Mac de Côme. Pas d'Edge Function dans le spike (cohérent avec convention spike throwaway). Portabilité Edge Function vérifiée à l'industrialisation, hors scope spike.

### 2.7 Cible d'ancrage utilisateur (mission a)

Si la mission (a) réussit (détection auto précise au pixel près) : suppression complète des 4 clics utilisateur du pipeline production. Pas de mode garde-fou intermédiaire (sur-ingénierie écartée). Si la mission (a) échoue, fallback sur l'homographie 4 ancres du spike #3, ou bascule chemin 3 (saisie manuelle assistée VISION §5) selon le verdict global.

---

## 3. Risques nommés

- **Risque A — Sensibilité du seuillage adaptatif** : la binarisation est sensible à la compression JPG de Martin. Mauvais seuillage → masque binaire de mauvaise qualité → grille mal détectée. Mitigation : tester 2-3 méthodes de seuillage, fallback sur seuillage adaptatif local si Otsu global échoue.
- **Risque B — Confusion avec en-têtes** : les en-têtes du calendrier Martin (jours de semaine en haut, semaines numérotées sur le côté) ont aussi des traits droits qui peuvent être confondus avec la grille des données. Mitigation : recadrer l'image sur la zone des cellules avant détection, soit manuellement (ROI fixe), soit par heuristique (le bloc le plus grand de cellules colorées).
- **Risque C — Interaction (a)+(b)** : le pré-traitement (mission b) peut améliorer la classification correcte tout en dégradant la détection de grille (parce qu'il modifie les contrastes des bordures). C'est précisément pour ça qu'on mesure (a) seule avant (a)+(b) — pour repérer cette interaction.
- **Risque D — Plafond couleur résistant au pré-traitement** : si la teinte des hex frontière reste ambiguë même après modulate/level agressifs, la mission (b) ne résoudra pas DETTE #43 et restera à adresser par les options 1 (élargir plage jaune) ou 2 (k-NN) listées dans la dette.

---

## 4. Critères de verdict

| Verdict | Condition | Décision suite |
|---|---|---|
| GO franc | Score consolidé (a)+(b) ≥ 97 % | DETTE #41 close, DETTE #43 close (si la mission b porte le gain), magick-wasm intégré au pipeline production chemin 2 |
| GO partiel mission (a) | (a) seule reproduit ~94.44 % au pixel près, (b) ne porte pas | Mission (a) intégrée pour supprimer les clics utilisateur, DETTE #43 traitée par option 1 ou 2 dans un spike #5 dédié |
| GO partiel mission (b) | (a) dégrade le score, (b) résout DETTE #43 indépendamment | Pré-traitement intégré au spike #3 (homographie 4 ancres + pré-traitement), DETTE #43 close, ancrage manuel conservé |
| NO-GO | Score consolidé < 94.44 % en (a)+(b) ou (a) seule | Magick-wasm écarté pour Martin. Bascule sur options 1 (élargir plage jaune) ou 2 (k-NN) de DETTE #43, ou ouverture session cadrage F4 ML, ou bascule chemin 3 saisie manuelle |

---

## 5. Plan d'exécution séquentiel

| Étape | Description | Estimation |
|---|---|---|
| 2A | Création sous-dossier + CONCEPTION.md (ce document) | 30 min |
| 2B | Setup magick-wasm Deno + script de smoke test (charger Martin, afficher dimensions) | 30 min - 1h |
| 2C | Mission (a) — implémentation pipeline morpho 10 étapes, tuning sur G1 | 2 - 4h |
| 2D | Mission (a) — application sans tuning sur G2 + G3 + G4, mesure consolidée | 30 min |
| 2E | Mission (b) — implémentation pré-traitement, tuning sur G1 | 1 - 2h |
| 2F | Mission (a)+(b) — application sans tuning sur G2 + G3 + G4, mesure consolidée | 30 min |
| 2G | Rédaction RESULTS.md (6 sections standard) + comparaison à froid des 3 scores | 1h |

Total : **6 - 9h** étalable sur 2-3 sessions Claude.ai.

---

## 6. Versionnement attendu du dossier spike

Tous les fichiers du dossier docs/spikes/2026-04-30-04-magick-wasm/ sont versionnés (pas de gitignore local). Reproductibilité d'un spike = actif d'équipe (convention héritée du spike #3).

Fichiers attendus en fin de spike :
- CONCEPTION.md (ce document)
- run.ts (script Deno principal)
- output-g1.json, output-g2.json, output-g3.json, output-g4.json (mesures par groupe)
- output-consolidated.json (synthèse 4 groupes)
- RESULTS.md (rapport final 6 sections + verdict)
- Éventuels artefacts de debug : masques binaires intermédiaires en PNG, logs d'inspection morphologique.

CSVs vérité terrain : référence partagée, restent dans docs/fixtures-ground-truth/martin/ (gitignored).

---

## 7. Dépendances et lecture connexe

- Spike #3 RESULTS.md : `docs/spikes/2026-04-30-03-homographie-3-4-ancres/RESULTS.md` (verdict 94.44 %, profil des 10 erreurs résiduelles, matrice homographie 3×3).
- DETTE #41 (éligible clôture, conditionnée au verdict de ce spike) : DETTE-TECHNIQUE.md.
- DETTE #43 (plafond classification couleur, traitée potentiellement par mission b) : DETTE-TECHNIQUE.md.
- VISION §4 (pattern accumulateur + mesure parser sur planning intégral + mapping couleur → statut obligatoire).
- VISION §5 (stratégie discriminante par format, chemin 2 image raster).
- VISION §7 risque 4 (UX honnête, validation utilisateur obligatoire).
