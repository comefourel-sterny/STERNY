# Vérités terrain des fixtures parser — Planning Martin

Dossier partagé contenant les CSVs de vérité terrain pour le planning Martin (Planning_Martin.JPG, BUT 3 GEA, IUT Saint-Malo, année 2026/2027). Sert de référence à tous les spikes de mesure du parser sur image raster.

## Convention de nommage des fichiers

Un fichier CSV par groupe du planning :

- `martin-ground-truth-g1-cg2p.csv` — Formation Alternance CG2P, groupe 1
- `martin-ground-truth-g2-gc2f.csv` — Formation Alternance GC2F, groupe 2
- `martin-ground-truth-g3-gema-log.csv` — Formation Alternance GEMA Logistique, groupe 3
- `martin-ground-truth-g4-gema-md.csv` — Formation Alternance GEMA Marketing Digital, groupe 4

Les libellés exacts des groupes peuvent être ajustés à la saisie selon ce que la légende du PDF Martin affiche réellement.

## Format CSV

5 colonnes uniformes (cf. convention figée le 28 avril 2026 sur les vérités terrain Mathis et Matthieu) :

| Colonne | Type | Description |
|---|---|---|
| `groupe` | string | Libellé du groupe + année académique, identique sur toutes les lignes du fichier (ex. `FA_CG2P_G1_2026-2027`) |
| `week_start_iso` | date YYYY-MM-DD | Date ISO du lundi de la semaine |
| `statut_observe_martin` | enum | Couleur ou indicateur observé dans l'image Martin avant mapping métier (`school`, `company`, `vacances`, `ferie`, `autre`) |
| `statut_business` | enum | Statut métier final (`school`, `company`) |
| `notes` | string optional | Précisions saisie (cas litigieux, jours fériés, etc.) |

**Convention transverse — nommage de la colonne 3** : la colonne 3 porte un nom **spécifique à la fixture** au format `statut_observe_<fixture>`. Pour Martin c'est `statut_observe_martin`, pour Mathis c'est `statut_observe_pdf` (convention historique du spike #1, conservée), pour Matthieu c'est `statut_observe_pdf` aussi. Cette spécialisation permet, lors d'une future analyse cross-fixture, d'identifier clairement la source d'un statut observé.

La séparation entre `statut_observe_<fixture>` et `statut_business` permet de corriger la projection observation → statut métier sans re-saisir le CSV en cas de changement de règle de mapping.

## Méthode de saisie

1. PDF Martin sous les yeux ouvert dans Aperçu (Mac) ou équivalent.
2. Saisie manuelle attentive semaine par semaine, en suivant l'ordre chronologique.
3. Crosscheck en fin de saisie : le compte des lignes avec `statut_business = school` doit être cohérent avec la mention de la légende du planning (par exemple « 18 semaines de formation au centre »).

## Statut Git

Tous les CSVs de ce dossier sont **gitignored** par convention (cf. `.gitignore` racine), pour éviter de committer de la donnée potentiellement personnelle (nom d'établissement, nom de groupe, calendrier précis) dans un repo public ou semi-public.

Seul ce README.md est versionné — il documente la convention pour permettre à toute nouvelle session Claude.ai ou à tout futur contributeur de comprendre la structure sans la deviner.

## Pointeurs

- `VISION-ARCHITECTURE.md` §4 sous-section « Mesure d'une candidate parser — couverture intégrale du planning fixture » : principe acquis qui justifie la couverture multi-groupes.
- `ETAT-COURANT.md` bloc « Suite 30 avril après-midi bis » : plan complet du spike d'amélioration parser qui consomme ces vérités terrain.
- `docs/spikes/2026-04-30-03-homographie-3-4-ancres/` : spike #3 qui exploitera ces 4 CSVs.
- `docs/spikes/2026-04-30-04-magick-wasm/` : spike #4 qui exploitera également ces 4 CSVs.
