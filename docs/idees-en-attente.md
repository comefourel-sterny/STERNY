# Idées en attente — Sterny

Liste vivante des idées et tâches non priorisées, à reconsidérer plus tard. Format : une ligne par idée, datée à l'ajout.

## Liste

- 2026-04-30 — Améliorer la signature email Gmail : ajouter une photo de profil professionnelle de Côme + un sigle Sterny carré (160x160 PNG, fond navy intégré, version remplie pas en trait fin pour rester lisible à 80px). Brief logo carré à inclure dans la prochaine itération de l'identité visuelle.
- 2026-04-30 — Créer un fichier docs/templates-mails.md regroupant les templates d'emails standardisés à utiliser : prise de contact incubateur, demande RDV expert-comptable, demande autorisation responsable alternance école, sollicitation alternant pour entretien recherche utilisateur, relance J+5 sans réponse.
- 2026-04-30 — Préparer un chiffrage prévisionnel de besoin de financement Sterny (12 mois de runway, ventilation salaire fondateur, marketing, juridique, hébergement infra) avant les RDV CAPEOS et SECOB.
- 2026-05-02 — Cas marginal `les_deux` qui propose 2 logements (1 dans sa ville d'école + 1 dans sa ville d'entreprise) sans rien chercher : cet utilisateur n'a pas de `villeRecherchee` et n'a pas besoin de saisir un `rhythm_calendar` côté logique de sélection inverse. À traiter post-démo dans le chantier unification inscription (Option A) ou dans une session dédiée. Ne pas creuser avant.
- 2026-05-02 — Auditer la sémantique exacte de `users.ville_recherche_secondaire` (existe en BDD, observée par grep le 2 mai soir, sans documentation explicite). À investiguer avant tout nouveau code qui touche cette colonne.
- 2026-06-11 — Vue « candidatures refusées » côté hôte (page à déterminer) : revoir les candidatures refusées et, si regret, recontacter l'alternant. Gratuit côté données (M4 conserve la ligne en statut='refusee'). Surface UI + éventuelle action « recontacter » à cadrer.

## Référentiels écoles / filières incomplets (inscription E-4)
Constat (conv 37, 7 juin 2026) : la liste des écoles (`ECOLES`, `data/inscription-options`) est très incomplète — l'autocomplétion ne propose qu'une poignée d'établissements (ex. taper « ENSA » ne renvoie que ENSAB, ENSAI). La filière est aujourd'hui un champ texte libre (placeholder « Ex : Informatique, GEA, Marketing »). À faire plus tard : enrichir le référentiel des écoles ; décider du référentiel filières (liste contrôlée vs texte libre) ; trancher autocomplétion stricte (sélection obligatoire) vs saisie libre tolérée, pour ne pas bloquer un alternant dont l'école n'est pas listée. Non bloquant pour la mécanique d'inscription ; impacte la qualité/complétude des données de profil.

## 2026-06-07 (conv 39) — observations à traiter
- **Refonte page profil** (Côme) : la page d'édition profil (/profil/modifier, ModifierProfilPage, « Étape 1 sur 6 ») est à refaire (design/structure). À préciser.
- **Guard-rails /parametres & /profil → promus en DETTE #101 (18 juin 2026).** Constat consolidé : non-bug en prod (DashboardLayout redirige déjà ; blanc/spinner seulement en DEV via le bypass) ; vrai sujet = /profil conçue pour un profil tiers, /profil nu déclenche une alerte « Utilisateur non spécifié » (atteignable via l'entrée « Mon profil » du menu). Détail : DETTE #101.
- **CSS mort** : .modal-pwd-group (et règles modale associées) dupliqué dans DashboardLocatairePage.css (~l.2527) sans JSX correspondant. Candidat au nettoyage.

## 2026-06-09 (conv 44) — Hiérarchie visuelle du dashboard locataire
Observation (Côme) : /dashboard paraît "agressif / brouillon" — cartes de même poids visuel, orange répété (bandeau alerte, CTA, en-têtes), pas de hiérarchie qui guide l'œil, peu engageant à l'arrivée. Chantier dédié (pas une retouche) : définir un focal clair, hiérarchiser primaire/secondaire, calmer les accents orange, soigner les états vides. Distinct de la carte rythme (faite conv 44).

## Indicateur de couverture logement sur la carte rythme (rainure vert/rouge)
Idée Côme (conv 46), avec référence visuelle « planche à découper » : une rainure/cadre intérieur subtil sur chaque tuile de semaine, même esprit que la gorge d'une planche à découper, pour apporter du relief ET porter une couleur de statut.
Usage cible : vert = semaine couverte (logement trouvé), rouge = semaine découverte (pas encore). À harmoniser avec orange (école) / navy (entreprise) pour éviter l'effet criard, et NE PAS reposer uniquement sur vert/rouge (accessibilité daltonisme : ajouter icône/motif).
Dépendance bloquante : nécessite une donnée fiable « semaine couverte/découverte » issue du flux match→contrat (mises_en_relation/contrats), aujourd'hui indisponible (candidatures bloquées par DETTE #14 P0). Ne pas construire avant.
Périmètre à cadrer : n'afficher le statut que sur les semaines où l'alternant CHERCHE un logement (pas toutes), traitement visuel de la rainure, lisibilité.

### Carte annonce réutilisable (composant partagé)
Repérée conv 51 (audit messagerie #92). Les cartes annonce (image + titre + ville + prix) sont dupliquées en markup inline dans chaque page (homepage, RecherchePage, favoris/candidatures du dashboard), sans composant partagé. Créer une vraie carte réutilisable apporterait une double valeur : (1) afficher une carte annonce dans le chat (message d'acceptation enrichi, cf. #92), (2) dédupliquer toutes les cartes existantes. La colonne messages.annonce_id est déjà renseignée par le message d'acceptation → rattachement prêt côté donnée, il ne manque que l'affichage. Chantier UI dédié à planifier.

### Recherche à la semaine (clic sur une semaine unique)
Idée Côme (conv 53). Depuis le calendrier/dashboard, le locataire clique sur UNE seule semaine et cherche un logement pour celle-là uniquement, même si son rythme lui donne deux semaines libres d'affilée. Cas d'usage : il part en vacances la 2ᵉ semaine, ou veut la passer ailleurs.
Gratuit côté modèle : le multi-locataires (DETTE #93) stocke la demande comme une liste de semaines individuelles (`candidatures.semaines_demandees`, lundis ISO), jamais un bloc continu — chercher une semaine = une recherche avec une liste d'une semaine. Pas de changement de structure : c'est une feature d'INTERFACE.
À cadrer avec : refonte barre de recherche (DETTE #47) et matching partiel / score (DETTE #48). Périmètre UI : sélecteur de semaine(s) sur le calendrier, état « je cherche pour ces semaines-là », affichage des annonces dont les semaines à découvert croisent la sélection.

- Recherche — aligner le design des cartes de logement de /recherche sur celui de la homepage (cohérence vitrine). Parqué, post-design planche (conv 63).

- Planche hôte (miroir de la planche locataire) : « semaines à compléter » (semaines libres du logement à remplir) au lieu de « semaines à couvrir ». Même composant/mécanique, sémantique inversée — face offre de #93 (disponibilites_pattern moins le registre). Pour après l'Étape B.

### 2026-06-18 (conv 67) — Revoir la page Logement (/logement) : vestiges de l'ancien modèle « location continue »
Constat (Côme, captures) : la page détail annonce porte plusieurs restes du modèle continu (façon Airbnb classique), incohérents avec le modèle Sterny « à la semaine » :
- calendrier « Disponibilités » en JOUR PAR JOUR (vue mensuelle, légende Disponible/Occupé/Sélectionné, orange) → ancien calendrier, à passer en vue SEMAINES (lundis ISO) ;
- « Disponible du … jusqu'au … » = fenêtre continue, alors que la vraie dispo = semaines éparses (disponibilites_pattern) ;
- « Durée minimum 3 mois » = logique bail continu, à requestionner pour la location à la semaine.
Liens : recoupe DETTE #99 (couleurs calendrier, dont LogementPage .user-selected orange) mais va plus loin (problème de MODÈLE jour vs semaine). La refonte du calendrier dépend du modèle par semaines (couverture, registre semaines_reservees #93) → à faire dans la foulée du chantier recherche/#48, pas isolément.

### 2026-06-18 (conv 67) — Système de réputation (profils + avis + notes), façon Airbnb/BlaBlaCar
Idée Côme : enrichir les profils + ajouter avis et notes comme socle de confiance et levier de civilité/respect entre membres.
Rationnel : le modèle à la semaine implique une rotation élevée (passages courts ; un locataire enchaîne plusieurs logements ; un logement accueille plusieurs locataires sur l'année). Spécificité Sterny structurante : les utilisateurs sont des CO-OCCUPANTS SUCCESSIFS du même logement — ils ne se croisent jamais, mais l'état laissé par l'un conditionne l'expérience du suivant. Relation inédite (ni Airbnb ni BlaBlaCar) → modèle de réputation à concevoir, pas à copier.
Liens : page /profil existe (cf. #101, profil d'autrui via ?user_id) + AvisPage déjà dans le code (embryon, à auditer) ; s'imbrique dans candidature→contrat→fin de séjour ; lié multi-locataires #93 et matching #48 ; recoupe « Refonte page profil ».
⚠️ Drapeau (au moment de concevoir, pas avant) : avis/notes PUBLICS sur des personnes = zone réglementée (RGPD, diffamation, droit de réponse, modération). Certains alternants ont moins de 18 ans → réputation publique touchant des mineurs = sujet sensible. Passage par un professionnel requis le moment venu ; ne rien présumer.

### 2026-06-18 (conv 67) — Remettre au propre la landing d'attente sterny.co (page bricolée en urgence)
Contexte : la landing « Lancement prochainement » (sterny.co, fichier a-propos.html) a été faite en urgence (panne d'ordi) → à reprendre proprement. Trois volets :
1. EMAIL : le mail reçu après « Me prévenir » serait (À CONFIRMER) le template de l'ALERTE D'ANNONCE, incohérent. Créer un vrai email « inscription liste d'attente ». Lien : chantier emails Resend (#16).
2. LOGO/FAVICON : remettre le logo proprement + le favicon (absent dans les résultats Google).
3. TITRE : remplacer la balise titre « À propos de STERNY » par un titre adapté à une page d'attente (impact onglet + résultats Google). Lien SEO.
Note : mini-chantier borné qui touche la PROD VISIBLE (prospects) → sans doute le plus rentable des quatre. Connexe (plus large) : la marque « Sterny » est noyée dans des homonymes Google (remorque Sternytent, etc.) = sujet SEO/visibilité à part. ⚠️ Collecte d'emails = base légale RGPD (consentement + finalité) à cadrer le moment venu.

### 2026-06-18 (conv 67) — Version mobile : landing d'attente + plateforme (priorité « vitrine »)
Constat (Côme, capture mobile) : la landing sterny.co est cassée sur mobile (logo non responsive qui DÉBORDE de l'écran → effet amateur). Argument terrain fort : le premier réflexe des gens à qui Côme parle = sortir leur téléphone ; aujourd'hui il doit s'excuser de l'absence de version mobile.
Lien : recoupe DETTE #44 (UX mobile globale non aboutie).
Séquencement voulu par Côme : (a) d'abord stabiliser la plateforme en version PC ; (b) revoir la version mobile « sans trop tarder » ensuite ; (c) revoir la landing d'attente (PC + mobile) EN MÊME TEMPS que la plateforme PC, car c'est la vitrine montrée aux prospects → converge avec l'idée « landing d'attente » ci-dessus en un seul mini-chantier.
PRÉALABLE avant tout fix : localiser le fichier de la landing (a-propos.html) + son mode de déploiement (prod). Ne pas toucher à l'aveugle.
