# Idées en attente — Sterny

Liste vivante des idées et tâches non priorisées, à reconsidérer plus tard. Format : une ligne par idée, datée à l'ajout.

## Liste

- 2026-06-19 (conv 71) — CHANTIER table waitlist dédiée (DÉCISION actée). La table `alertes` mélange 2 choses distinctes : (1) inscriptions waitlist de la page d'attente (visiteur non connecté, email seul, prévenu au LANCEMENT) ; (2) alertes produit (user connecté, prévenu quand une ANNONCE correspond à ses critères ville/rythme). À séparer : créer table dédiée (waitlist), repointer PasswordGate (handleEmail écrit dans waitlist, plus dans alertes), migrer les lignes waitlist existantes d'alertes (ville/rythme NULL), poser RLS (insert public, lecture admin). Bénéfice : compteur + courbe d'inscrits propres (pitch investisseurs) + alertes produit non polluées. NOTIF à intégrer : 2e email Resend vers un secret NOTIFY_EMAIL dans send-landing-email, non bloquant. RGPD gated DPO (Q-DPO-008→013) : consentement/finalité/rétention à cadrer pro avant lancement ; anticiper dans le schéma (ex. colonne date de consentement). Session dédiée.
- 2026-06-19 (conv 71) — SEO landing : décision « indexer » ACTÉE (noindex retiré, en prod). Suites : (a) www vs non-www — sterny.co redirige 307 vers www alors que canonical = sterny.co → choisir le domaine principal (reco : sterny.co) puis aligner redirection Vercel + canonical ; (b) og-image.png (aperçu au partage) à vérifier/créer ; (c) Google Search Console (vérif domaine via DNS + demander l'indexation de la home) pour accélérer le re-crawl et remplacer le vieux cache « À propos ».
- 2026-06-19 (conv 71) — Incohérence orange de marque : le logo Sterny utilise #FF6B35 (vu dans Logo-Sterny-V1-white.svg), la charte dit #E8622A. À trancher un jour (aligner logo sur charte, ou l'inverse). Sans impact email actuel.
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

- Planche hôte (miroir de la planche locataire) : « semaines à compléter » (semaines libres du logement à remplir) au lieu de « semaines à couvrir ». Même composant/mécanique, sémantique inversée — face offre de #93 (disponibilites_pattern moins le registre). Pour après l'Étape B. **Précisée le 20/07/2026, voir bloc ci-dessous.**

## Planche hôte ("semaines à compléter") — précisée le 20/07/2026

Idée initiale déjà parquée, précisée aujourd'hui en préparant le
branchement de /mon-calendrier sur la ville active : quand la ville
active est une ville "hôte", la planche devrait afficher :
- le rythme personnel de l'hôte (école/entreprise), mais visuellement
  en retrait/flouté — ce n'est pas l'info principale de cette vue
- une couleur distincte pour les semaines de SON LOGEMENT PROPOSÉ qui
  restent à combler (pas de candidature acceptée dessus)

Nécessite une nouvelle source de données (candidatures/contrats reçus
côté hôte sur l'annonce), différente de deduireRecherche. Pas une
variante de couleur sur PlancheCouverturePage.jsx existante — plutôt
une vraie planche parallèle, à construire dans le volet hôte du
chantier "système de pages par ville".

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
MAJ 2026-06-18 (conv 68) — audit lecture seule : CIBLE RECALÉE. La vraie landing « Lancement prochainement / Me prévenir » n'est PAS a-propos.html (repo) mais PasswordGate.jsx (app React, enveloppe App.jsx:98-195). sterny.co sert l'app React (Vercel root = sterny-react/ ; rewrite SPA /(.*) → / → /a-propos.html et tout chemin servent l'index React + PasswordGate). Le site statique racine (48 .html dont a-propos.html) est MORT en prod. Recalage des 4 volets :
- TITRE : live = sterny-react/index.html:13 « STERNY — Trouve ton logement en alternance » (le « À propos de STERNY » était le titre du a-propos.html statique mort, hors-sol). Acceptable ; polish « page d'attente » optionnelle à poser via PasswordGate, jamais via le <title> statique (sinon titre faux une fois l'app lancée).
- FAVICON : fichiers présents et câblés (index.html:7-12, ?v=2). Absence Google = <meta robots noindex,nofollow> (index.html:6), PAS un fichier manquant → décision SEO (indexer ou non la page d'attente, lié au sujet « marque noyée dans les homonymes »), pas un fix de fichier.
- RESPONSIVE : viewport OK. Débordement mobile = logo PasswordGate.jsx:127 height:180px sans max-width ni @media. Fix isolé (lié #44).
- EMAIL : confirmé. PasswordGate handleEmail (jsx:45-70) insère dans alertes (ville:null, rythme:null) puis invoque send-alert-email (mauvais template « Ton alerte est activée »). send-landing-email (« Bienvenue… prévenu au lancement ») existe mais n'est jamais appelée + probablement non déployée (#17). Fix = déployer send-landing-email + remplacer l'appel jsx:59 + trancher « réutiliser table alertes vs table dédiée waitlist » (+ RGPD consentement/finalité au moment du fix).
Secrets : aucun en dur côté front/statique (config.js = clés publiques anon/pk_test_/Mapbox ; clés Resend via Deno.env.get). Ordre de fix recalé : responsive → titre → favicon(décision SEO) → email.
AVANCEMENT 2026-06-19 (conv 68) — Landing : FAIT (non poussé) — (1) responsive logo (commit 3509369) ; (2) refonte composition page d'attente : champ email long + bouton compact, badge transparent à liseré orange (fini le brun), accroche 2 parties « La plateforme pour tous les alternants » (#CBD5E1, 16/500) + « Propose ou trouve ton logement à la semaine. » (#94A3B8, 14) — tirée du doc Le Poool (bénéfice « à la semaine », inclusivité « tous » + « propose ou trouve » = les 2 rôles) ; rythme vertical revu, double-margin supprimé ; logo = seul vrai blanc. RESTE sur le chantier : P3 (Connexion sous barre Safari iOS : bottom:24px sans env(safe-area-inset-bottom) → fix bottom calc(24px+env(...)) + viewport-fit=cover global ; PRÊT) ; P2 (fine ligne blanche au bord = body #F4F5F7 + #root sans fond qui perce derrière le wrapper sombre ; mineur, parkable #44) ; TITRE (live « STERNY — Trouve ton logement en alternance », acceptable ; polish optionnel via PasswordGate) ; FAVICON/SEO (fichiers OK ; absence Google = <meta robots noindex,nofollow> index.html:6 → DÉCISION : indexer la page d'attente ou non, lié homonymes Google) ; EMAIL (PasswordGate invoque send-alert-email = mauvais template ; send-landing-email existe mais non branchée + prob. non déployée #16/#17 → déployer + remplacer l'appel + trancher table alertes vs table dédiée + RGPD ; session dédiée).

### 2026-06-18 (conv 67) — Version mobile : landing d'attente + plateforme (priorité « vitrine »)
Constat (Côme, capture mobile) : la landing sterny.co est cassée sur mobile (logo non responsive qui DÉBORDE de l'écran → effet amateur). Argument terrain fort : le premier réflexe des gens à qui Côme parle = sortir leur téléphone ; aujourd'hui il doit s'excuser de l'absence de version mobile.
Lien : recoupe DETTE #44 (UX mobile globale non aboutie).
Séquencement voulu par Côme : (a) d'abord stabiliser la plateforme en version PC ; (b) revoir la version mobile « sans trop tarder » ensuite ; (c) revoir la landing d'attente (PC + mobile) EN MÊME TEMPS que la plateforme PC, car c'est la vitrine montrée aux prospects → converge avec l'idée « landing d'attente » ci-dessus en un seul mini-chantier.
PRÉALABLE avant tout fix : localiser le fichier de la landing (a-propos.html) + son mode de déploiement (prod). Ne pas toucher à l'aveugle.

## AVANCEMENT 2026-06-19 (conv 69) — Landing LIVE en prod + bords iOS réglés

DÉPLOIEMENT (apprentissage clé, réutilisable) :
- La prod Vercel (sterny.co + sterny.vercel.app) déploie depuis `main`, PAS depuis feat.
- feat est ~215 commits devant main → merger feat publierait tout le chantier. NE PAS le faire.
- Déployer UNIQUEMENT la landing : worktree `../sterny-landing-prod` (branche fix/landing-prod
  depuis origin/main) + cherry-pick des commits landing depuis feat + `git push origin
  fix/landing-prod:main` (fast-forward propre).

LANDING (PasswordGate.jsx + index.html) — en prod, validée iPhone :
- Refonte composition : logo responsive 180px, badge contour orange, accroche 2 lignes
  (« La plateforme pour tous les alternants » / « Propose ou trouve ton logement à la semaine. »),
  champ long + bouton « Me prévenir » compact.
- Bords iOS réglés par 3 leviers : (1) theme-color #1E293B index.html ; (2) useEffect scopé
  dans PasswordGate (fond html+body navy SEULEMENT quand le gate public est affiché, restauré
  au déverrouillage) ; (3) viewport-fit=cover index.html (GLOBAL). Ce sont (2)+(3) qui ont
  supprimé les bandes blanches ; theme-color seul ne suffisait pas sur l'iOS de Côme.

ÉTAT GIT : origin/main = 49b7626 (PROD). feat poussée à 6a6df63 (mêmes fixes + chantier).

RESTE :
- P3 : lien « Connexion » (PasswordGate, bottom:24px sans env()). viewport-fit=cover désormais
  live → il peut être trop bas. Fix = bottom: calc(24px + env(safe-area-inset-bottom)).
- viewport-fit=cover est GLOBAL : surveiller que les dashboards équipe ne soient pas collés
  sous l'encoche ; si oui, padding safe-area sur leurs en-têtes.
- EMAIL : prod appelle toujours send-alert-email (mauvais template) au lieu de
  send-landing-email. Trancher table alertes vs dédiée + RGPD. Session dédiée.
- SEO : <meta robots noindex,nofollow> toujours en place → décision à prendre (indexer ou non).

## 2026-06-19 (conv 70) — Page « À propos » : revoir titre + description
Titre actuel « À propos de STERNY » → /a-propos.html. ⚠️ a-propos.html = .html statique probablement MORT en prod (SPA Vercel). Description « Découvrez l'histoire de STERNY, la plateforme née du constat qu'aucune solution de logement n'était adaptée aux étudiants en alternance. » = lourde, à reformuler. AVANT de retoucher : localiser où vit ce texte (fichier mort ? route React ? meta SEO/OG ?) + vérifier si la page est servie.

### 2026-06-22 (conv 82) — Référencer ou non la landing waitlist sur Google (décision stratégique, gated tête fraîche)
Constat (audit Search Console conv 82) : propriété « Domaine » sc-domain:sterny.co en place et saine ; 3 pages indexées / 4 « bloquées par robots.txt » + 2 « indexées malgré le blocage ». Cause unique = le robots.txt de prod : « # STERNY — En développement, pas d'indexation / User-agent: * / Disallow: / » (blocage total, VOLONTAIRE, posture pré-lancement). Aucune anomalie à réparer : l'état actuel est cohérent.
Rappel technique : Disallow: / empêche l'EXPLORATION, pas l'indexation d'une URL déjà connue par un lien externe (d'où les 2 « indexées malgré tout », sans gravité). Pour vraiment exclure une page, c'est la balise noindex dans le HTML — PAS le robots.txt ; et si robots.txt bloque l'exploration, Google ne peut pas lire le noindex (les deux se neutralisent).
DÉCISION À TRANCHER (tête fraîche) : veut-on que la landing sterny.co soit trouvable sur Google pour capter des inscrits waitlist via la recherche, OU rester invisible (cohérent « en développement ») ?
- Rester invisible → ne rien toucher, état correct.
- Référencer la landing → modifier le robots.txt (autoriser l'exploration de la landing, garder le reste bloqué) = modif de code EN PROD + décision d'acquisition. Implique un déploiement prod (worktree + cherry-pick + FF). À cadrer avec le reste des annexes SEO si on y va.
Note : sujet d'acquisition, non urgent, aucune échéance.

## Parcours guidé de couverture — reste à construire (parqué conv 82, 23 juin 2026)
L'écran Proposition (preview DEV /dev/parcours-proposition) est conçu et sa surbrillance est livrée (commit ff7a87d). Décisions produit A/B logées en VISION. Reste, pour une (ou plusieurs) session(s) fraîche(s) dédiée(s) :
- **Les 3 autres écrans du parcours** : hub d'entrée (CTA « m'aider à couvrir » depuis /mon-calendrier) → recalcul après chaque candidature → écran de fin. Aujourd'hui seul l'écran Proposition existe (mocké).
- **Câblage vers le réel** : remplacer le mock par les vraies données — réutiliser couvertureSemaines + deduireRecherche + fetch annonces (audit conv 82 : tout est réutilisable tel quel, semainesCouvertes déjà attaché à chaque logement, mono-ville). 
- **Flux candidater → /logement** : brancher le bouton sur le flux candidature existant (touche le légal pièces/garant §366 — prudence, gated par ce qui dépend de l'avocat).
- **Refonte de la carte logement de l'écran Proposition** : au runtime du 23 juin, la carte (photo navy vide + mise en page) est jugée « pas bonne » par Côme. Point DISTINCT de la surbrillance (qui, elle, est validée). À retravailler avec une vraie direction design (réf qualité = homepage / cartes /recherche), en session dédiée.
- **Moteur identifié (audit conv 82 suite)** : la liste triée « plus couvrant d'abord » existe déjà dans RecherchePage.jsx (public/), lignes ~426-440 : filtre dispo ∩ semaines cherchées → couvertureSemaines par annonce ({couvertes, totalCherchees, semainesCouvertes}) → tri par couvertes décroissant. Le parcours REPREND cette liste (resultats) et l'affiche un logement à la fois : Proposition = resultats[index], « Passer » = index+1, index hors liste = écran Fin. Le `semainesCouvertes` de chaque logement alimente directement la clé `proposee` de la surbrillance (déjà construite, ff7a87d). ATTENTION : RecherchePage.jsx fait 1748 lignes → lire par blocs ciblés, jamais en entier.

## Couche filtres / préférences du parcours guidé (idée Côme conv 82 suite, 23 juin 2026)
Le matching aux semaines est nécessaire mais pas suffisant : un logement « parfait sur les semaines » peut être inhabitable (loin de l'école, sans parking pour une voiture, quartier non souhaité). À poser PAR-DESSUS la colonne vertébrale, comme son propre chantier (rattaché aux DETTE #47 barre de recherche / #48 matching), APRÈS que le parcours de base fonctionne.
Distinction clé : filtre DUR (exclut des logements) vs préférence DOUCE (classe sans exclure).
- **Parking** (si l'utilisateur a une voiture) : filtre quasi-dur. Besoin d'un champ équipement « parking » côté annonce.
- **Proximité école/entreprise** : préférence DOUCE, jamais imposée (ex. quartier d'école moche → l'utilisateur peut préférer habiter loin). Option cochable + tri « plus proche d'abord » décochable.
- **Quartier souhaité** : préférence subjective, dur à modéliser, repoussé.
CONSTAT IMPORTANT (audit conv 82 suite) : /recherche PORTE DÉJÀ une partie de cette couche — états budgetMax / surfaceMin / typesLogement / equipementsFilter + équipements dynamiques (RecherchePage.jsx ~242-251) ET un système de proximité géographique complet (proximityInput / userLat / userLng / tri par distance, ~257-263, 667, 692). Donc cette couche ne part PAS de zéro : auditer et réutiliser l'existant de /recherche.
PRÉREQUIS DATA À AUDITER AVANT TOUTE CONCEPTION (ne rien présumer) : (a) stocke-t-on l'ADRESSE de l'école ou juste la VILLE ? « Rennes Nord vs Sud » exige une finesse infra-ville qu'on n'a peut-être pas. (b) les annonces ont-elles des COORDONNÉES par logement ou une ville en texte libre ? (c) existe-t-il un champ « parking » / équipements structuré côté annonce ?
PISTE CÔME pour la ville d'entreprise : champ entreprise OPTIONNEL à l'inscription (avec un « i » expliquant la finalité : proposer des logements proches). PRUDENCE : (1) RGPD — collecte d'une donnée personnelle, finalité + consentement + conservation à cadrer avec le DPO (cf. Q-DPO ouvertes), ne pas trancher seul ; (2) toucher l'inscription = règle 8ter (audit composants auth-wizard d'abord). Ne pas implémenter sans ces deux validations.

## Carte « avec qui tu partages » (profil hôte) sur la fiche /logement (idée née conv 83, 23 juin 2026)
Au moment de candidater sur /logement, afficher le profil de l'hôte avec qui le locataire alternerait : prénom, école, et une phrase de complémentarité (« vous ne vous croisez pas : l'hôte occupe le logement les semaines où tu es en entreprise »). Seule trouvaille à conserver de l'exploration du parcours guidé (conv 83). Statut : modification en attente sur /logement. RGPD : afficher la donnée personnelle d'un tiers avant tout contrat → champs exacts (prénom ? école ? photo ?) et base de consentement à valider avec un professionnel avant branchement réel (cohérent CONTEXTE §9). Mock de référence visuel : src/pages/dev/ParcoursPropositionPreview.jsx (bloc hôte intégré).

- [DETTE #114] Création d'annonce vidée au changement d'onglet/fenêtre — session dédiée après refonte annonce. Auditer la cause (reload / onAuthStateChange focus / état non persisté) avant de coder. Probable besoin de persister le brouillon du wizard.

### Hôte proposant plusieurs logements (2 villes ou plus)

Un hôte pourrait vouloir proposer plusieurs logements, y compris dans des
villes différentes — notamment pour garder le contrôle sur qui est accepté
dans chacun, et conserver un usage personnel de son propre logement pendant
que le second est loué. Distinct de la recherche multi-villes (chantier du
15/07/2026, réservé au côté locataire). Touche deduireOffre, CreerAnnoncePage,
et une question non auditée : le modèle actuel suppose-t-il 1 seule annonce
par hôte ? À auditer en session dédiée avant tout arbitrage.

### Bascule de mode façon Airbnb (hôte / voyageur)

Piste évoquée le 16/07/2026 : repenser le passage entre "chercher un logement"
et "proposer un logement" comme une vraie bascule de mode (à la façon du switch
hôte/voyageur d'Airbnb, où on garde son identité mais on change de contexte
d'usage), plutôt qu'un simple ajout de colonne/statut en arrière-plan. Intérêt
relevé : la cohérence d'expérience quand on est déjà cohôte ou hôte ailleurs.
Probablement plus pertinent pour l'application mobile que pour le web actuel.
Non cadré, à explorer en session dédiée — distinct du chantier recherche
multi-villes en cours, à ne pas mélanger.

**Homepage — pas de pré-remplissage par ville active (décision 22/07/2026)**
Contrairement à /recherche, la homepage reste non personnalisée par la ville
active du profil. Deux raisons : (1) son contenu ("Logements à Rennes", etc.)
est 100% mock (données de démo écrites en dur, aucune connexion Supabase,
commenté "Static test listings data" dans HomePage.jsx) — personnaliser un
affichage sans vraies données n'a pas de valeur ; (2) la personnalisation
utile se joue là où il y a de la vraie logique métier (recherche, calendrier,
favoris/candidatures), déjà couverte. À reconsidérer uniquement si/quand la
homepage est branchée sur de vraies annonces — nouvelle décision produit à
ce moment-là, pas un prolongement automatique.

**Design de ModifierProfilPage à revoir** — signalé par Côme le 23/07/2026.
Le rendu wizard 6 étapes actuel ne convient pas. Fusionné avec la décision
de restructuration en sections cliquables (voir ETAT-COURANT.md, entrée du
23/07/2026) — les deux sujets seront traités ensemble dans le futur chantier
dédié.

## Rappels / échéances

**Rappel — purge/anonymisation questionnaire étude de terrain (échéance ~juillet 2028).** Les réponses au formulaire "Trouver un logement en alternance" (Google Forms) sont conservées 24 mois maximum à compter de la collecte (voir ETAT-COURANT.md conv 111, QUESTIONS-PROFESSIONNELS.md Q-DPO-020). Actions à cette échéance : supprimer l'email de chaque réponse + purger les réponses individuelles côté Google Forms (pas seulement le Sheet lié), OU conserver uniquement des chiffres agrégés. Vérifier aussi qu'aucun champ texte libre ne permet de ré-identifier un répondant avant conservation prolongée.
