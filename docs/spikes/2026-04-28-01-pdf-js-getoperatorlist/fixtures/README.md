# Fixtures spike #1 — pdf.js getOperatorList()

Les PDFs eux-mêmes ne sont **pas commités** (gitignored via `.gitignore` local) — ce sont des plannings d'alternants réels (données personnelles).

## Fichiers attendus dans ce dossier

- `Mathis.pdf` — Hyperplanning R_CA_A3, PDF vectoriel, 1 groupe (cf. ETAT-COURANT fixture #2)
- `Plannig_Matthieu.pdf` — Master CCA, PDF probablement vectoriel, 2 pages (Master 1 + Master 2), encodage hybride couleur+texte (cf. ETAT-COURANT fixture #3)

## Source repo

Sources canoniques dans `test-plannings/` à la racine du repo (lui-même gitignoré). Pour reconstituer ce dossier :

```bash
cp test-plannings/Planning_Mathis.pdf docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/fixtures/Mathis.pdf
cp "test-plannings/Plannig Matthieu.pdf" docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/fixtures/Plannig_Matthieu.pdf
```

## Fichiers de vérité terrain (1B)

Saisis à la main par Côme avec PDF sous les yeux. Non commités (données personnelles : rythme alternance d'humains identifiables). Format CSV 5 colonnes uniformes pour Mathis et Matthieu — voir RESULTS.md §3 sous-section "Vérité terrain Mathis — méthodologie".

- `mathis-ground-truth.csv` — 1 groupe (R_CA_A3 à confirmer), ~53 semaines. Saisi en 1B.1.
- `matthieu-ground-truth.csv` — 2 groupes (M1 CCA + M2 CCA). Déjà rédigé par Côme avant la session, à valider en 1B.6.
