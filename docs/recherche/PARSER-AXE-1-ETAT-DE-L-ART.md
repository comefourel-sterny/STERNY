# Recherche parser rhythm_calendar — Axe 1 : état de l'art académique et open source

Document de recherche vivant. Construit séance par séance dans le cadre du plan en 4 axes documenté dans `ETAT-COURANT.md` section 0 du 27 avril 2026, lui-même conséquence du report de décision sur le parser (DETTE #37 statut au 27 avril 2026).

**Objectif** : cartographier les techniques existantes pour extraction de tableaux structurés (PDF vectoriel et raster), classification de couleur de fond de cellule, OCR couplé à analyse de mise en page, et reconnaissance de structure de calendrier — afin d'éclairer la décision d'architecture du parser Sterny.

**Contraintes fermes** :
- Stack Edge Function Deno / TypeScript. Pas de Python (sauf discussion explicite et documentation de la barrière d'entrée).
- Aucune implémentation de code dans la session de recherche — pure cartographie.
- Aucune décision d'architecture tant que les 4 axes du plan ne sont pas suffisamment couverts.

**Méthodologie par famille** : shortlist des techniques candidates en 5-10 lignes → validation par Côme → recherche détaillée des techniques retenues → commit d'ajout de la famille au doc (`docs(recherche): add family X to PARSER-AXE-1`).

**Dernière mise à jour** : 28 avril 2026 — création du squelette du document.

---

## Table des matières prévisionnelle

1. **Famille 1 — Extraction structurée depuis PDF vectoriel** *(en cours)*. Couvre Mathis (PDF Hyperplanning, légende textuelle, 1 groupe) et Matthieu (PDF Master CCA, calendrier civil jour-par-jour, encodage hybride couleur+texte, 2 pages), soit 2 fixtures sur 3.
2. **Famille 2 — Classification visuelle de couleur de fond de cellule** *(à venir)*. Couvre Martin (JPG, image raster, 4 groupes, légende couleur seule) et le cas de fallback où les fonds de cellules de Matthieu ne seraient pas extractibles programmatiquement malgré le caractère vectoriel du texte.
3. **Famille 3 — OCR couplé à analyse de mise en page** *(à venir)*. Couvre principalement les images raster (Martin) où le texte doit être relu, et tout cas où l'extraction PDF directe ne donne pas le texte intra-cellule.
4. **Famille 4 — ML appliqué aux documents (LayoutLM, DETR, Donut, etc.)** *(à venir)*. Famille la plus ambitieuse, explorée en dernier pour identifier ce que les approches plus simples n'auraient pas couvert.
5. **Acteurs marché cloud, en transversal** *(à venir)*. Adobe Extract, Microsoft Azure Document Intelligence, Google Document AI, AWS Textract — examinés famille par famille pour voir comment chaque acteur traite chaque problème, et notamment s'ils restituent ou non la couleur de fond.

---

## Famille 1 — Extraction structurée depuis PDF vectoriel

*(À compléter après validation du shortlist et recherche détaillée des techniques retenues.)*

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

*(Vide pour l'instant.)*

---

*Document de recherche vivant. Mis à jour à chaque famille validée. Versionné par commits successifs pour permettre la relecture pas à pas.*
