# Fixtures spike #2 Martin

## Planning_Martin.JPG
Image raster JPG du planning IUT Saint-Malo BUT 3 GEA 2026-2027, 4 groupes (FA CG2P, FA GC2F, FA GEMA LOG, FA GEMA MD), 45 semaines chacun, légende couleur seule sans annotation textuelle dans les cellules. Copie locale du fichier source du repo.

## martin-ground-truth.csv (GITIGNORED — hors repo)
Vérité terrain saisie main par Côme le 29 avril 2026, en regardant directement le JPG. Mapping visuellement validé : jaune = school, vert = company. 5 colonnes : groupe, week_start_iso, statut_observe_martin, statut_business, notes. 45 lignes pour FA CG2P G1.

Périmètre du spike : un seul groupe (G1). Les 3 autres groupes seront saisis en étape 2 robustesse uniquement si plan A validé.

Le .gitignore local de ce dossier (convention héritée du commit 2cae874 spike #1) ignore *.pdf et *.csv pour éviter de commiter par accident des données potentiellement sensibles.
