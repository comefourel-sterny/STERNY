# Idées en attente — Sterny

Liste vivante des idées et tâches non priorisées, à reconsidérer plus tard. Format : une ligne par idée, datée à l'ajout.

## Liste

- 2026-04-30 — Améliorer la signature email Gmail : ajouter une photo de profil professionnelle de Côme + un sigle Sterny carré (160x160 PNG, fond navy intégré, version remplie pas en trait fin pour rester lisible à 80px). Brief logo carré à inclure dans la prochaine itération de l'identité visuelle.
- 2026-04-30 — Créer un fichier docs/templates-mails.md regroupant les templates d'emails standardisés à utiliser : prise de contact incubateur, demande RDV expert-comptable, demande autorisation responsable alternance école, sollicitation alternant pour entretien recherche utilisateur, relance J+5 sans réponse.
- 2026-04-30 — Préparer un chiffrage prévisionnel de besoin de financement Sterny (12 mois de runway, ventilation salaire fondateur, marketing, juridique, hébergement infra) avant les RDV CAPEOS et SECOB.
- 2026-05-02 — Cas marginal `les_deux` qui propose 2 logements (1 dans sa ville d'école + 1 dans sa ville d'entreprise) sans rien chercher : cet utilisateur n'a pas de `villeRecherchee` et n'a pas besoin de saisir un `rhythm_calendar` côté logique de sélection inverse. À traiter post-démo dans le chantier unification inscription (Option A) ou dans une session dédiée. Ne pas creuser avant.
- 2026-05-02 — Auditer la sémantique exacte de `users.ville_recherche_secondaire` (existe en BDD, observée par grep le 2 mai soir, sans documentation explicite). À investiguer avant tout nouveau code qui touche cette colonne.

## Référentiels écoles / filières incomplets (inscription E-4)
Constat (conv 37, 7 juin 2026) : la liste des écoles (`ECOLES`, `data/inscription-options`) est très incomplète — l'autocomplétion ne propose qu'une poignée d'établissements (ex. taper « ENSA » ne renvoie que ENSAB, ENSAI). La filière est aujourd'hui un champ texte libre (placeholder « Ex : Informatique, GEA, Marketing »). À faire plus tard : enrichir le référentiel des écoles ; décider du référentiel filières (liste contrôlée vs texte libre) ; trancher autocomplétion stricte (sélection obligatoire) vs saisie libre tolérée, pour ne pas bloquer un alternant dont l'école n'est pas listée. Non bloquant pour la mécanique d'inscription ; impacte la qualité/complétude des données de profil.

## 2026-06-07 (conv 39) — observations à traiter
- **Refonte page profil** (Côme) : la page d'édition profil (/profil/modifier, ModifierProfilPage, « Étape 1 sur 6 ») est à refaire (design/structure). À préciser.
- **Bug /parametres** : ParametresPage ne rend que le footer, contenu principal absent. À investiguer (hors #83).
- **Bug /profil** : ProfilPage affiche alert « Utilisateur non spécifié » + chargement infini. À investiguer (hors #83).
- **CSS mort** : .modal-pwd-group (et règles modale associées) dupliqué dans DashboardLocatairePage.css (~l.2527) sans JSX correspondant. Candidat au nettoyage.

## 2026-06-09 (conv 44) — Hiérarchie visuelle du dashboard locataire
Observation (Côme) : /dashboard paraît "agressif / brouillon" — cartes de même poids visuel, orange répété (bandeau alerte, CTA, en-têtes), pas de hiérarchie qui guide l'œil, peu engageant à l'arrivée. Chantier dédié (pas une retouche) : définir un focal clair, hiérarchiser primaire/secondaire, calmer les accents orange, soigner les états vides. Distinct de la carte rythme (faite conv 44).

## Indicateur de couverture logement sur la carte rythme (rainure vert/rouge)
Idée Côme (conv 46), avec référence visuelle « planche à découper » : une rainure/cadre intérieur subtil sur chaque tuile de semaine, même esprit que la gorge d'une planche à découper, pour apporter du relief ET porter une couleur de statut.
Usage cible : vert = semaine couverte (logement trouvé), rouge = semaine découverte (pas encore). À harmoniser avec orange (école) / navy (entreprise) pour éviter l'effet criard, et NE PAS reposer uniquement sur vert/rouge (accessibilité daltonisme : ajouter icône/motif).
Dépendance bloquante : nécessite une donnée fiable « semaine couverte/découverte » issue du flux match→contrat (mises_en_relation/contrats), aujourd'hui indisponible (candidatures bloquées par DETTE #14 P0). Ne pas construire avant.
Périmètre à cadrer : n'afficher le statut que sur les semaines où l'alternant CHERCHE un logement (pas toutes), traitement visuel de la rainure, lisibilité.
