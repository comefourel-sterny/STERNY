# État courant du projet Sterny

Document vivant. Mis à jour **à chaque changement de conversation Claude.ai saturée** (règle : avant de fermer une conversation, demander à Claude de proposer une mise à jour de ce fichier, puis commit). Permet à toute nouvelle session de savoir immédiatement où on en est sans perte de contexte.

**Dernière mise à jour** : 2026-06-30 (conv 99) — Verrou #123 LEVÉ (modale de save masquee par collision CSS globale .modal-overlay vs #86, pas une boucle). Fix a3c1761 (.ma-confirm-overlay scopee) + 6c-① commite (b8f47dc). #120 confirme. Branche ahead de 2, non poussee.

---

Socle recherche — pièce 1 (déduction profil → filtrage) : livrée et validée runtime.
Pour un alternant connecté, /recherche déduit ses semaines de présence depuis son rythme (rhythm_calendar) et propose les annonces compatibles avec un score de match, sans aucune re-saisie de ville ni de rythme. Source des semaines du croisement : saisie manuelle si présente, sinon déduction du profil (util deduireRecherche → semainesUtilisateur dans RecherchePage). Calcul du score existant inchangé.

Reste du socle recherche :
- (2) couverture explicite « X de tes Y semaines » : LIVRÉE (cartes /recherche, voir bloc 2026-06-18 ci-dessous)
- (3) prise en compte des semaines déjà réservées (registre semaines_reservees)
- (4) affichage de cette couverture sur les cartes : LIVRÉE (idem)
- (5) nettoyage UI recherche : SOLDÉ — barre = Ville seule (5b-1) en look pilule clone homepage + hero aligné (5b-2), colonnes dépréciées retirées. Reste 5b-3 (composant <SearchBar> partagé) différé.

---

## Écosystème / Partenaires

Zone de RÉFÉRENCE (contacts, statuts, dates de relance), distincte du journal daté ci-dessous. Entrée la plus récente en premier.

**26/06/2026 — Suite RDV Le Poool.** Le Poool (Sophie Chatelin + Alexis Roussel) a conseillé deux axes : (1) se rapprocher de Pépite Bretagne ; (2) mener une étude terrain structurée pour qualifier le besoin. Actions faites : réponse envoyée à Sophie ; prise de contact envoyée à Pépite. Marion Lepinay (marion.lepinay@univ-rennes.fr) est en congé maternité jusqu'au 20/08/2026 ; relais pris avec Barbara Prudhomme (barbara.prudhomme@pepitebretagne.fr). Étude terrain à lancer très prochainement (questionnaire alternants + volet propriétaires/agences). Prochaine étape : obtenir un échange avec Pépite (Barbara, ou Marion à son retour).

---

## 2026-06-30 (conv 99) — Verrou #123 LEVÉ : modale de save = collision CSS globale (pas une boucle) ; 6c-① + fix #123 commités
CAUSE TROUVÉE APRÈS 2 JOURS : le gel "au save" n'etait ni agentation (#122, innocente conv 98) ni une boucle de re-rendu. La modale de confirmation utilisait la classe globale .modal-overlay, masquee par .modal-overlay{display:none} de ContratLocationPage.css (#86) → modale rendue mais invisible + scroll bloque (overflow:hidden). Methode : 4 audits LECTURE SEULE successifs (effets/deps, checkUserAndLoadAnnonce, chemin save, CSS) — aucun moteur de boucle interne au fichier → pivot vers la piste CSS.
PIÈGE CONV 98 ÉLUCIDÉ : le "gel au chargement" + "[6a] en rafale" + "fix #120 insuffisant" = artefact de bundle Vite perime (HMR ne reapplique pas un changement de deps useEffect). Bundle frais → chargement calme, [6a] x2 (StrictMode) puis stop. Fix #120 CONFIRME.
FIX #123 : renommage .modal-overlay → .ma-confirm-overlay (classe scopee unique, .jsx + .css), miroir du remede InvitationModal (.inv-overlay). Commit a3c1761. Valide runtime : modale affichee, save execute jusqu'a la garde identite.
COMMITS DE LA SESSION (branche feat, ahead de 2, NON poussés) : a3c1761 fix #123 (modale scopee, CSS entier + 1 ligne JSX extraite via git apply --cached, methode #120) ; b8f47dc refactor 6c-① (retrait moteur de cycle mort, ~398 lignes, colonnes depreciees type_alternance/rythme_pattern retirees du payload). ModifierAnnoncePage.jsx desormais CLEAN cote working tree.
ÉTAT 6c : 6c-① TERMINÉ et commité (rendu + chemin save valides runtime). RESTE : 6c-② (step 0 "Bail" : deplacer import+dates hors step 4, classes ca-bail-*, stepper 0→5, seuil planche ≥1 = DETTE #119) ; 6c-③ (retrait bypass DEV #117 + validation complete champs + push + MAJ docs).
RESTE OUVERT (hors 6c, a la main de Côme) : (1) push des 2 commits ; (2) npm uninstall agentation + commit package.json/lockfile (#122, code deja retire conv 98) ; (3) test d'ecriture REELLE du save = composer un compte de test identite_verifiee='verifiee' (la garde identite bloque l'ecriture finale, comportement NORMAL) ; (4) #124 PASSWORD_HASH (securite, hors chantier annonce).
PROCHAINE SESSION : soit 6c-② (suite refonte annonce), soit push + nettoyage #122. Verrou #123 n'existe plus.

## 2026-06-29 (conv 98) — Retrait agentation (DETTE #122) commité+poussé ; gel modale = boucle de re-rendu LOCALISÉE à ModifierAnnoncePage, non corrigée
PUSH DÉBUT DE SESSION : 3 commits conv 95/97 poussés (ea6c753), puis ce soir commit 4eb9ce2. Branche synchro origin (0/0). main intacte.
FAIT & COMMITÉ (4eb9ce2, chore) : retrait de l'outil de dev agentation = 2 imports + 2 montages <Agentation> (App.jsx l.3+196, PasswordGate.jsx l.2+198). Le montage PasswordGate était SANS garde import.meta.env.DEV alors que PasswordGate enveloppe toute l'app en prod → risque prod écarté. Build vert, console nettoyée du localhost:4747. Backups hors-git faits.
RESTE sur agentation : la DÉPENDANCE npm "agentation":"^3.0.2" est ENCORE dans package.json → `npm uninstall agentation` + commit package.json/lockfile = étape séparée non faite.
DIAGNOSTIC DU GEL (le vrai sujet, NON résolu) : agentation INNOCENTÉ — après son retrait, le symptôme PERSISTE (modale de save jamais peinte + page figée). Bug PRÉEXISTANT (≥4h, antérieur aux modifs du jour).
CAUSE LOCALISÉE PAR TEST RUNTIME (acquis solide) : la boucle est SPÉCIFIQUE à ModifierAnnoncePage. Test décisif : sur /recherche et la home, AUCUNE boucle (pages calmes). Donc PAS un composant global (PasswordGate/useAuth/routeur) — NE PAS re-creuser cette piste.
SIGNATURE : les logs ModifierAnnoncePage.jsx (l.414 hostProfile, l.296 nature) CONTINUENT d'apparaître même après navigation vers /recherche → le composant NE SE DÉMONTE PAS proprement, un useEffect boucle et n'est jamais nettoyé. Le "Navigated to" en rafale n'est PAS un window.location/reload (aucun dans le chemin de chargement, vérifié) : c'est un effet qui se relance sans fin et fait ré-émettre des rendus/navigations.
FIX #120 INSUFFISANT : la dep [user?.id] n'a pas éteint la boucle. Hypothèse forte = une dépendance OBJET/TABLEAU recréée à chaque rendu (motif #121 en local). SUSPECTS À LIRE EN PRIORITÉ : useEffect l.~297 (deps [hostProfile, natureLogement, semainesLibres]) et useEffect chargement l.~404 (deps [user?.id]). Vérifier comment hostProfile/natureLogement/semainesLibres sont produits (useState vs recalcul/useMemo).
PROCHAINE SESSION (reprendre ICI) : (1) lire EN ENTIER les 2 effets suspects + la production de leurs deps ; (2) identifier la dep instable ; (3) la stabiliser (useMemo / dépendance primitive) ; (4) valider runtime (console propre, modale s'affiche) ; (5) PUIS reprendre le test du save, puis 6c-②. Toucher un useEffect = à froid, pas fatigué.
COMPTE DE TEST utilisé ce soir : come.fourel@rennes.archi.fr (profil hote, Rennes), annonce id aaaaaaaa-... (seed). Boucle présente dès le chargement, avant tout clic.

## 2026-06-29 (conv 97) — DETTE #120 diagnostiquée (lecture seule + runtime) et RÉSOLUE côté page ; fix commité à part ; modale + useAuth + agentation ouverts en dette
VERROU #120 LEVÉ. Session dédiée diagnostic, méthode lecture seule puis mesures runtime, sans présumer.
CAUSE RACINE PROUVÉE : boucle de re-rendu / requêtes infinie. useEffect de chargement de ModifierAnnoncePage dépendait de l'OBJET `user` ; useAuth recrée `user` (= session.user, nouvelle réf) à chaque event auth ; autoRefreshToken → refresh token en boucle → 4000+ requêtes sans interaction, page gelée, save inopérant.
FIX : dep [user] → [user?.id] (l.~407, chaîne stable). Validé sûr par audit (user lu seulement via véracité + .id). Validé runtime : console [6a]=0 sur fenêtre propre, plus de rafale token, page fluide.
COMMIT : fix isolé du travail 6c-① (même fichier) via extraction de hunk (git apply --cached, add -p étant interactif/non supporté), message fix: dédié (8521ca9). 6c-① reste NON commité (non validé runtime de bout en bout).
PIÈGES de diagnostic notés (DETTE #120) : compteur Network cumulé (Preserve log) trompeur → mesurer le débit sur fenêtre vidée ; HMR Vite ne réapplique pas un changement de deps useEffect → redémarrer npm run dev.
RESTE OUVERT (3 sujets distincts, NON traités) :
- DETTE #121 racine useAuth (fragilité globale, tout useEffect([user])) → session dédiée, fichier central.
- DETTE #122 agentation : casse le rendu de la modale de confirmation du save en dev (erreur Failed to fetch dans un effet React → modale jamais peinte ; code modale CORRECT par ailleurs) + montée SANS garde DEV dans PasswordGate.jsx (risque prod) → PRIORITAIRE avant de reprendre le test du save.
- Test du vrai SAVE jamais mené jusqu'au bout : bloqué d'abord par #120, puis par #122 (modale invisible). + gate identité (compte de test non_verifiee) à composer pour tester une écriture réelle.
PROCHAINE SESSION : (1) #122 agentation (débloquer la modale + sécuriser PasswordGate) ; (2) tester le save ; (3) reprendre 6c-② (step 0 Bail). 6c-① toujours dans le working tree, non commité.

## 2026-06-29 (conv 96) — 6c-①b-2 : retrait en bloc du moteur de cycle mort TERMINÉ (build + rendu validés, NON commité)
ÉTAT CODE : ModifierAnnoncePage.jsx contient ①a + ①b-1 + ①b-2 dans le working tree (NON commité, conforme règle « pas de commit non validé runtime » + gel #120). Backups hors-git frais : ~/sterny-backups/ModifierAnnoncePage.jsx.bak-6c1b2-{G1,G2,G3}-<timestamp>. Branche feat/unification-inscription, e1706b4 en tête (clôture conv 95), ahead de 1 (non poussé). main intacte.
FAIT cette session — 6c-①b-2 en 3 groupes, build vert entre chaque :
- G1 : retrait des CORPS morts — 12 fonctions (processRhythmDates, finalizeBailDates, choisirDimanche, generateRhythmDatesFromAnchor, enterCycleSelectionMode, handleGenerateClick, getRhythmOptions, selectDate, getWeekCells, renderMonthGrid, shiftMonths, resetToCycleSelection) + useEffect de cycle (deps [calendarMode, cycleAnchorDate]) + bloc const endMonthIdx/endYr/calendarPeriodText. 3 fonctions VIVANTES intercalées préservées (clearAllDates, handleBailEndDateCalc, handleBailFromDates).
- G2 : retrait des 5 ÉCRITURES de réhydratation alimentant des states morts — bloc rhythmStart/EndDate (ancien if bail.date_debut && bail.date_fin) + bloc startMonthIndex/startYear + setCalendarMode('editing'). PRÉSERVÉS : setBailStartDate/EndDate/Duree, setSelectedDates, ouvertureDispoRef (Réinitialiser), setShowEditCalendar (affichage planche).
- G3 : retrait des 12 déclarations de states morts + 2 constantes orphelines (monthNames, dayNames, dont les seuls lecteurs renderMonthGrid/calendarPeriodText sont partis en G1).
→ ~398 lignes de code mort retirées au total. Moteur de cycle entièrement disparu.
PREUVE DE MORT : verrou G1 re-prouvé (grep -nw des 12 fonctions = vide → zéro référence fantôme). Vérif prioritaire rhythmStartDate/rhythmEndDate : aucun lecteur vivant hors cluster (seules occurrences hors cluster = déclarations + setters de réhydratation, jamais une lecture). Condition d'arrêt NON déclenchée.
VALIDÉ : npm run build vert à G1/G2/G3 + smoke-test navigateur (come.fourel@rennes.archi.fr, annonce id aaaa…, étape Disponibilités) : planche affichée (cal. 2025-2026, 6 semaines cochées), dates de bail intactes, Réinitialiser présent, sélecteur de rythme + modale Dimanche disparus. Aucune erreur console imputable à 6c-①b-2 (seuls bruits pré-existants : toolbar agentation localhost:4747 #120, modèle TensorFlow QUIC).
NON validé au SAVE : gel #120 (pré-existant, hors 6c) toujours là → commit du code annonce reste gelé.
ÉCART DE PÉRIMÈTRE ASSUMÉ : retrait de monthNames/dayNames non listé au plan conv 94 (qui ne citait que « ~13 fonctions + states »). Justifié : dernières miettes du même cluster mort, preuve de mort faite. Aucune autre extension.
RESTE 6c : ①b-2 fini → 6c-② (step 0 « Bail » : déplacer import + dates hors step 4, recopier 20 classes ca-bail-*, recâbler stepper 1..5→0..5, déplacer checks validateStep dates bail vers step 0, corriger seuil planche ≥1 = DETTE #119) ; puis 6c-③ (retrait bypass DEV #117 + validation complète des champs + commit feat + push + MAJ docs).
VERROU PERSISTANT : DETTE #120 (save gèle) = à diagnostiquer en session dédiée, lecture seule. Reste le verrou avant tout commit du code annonce.

## 2026-06-29 (conv 95) — 6c-① : ①a (coupe JSX) + ①b-1 (débranchement coutures) FAITS, build vert, NON commités ; bug de save #120 découvert (pré-existant, hors 6c)
ÉTAT CODE : ModifierAnnoncePage.jsx contient ①a + ①b-1 dans le working tree (NON commité, conforme règle « pas de commit non validé runtime »). Backups hors-git frais : ~/sterny-backups/ModifierAnnoncePage.jsx.bak-* (états ①a, ①b-1, AVANT-STASH). Branche feat/unification-inscription, e05ef2a en tête de remote.
FAIT cette session :
- 6c-①a (coupe JSX) : modale Dimanche + sélecteur de rythme abstrait retirés. Build vert, validé navigateur (planche + dates bail OK, sélecteur/modale disparus).
- 6c-①b-1 (débranchement des 3 coutures vivantes) : 5 str_replace ancrés — (A/B) retrait de la dernière ligne processRhythmDates des 2 handlers dates (calcul date↔durée conservé) ; (C) removeBailFile nettoyé (3 lignes cycle retirées) ; (D) 2 onChange nettoyés de dimancheChoixFaitRef ; (E) payload : colonnes dépréciées type_alternance/rythme_pattern retirées + fallback rhythmEndDate simplifié. Build vert. Le cluster mort est désormais TOTALEMENT ISOLÉ (zéro appelant vivant).
RESTE 6c-① : ①b-2 = retrait en bloc du cluster mort (≈13 fonctions + useEffect cycle l.~1156 + states cycle), suppression mécanique sans appelant vivant. PUIS 6c-② (step 0 Bail) et 6c-③ (retrait bypass #117).
BUG DÉCOUVERT #120 (sauvegarde gèle, étape Prix) : test causal git stash mené → le SAVE gèle AUSSI sur le committé conv 93 (sans nos coupes) → bug PRÉ-EXISTANT, ①b-1 INNOCENTÉ. Le gel survient notamment quand les dates de bail sont renseignées (annonce de test : dates incohérentes 2027→2035). Pistes : toolbar « agentation » App.jsx:196 (localhost:4747, ERR_CONNECTION_REFUSED en boucle) + rebond redirection /dashboard/proprietaire (déjà noté conv 93). NON bloquant pour finir 6c-① en local (bypass DEV #117 court-circuite validateStep). À diagnostiquer en session dédiée.
DÉCISION ACTÉE : 6c-① peut se terminer normalement (①b-2) malgré #120, car #120 est hors périmètre et non bloquant en local. La validation runtime du SAVE de bout en bout restera toutefois suspendue à la résolution de #120 avant tout commit du code annonce.

## 2026-06-27 (conv 94) — Audit exhaustif zone bail ModifierAnnoncePage terminé ; plan 6c re-cadré (AUCUNE coupe de code)
PALIER : feat/unification-inscription poussée en début de session (51f6faa..85b8a46, 6 commits, main intacte). Puis 6 LECTURES SEULES de la zone bail (states, extraction PDF, persistance, payload, validateStep) — zéro écriture, zéro commit de code.
CARTE ÉTABLIE (sans surprise restante) :
- Extraction PDF Modifier → dates bail (start/end/durée) + pricing (prix/caution/chargeMode). PAS de dpe/propertyInfo (≠ Creer). PDF jamais stocké (bailFileData write-only ; note Storage DETTE #118).
- Dates/durée = MULTI-SOURCES : extraction PDF (handleBailUpload l.1006) + réhydratation base (l.575) + saisie manuelle ; toutes persistées via bail_info. → ne PAS mettre bail_info à null (corrige une fausse piste de début de session).
- Moteur de cycle = mort, cluster fermé (handlers dates→processRhythmDates→finalizeBailDates/choisirDimanche↔modale Dimanche). rhythmStartDate/EndDate : 1 seule lecture vivante = fallback date_fin l.1532, qui part sans perte (bailEndDate reste la source).
- Payload écrit encore type_alternance/rythme_pattern (l.1554-1555, dépréciées, invariant 5) → à retirer en 6c.
- Import PDF NON obligatoire dans le code (aucune garde validateStep sur bailFileData ; UI « ou remplis manuellement »). Intention « import obligatoire » NON câblée (logée VISION conv 94).
- COUPLAGE EMPLACEMENT↔VALIDATION + BUG LATENT seuil ≥7 : voir DETTE #119.
3 SUJETS PRODUIT SORTIS, tracés et reportés APRÈS 6c (ne pas mélanger à une passe de propreté) : (1) obligation d'import + bail source de vérité du prix → VISION « Cap B » ; (2) validation utilisateur des données extraites (dates ET prix) → DETTE #118 ; (3) parité Creer/Modifier sur la persistance bail.
CAP RETENU 6c = CAP A (technique pur : ranger sans changer le modèle de confiance). PLAN 6c STABILISÉ (sans angle mort) :
- 6c-① : retirer le mort — modale Dimanche + sélecteur de rythme abstrait + moteur de cycle complet (≈13 fonctions + useEffect cycle l.1156 + states cycle) + colonnes dépréciées type_alternance/rythme_pattern du payload. GARDER : inputs dates bail, bail_info intact, zone import, planche.
- 6c-② : créer le step 0 « Bail » (design Creer, recopier les 20 classes ca-bail-* depuis CreerAnnoncePage.css, JSX inline → classes), Y DÉPLACER import + dates + leurs CHECKS validateStep, recâbler stepper 1..5 → 0..5, label « Bail », retirer commentaire mort « (locataires only) », corriger le seuil planche ≥1 (DETTE #119).
- 6c-③ : retirer le bypass DEV #117, re-tester la validation complète des champs, commit + push, MAJ docs.
AUCUN fichier de code modifié cette session. ModifierAnnoncePage.jsx (2385 l.) NON never-stage (committable). Sauvegardes hors-git de conv 93 toujours valides.

## 2026-06-26 (conv 93) — ModifierAnnoncePage : Lot 6 (a + a-bis + b) livré, commité, validé runtime
COMMITS DE LA SESSION (branche feat, NON poussés — feat ahead de 5) :
- a0047ca docs : DETTE #115 + Q-AVO-010 (retrait semaine réservée = conséquences logement/paiement/contrat, gated avocat).
- 9b71197 docs : DETTE #116 (modal d'avertissement quand l'hôte change son rythme → impact annonces) + complète #115/Q-AVO-010 (2 portes d'entrée).
- 3cba2c6 feat 6a : ModifierAnnoncePage charge le profil hôte (select élargi ville_*/statut_ville_*/rhythm_calendar) + dérive deduireOffre (offreHote/natureLogement/semainesLibres). Validé runtime (nature=entreprise, 6 semaines libres).
- a36f8f0 feat Lot 6 (a-bis + b + bypass #117) : (a-bis) retrait branche 'propriétaire' (charte conv 86 §705) → toute annonce = 5 étapes dont Disponibilités, userType='locataire'=hôte conservé ; (b) PlancheCouverture remplace la grille jour-par-jour. Pré-coché = disponibilites_pattern de l'annonce ; cliquable = union(semainesLibres, selectedDates) pour garder les semaines orphelines retirables ; Réinitialiser = retour à l'état d'ouverture ; CSS planche recopié. Bypass DEV #117 (import.meta.env.DEV, auto-désactivé prod, page reste commitable).
VALIDÉ RUNTIME (come.fourel@rennes.archi.fr, annonce id aaaa…) : 5 étapes affichées, planche centrée, 6 semaines proposées cochées, toggle OK, Réinitialiser OK, label « Locataire » (=hôte).
SAUVEGARDES fraîches (hors-git) : ~/sterny-backups/sterny-refonte-annonce-2026-06-26-avant-lot6.patch + sterny-working-tree-complet-2026-06-26.patch (couvrent les 5 never-stage).
RESTE — 6c (le plus délicat, à faire en session fraîche, miroir grappes 3/4 + step 0 de Creer) :
- 6c-1 : créer un STEP 0 « Bail » dans Modifier (miroir Creer) + Y DÉPLACER la zone import bail actuellement noyée dans le step 4. Recopier le bloc step 0 + classes ca-bail-* de Creer. ZONE BAIL À PRÉSERVER (consigne Côme) : lire EXHAUSTIVEMENT tout ce qui est attaché (states bail, extraction PDF, ce que ça alimente : pricing/dpe/propertyInfo lus) AVANT toute découpe.
- 6c-2 : vider le step 4 de tout sauf la planche — retirer dates de bail + durée + sélecteur de rythme abstrait (mort, viole invariants 5/6) + moteur de cycle (renderMonthGrid/selectDate/getWeekCells/shiftMonths/calendarPeriodText/generateRhythmDatesFromAnchor/processRhythmDates/finalizeBailDates/modale Dimanche + states cycle + 2 useEffect).
- 6c-3 : recâbler la numérotation du stepper 0→5 + label « Bail » (miroir Creer l.1571).
- PAYLOAD à nettoyer (vu audit) : ModifierAnnoncePage écrit encore type_alternance/rythme_pattern (colonnes dépréciées, l.~1517-1518) → à retirer avec le moteur de cycle.
- Commentaire mort « (locataires only) » au-dessus du step 4 → à retirer en 6c.
- À RETIRER en fin de Lot 6 : bypass DEV #117 (grep import.meta.env.DEV dans ModifierAnnoncePage.jsx).
NOTÉ pour plus tard (hors Lot 6) : les URL de redirection /dashboard/proprietaire (l.434/442/457/1430/1602) renvoient l'hôte vers un dashboard « proprietaire » — incohérent avec l'alternant-hôte, à revoir (non bloquant).

## 2026-06-25 (conv 92) — CreerAnnoncePage : bouton « Réinitialiser » livré + validé runtime (never-stage)
LIVRÉ et VALIDÉ RUNTIME (come.fourel, étape Disponibilités création annonce, 6 semaines libres) : bouton « Réinitialiser » sous la planche restaure le pré-cochage par défaut (semaines libres de l'hôte). clearAllDates (confirm + setSelectedDates([])) → reinitialiserDispo (setSelectedDates(semainesLibres), non destructif, sans confirm). Bouton RECRÉÉ (pas « transformé » : l'ancien « Tout effacer » avait disparu avec l'encadré récap retiré grappe 3bis) via la classe CSS .clear-dates-btn préexistante (zéro CSS ajouté). Build vert. NON commité, never-stage (rejoint le commit atomique Phase 0bis). Message de commit préparé, en attente.
AUDIT au passage (3 apparences de la planche annonce confirmées par lecture) : orange = semaine libre proposée (cliquable) ; atténué = semaine libre retirée (cliquable, re-cochable) ; gris = présence de l'hôte / hors-données (NON cliquable par design : cliquable = Boolean(d) && !passee). Le « je ne peux pas sélectionner de nouvelles cases » = comportement CONFORME charte (l'hôte ne propose que son absence). Aucun bug.
RESTE : passe (b) cosmétique LIVRÉE (voir bloc conv 92 suite ci-dessous) ; grappe « étape 0 Bail » (c) ; ModifierAnnoncePage (Lot 6).

## 2026-06-25 (conv 92 suite) — CreerAnnoncePage : passe cosmétique (b) section Disponibilités TERMINÉE (never-stage, build vert)
LIVRÉ et VALIDÉ RUNTIME (come.fourel, étape Disponibilités) — planche inchangée à l'œil après coupe CSS :
(b1) TEXTES : header « Disponibilités & Bail »→« Disponibilités » ; description→« Choisis les semaines où ton logement est libre » ; consigne planche→« Tes semaines libres sont pré-cochées. Clique sur une semaine pour la retirer ou la remettre. » (plus de mention rythme/bail, conforme charte).
(b2) CODE/CSS MORT : retrait const joursNoms (l.86, vestige grille jour-par-jour) ; retrait logs checkpoint [Lot1a]/[Lot3a] + commentaire orphelin « Checkpoint runtime 3a » ; retrait 6 classes CSS mortes (.calendar-months-grid/.calendar-month/.month-header/.weekdays/.weekday/.days-grid + duplicat @media). PRÉSERVÉS : 4 logs [DEBUG]/[DEBUG RENDER] (protégés Phase 0bis) + bypass DEV + .clear-dates-btn (vivante = bouton Réinitialiser) + .calendar-container.
⚠️ REPORTÉ (non fait, à ne pas oublier) : la cible « imports nommés morts » (Link/deduireOffre/Cropper/academicYearForMonday/etc.) N'A PAS été auditée ni retirée. Seuls les 5 hooks React ont été prouvés vivants. Imports morts = coût nul (tree-shaking au build), non bloquant. À traiter si on veut le fichier 100% propre, ou à absorber dans le commit atomique Phase 0bis.
Message de commit (b1+b2) préparé, en attente. NON commité, never-stage. ModifierAnnoncePage non touché (miroir Lot 6).
RESTE refonte annonce : grappe « étape 0 Bail » (c, décision produit sur l'import PDF) ; ModifierAnnoncePage (Lot 6) ; puis gros commit atomique Phase 0bis.

## 2026-06-25 (conv 91 suite) — CreerAnnoncePage : nettoyage moteur de cycle + bail vestige TERMINÉ (never-stage, build vert)
RETIRÉ (working tree, never-stage, build vert, validé runtime come.fourel) — grappes 3+5 (JSX bail/rythme du step 4 + réécriture bail_info : objet conservé comme marqueur ModifierAnnoncePage, dates→null §145), 3bis (encadré « plage continue » DÉBUT→FIN + ligne « Période » modale), 4 (moteur de cycle complet : generateRhythmDatesFromAnchor/processRhythmDates/finalizeBailDates/enterCycleSelectionMode/resetToCycleSelection/choisirDimanche/handleGenerateClick/handleBail* + 2 useEffect + 10 states cycle, ~178 l.). DETTE #5 (boucle re-render) RÉSOLUE — vérifiée console (filtre « Calendar debug » = 0).
PRÉSERVÉS : planche (useEffect auto-show l.616 intact), selectedDates, toggleSemaineDispo, nbSemaines, bail_info, garde userType==='locataire'(=hôte), clearAllDates (pour futur « Réinitialiser »), bypass DEV.
MAPPING WIZARD confirmé (lu l.1576) : currentStep 0=Bail · 1=Infos · 2=Détails · 3=Photos · 4=Disponibilités(planche) · 5=Prix. Décalage code/écran : « step 4 » code = « étape 5 » écran.
ZONE IMPORT ÉTAPE 0 BAIL = À PRÉSERVER (consigne Côme : sert au fonctionnement + vérification des annonces). Les 8 states write-only restants y sont rattachés → grappe « étape 0 Bail » dédiée (décision produit sur le sort de l'import PDF bail + prefill qui viole invariant 5).
RESTE : (1) « Réinitialiser » : LIVRÉ conv 92 (voir bloc ci-dessus) ; (2) passe finale (header « Disponibilités & Bail » périmé→« Disponibilités », imports morts, CSS orphelines .calendar-month*/.weekdays*, joursNoms, logs DEV) ; (3) grappe « étape 0 Bail » ; (4) ModifierAnnoncePage (Lot 6). Gros commit atomique de la refonte en Phase 0bis. Sauvegardes : ~/sterny-backups/sterny-refonte-annonce-{avant-grappe3,avant-grappe4,apres-grappe4}.patch.

## 2026-06-25 (conv 91) — CreerAnnoncePage : grappes 1-2 du nettoyage mort retirées (non commitées, never-stage)
RETIRÉ (working tree, build vert, never-stage — la refonte se commitera en bloc en Phase 0bis) :
- Grappe 1 : grille jour-par-jour morte = renderMonthGrid + getWeekCells + isSelected + selectDate (fonction entière : son seul appelant était le day-cell de renderMonthGrid ; la planche utilise toggleSemaineDispo, PAS selectDate → le « piège branche normale » de conv 88 était caduc) + CSS .day-cell* (6 règles). ~110 l JSX + 40 l CSS.
- Grappe 2 : habillage nav mort = shiftMonths + calendarPeriodText + calcul endMonthIdx/endYr. ~13 l. startMonthIndex/startYear CONSERVÉS (encore écrits par le useEffect du moteur de cycle → tombent en grappe 4).
DÉCOUVERTE D'AUDIT (à traiter grappes 3/4/5) : le step 4 affiche ENCORE l'ancien ET le nouveau système empilés — saisies de bail + SÉLECTEUR DE RYTHME ABSTRAIT (rhythmType/rhythmPattern « 4-2 » + « Générer mon calendrier ») VISIBLES en permanence (non gated), au-dessus de la planche. Le sélecteur de rythme sur une page secondaire VIOLE l'invariant 6 de la charte (le rythme ne se modifie pas hors inscription) + l'invariant 5 (cycles abstraits interdits) → retrait non négociable. bailInfo à RÉÉCRIRE (pas préserver) : date_debut/date_fin/duree_mois dépendent des saisies bail supprimées ; nb_semaines_presence/prix_total_sejour déjà alignés semaines. Modale Dimanche bien gated (showDimancheModal) → retirable proprement.
CSS sœurs désormais orphelines (laissées pour passe CSS finale, inoffensives) : .calendar-months-grid, .calendar-month(+::after), .month-header, .weekdays, .weekday, .days-grid.
RESTE : grappes 3 (JSX vestige step 4) → 4 (states + moteur de cycle + 2 useEffect dont boucle DETTE #5) → 5 (réécriture bailInfo), coordonnées ; puis passe CSS finale ; puis ModifierAnnoncePage (Lot 6).

## 2026-06-25 (conv 90) — CreerAnnoncePage : planche-semaines cliquable branchée + validée runtime
LIVRÉ et VALIDÉ AU RUNTIME (come.fourel@rennes.archi.fr, étape 4 création annonce) : la planche-semaines unique (PlancheCouverture) remplace la grille jour-par-jour (renderMonthGrid/day-cell). Mode clic optionnel ajouté au composant partagé (prop onSemaineClick, AJOUT PUR, design figé invariant 7) — COMMITÉ + POUSSÉ : 5eed513. Branchement côté page (etatsDispoAnnonce via useMemo, anneeDispoInitiale, handler toggleSemaineDispo, en-tête « TES SEMAINES À PROPOSER » + compteur + consigne, largeur bornée .planche-annonce 704px) : working tree, CreerAnnoncePage.jsx + .css = never-stage, NON commités.
ÉTAT VISUEL des semaines = clé `proposee` (rendu existant orange+« + » ↔ atténué) : proposee:true = proposée, false = gardée (« semaine supérieure » = l'hôte reste/occupe). couvert TOUJOURS false (vert = signé, réservé). Le clic n'ajuste QUE selectedDates (dispo de l'annonce), JAMAIS le rhythm_calendar (invariant 6).
VALIDATION : 5 cases orange pré-cochées (semaines school futures = libres car logement côté entreprise → nature opposée), compteur juste, toggle vérifié dans les 2 sens (case décochée = blanc/loupe, recochable). /mon-calendrier non régressé (ne passe pas onSemaineClick).
FAUSSE PISTE écartée : le « tout gris » initial venait du compte hote@sterny.test (rhythm_calendar vide) — PAS d'un bug. Lecture BDD : come.fourel a 6 semaines school futures = 6 libres ; hote@sterny.test = 0. Format rythme confirmé { week_start:"AAAA-MM-JJ", status:'school'|'company' }.
CORRECTION D'INCOHÉRENCE (repérée début conv 90) : la fin de 3b n'avait PAS été loguée conv 89 (l.5 et l.24 disaient encore « Reste 3b »). En réalité 3b était FAIT, working tree. État réel : Lots 1-2 + 3a + 3b + ex-3c planche, tous never-stage.
RESTE (tracé) : (1) nettoyage moteur de cycle MORT — renderMonthGrid, getWeekCells, isSelected, states cycle, branche cycle_selection de selectDate, + le BLOC BAIL VESTIGE (encadré « DÉBUT/FIN/N semaines » affichant une plage continue, contraire aux semaines-discontinues) ; (2) ModifierAnnoncePage (miroir, Lot 6) ; (3) lisibilité semaine décochée = DETTE #113-D ; (4) « semaine en moins » hors-rythme = DETTE #113-A parquée. Gros commit atomique de la refonte annonce prévu en phase de nettoyage finale.

## 2026-06-25 (conv 89) — Refonte CreerAnnoncePage : édition 3a appliquée + validée runtime (non commitée, never-stage)
Édition 3a = AJOUT de la lecture de la NATURE du logement depuis le profil hôte, conforme à la correction NATURE conv 88 (ne touche NI ville NI adresse NI GPS — la ville de l'annonce reste villeDetectee/CP/adresse). Voie A retenue : deduireOffre(hostProfile) (brique testée, commit e197475) renvoie [{ ville, nature, semaines }] par pôle hôte ; on lit .nature, JAMAIS .ville. 3 ajouts additifs dans CreerAnnoncePage.jsx : (1) useMemo ajouté à l'import React ; (2) import { deduireOffre } from '../../utils/deduireRecherche' ; (3) bloc [Lot3a] juste après le state hostProfile (≈ l.485-495) : offreHote = useMemo(hostProfile ? deduireOffre(hostProfile) : [], [hostProfile]) + natureLogement = offreHote.length===1 ? offreHote[0].nature : null (défensif : 0 ou >1 pôle → null ; cas les_deux 2 pôles différé conv 88) + console.log [Lot3a].
VALIDATION RUNTIME (compte hôte Rennes = ville_entreprise) : après chargement asynchrone du profil, offreHote = Array(1), natureLogement = 'entreprise'. Les 'null' avant chargement de hostProfile = état transitoire normal (le useMemo recalcule au chargement). Build vert (vite ✓ built). Ville/adresse intactes.
NON COMMITÉE : CreerAnnoncePage.jsx reste never-stage (bypass DEV présents). Le console.log [Lot3a] sera retiré au nettoyage atomique final. offreHote est conservé pour 3b (qui lira .semaines).
RESTE : 3b (selectedDates jours→lundis via deduireOffre + bascule des 5 consommateurs + grille toggle-à-la-semaine + retrait colonnes dépréciées du payload) puis 3c (retrait physique moteur de cycle + states + 2 useEffect + saisies bail/modale Dimanche ; la boucle re-render DETTE #5 disparaît alors). Aucun commit pendant 3b/3c.
NOTE bruit console (non lié à 3a) : erreurs port 4747 [Agentation] = externe à Sterny (ni 5173 ni Supabase 54321). Logs [Lot3a]/[DEBUG RENDER] répétés = boucle re-render DETTE #5, inoffensive, part en 3c.

## 2026-06-23 (conv 83 suite) — Fiche /logement : début d'alignement + découverte d'un trou de données
OBJECTIF initial : aligner /logement (fiche annonce) sur le nouvel écosystème couverture (la page affichait un calendrier jour-par-jour ignorant le rythme du visiteur ; sélection de semaines décorative qui n'alimente PAS la candidature ; bloc prix dates codé en dur). DÉCISION PRODUIT actée : la fiche affiche la couverture en LECTURE SEULE (planche colorée croisant le rythme du visiteur avec disponibilites_pattern), elle ne sert plus à sélectionner des semaines ; la sélection éventuelle relèvera du flux Postuler (§366, gelé légal). À promouvoir en VISION à la prochaine session.
FRONTIÈRE LÉGALE tenue : aucune touche à la modale Postuler / au flux candidature. selectedWeeks confirmé décoratif (n'alimente pas Postuler).
ÉTAPE 1a FAITE (code en place, build vert, NON commité) : ajout dans LogementPage.jsx du chargement du rhythm_calendar du visiteur connecté + dérivation deduireRecherche/couvertureSemaines + console.log [1a]. Aucun changement visuel.
RÉSULTAT DU TEST 1a : couverture renvoie "0 de tes 0" → remonté à un CONSTAT MAJEUR (DETTE #112) : aucun rythme en base, comptes seed absents. Le code est sain ; il n'y a juste rien à matcher. Étape 1b (affichage planche+badge) reportée tant qu'on n'a pas de données de test.
PROCHAINE SESSION (cap unique) : option (b) — vérifier si *@sterny.test existent dans Auth mais pas public.users (bug d'inscription ?). Selon résultat : corriger le bug, ou recréer des comptes de test via inscription normale. PUIS reprendre 1a→1b sur données réelles.

## 2026-06-23 (conv 83) — Parcours guidé abandonné, réabsorbé dans surfaces existantes
8 itérations de refonte de l'écran Proposition (/dev/parcours-proposition) ont montré que le parcours guidé ré-emballait la mécanique DÉJÀ livrée dans /recherche (tri plus-couvrant + couverture X/Y pièce 2/4) sans valeur ajoutée, et résistait à un rendu pro. DÉCISION (logée VISION §tête) : abandon du parcours comme surface séparée. Couverture progressive = /recherche (candidater → recalcul après SIGNATURE, dépend registre semaines_reservees #93 gelé). Réaffectations : « X semaines à couvrir » → /mon-calendrier ; planche → /mon-calendrier ; carte « avec qui tu partages » (hôte) → /logement (modif en attente, idees-en-attente). AUCUN code touché cette session : le fichier DEV src/pages/dev/ParcoursPropositionPreview.jsx reste tel quel (mock de boucle + layout « une carte une décision » 900px), conservé comme exploration archivée NON branchée. La surbrillance `proposee` livrée conv 82 (commit ff7a87d) reste valide et utile à /mon-calendrier indépendamment.

## 2026-06-24 (conv 88) — Refonte CreerAnnoncePage : audit Lot 3 complet + plan figé (aucun code touché)
AUDIT lecture seule en 3 passes de la zone calendrier/dispo (CreerAnnoncePage.jsx, sous-dossier annonce/). CONSTAT central : le step 4 « Disponibilités » repose sur un MOTEUR DE CYCLE ABSTRAIT (~250 l.) intriqué avec du cadrage de dates de bail — bien plus gros que le « brancher deduireOffre » anticipé conv 87. À retirer à terme : generateRhythmDatesFromAnchor, processRhythmDates + finalizeBailDates + modale Dimanche, enterCycleSelectionMode, les 2 useEffect déclencheurs (dont la boucle re-render DETTE #5), selectDate en mode cycle, + states cycle (rhythmType/rhythmPattern/cycleStartDate/cycleAnchorDate/calendarMode/showDimancheModal/dimancheData). selectedDates est aujourd'hui JOUR-PAR-JOUR (7 entrées/semaine) et a 5 CONSOMMATEURS (pas 4) : getSelectedWeeksCount (/7), validateStep (<7), récap période, payload, ET le rendu grille isSelected (selectedDates.includes(jour)).
DÉCISIONS FIGÉES :
- NATURE (pas ville) ← profil. La dérivation dispo a besoin de la NATURE du logement (côté école / côté entreprise), PAS de la ville exacte. Nature = pôle statut_ville_*='hote' (deduireOffre(hostProfile)). VILLE + adresse + GPS restent SAISIS LIBREMENT (villeDetectee/CP/api-adresse) : un logement peut être en commune voisine du pôle (Bruz, 20 min de Rennes-école) — pas Rennes, mais nature = école. On NE remplace PAS annonces.ville. 3a = AJOUTER la lecture de la nature, ne touche NI la ville NI l'adresse. Cas courant 1 pôle hote → non ambigu. les_deux 2 pôles (§91/§653) → différé. CONTRÔLE DE DISTANCE (profil Rennes mais bail Marseille = suspect) reconnu utile mais DIFFÉRÉ (décision conv 88, chantier séparé lié à recherche par rayon). Corrige le §652 trop littéral (logé VISION conv 88).
- Bail à la création = SUPPRIMÉ, cohérent VISION §145 (date d'effet du contrat choisie à la SIGNATURE). Saisies bailStartDate/End + modale Dimanche = décor de cycle, retirées. bail_info (nb_semaines_presence/prix_total_sejour) CONSERVÉ mais alimenté par selectedDates.length. Changement UX visible (modale Dimanche disparaît) validé côté produit.
- hostProfile (chargé Lot 1a) n'est encore consommé NULLE PART → c'est 3b qui le branche.
PLAN (3 éditions runtime-vertes, sauvegarde hors-git d'abord, AUCUN commit — never-stage, différé Phase 0bis) : 3a ancrage ville (annonces.ville ← deduireOffre, CP/adresse=GPS only) · 3b selectedDates=lundis via deduireOffre + bascule des 5 consommateurs + grille toggle-à-la-semaine + retrait colonnes dépréciées du payload (la boucle DETTE #5 devient inerte : rhythmPattern n'est plus posé) · 3c retrait physique du moteur de cycle + states + 2 useEffect + saisies bail/modale Dimanche (DETTE #5 disparaît). Nommage : selectedDates garde son nom (contient des lundis), dette commentée, rename différé DETTE #6.
PRIX inchangé (annonces.prix ne lit pas selectedDates). Bypass DEV (skipStripeIdentity/[DEBUG]/[DEBUG RENDER]) NON touchés, page never-stage. Commit Lots 1-2 séparément = ÉCARTÉ (bypass DEV embarqués → never-stage tient ; travail protégé par copie hors-git). Refonte entière commitée en bloc propre en Phase 0bis.

## 2026-06-24 (conv 87) — Refonte CreerAnnoncePage : données de test + Lots 1-2 (working tree, non commité)
DONNÉE DE TEST (local 54322) : créé une annonce témoin au format VISION (id aaaaaaaa-…, auteur come.fourel hôte, ville Rennes, disponibilites_pattern = lundis school dérivés, zéro colonne dépréciée). Rythme hôte ajusté (2 semaines 2026-08-17/08-24 passées school) pour un recoupement non nul avec le locataire comefourel@gmail.com, PASSÉ PAR LA VRAIE DÉRIVATION (pas un mock). Validé runtime sur /logement?id=aaaa… : « couvre 2 de tes 28 », liste 17-23 + 24-30 août. → l'écosystème couverture conv 85 validé de bout en bout sur donnée conforme.
DÉCOUPAGE refonte en 6 lots (acté) : 0 donnée test [FAIT] · 1 charger+persister profil hôte [FAIT] · 2 retrait taxonomie proprio [FAIT] · 3 dérivation dispo step 4 + bascule selectedDates jours→lundis + 4 consommateurs + retrait cycle abstrait/colonnes dépréciées [À FAIRE, cœur] · 4 réparer consommateurs selectedDates · 5 nettoyer payload · 6 miroir sur ModifierAnnoncePage.
FAIT cette session (working tree, NON commité, CreerAnnoncePage never-stage) :
- Lot 1a : state hostProfile + select profil élargi (ville_*, statut_ville_*, rhythm_calendar) + persistance. Validé runtime (log [Lot1a]).
- Lot 2a : checkUserType route l'alternant-hôte (hote/les_deux/locataire) direct au wizard, userType forcé 'locataire' ; cas non reconnu → écran de choix (puis supprimé 2b).
- Lot 2b : retrait du code mort écran de choix (états showUserTypeScreen/selectedUserType, handler handleConfirmUserType, bloc JSX) ; cas non reconnu → navigate('/dashboard').
- Lot 2c : parcours unique 0→1→2→3→4→5, retrait de tous les sauts/branches proprio (nextStep/prevStep/visibleSteps/stepNumber5Text + 2 classes hidden-for-user-type). grep proprio actif = 0.
Tout validé runtime (build vert à chaque lot, navigation 1↔6 sans saut). DETTE #5 (boucle re-render) confirmée empiriquement (log ×6) — à neutraliser au Lot 3.
DÉCISION NOMMAGE (à respecter) : userType garde la valeur 'locataire' (= l'hôte alternant dans cette page) ; le renommage 'locataire'→'hote' est différé à la refonte globale (DETTE #6). Dette de nommage assumée + commentée dans le code.
CAP PROCHAINE SESSION : Lot 3 (le cœur). D'abord décider commit Lots 1+2 (check-list secrets, vérifier qu'aucun bypass DEV n'est embarqué). Puis brancher deduireOffre(hostProfile) au step 4.

## 2026-06-24 (conv 86) — Brique pure de dérivation dispo livrée
Livré + testé + poussé (origin/feat, commits cef1415 + e197475 + 55c7e41) : semainesLibresLogement(rhythmCalendarHote, natureVilleLogement) et deduireOffre(user) dans sterny-react/src/utils/deduireRecherche.js. Miroir de deduireRecherche côté offre. Règle (VISION §651) : logement libre = semaines de présence de l'hôte dans la nature OPPOSÉE à la ville du logement. Réutilise semainesDePresence. Testé runtime sur come.fourel@rennes.archi.fr → 4 lundis school. Audit lecture seule des 2 pages annonce (Creer + Modifier) : même logique défectueuse confirmée (cf DETTE #113). Décisions de modèle actées en VISION (bloc conv 86).

## 2026-06-24 (conv 85) — Couverture /logement livree : badge + liste compacte (planche ecartee de la fiche)
LIVRE et commite (a6f4707 puis ee355e9, branche feat, non pousse au moment de l'ecriture) : la fiche /logement affiche, pour un visiteur connecte avec rythme, la couverture de l'annonce contre ses semaines cherchees. Deux briques : (1a+1b-i, a6f4707) chargement du rhythm_calendar visiteur + derivation deduireRecherche/couvertureSemaines + badge texte « couvre X de tes Y semaines » dans une carte de l'aside ; (1b-iii+iv, ee355e9) la couverture detaillee s'affiche en LISTE COMPACTE des semaines comblees (puces orange, formatWeekRangeFR avec annee, max 6 puis « … et N autres »), PAS en planche annuelle. Lecture seule, hors flux candidature, calendrier jour-par-jour intact.
PLANCHE ECARTEE DE LA FICHE : la tentative 1b-ii (composant PlancheCouverture pleine largeur dans l'aside etroit ~340px) etait illisible (12 colonnes de mois compressees, titres se chevauchant) et atterrissait sur la mauvaise annee. Code 1b-ii entierement retire (orphelins nettoyes en 1b-iv). PlancheCouverture reste en usage sur /mon-calendrier (pleine largeur), inchangee. Decision de fond logee en VISION (couverture /logement = liste compacte, pas planche annuelle).
RESERVE TECHNIQUE tracee : sur /logement, le badge compte sur l'UNION multi-villes (deduireRecherche.flatMap) tandis que la planche abandonnee etait mono-ville [0]. La liste compacte lit couvertureVisiteur.semainesCouvertes (union), donc coherente avec le badge. A reexaminer si un jour un visiteur les_deux cherchant 2 villes consulte une fiche — le badge lui-meme meriterait alors d'etre repense.
formatters.js : formatWeekRangeFR gagne une option withYear (defaut false, non cassante ; unique appelant existant RythmeCarousel inchange) pour lever l'ambiguite des semaines a cheval sur deux annees civiles.
RECTIF EMAILS DE TEST (importante) : les emails hote-test-01@sterny.test / locataire@sterny.test cites en conv 84 n'ont JAMAIS ete utilises. Comptes de test reels en LOCAL (stack 54322) : locataire = comefourel@gmail.com (rythme 61 sem., Rennes ville_ecole/recherche, 28 semaines school futures) ; hote miroir = come.fourel@rennes.archi.fr (rythme 9 sem., Rennes ville_entreprise/hote, SANS annonce). Annonce de test exploitee : « Studio test Rennes » (proprietaire seed hote@sterny.test, 0 rythme), disponibilites_pattern = ["2026-09-07","2026-09-21","2026-10-05","2026-10-19"]. Recoupement reel avec les semaines school du locataire = 1 (2026-09-07), non accidentel — d'ou le test « couvre 1 de tes 28 semaines ».
DONNEES DE TEST : aucune annonce de seed nouvelle n'a ete creee finalement — l'annonce existante « Studio test Rennes » suffisait (recoupement 1). Un seed a recoupement plus large reste possible plus tard pour une demo visuelle riche, non fait.
SUITE : DETTE #113 (refonte CreerAnnoncePage : disponibilites_pattern conforme VISION = lundis ISO derives du rhythm_calendar hote x ville) reste le gros morceau pour que de VRAIES annonces alimentent cette couverture. Retrait du calendrier jour-par-jour de /logement = decision separee, non faite.

## 2026-06-24 (conv 84 suite) — Audit CreerAnnoncePage : page pré-calendrier, inexploitable pour /logement (DETTE #113) + ordre de bataille
AUDIT lecture seule de CreerAnnoncePage.jsx (2699 lignes) déclenché par une objection de Côme : la page a été écrite AVANT le système calendrier connecté, donc « elle sait produire une annonce exploitable » était une hypothèse non vérifiée. VERDICT : NON, elle ne produit PAS un disponibilites_pattern conforme VISION. Preuves : (1) source = saisie manuelle (dates de bail) + cycle abstrait "X-Y" piloté par les colonnes DÉPRÉCIÉES type_alternance/rythme_alternance (l.617-618) ; rhythm_calendar JAMAIS lu (0 occurrence). (2) format = tableau de TOUS les jours ISO (~7/semaine, l.1217-1220 et 1265-1271), pas des lundis. (3) colonnes dépréciées type_alternance + rythme_pattern écrites en base (l.1699-1700). (4) ville du logement jamais croisée avec rythme. Piège noté : le lundi étant inclus dans les 7 jours, couvertureSemaines pourrait renvoyer un compte non-nul PAR ACCIDENT → « marcherait » à l'écran tout en étant faux. → tracé DETTE #113.
CONSÉQUENCE PLAN : l'option « générer une annonce de test via la page actuelle » est ABANDONNÉE (la page ne produit pas la donnée dont /logement a besoin). Pour obtenir une annonce de test exploitable, 2 chemins : (A) SEED MAÎTRISÉ — insérer une annonce avec disponibilites_pattern = tableau de lundis dérivé du rythme de l'hôte miroir, APRÈS lecture de couvertureSemaines/deduireRecherche pour produire le format EXACT (ne rien présumer) ; (B) réparer le calcul de dispo dans CreerAnnoncePage (source rythme_calendar + format lundis) — mais c'est un bout de la refonte annonce, gros morceau. Reco : (A) pour débloquer /logement proprement et vite ; (B) relève de la refonte annonce, plus tard.
ORDRE DE BATAILLE CONFIRMÉ : finir /logement 1a→1b AVANT de refondre CreerAnnoncePage. Raison : /logement 1a→1b est presque fini (code 1a dort dans le working tree depuis conv 83) ; CreerAnnoncePage est le plus gros morceau de la zone.
CAP PROCHAINE SESSION : (1) lire couvertureSemaines (utils/matching.js) + deduireRecherche pour connaître le format exact attendu ; (2) fabriquer 1 annonce de test à Rennes (seed maîtrisé, chemin A) cohérente avec le rythme MIROIR de l'hôte hote-test-01 créé en conv 84 ; (3) reprendre /logement 1a→1b sur cette annonce ; (4) committer l'étape 1a (LogementPage.jsx).
RAPPEL DONNÉES DE TEST (local) : locataire comefourel@gmail.com (rythme 61 sem., 1ʳᵉ sem. 2026-06-29 school) + hôte hote-test-01@sterny.test (rythme miroir, logement Rennes, MAIS sans annonce — l'inscription hôte ne crée pas l'annonce). Stack locale 54322.

## 2026-06-24 (conv 84) — DETTE #112 LEVÉE : l'inscription écrit bien le rythme (vérification, pas une dette de code)
Recadrage du constat conv 83 : le « 9 locataires / 0 rythme » en prod n'était PAS un bug. Ces 9 comptes sont des comptes d'amis créés AVANT la refonte du parcours calendrier (rythme vide = historique mort). La vraie question = « le parcours d'inscription ACTUEL sait-il écrire un rythme ». Ce parcours unifié (E-1→E-7) vit uniquement sur feat/unification-inscription, donc en LOCAL, pas déployé en prod — d'où l'absence de rythmes prod.
TEST DE BOUT EN BOUT (local) : `npm run dev` (stack locale 127.0.0.1:54321 via .env.local), création d'UN compte locataire neuf avec saisie réelle du rythme en E-5. PREUVE (SELECT lecture seule, psql 127.0.0.1:54322) : `jsonb_array_length(rhythm_calendar)` = 61, première semaine `{"status":"school","week_start":"2026-06-29"}` (format VISION {week_start, status}, lundi ISO) ; dashboard « TON RYTHME » peuplé.
CONCLUSIONS : (1) chemin E-5 → RPC complete_inscription_alternant → colonne rhythm_calendar SAIN ; l'inscription écrit bien le rythme. (2) Hypothèse « compte Auth sans profil public.users » (option b de #112) ÉCARTÉE : le compte neuf a une ligne public.users complète en un seul passage. (3) Le « 0 de tes 0 » de l'étape 1a (conv 83) n'était ni un bug de code ni un bug d'inscription — juste une base sans données fraîches. → DETTE #112 LEVÉE (cf DETTE-TECHNIQUE).
ACTION RÉELLE : une seule création de compte de test via le parcours normal. AUCUN fix, AUCUN UPDATE/INSERT SQL, AUCUNE modif de repo (vérification pure). Précision : compte créé avec l'email réel comefourel@gmail.com au lieu du rythme-test-01@sterny.test prévu — sans incidence (local, Mailpit, rien ne part).
SUITE EN CONV 84 SUITE : hôte hote-test-01@sterny.test créé (rythme miroir, Rennes) ; audit CreerAnnoncePage ; reste reprise 1a→1b + commit étape 1a — voir bloc conv 84 suite.

## 2026-06-24 (conv 83) — RDV individuel Le Poool : étude de terrain priorité débloquante, étude élargie à l'offre, incubation Emergys reportée
RDV individuel Le Poool (Alexis Roussel), positif, aucune réserve de fond. Confirme la lecture d'Initiative Rennes (Pauline, 30 avril) : pas un "non" sur l'incubation Emergys, mais Sterny pas assez mûr (terrain + financier) pour être incubé maintenant — Emergys vise des projets plus avancés, prêts à se lancer. Consigne Le Poool : continuer à avancer (étude de terrain, site, problème propriétaire), revenir quand mûr. Le 1er octobre (fenêtre Emergys) n'est donc PAS une deadline ferme mais une cible conditionnée à la maturité.
DÉCISION STRUCTURANTE — l'étude de terrain devient à DEUX FACES : (1) DEMANDE = alternants, instrument existant (Tally Gx5lbo), à finir ; (2) OFFRE = propriétaires + agences immobilières, instrument à CRÉER (entretiens directs / questions ciblées, format à définir, probablement plus léger qu'un Tally). Objectif offre : valider l'intérêt proprios/agences et le "problème propriétaire". Même prudence données perso que pour la demande (déjà tracé Q-DPO).
À INTÉGRER au Tally demande : la question "si l'alternant avait eu une autre opportunité, l'aurait-il choisie ? la distance le bloque-t-elle ?" — teste si le problème logement/distance est assez fort pour modifier un comportement (validation du besoin).
PISTE à creuser : France Pépites (mentionné par Le Poool, lié à l'adaptation du rythme école selon l'entreprise). Côme attend un mail Le Poool avec les contacts. Nature exacte à clarifier.
RESTE inchangé côté code : #108 + compteur waitlist non déployés prod ; #111 ; Q-DPO-008→015 / Q-AVO-006→009 ; audit logique conditionnelle Tally (Hide blocks + 2 conditionnels imbriqués). (Parcours guidé = abandonné conv 83, cf bloc 23/06, plus un reste.)

## 2026-06-22 (conv 82) — Parcours guidé de couverture : conception reprise puis re-mise en pause (écran Proposition) + preview DEV
Reprise du chantier calendrier <-> dashboard à l'endroit exact d'arrêt (Étape B planche terminée le 18 juin ; rien bougé depuis, conv 71-81 sur d'autres sujets). Chantier = parcours guidé d'aide à la couverture (conv 61, tranche #48). Aucun code de prod touché.
SQUELETTE acté : entrée depuis la planche /mon-calendrier (CTA « m'aider à couvrir »), parcours séquentiel 4 écrans (hub -> proposition -> recalcul -> fin), UN logement à la fois (le plus couvrant des trous restants).
2 DÉCISIONS PRODUIT actées (à remonter en VISION §605 en session fraîche) :
- (A) « Candidater » dans le parcours RENVOIE vers /logement (réutilise le flux candidature existant : pop-up planning Q9 + niveau légal pièces/garant §366) au lieu de le doublonner ; retour -> recalcul. v2 : candidater-en-1-clic rapatriable si le flux se simplifie.
- (B) le parcours PROPOSE le plus couvrant des semaines « blanches » (ni signées ni candidatées) pour ne pas tourner en rond ; mais le RESTANT AFFICHÉ garde les « en attente » (un refus rouvre la semaine, modèle 3 états conv 65). Les « en attente » sont dérivables des candidatures existantes (candidature -> annonce -> disponibilites_pattern inter cherchées), SANS attendre candidatures.semaines_demandees (#93).
AUDIT lecture seule (RecherchePage connecté) : couvertureSemaines / deduireRecherche / semainesCouvertes / tri « plus couvrant » réutilisables tels quels ; semainesCouvertes (lundis couverts) déjà attaché à chaque logement -> mini-planche sans recalcul ; carte = Link /logement (pas de bouton candidater sur la carte) ; mono-ville. DETTE #14 (candidatures) confirmée RÉSOLUE -> flux candidater exploitable.
PREVIEW DEV posée (commit feat) : src/pages/dev/ParcoursPropositionPreview.jsx + route DEV /dev/parcours-proposition. 100% mocké, réutilise <PlancheCouverture>, build vert. Layout : titre restant -> carte annonce + badge « couvre X de tes Y » -> mini-planche -> 3 boutons (Candidater/Voir/Passer) -> ligne progression.
SURBRILLANCE LIVRÉE (2026-06-23, commit ff7a87d sur feat, validée runtime sur /dev/parcours-proposition) : PlancheCouverture lit désormais la clé optionnelle `proposee` (ajout PUREMENT ADDITIF). Semaine proposee:true → wash orange #FFF4EE + anneau 2px #E8622A + icône « + » coin (surbrillance = projection « ce que tu gagnerais si tu candidates », volontairement PAS un aplat plein, réservé aux états réels couvert/en-attente). Semaine proposee:false → look à-couvrir atténué (opacity 0.55) pour faire ressortir les proposées. Clé ABSENTE (/mon-calendrier) → d.proposee undefined → rendu à-couvrir inchangé, zéro régression (vérifié : PlancheCouverturePage ne passe pas la clé). Précédence : couvert > enAttente > proposee > cherche. Validé visuellement par Côme (5 cases orange ressortent, 7 reculent).
RESTE DU PARCOURS GUIDÉ (parqué idees-en-attente, session fraîche) : 3 écrans restants (hub → recalcul → fin) ; câblage de la preview mockée vers le réel (couvertureSemaines / deduireRecherche / fetch annonces) ; flux candidater → /logement (touche le légal pièces/garant §366) ; REFONTE de la carte logement de l'écran Proposition (photo navy vide + mise en page jugées « pas bonnes » par Côme au runtime 2026-06-23 — hors sujet surbrillance, à reprendre).
RESTE inchangé : Google Search Console (sterny.co) ; #108 + compteur waitlist non déployés prod ; #111 (message erreur reset) ; Q-DPO-008->015 / Q-AVO-006->009.

## 2026-06-22 (conv 81) — Domaine canonique tranché = `sterny.co` (non-www) + appliqué côté Vercel/SEO ; #110 débloqué
Décision : domaine canonique = **`sterny.co`** (sans www), choisi pour une marque épurée (révise la reco initiale www, qui n'était motivée que par le moindre effort — écarté au profit du bon choix). Inventaire factuel d'abord (Vercel, Supabase Auth, SEO, liens publiés) : seul Vercel servait le www ; Supabase Site URL + canonical/og:url étaient DÉJÀ en non-www.
APPLIQUÉ ET VALIDÉ EN RÉEL (aucune modif de code) : (1) Vercel — `sterny.co` promu Production servi en direct ; `www.sterny.co` basculé en redirection **308 (permanente)** vers `sterny.co`. Vérifié curl : `sterny.co` = 200, `www` = 308 → `sterny.co`. (2) Canonical/og:url confirmés non-www sur le domaine servi (curl). (3) Supabase Site URL inchangée (déjà `https://sterny.co`), allow-list conserve les 2 entrées (non-www + www) par sécurité.
CAUSE PROFONDE #109 ÉLIMINÉE : le filet Auth (Site URL) pointe désormais vers le domaine réellement servi. Le code n'a pas été touché (URLs construites via `location.origin`, qui suit le domaine servi).
#110 DÉPLOYÉ EN PROD (56289dc, via worktree + cherry-pick + FF) ET VALIDÉ end-to-end sur sterny.co réel (lien recovery → /reset-password sans rebascule → reconnexion OK) → #109 + #110 CLOS EN PROD. NOUVELLE DETTE #111 (message d'erreur générique sur /reset-password quand nouveau mdp = ancien, NON traitée, à vérifier si Supabase expose une erreur distinguable). RESTE : Google Search Console (propriété à vérifier/configurer) ; #108 + compteur waitlist toujours non déployés prod ; Q-DPO-008→015.

## 2026-06-22 (conv 80) — DETTE #110 RÉSOLUE (ResetPasswordPage reconnaît la session recovery au montage) + config.toml local aligné sur port Vite 5173
Suite directe de conv 79. #110 = la page /reset-password affichait le formulaire ~3 s puis rebasculait vers /mot-de-passe-oublie. CAUSE (confirmée par lecture code) : ResetPasswordPage n'écoutait QUE l'événement PASSWORD_RECOVERY, or detectSessionInUrl:true (défaut du client, config/supabase.js sans options) consomme+nettoie le hash AVANT l'abonnement du listener → événement raté + hash vidé → timer de secours 3 s redirigeait.
FIX (commit b4e8628, feat) : getSession() au montage lit la session déjà posée par detectSessionInUrl, sans dépendre de la capture temps-réel. onAuthStateChange élargi en secours (PASSWORD_RECOVERY OU session non-nulle). Timer relit la vraie session avant de décider. Bouton submit désactivé tant que !sessionReady. Fix 100% local à la page, config/supabase.js NON touché → OTP/proprio/OAuth intacts.
VALIDÉ RUNTIME (Mailpit local) : lien recovery → /reset-password sans rebascule → changement de mdp → /connexion → reconnexion OK. Chaîne complète.
CONFIG LOCALE (commit ca5d068) : le test a révélé que config.toml pointait encore sur le défaut Supabase (127.0.0.1:3000). Aligné sur localhost:5173 (+ allow-list /**). Local uniquement, sans impact prod (prod pilotée par le Dashboard).
OUTILLAGE (non commité, pour mémoire) : le stack local refusait de démarrer (conteneur studio unhealthy). Contourné par `supabase start -x studio` (studio facultatif ; db/auth/mailpit sains). Mise à jour CLI Supabase (2.90 → 2.107) proposée mais REPORTÉE (cascade Node 26 + 17 deps jugée disproportionnée en cours de test). À traiter comme tâche d'environnement dédiée si studio reste récalcitrant.
RESTE AVANT PROD POUR #110 : déploiement de b4e8628 (frontend) via worktree + cherry-pick + FF vers main — GATED par la décision domaine canonique www vs non-www (cause profonde #109). Tant que ce point n'est pas tranché, on ne déploie pas #110. ca5d068 est local-only, ne part jamais en prod.
RESTE (inchangé depuis conv 79) : décision domaine canonique www/non-www (désormais prioritaire, bloque le déploiement #110) ; #108 + compteur waitlist toujours non déployés en prod ; durcir OAuthHandler pour ne pas avaler une session type=recovery (filet optionnel) ; Q-DPO-008→015.

## 2026-06-22 (conv 79) — DETTE #109 RÉSOLUE (cause www allow-list, prouvée par la requête réseau) ; nouveau bug #110 (ResetPasswordPage rebascule)
Diagnostic de bout en bout du lien recovery prod, 100% lecture jusqu'à la cause. CAUSE RACINE #109 PROUVÉE : l'app est servie sur www.sterny.co (Chrome masque le "www." dans la barre d'adresse → illusion de non-www). window.location.origin = https://www.sterny.co → le code envoie redirectTo = https://www.sterny.co/reset-password. Or la Redirect Allow List ne contenait que https://sterny.co/** (non-www) → Supabase rejette le redirect_to www → fallback sur la Site URL nue (https://sterny.co) → atterrissage racine → PasswordGate + OAuthHandler avalent la session → /dashboard, jamais /reset-password. PREUVE DÉCISIVE : la requête /auth/v1/recover montrait redirect_to=https%3A%2F%2Fwww.sterny.co%2Freset-password.
ÉCARTÉ EN CHEMIN (tout vérifié, jamais présumé) : route /reset-password absente du build prod (présente, App.jsx) ; redirectTo manquant côté code (présent dans le commit déployé 74d7c98, lu via git show) ; bundle Vercel périmé (Production = 74d7c98, à jour) ; Site URL mal réglée (OK) ; allow-list non-www défaillante (le joker sterny.co/** couvre bien /reset-password — prouvé par l'OAuth qui fonctionne).
FIX #109 APPLIQUÉ (Dashboard, config PROD uniquement — PAS de commit) : ajout de https://www.sterny.co/** aux Redirect URLs (Authentication → URL Configuration). Additif : Site URL inchangée, aucune entrée retirée → flux OTP/proprio non affectés. Répare aussi les autres flux auth servis en www (OAuth, OTP). VALIDÉ : le lien recovery atterrit désormais sur /reset-password.
NOUVEAU BUG #110 (ouvert) : une fois sur /reset-password, la page nouveau-mot-de-passe s'affiche ~3 s puis rebascule vers /mot-de-passe-oublie. Cause probable : detectSessionInUrl consomme+nettoie le hash avant que ResetPasswordPage ne capte PASSWORD_RECOVERY → timer de secours 3 s → navigate('/mot-de-passe-oublie'). Fix pressenti : getSession() au montage. CODE AUTH → session fraîche.
RESTE : fix #110 (feat + test Mailpit + déploiement) ; décision domaine canonique www vs non-www (annexe SEO, désormais prioritaire car touche l'auth) ; durcir OAuthHandler pour ne pas avaler une session type=recovery (filet, optionnel) ; #108 + compteur waitlist toujours non déployés en prod ; Q-DPO-008→015.

## 2026-06-22 (conv 78) — Template email reset (recovery) : design refondu (grammaire conv 71) + déployé Dashboard prod ; bug redirection découvert (#109)
DESIGN LIVRÉ ET VALIDÉ (navigateur + rendu Gmail réel OK). Refonte du template email de réinitialisation de mot de passe (recovery = mail Auth Supabase, DISTINCT du circuit Resend/send-landing-email).
LOCALISATION (tranchée conv 78) : le template recovery vivait UNIQUEMENT dans le Dashboard Supabase (Auth → Email Templates → Reset Password), non versionné — config.toml ne déclarait que confirmation. Décision : on VERSIONNE le HTML au repo (trace + rendu local brandé) MAIS la prod se met à jour À LA MAIN dans le Dashboard (collage HTML), JAMAIS via supabase config push (écraserait d'autres réglages Auth, dont le SMTP custom).
DESIGN (calqué pixel sur le mail de bienvenue conv 71) : fond #F4F5F7 ; carte 460/radius 16 SANS bordure + ombre douce ; bandeau navy #1E293B + logo blanc (Logo-Sterny-V1-white.png 134×44) + filet orange #E8622A ; corps centré, texte sur 2 lignes (retour ligne après le 1er point ; 2e ligne raccourcie pour tenir sur une ligne), PAS de titre h1 (doublon avec le bouton, retiré) ; bouton orange #E8622A portant {{ .ConfirmationURL }} (variable Auth préservée) ; footer marque dans la carte + mention « ignore cet email » sous la carte. Police = stack système (-apple-system…), PAS DM Sans (comme le mail de bienvenue). Email-safe : tables + inline + meta charset utf-8 (a corrigé un mojibake d'accents en aperçu) + color-scheme light only.
VERSIONNÉ : supabase/templates/recovery.html (source HTML) + [auth.email.template.recovery] dans config.toml (subject + content_path ; pilote le LOCAL) — commit feat a03933b. PROD = HTML collé dans le Dashboard (Subject inchangé), validé self-send Gmail.
BUG DÉCOUVERT — DETTE #109 (NON causé par la refonte) : en prod, cliquer le bouton recovery → passage PasswordGate → auto-login → /dashboard, jamais /reset-password. Le lien {{ .ConfirmationURL }} est INCHANGÉ vs l'ancien template → bug PRÉ-EXISTANT, révélé par le 1er test end-to-end prod (conv 77 n'avait validé que local Mailpit + arrivée du mail prod). Chantier SÉPARÉ : config Auth (Site URL / Redirect URLs) + routage type=recovery + interaction PasswordGate. Sensible (auth) → session fraîche. = PROCHAINE SESSION PRIORITAIRE.
RESTE (inchangé) : déployer #108 + compteur waitlist prod (groupé worktree+cherry-pick) ; #107 toLowerCase ; SEO annexes (www/non-www, og-image, Search Console) + page À-propos ; Q-DPO-008→015.

## 2026-06-21 (conv 77) — DETTE #108 résolue (page /mot-de-passe-oublie) + clarification modèle feat/prod
Fix #108 livré sur feat (commit 30dff1b, poussé origin/feat). Page /mot-de-passe-oublie : le spinner restait figé après un envoi réussi alors que le message vert « Lien envoyé » s'affichait — deux états incohérents simultanés.
CAUSE : setLoading(false) présent uniquement dans le bloc catch (chemin erreur), absent du chemin succès → loading jamais relâché en succès → spinner infini.
FIX (2 changements, MotDePasseOubliePage.jsx) : (a) setLoading(false) déplacé du catch vers un bloc finally → relâché dans TOUS les cas (succès et erreur), robuste anti-régression ; (b) libellé bouton conditionnel `emailDisabled ? 'Lien envoyé' : 'Envoyer le lien'` (le bouton reste grisé après succès via emailDisabled, mais affiche un libellé cohérent). Validé runtime local : spinner stoppé + bouton « Lien envoyé » grisé + champ désactivé + message vert.
CLARIFICATION MODÈLE feat/prod (actée, à ne plus reconfondre) : le bug #108 est TOUJOURS visible en PROD (sterny.co/mot-de-passe-oublie, spinner figé) car le fix vit sur feat et n'est PAS déployé. 3 niveaux distincts : (1) commit local ; (2) push origin/feat = « en ligne » sur GitHub (travail sauvegardé) ; (3) déployé prod = main uniquement, cherry-pick sélectif, JAMAIS merge feat→main. Sterny en pré-lancement → prod publique = landing waitlist seule ; l'app complète (dashboards, inscription, recherche, reset) vit sur feat, pas ouverte au public. Décalage feat/prod = VOULU (protection), pas un bug.
DÉPLOIEMENT #108 EN PROD : non urgent (page reset non utilisée en pré-lancement, aucun user avec compte en prod). À grouper avec un futur passage prod landing (#107 toLowerCase + annexes SEO) via worktree + cherry-pick + FF.
MAIL RESET PROD — TRANCHÉ (conv 77) : le mail de reset ARRIVE bien en prod (vérifié dans un vrai Gmail), expéditeur noreply@sterny.co, template Sterny déjà personnalisé (français, logo, bouton orange). Envoi prod OK → un SMTP custom est configuré dans Supabase Auth (hypothèse « SMTP par défaut non configuré » INFIRMÉE). Flux reset validé local de bout en bout (demande → mail Mailpit → page /reset-password saine à la lecture).
NOUVEAU CHANTIER (session dédiée) : refonte du DESIGN du template email de réinitialisation — le template actuel fonctionne mais son design ne convient pas, reprendre comme base la grammaire du mail de bienvenue waitlist (conv 71 : bandeau navy + logo blanc + filet orange + carte blanche + copy minimal, HTML dans l'Edge Function send-landing-email/index.ts). PRÉALABLE : localiser où vit le template reset — versionné au repo (supabase/config.toml [auth.email.template.recovery] + fichier HTML) OU édité dans le Dashboard Supabase Auth > Email Templates (cas probable). Template reset = mail Auth Supabase, distinct du circuit send-landing-email/Resend.
RESTE (inchangé conv 76) : déployer compteur prod (groupé) ; #107 ; annexes SEO + page À-propos ; compte admin local persistant (seed) ; ménage branches claude/* ; Q-DPO-008→015.

## 2026-06-20 (conv 76) — Waitlist objectif (5) : compteur d'inscrits livré (dashboard admin)
Volet COMPTEUR de l'objectif (5) livré sur feat (commit b104416, NON déployé prod). Carte « Inscrits waitlist » sur /dashboard/admin (DashboardAdminPage) affichant le total d'inscrits.
DÉCISION (surface + mécanisme, actée) : compteur PRIVÉ (admin, pour le pitch — PAS de compteur public sur la landing). Surface = greffe sur DashboardAdminPage existante (déjà protégée par verifierAdmin lisant users.is_admin). Mécanisme = lecture admin DIRECTE via SDK, from('waitlist').select('*', { count:'exact', head:true }) ajouté au Promise.all de chargerStats (même pattern que les 6 stats existantes), sous la RLS waitlist_select_admin (conv 73). head:true ⇒ ramène le NOMBRE seul, jamais d'email (zéro donnée perso). Pas de RPC ni Edge Function : l'infra admin existante suffit. Carte = 7e stat-card, couleur amber (doublon assumé avec Locataires, rangées différentes, dashboard interne).
COURBE (volet 2) : REPORTÉE. À 5 inscrits étalés sur ~4 mois, une courbe est peu parlante (et à contre-emploi d'un pitch sobre). Fondation connue (waitlist.created_at) → à brancher quand le volume racontera une histoire. Objectif (5) atteint en pratique au compteur.
DÉPLOIEMENT : sur feat uniquement (page React → Vercel/main). À déployer via worktree + cherry-pick b104416 + FF quand utile (pas de démo datée → non urgent, idéalement groupé).
DÉBLOCAGE ADMIN LOCAL (incident) : plus aucun compte admin en local (seed hote@/locataire@sterny.test = is_admin false). Débloqué par UPDATE ponctuel public.users.is_admin=true sur locataire@sterny.test (base locale 127.0.0.1:54322) — réversible, perdu au prochain db reset, prod jamais touchée. NB clé : le front local tape le Supabase LOCAL (.env.local=127.0.0.1 prioritaire sur .env=prod) → les emails Auth locaux (reset mdp) partent dans la boîte de test locale, jamais dans un vrai Gmail.
RESTE : déployer le compteur prod (quand utile) ; courbe différée ; #107, Q-DPO-008→015 ; annexes SEO landing (www vs non-www, og-image, Search Console) + page À-propos ; compte admin local persistant (seed) à ajouter.

## 2026-06-20 (conv 75) — Waitlist objectif (4) : notif d'inscription LIVRÉE en prod (pivot email→Discord), vérifiée bout en bout + rotation clé Resend (incident).
OBJECTIF (4) LIVRÉ + déployé + testé en réel : à chaque inscription waitlist, l'admin est prévenu par un ping Discord sur son téléphone (inscription → mail de bienvenue + ping Discord + notif tél = OK).
PIVOT email→Discord : la notif admin ne passe PAS par email (garder l'inbox propre) mais par un webhook Discord vers un salon dédié `#inscriptions`. NB Discord mobile : NE PAS créer de 2e compte — Discord ne push QUE le compte actif (un 2e compte ferait rater les pings) → serveur dédié « Sterny » sur le compte existant, réglé « Tous les messages » + push on (un webhook = message normal sans @mention, sinon non notifié). Le push tél ne sonne que si Discord n'est pas actif (par design).
ARCHI : 2e `fetch` NON BLOQUANT dans `send-landing-email/index.ts`, juste avant le return succès (après l'envoi du mail de bienvenue). Webhook lu via secret `DISCORD_WEBHOOK_URL` ; garde `if (url)` (secret absent → ping sauté, aucune erreur) ; isolé dans son try/catch (erreur → console.error). Message = TEXTE FIXE « 🎉 Nouvelle inscription sur la waitlist Sterny », ZÉRO donnée perso (pas d'email ; Discord horodate seul). Non-bloquant prouvé en réel (pendant le debug, le ping ratait, l'inscription + le mail passaient). Commit feat `d91431a` → `origin/feat = d91431a`. Secret posé + `functions deploy send-landing-email` (déploiement indépendant du frontend).
INCIDENT CLÉ RESEND (résolu) : ancienne clé `re_…` aperçue dans une capture (fenêtre Notes ouverte derrière) → RÉVOQUÉE immédiatement → nouvelle clé « Onboarding » (Sending access, domaine restreint `sterny.co`) → secret `RESEND_API_KEY` mis à jour → mail de bienvenue re-validé en réel. Exposition limitée à la conversation (pas de fuite publique, pas de commit) ; donnée exposée = clé API, pas une donnée perso. Leçon : fermer toute fenêtre affichant un secret avant une capture.
LEÇON PROCESS : la saisie masquée (`stty -echo; read`) collée dans un bloc multi-lignes a rangé 2× une valeur de secret abîmée → ping muet. Diagnostic : `curl` direct du webhook (HTTP 204 = URL OK) isole « secret cassé » vs « URL cassée ». Pour poser un secret CLI de façon fiable : valeur en clair (placeholder visible), pas la saisie masquée fragile.
NETTOYAGE : 3 lignes de test du jour (`come+notiftest`/`2`/`3`, 2026-06-20) supprimées par email exact (pas par date, pour ne pas risquer une vraie inscription du même jour) + ledger `count` 8→5. waitlist = 5 vrais inscrits, compteur investisseurs propre.
RGPD : la notif ne transporte AUCUNE donnée perso → Discord ne reçoit rien d'identifiable → concern très léger. Tracé sans présumer → Q-DPO-015.
RESTE chantier waitlist : (5) compteur/courbe d'inscrits (pitch investisseurs) — surface à définir (dashboard admin ? page dédiée ?). DETTE #107 (toLowerCase PasswordGate, parquée). Q-DPO-008→015. Annexe SEO landing (www vs non-www, og-image, Search Console) + page À propos. NB : CLI Supabase v2.90.0 → v2.107.0 dispo (MAJ non urgente).

## 2026-06-20 (conv 74) — Waitlist : étape 2 déployée en prod + étape 3 (migration anciens + dédup casse). Chantier prod waitlist complet.
Le chantier waitlist passe en production : la landing prod écrit désormais dans `waitlist` (plus dans `alertes`), et les inscrits historiques y sont migrés.
ÉTAPE 2 DÉPLOYÉE (origin/main 2e06b75 → 74d7c98) : repoint PasswordGate `from('alertes')` → `from('waitlist').insert({ email })` (commit feat 56f1eb8) porté sur main via le pattern landing (worktree `../sterny-deploy-waitlist-e2` depuis origin/main + cherry-pick → 74d7c98 + push fast-forward ; JAMAIS de merge feat→main). Vercel a redéployé. VÉRIFIÉ EN PROD : inscription `test-waitlist@sterny.test` → atterrit dans `waitlist` (consentement_at NULL), `alertes` inchangée (43).
PROTOCOLE TEST PROD (acté, à réutiliser) : email marqueur `test-waitlist@sterny.test` (TLD `.test` non livrable → aucun mail réel, seule l'écriture en base est vérifiée ; livraison mail déjà prouvée conv 70/71) ; DELETE ciblé de la ligne test AVANT migration ; `count(*)` avant/après chaque mutation. Ledger waitlist : 0 → 1 (test) → 0 (delete) → 5 (migration).
ÉTAPE 3 MIGRÉE : 22 candidates d'`alertes` (user_id/ville/rythme NULL) → 5 emails distincts vers `waitlist` (DISTINCT ON lower(email), date la plus ancienne conservée : 2026-02-19 → 2026-06-19), consentement_at NULL. Appliqué prod via SQL editor (pattern conv 72, ledger prod non marqué) PUIS tracé repo : migration `…0824_migrate_alertes_to_waitlist.sql` (feat c8a980a) + index `…0825_waitlist_email_lower_unique_index.sql` (feat 8a4a9f3, origin/feat = 8a4a9f3).
ÉTAT BASE PROD : `waitlist` = 5 lignes · 3 index (pkey, email_key, **email_lower_unique** insensible casse) · prod écrit dans waitlist.
SOUS-DÉCISIONS TRANCHÉES (conv 74) :
- (i) suppression des 22 lignes d'`alertes` post-migration : PARQUÉE, gated DPO (voir QUESTIONS-PROFESSIONNELS). Les 22 restent (filet + minimisation RGPD à valider par un pro). Aucune urgence : `alertes` plus écrite, fuite lecture colmatée (conv 72), ne pollue pas le compteur.
- (ii) dédup insensible casse : index unique `lower(email)` FAIT (prod + repo). `toLowerCase()` dans PasswordGate PARQUÉ → DETTE #107.
RESTE chantier waitlist : (4) notif NOTIFY_EMAIL (2e fetch Resend non bloquant dans send-landing-email) ; (5) compteur/courbe inscrits (pitch investisseurs). Annexe : SEO landing + page À propos (NB : `sterny.co/a-propos.html` sert la landing via fallback SPA Vercel — la vieille page statique est bien morte). Worktree `../sterny-deploy-waitlist-e2` + branche `deploy/waitlist-etape2` à nettoyer.

## 2026-06-19 (conv 73) — Waitlist : table dédiée `waitlist` créée en prod (étape 1/5)
Étape 1 du chantier waitlist (ordre figé conv 71/72) livrée. Table `public.waitlist` créée en PROD via éditeur SQL (pattern conv 72 : db push impossible depuis feat ≠ main). Transaction begin/commit, entièrement réversible (rollback = DROP TABLE). Migration `20260619204938_create_waitlist_table.sql` au repo (commit feat 8c7bdca sur feat/unification-inscription). Ledger migration prod non marqué (assumé, pattern conv 72).
- SCHÉMA (minimal, email seul — fin du mélange waitlist/alerte-produit) : `id` uuid PK gen_random_uuid() · `email` text NOT NULL UNIQUE · `created_at` timestamptz NOT NULL default now() · `consentement_at` timestamptz NULLABLE sans default.
- DÉCOUVERTE : `alertes` n'a AUCUNE contrainte UNIQUE sur email (snapshot 20260421082830, PK sur id seulement) → la branche « doublon » de PasswordGate (error.message.includes('duplicate')) ne se déclenchait probablement jamais sur alertes (doublons empilés). `waitlist.email UNIQUE` rend cette détection fonctionnelle après repoint (étape 2).
- DÉCISION RGPD (gated DPO) : `consentement_at` JAMAIS stampé à l'insert (saisir un email sans case + finalité ≠ consentement valide RGPD). Colonne anticipée, reste NULL jusqu'à une UX de consentement validée DPO (Q-DPO-008→013). Fondation technique seulement.
- RLS (leçons #105, aucune erreur d'alertes reproduite) : RLS activé ; INSERT public anon+authenticated (1 seule policy `waitlist_insert_public`, with_check true) ; SELECT admin-only `waitlist_select_admin` is_admin() ; DELETE admin-only `waitlist_delete_admin` is_admin() ; aucune policy UPDATE ; grants explicites. Emails jamais lisibles via clé anon (fuite #105 impossible by design). Vérifié en prod (pg_policies = 3 lignes conformes).
- SANS AUCUN TRIGGER (VISION §533 + #106 : ne pas répliquer le trigger d'alertes).
AVANCEMENT : (2) repoint PasswordGate.handleEmail → waitlist : FAIT, validé runtime local (POST /waitlist + 409 doublon OK, consentement_at null, alertes intacte), commit feat 56f1eb8 (poussé origin/feat).
ORDRE PROD ÉTAPE 2↔3 (décision conv 73, ⚠️ piège : Claude Code avait proposé l'ordre inverse) : DÉPLOYER l'étape 2 en prod (cherry-pick 56f1eb8 → main, pattern landing conv 69-71) AVANT de migrer les 22 lignes. La migration est un balayage one-shot alertes→waitlist : si la prod écrit encore dans alertes APRÈS le balayage, ces inscriptions sont orphelines. Donc : (a) deploy étape 2 → prod écrit dans waitlist ; (b) PUIS migration 22 alertes→waitlist (ON CONFLICT (email) DO NOTHING, created_at préservé).
INSPECTION conv 73 (lecture seule prod) + MIGRATION RAFFINÉE : les 22 candidates = seulement 5 emails DISTINCTS (insensible casse), 17 doublons (alertes sans contrainte unique → soumissions répétées). created_at : 2026-02-19 → 2026-06-19. 0 recoupement avec waitlist (vide). ⇒ étape 3 = PAS un INSERT…SELECT brut (garderait une date arbitraire) mais : INSERT INTO public.waitlist (email, created_at) SELECT DISTINCT ON (lower(email)) email, created_at FROM public.alertes WHERE user_id IS NULL AND ville IS NULL AND rythme IS NULL ORDER BY lower(email), created_at ASC ON CONFLICT (email) DO NOTHING ; → ~5 lignes propres, date la PLUS ANCIENNE par email. Réversible. Sous-décisions ouvertes (next session) : (i) supprimer ou non les 22 lignes d'alertes après migration (minimisation RGPD, gated DPO) ; (ii) rendre la dédup waitlist insensible à la casse (index unique lower(email) + lowercase dans PasswordGate).
RESTE : (3) migration des 22 candidates d'alertes (user_id/ville/rythme null) ; (4) notif NOTIFY_EMAIL (2e fetch Resend non bloquant dans send-landing-email) ; (5) compteur/courbe inscrits. Annexe : SEO landing + page À propos.

## 2026-06-19 (conv 72) — Sécurité : fuite de lecture sur `alertes` colmatée (chantier waitlist en cours)
Audit RLS de `alertes` (préalable au chantier table waitlist dédiée). Trouvaille majeure : 2 policies `SELECT … USING (true)` (`Lecture publique alertes` anon+auth ; `alertes_select` auth) exposaient TOUS les emails collectés via la clé anon publique. CORRIGÉ en prod (SQL editor, 2 DROP POLICY) → restent `alertes_select_own` + `admin_select_all` (vérifié). Migration `20260619201252_harden_alertes_rls.sql` enregistrée au repo (feat). NB : appliqué via SQL editor, PAS `db push` (feat ≠ main) → prod corrigée, ledger de migration prod non marqué (assumé pour un hotfix policy).
Loggé DETTE #105 (RLS alertes : DELETE-any `alertes_delete` + inserts redondants encore ouverts) et #106 (triggers `send-alert-on-insert` double-envoi, statut prod à confirmer).
Volumétrie `alertes` : 43 lignes = 1 alerte dashboard (user_id rempli) + 20 alertes RecherchePage avec ville + 22 candidates waitlist (user_id/ville/rythme null). Les 22 = cible de migration vers la future table waitlist (sans risque : une alerte sans ville ne filtre rien).
MAJ part 2 (même session) : trou DELETE `alertes_delete` FERMÉ en prod + migration `…_harden_alertes_part2.sql` (+ DROP TRIGGER alignement local). Triggers prod CONFIRMÉS absents (`pg_trigger` = 0) → pas de double-envoi. RLS `alertes` propre. 0bis soldé.
RESTE chantier waitlist (ordre figé) : (1) table `waitlist` dédiée (réversible, `consentement_at` anticipé, RLS insert public/lecture admin, SANS trigger) ; (2) repoint PasswordGate ; (3) migration des 22 lignes ; (4) notif NOTIFY_EMAIL ; (5) compteur/courbe. RGPD gated DPO (Q-DPO-008→013). SEO landing + page À propos = annexe.

## 2026-06-19 (conv 71) — Landing : mail de bienvenue redesigné (design + message) + déployé
Refonte du template send-landing-email (supabase/functions/send-landing-email/index.ts), déployé en prod et validé par envoi réel (rendu Gmail OK).
- DESIGN : bandeau navy #1E293B + logo BLANC (nouveau Logo-Sterny-V1-white.png uploadé dans bucket public-assets ; l'ancien template pointait le logo sombre) + fin trait orange #E8622A ; corps blanc centré aéré ; carte 460px radius 16px ; fond #F4F5F7 ; footer marque dans la carte ; mention « ignore cet email » SOUS la carte. Email-safe (tables + inline + color-scheme light only). Suppression de l'encadré à filet #FF6B35 et de la soupe de gris.
- MESSAGE : sujet « Merci ! On te prévient dès le lancement de STERNY » ; titre « Bienvenue ! » ; corps 2 lignes (« Merci pour ton inscription ! » + « On te préviendra dès le lancement de STERNY. » orange). Retrait des formulations creuses et de l'ancien « mise en relation entre étudiants ».
- DÉCISION (logée DETTE #16) : ce mail = GABARIT DE RÉFÉRENCE pour la refonte des 5 autres templates email.
- Git : commit feat sur feat/unification-inscription.
- SEO LANDING : robots noindex→index,follow + nouveau titre « Sterny — La plateforme de logement pour les alternants » + description/OG/twitter alignés sur le doc Le Poool. Déployé en prod (main 2e06b75, worktree + cherry-pick FF, jamais de merge feat→main). Vérif clé : le « À propos de STERNY » vu dans Google était un VIEUX CACHE (tout le site était noindex), PAS une page statique vivante — la page statique est bien morte. RESTE : (a) www vs non-www (sterny.co redirige 307 vers www mais canonical = non-www → aligner côté Vercel) ; (b) og-image.png à vérifier/créer ; (c) Google Search Console à configurer. Re-indexation Google = jours/semaines, pas immédiat.
- DÉCISION : table WAITLIST DÉDIÉE (tranche la Piste B « table alertes vs dédiée »). Détail + périmètre dans idees-en-attente. Notif d'inscription (email admin) scopée mais NON construite → intégrée à ce chantier. À faire en session dédiée.

## 2026-06-19 (conv 70) — Landing : email de bienvenue en prod + 3 bugs mobiles corrigés (tout validé)
EMAIL : send-landing-email DÉPLOYÉE en prod (n'y était pas, DETTE #17) + vérifiée (curl 200 + mail reçu). PasswordGate : swap send-alert-email -> send-landing-email (body { email }) ; insert `alertes` inchangé (commit feat 0eda4bf). Mail de bienvenue CONFIRMÉ reçu en prod. NB : un test précoce avait fait croire à un non-envoi (délai de livraison / alias « Masquer mon e-mail » Apple) = fausse alerte, la prod envoie bien.
MOBILE (3 fixes, validés iPhone en prod) : (1) champ email 14->16px = plus de zoom iOS (cf2f7f8) ; (2) message succès/erreur toujours monté + minHeight 18px + bascule opacité = ne décale plus la page (b89e19a) ; (3) wrapper vue d'attente 100vh->100dvh = plus de scroll parasite + bouton Connexion au-dessus de la barre Safari (e355073, complète #102). Vue login (l.93) garde 100vh (latent, non touché).
PROD : origin/main 49b7626 -> 7386c7b (worktree + cherry-pick fast-forward). feat = e355073, poussé sur origin/feat en clôture.
Reste landing : table waitlist + RGPD = Piste B (gated pro, Q-DPO-008..013) ; SEO noindex (décision) ; #103 viewport-fit dashboards.

## 2026-06-19 (conv 69) — Landing PasswordGate LIVE en prod (bords iOS réglés)
La page d'attente publique (PasswordGate, sterny.co) est **déployée en prod** : `origin/main = 49b7626`. Refonte composition (logo responsive 180px, badge contour orange, accroche 2 lignes « La plateforme pour tous les alternants » / « Propose ou trouve ton logement à la semaine. », champ long + bouton compact) + **bords iOS réglés** par 3 leviers : theme-color #1E293B, useEffect scopé (fond html+body navy seulement quand le gate public est affiché, restauré au déverrouillage → dashboards intacts), viewport-fit=cover (global). Validé iPhone.
- **Déploiement** : la prod Vercel déploie depuis `main`, PAS feat (feat ~215 commits devant). La landing a été mise en prod via worktree `../sterny-landing-prod` (branche fix/landing-prod depuis origin/main) + cherry-pick des commits landing + `git push origin fix/landing-prod:main` (fast-forward). NE PAS merger feat → main.
- **Reste à faire** (cf. DETTE #102/#103 + idees-en-attente conv 69) : P3 lien « Connexion » sans `env(safe-area-inset-bottom)` (à corriger maintenant que viewport-fit=cover est live) ; surveiller dashboards sous l'encoche (viewport-fit global) ; EMAIL prod appelle encore `send-alert-email` (mauvais template) au lieu de `send-landing-email` (session dédiée + RGPD) ; SEO `noindex,nofollow` toujours posé (décision à prendre).

## 2026-06-18 (conv 66) — planche : 3e état « en attente » branché (modèle 3 états visible)
La planche /mon-calendrier affiche le 2e des 3 états (VISION conv 65). « En attente » = semaine cherchée où le locataire a candidaté sans contrat signé (candidater ne réserve rien §381/§621 ; un refus rouvre la semaine §610).
- Donnée (PlancheCouverturePage.jsx) : fetch candidatures du locataire (Promise.all avec le fetch users) ; Set semainesEnAttente = pour chaque candidature non 'refusee', candidatures.semaines_demandees EN PRIORITÉ, repli = semaines cherchées ∩ annonces.disponibilites_pattern si liste vide (vieille candidature) ; intersecté avec les semaines cherchées. etatsParSemaine enrichi de enAttente.
- Affichage (PlancheCouverture.jsx) : précédence couvert > enAttente > à couvrir.
- Résumé « Il te reste N à couvrir » inchangé : une semaine en attente reste comptée à couvrir (pas gagnée, §621).
DÉCISION VISUELLE (logée) — icônes de la planche en COIN bas-droite (right 3px bottom 3px / 11px, background-image SVG) : à couvrir = blanc + loupe grise (déplacée du centre au coin) ; en attente = gris ardoise #64748B + bordure #475569 + sablier blanc ; couvert = vert #57B98C + check blanc (prêt, s'affichera quand couvert sera branché). Ardoise choisie après rejet de l'ambre (trop « jaune »/hors registre pro) et du slate clair #CBD5E1 (trop proche du gris hors-sujet #D9DEE6). Coin retenu vs centré (centré jugé « enfantin »). Cohérent VISION conv 63 (couleur = couverture) ; les icônes renforcent lisibilité sans légende + accessibilité daltonien.
RESTE planche : « couvert » (vert) viendra avec la signature / registre semaines_reservees (#93 tranche B / pièce 3). Multi-villes et planche hôte parqués.

## 2026-06-18 (conv 66) — cartes /recherche : badge « Dispo dans X sem. » retiré (solde le TODO du bloc conv 65)
Le badge dispo (bas de carte) est supprimé : obsolète depuis le matching au planning près. La pastille de couverture (✓ Couvert / X-Y sem., haut de carte) est désormais la SEULE info de dispo sur la carte. Les DEUX états du badge retirés, y compris « Disponible maintenant » (générique, non personnalisé, potentiellement contradictoire avec la pastille : une annonce pouvait afficher « Disponible maintenant » en couvrant 0 semaine cherchée).
- RecherchePage.jsx : suppression de getDispoBadge (fonction), de la const dispo, du <span rch-card-badge>.
- RecherchePage.css : suppression des 3 règles, toutes scopées au badge (.rch-card-badge, .rch-card-badge.available, .rch-card-badge.soon) → aucun risque collision #95 (pas de classe nue).
- Intacts : disponibilites_pattern, moteur de couverture, filtre. npm run build vert, grep orphelins clean.
- Commit refactor 9e9a649.
RESTE socle recherche inchangé : pièce 3 (brancher le « restant » via signature / #93 tranche B) ; couverture sur la planche (vert « couvert » + état « en attente », modèle 3 états).

## 2026-06-18 (conv 65) — socle recherche pièces 2+4 livrées : moteur de couverture branché sur /recherche
Fonction pure couvertureSemaines (utils/matching.js, créée conv 61, jamais branchée) désormais utilisée par RecherchePage. Commit feat b18484b.
- Calcul : chaque annonce porte { couvertes (X), totalCherchees (Y), semainesCouvertes }. Y = TOUTES les semaines cherchées du locataire (futurUserDates), et NON plus la fenêtre de l'annonce → corrige le « match parfait » trompeur.
- Tri : par couvertes décroissant (le plus couvrant d'abord, VISION §606).
- Badge carte : plus de %. Pastille compacte — vert « ✓ Couvert » si X===Y>0 ; orange « X/Y sem. » sinon ; rien si Y===0 (visiteur/sans recherche). Validé runtime (locataire@sterny.test).
- Code mort supprimé : ancien calcul fenêtre-annonce + fallback dette #12 + normaliseur dette #13 (les deux résolues).
- DÉNOMINATEUR = total POUR L'INSTANT. Décision (voir VISION) : Y deviendra « semaines RESTANT à couvrir » (total moins semaines SIGNÉES du locataire) quand le registre semaines_reservees sera rempli à la signature (#93 / pièce 3). Aujourd'hui registre vide → restant = total → correct.
- RESTE socle : pièce 3 (brancher le restant) ; couverture sur la planche (vert « couvert » + état « en attente », modèle 3 états). À FAIRE AUSSI : retirer le badge « Dispo dans X sem. » des cartes (obsolète depuis le matching au planning près — audit d'abord).
NB : une 2e annonce Rennes « partielle » a été insérée en base LOCALE pour tester l'orange — donnée de test non versionnée, à supprimer ou balayée au prochain db reset.

## 2026-06-18 — planche Étape B3 livrée : 2 accès vers /mon-calendrier (clôture Étape B)
B3 : 2 points d'entrée vers la planche, réservés aux profils qui cherchent.
- B3.1 (menu) : item « Mon calendrier » → /mon-calendrier dans UserDropdown (le menu réellement monté ; HamburgerMenu = code mort #21/#103, non touché). Placé dans locataireItems (2e, sous « Mon profil »). Gate NATUREL : locataireItems = branche else couvrant locataire ET les_deux ; hote/proprietaire ont leurs propres tableaux → exclus sans condition ajoutée. IconCalendar préexistait (réutilisée).
- B3.2 (carte TON RYTHME) : lien « Voir mon calendrier » → /mon-calendrier dans l'en-tête du RythmeCarousel (haut-droite). /dashboard sert les 3 types alternants → gate EXPLICITE : DashboardLocatairePage passe lienCalendrier = /mon-calendrier si type_user ∈ {locataire, les_deux}, sinon null ; RythmeCarousel (bête) rend le lien si la prop est là. Gris #64748B, typo alignée sur « Aujourd'hui » (classe .rythme-today + override couleur).
- Toggle en-tête carrousel : un seul emplacement haut-droite qui bascule — semaine courante → « Voir mon calendrier » ; navigué (offset≠0) → bouton « Aujourd'hui ». Corrige le « Aujourd'hui » qui flottait au centre quand les deux coexistaient.
- Validé runtime : locataire voit les 2 accès ; hote n'en voit aucun.
- 2 commits feat (B3.1, puis B3.2 amendé pour folder toggle + typo) ; voir git log.

DÉCISION PRODUIT — gate de la planche : les accès à /mon-calendrier sont réservés aux profils qui CHERCHENT (type_user 'locataire' ou 'les_deux'). Exclus : 'hote' pur et 'proprietaire'. Raison : la planche ne gère aujourd'hui que le côté locataire (« semaines à couvrir »). La version HÔTE miroir (« semaines à compléter ») est parquée (idees-en-attente). L'état vide soigné B2.2 reste le filet si un les_deux sans recherche atteint l'URL en direct. Gate exprimé via la structure (locataireItems) côté menu, via une prop côté carrousel — même set de profils des deux côtés.

ÉTAPE B TERMINÉE (planche sortie de preview : page+route B1, vraies semaines B2.1, état vide B2.2, 2 accès B3). RESTE planche (hors Étape B) : vert « couvert » viendra avec la donnée contrats/semaines_reservees ; multi-villes parqué ; planche hôte parquée.

## 2026-06-18 — planche Étape B2.2 livrée : état vide soigné de /mon-calendrier
B2.2 : si aucune semaine cherchée (pas de rythme OU aucune ville en 'recherche' — ex. hôte pur ou proprio), la planche affichait une grille grise + un faux résumé « entièrement couvert ». Corrigé.
- PlancheCouverturePage.jsx : 3 états de rendu — enChargement → « Chargement… » ; estVide (semaines.length===0) → message sobre « Aucune semaine de recherche à afficher pour le moment. » ; sinon planche + résumé. Résumé masqué en chargement ET en estVide. Titre « Ton planning » conservé dans les 3 cas.
- Cas réels d'état vide : hôte pur (a un rythme mais ne cherche pas) ; proprio (pas de rythme). Locataire inscrit (rythme obligatoire) → ne devrait pas arriver dans le flux normal ; l'état vide est un FILET. La vraie protection « qui voit la page » se joue en B3 (lien réservé aux profils qui cherchent, tant que la planche hôte n'existe pas).
- Commit feat local (non poussé) ; voir git log.
RESTE Étape B : B3 = 2 accès (burger « Mon calendrier » + bouton RythmeCarousel), avec gating à cadrer (lien réservé aux profils qui cherchent).

## 2026-06-18 — planche Étape B2.1 livrée : vraies semaines branchées sur /mon-calendrier
B2.1 : la planche affiche les VRAIES semaines cherchées du locataire connecté (fin des données de démo).
- PlancheCouverturePage.jsx : ETATS_DEMO/genererDemo retirés. Branchement repris de RecherchePage : useAuth → fetch row users (type_user, ville_*/statut_ville_*, rhythm_calendar) → deduireRecherche → 1ʳᵉ entrée 'recherche' (mono-ville). etatsParSemaine = chaque lundi cherché → { nature, cherchee:true, couvert:false } (couvert false partout : le vert « couvert » viendra avec la donnée contrats/semaines_reservees, hors Étape B). anneeScolaireInitiale = academicYearForMonday(semaines[0]) → planche ouverte sur l'année des semaines cherchées (corrige le piège « planche grise » de computeDefaultAcademicYear). Garde-fou « Chargement… » pendant le fetch. academicYear/RhythmManualBuilder non touchés (import seul).
- Validé runtime (locataire@sterny.test) : planche sur 2026-2027, 2 semaines école futures en « à couvrir » (blanc+loupe), résumé « Il te reste 2 semaines à couvrir ». NB : compte de test pauvre (4 semaines de rythme) → planche peu remplie, normal.
- Commit feat local (non poussé) ; voir git log.
RESTE Étape B : B2.2 = état vide soigné si aucune recherche/rythme (aujourd'hui : planche grise + faux résumé « entièrement couvert » dans ce cas). B3 = 2 accès (burger « Mon calendrier » + bouton RythmeCarousel).

## 2026-06-18 — planche Étape B1 livrée : page dédiée /mon-calendrier (habillage + route), données encore en dur
B1 du branchement de la planche : elle sort du mode preview, validée runtime (Côme).
- Créé sterny-react/src/pages/dashboard/PlancheCouverturePage.jsx (vrai parent). Habillage 100% INLINE porté depuis la preview : cadre verre dépoli (rgba(255,255,255,0.72) + backdrop-filter blur 14 saturate 140), en-tête « Ton planning » (valeurs de .dp-card-title copiées en local), résumé gris « Il te reste N semaines à couvrir » (N dérivé des états). PAS de className dp-card, AUCUN import CSS dashboard → couplage DETTE #35 évité. Composant NU PlancheCouverture alimenté par ETATS_DEMO (données EN DUR copiées de la preview).
- Route /mon-calendrier ajoutée sous <DashboardLayout/> (App.jsx) ; preview DEV /dev/planche-couverture laissée intacte.
- Hauteur : PAGE_STYLE.minHeight = calc(100vh - 85px). DashboardLayout = fragment nu Navbar+Outlet+Footer (aucun flex/min-height) → c'est la page qui pousse le footer ; navbar = 85px (.nav-grid, dans le flux, border-box global, pas de padding-top body/#root). Divergence ASSUMÉE vs voisines (qui gardent 100vh brut) : sur cette page courte, footer pile sous le bord, visible au 1er scroll.
- Verre dépoli VALIDÉ sur fond gris #F4F5F7 : la réserve « rend peu sur fond plat » est levée (carte détachée par ombre + bord clair).
- Commit feat local (non poussé) ; voir git log.
RESTE Étape B : B2 = brancher les VRAIES semaines (deduireRecherche → 1ʳᵉ entrée 'recherche' → lundis ISO ; ouvrir sur l'ANNÉE des semaines cherchées, pas computeDefaultAcademicYear ; mono-ville livré, cas 2 villes parqué). B3 = 2 accès (item burger « Mon calendrier » + bouton sur RythmeCarousel, même destination ; carrousel touché UNIQUEMENT pour ce lien).

## 2026-06-17 — planche : habillage VALIDÉ (couleur = couverture, point optique flou)
Direction validée à partir d'un croquis de Côme, après plusieurs pistes rejetées : grille régulière resserrée au **point optique** — semaines à combler / comblées **nettes**, hors-sujet **flouté** en retrait. Lisible sans légende (objectif de départ atteint).
**Décision (revirement conv 63)** : sur la planche, la couleur encode la **couverture**, pas la nature. On a copié le *principe* de l'inscription (couleur = info n°1 de l'écran), pas ses couleurs : sur la planche l'info n°1 est la couverture, et en mono-ville la nature ne porte aucune info utile.
**Système (PlancheCouverture.css, commit de94d30 sur base 2af7352)** : couvert = vert #57B98C + ombre douce ; à couvrir = blanc + loupe grise SVG (#B4BCC8, 18px) + contour 1.5px #B4BCC8 (gris tranché > orange pour la lisibilité ; l'orange de marque est porté par le titre) ; hors-sujet (contexte/passee/neutre unifiés) = gris #D9DEE6 + blur(1.7px) + opacity .45 ; densité assumée 40px / gap 3px / radius 10px.
**Parent (PlancheCouverturePreview, composant NU)** : cadre verre dépoli (rgba blanc + backdrop-filter) ; en-tête une ligne = titre « Ton planning » (style exact `.dp-card-title` dashboard, copié en local) à gauche + résumé gris discret « Il te reste N semaines à couvrir » à droite.
**Réserve** : le verre dépoli ne rend qu'avec un fond contrasté ; sur le fond plat du dashboard l'effet sera subtil, à rejuger au branchement.
**Reste (Étape B)** : page dédiée + route + 2 accès (burger « Mon calendrier » + bouton carrousel) + branchement vraies données (deduireRecherche, ouvrir sur l'année des semaines cherchées). Mono-ville livré ; 2 villes parqué. Réf maquette : planche-flou-v4.html (output, non versionné).

## 2026-06-17 (conv 64) — dropdown villes /recherche aligné sur homepage
- Largeur : .search-field repassé en position:static (inline JSX + règle CSS), comme la homepage en 5b → le dropdown s'ancre sur .recherche-hero .search-bar = toute la barre, bouton inclus.
- Style : règles dropdown (.ville-suggestions / .ville-suggestion-item) scopées sous .recherche-hero (0,1,0 → 0,2,0), miroir exact du bloc .hero de la homepage (radius 999px, item 13px 18px 13px 36px / 15px, hover gris #F4F5F7). Gagne désormais contre la copie globale d'index.css quel que soit l'ordre du bundle.
- Volet /recherche de la dette #95 fermé. Copie globale dans index.css = cause racine, non touchée (voir DETTE #95).

---

## 2026-06-16 (conv 64) — planche habillage : EN PAUSE, à revoir à tête reposée
Plusieurs directions explorées EN MAQUETTE (jamais appliquées au code) : allègement icônes, coverage-first tout plat, premium gris, navy/orange, halo animé. AUCUNE validée par Côme → mise en pause volontaire.
Apprentissages à NE PAS reperdre (ils ont coûté plusieurs tours) :
- COULEUR = NATURE (orange = école, navy = entreprise), JAMAIS la couverture. Erreur récurrente du jour : couleur = couvert/à-couvrir → illisible. Règle conv 63 ré-affirmée.
- La couverture (à couvrir / couvert) passe par un signal SECONDAIRE (halo, plein vs contour…), pas par la teinte.
- Petites cases denses = élégant ; grosses cases = cheap.
- Barre de qualité = le VRAI langage Sterny (navy/orange assumés, carte blanche radius 20 + ombre douce, titre hero navy + un mot orange, labels majuscules espacées). PAS un premium gris importé.
- Garder le titre-résumé « il te reste X semaines à couvrir ».
État repo : skeleton conv 63 + habillage (logé aplat, bords) + slice 1 coverage-first cumulés dans le WORKING TREE des 3 fichiers planche, non validés, non commités. Index vidé en clôture. Aucune maquette du jour dans le code.

## 2026-06-16 (conv 63) — planche : système couleur/motif/icône des calendriers VALIDÉ (provisoire), avant implémentation
Audit lecture seule des 6 surfaces calendrier (RhythmManualBuilder, RhythmCalendar, RythmeCarousel, PlancheCouverture, CreerAnnoncePage .day-cell, LogementPage .calendar-day). Conventions existantes relevées : école = orange #E8622A (partout) ; entreprise = navy #1E293B (partout, 3 rendus) ; AUCUN bleu utilisé dans les calendriers ; vert « succès maison » = #10B981/#22C55E (la planche utilisait #86EFAC, hors design system).
DÉCISION (validée Côme « on essaye comme ça, on revoit en détail après ») — code couleur/motif/icône de la planche, 3 axes orthogonaux :
- COULEUR = nature de la semaine : orange #E8622A = école · navy #1E293B = entreprise · gris #94A3B8 = passé (le temps prime sur la ville).
- MOTIF = recherche ou non : plein = semaine de la ville où l'alternant CHERCHE · diagonale barrée (look rmb-cell-past copié) = il ne cherche pas (ville où il est DÉJÀ logé, OU passé). La diagonale prend la couleur de la semaine (orange/navy/gris).
- ICÔNE (cases pleines uniquement) : loupe = reste à loger · check = logé.
Conséquences : suppression du vert #86EFAC ET de l'ambré #FBBF24 de la planche (plus de vert du tout ; « logé » = icône check). Symétrique selon la ville cherchée (école-search → orange plein + icônes, entreprise en diagonale navy ; entreprise-search → l'inverse). Continuité totale avec l'inscription (orange/navy) ; RÈGLE Nº 1 respectée (inscription jamais modifiée, lecture seule).
IMPLIQUE une refonte du MODÈLE D'ÉTAT de la case (pas un simple recolor) : la planche doit connaître, par semaine : nature école/entreprise (rhythm_calendar) + ville cherchée ou non + logé ou non. Forme actuelle de `etatsParSemaine` à revoir.
RESTE : (1) implémentation système couleur + modèle d'état sur le vrai composant ; (2) qualité visuelle réelle (mise en page, profondeur, nav d'année, légende, ligne de résumé) jugée en npm run dev, barre de qualité = homepage ; (3) Étape B (page dédiée + route + 2 accès + branchement vraies semaines). À promouvoir dans CONTEXTE (design system) une fois stabilisé.

MAJ (conv 63, implémentation) — système IMPLÉMENTÉ et validé runtime sur PlancheCouverture, NON poussé. .jsx : prop etatsParSemaine = { "YYYY-MM-DD": { nature:'ecole'|'entreprise', cherchee:bool, couvert:bool } } ; logique case : passé→gris diagonale, absente→neutre, cherchée→fond pâle couleur nature + icône (loupe à loger / check logé), non cherchée→diagonale couleur nature ; CelluleIcone = SVG inline (Material Symbols ABSENT du projet → convention SVG inline retenue). .css : ecole/entreprise-cherche = fond pâle (#FDEEE6/#EEF1F6) + bord 1.5px + icône en couleur vive (--plc-ecole #E8622A / --plc-entreprise #1E293B) ; passee/ecole-libre/entreprise-libre = diagonale look inscription ÉPAISSIE 1.25px (trait 2.5px) + bord 2px (divergence assumée : cases 36px vs 24px, pour égaler le poids visuel) ; neutre = aplat #EAECEF. Preview : démo via helpers academicYear + légende corrigée. RESTE conv 63 : (2) HABILLAGE PRO (simplifier + vrai design : conteneur, typo, nav d'année, ligne de résumé, poids des icônes, hiérarchie, espacement) = session dédiée ; (3) Étape B (page + route + 2 accès + vraies semaines via deduireRecherche). Inscription jamais touchée.

## 2026-06-16 (conv 62) — planche à découper : T1.2 livré (structure), design à finir (session dédiée)
Chantier : 1er écran du parcours de couverture = la « planche à découper », calendrier des semaines cherchées du locataire qui se coloreront au fil des logements retenus. Découpage T1→T4 ; on ne livre que T1 ; mono-ville (1ʳᵉ entrée 'recherche' de deduireRecherche ; cas 2 villes parqué).
DÉCISIONS DE CONCEPTION :
- RÈGLE Nº 1 (absolue, posée par Côme) : ne JAMAIS toucher au calendrier d'inscription (RhythmManualBuilder.jsx/.css) ni à academicYear.js. On COPIE son look, jamais on ne partage/modifie (partager = toucher l'inscription = interdit).
- Composant d'affichage DÉDIÉ (pas d'adaptation de RhythmCalendar, pas de WeekGrid partagé). Cellules <div> NON cliquables (affichage pur).
- Planche = PAGE DÉDIÉE, PAS dans le dashboard (qui a déjà RythmeCarousel, bande semaine par semaine). Accès (Étape B) : item « Mon calendrier » au burger + bouton « Trouver mes logements » sur le carrousel (noms provisoires, même destination). Carrousel touché UNIQUEMENT pour ajouter ce lien.
- Calendrier = COPIE FIDÈLE de la grille d'inscription (CSS rmb- → plc-) : année sept→août, 12 colonnes mois, flèches de nav d'année, en PLUS GRAND (36px).
- 3 couleurs : couvert = vert plein ; à découvert = AMBRÉ plein (« à trouver », distinct de l'orange Sterny #E8622A) ; hors-recherche + semaines passées = barré diagonale (look rmb-cell-past copié).
LIVRÉ T1.2 (validé structurellement runtime, build OK) : PlancheCouverture.jsx/.css (props { etatsParSemaine, anneeScolaireInitiale?, className }), dev/PlancheCouverturePreview.jsx, App.jsx route DEV /dev/planche-couverture. Inscription JAMAIS touchée (git status vérifié à chaque tour).
DESIGN PAS FINI (retour Côme) : rendu actuel « bas de gamme / pas confiance ». Causes : palette trop vive et hors-marque (ambré néon + vert menthe) ; barre diagonale majoritaire = bruit visuel ; pas de profondeur ni hiérarchie. → POLISH en SESSION DÉDIÉE (skill design). Direction cadrée : palette restreinte alignée Sterny ; hors-recherche en neutre plat discret au lieu de la diagonale ; profondeur (ombre/épaisseur cases pleines) + légende soignée + ligne de résumé + nav stylée ; corriger la légende de la preview.
POINT POUR T1.3 : la planche doit s'ouvrir sur l'ANNÉE des semaines cherchées (pas computeDefaultAcademicYear), sinon planche grise. Données : deduireRecherche → 1ʳᵉ entrée 'recherche' → semaines (lundis ISO) ; garde mono-ville déjà gracieuse.
RESTE T1 : (1) polish design (prochaine session) ; (2) Étape B = page dédiée + route + 2 accès + branchement vraies semaines.
Working tree never-stage inchangé : CreerAnnoncePage.jsx, DashboardProprietaire .jsx/.css, 3 docs untracked.

## 2026-06-15 (conv 61) — décision produit : recherche = accompagnement guidé à la couverture (CONCEPTION, aucun code)
Session de conception. La recherche connectée devient un parcours guidé d'aide à la couverture du planning, depuis le dashboard.
**Principe acté** : le parcours propose le logement qui couvre le plus de semaines restantes, recalcule les trous, propose le suivant, jusqu'à couvrir au mieux (jamais garanti, §566). Avance au rythme des CANDIDATURES du locataire, pas des réponses des hôtes : candidater ne réserve rien (§381), une candidature abandonnée ne perd aucune semaine ; les réponses des hôtes ajustent la couverture après coup (refus = semaines rouvertes). « Retenir » dans le parcours = candidater.
**Dénominateur acté (raffine #48/§429)** : le besoin = TOUTES les semaines cherchées du locataire pour la ville (Y), pas la fenêtre d'une annonce ; un logement en couvre un sous-ensemble (X). Corrige le « Match parfait » trompeur d'un logement à fenêtre étroite. Audit conv 61 : aujourd'hui le score est borné à la fenêtre de l'annonce (RecherchePage.jsx:432-451).
**Fil conducteur** = calendrier des semaines cherchées qui se colore à chaque logement retenu (= « planche à découper », idees-en-attente).
**Moteur de couverture LIVRÉ (commit 0bc84e8, validé 5/5 cas)** = `couvertureSemaines` dans sterny-react/src/utils/matching.js (remplace le code mort calculerCompatibilite). Fonction pure retournant, pour un logement, la LISTE des semaines qu'il couvre + les comptes { semainesCouvertes, couvertes, totalCherchees } (réutilisée par le calendrier ET le score). Forme finale « offre moins registre » appelée avec registre=[] aujourd'hui (table semaines_reservees vide + RLS sans policy) → brancher le registre plus tard sans réécrire le calcul. Cas 2 (semaine réservée retirée) validé → la tranche registre = données seulement, pas de réécriture.
**Prochain pas (conv suivante)** : dessiner l'écran calendrier du parcours (« planche à découper » qui se colore), sur le DASHBOARD connecté — PAS /recherche (vitrine visiteur). Visuel piloté par Côme en npm run dev ; Claude.ai pose la logique de l'écran.
**Surfaces distinctes** : parcours guidé = dashboard connecté ; /recherche publique = vitrine visiteur par ville (conv 55).
**Audit conv 61 consigné (lecture seule)** : matching.js = code mort (calculerCompatibilite jamais importé) ; score inline RecherchePage.jsx:432-451 ; badge % l.1272-1279 ; semaines_reservees vide + RLS 0 policy ; fallback mort DETTE #12 l.444-445 dans le bloc score.
**Reste à concevoir** : écrans détaillés du parcours ; doublons de candidatures (filet de sécurité) ; tension hôte/locataire (#48 sous-pb 4) ; juridique multi-contrats gated avocat.
Working tree (ne jamais stager) : bypass CreerAnnoncePage.jsx, lot 2 #83 DashboardProprietaire .jsx/.css, docs untracked.

---

## 2026-06-15 (conv 60) — 5b-2 livré : barre /recherche en pilule + hero aligné homepage
Deux commits feat sur feat/unification-inscription (locaux non poussés) :
- 3050611 : barre /recherche = clone visuel de la barre homepage. Pilule (radius 999px, ombre douce 0 8px 24px /.12, border 1px #E8EAF0, input 40px) + bouton loupe ronde seule (aligné .hero .search-btn) + label « VILLE » retiré (placeholder « Dans quelle ville cherches-tu ? » + aria-label).
- 2566f04 : hauteur de la bande bleue (hero) alignée sur la homepage — padding-bas .recherche-hero 56→96px (top 60px et mobile 44px déjà identiques). Léger écart résiduel vs homepage dû au titre 1 ligne (vs 2), assumé.
Validé runtime un essai à la fois : look pilule → hauteur (retrait label) → bouton loupe → hauteur hero.
Toutes les règles .search-bar/.search-field/.search-btn de RecherchePage.css scopées .recherche-hero (y compris @media) → volet DESKTOP de la collision #95 refermé (grep : plus aucune règle .search-* nue). @media mobile scopé sans changer ses valeurs : responsive préservé, pilule mobile différée (#44).
Reste pièce 5b : 5b-3 (composant <SearchBar> partagé) différé. Point (5) du socle recherche (nettoyage UI barre) soldé (5b-1 ville seule + 5b-2 pilule).
Working tree (ne jamais stager) : bypass CreerAnnoncePage.jsx, lot 2 #83 DashboardProprietaire .jsx/.css, docs untracked.

---

## 2026-06-15 (conv 59) — 5b-1 livré : barre /recherche = Ville seule (Option B)
Chantier 5b-1 terminé sur feat/unification-inscription (5 commits locaux non poussés : 2b17c16, 95c5380, c7672d3, 1cda531, 9f46959). La barre /recherche ne demande plus que la ville ; tout le rythme abstrait a disparu de RecherchePage.jsx. Le matching connecté repose entièrement sur la déduction du profil (semainesUtilisateur ← deductionRecherche), conforme VISION (Option B, conv 58).
Découpage exécuté, validé un à un en runtime :
- 1/4 (2b17c16) : hasRythme branché sur semainesUtilisateur.length > 0.
- 2/4 (95c5380) : retrait JSX des champs Type/Rythme/Dates + modal calendrier (209 lignes).
- 3/4 (c7672d3) : retrait des filtres dépréciés type_alternance/rythme_pattern dans filtrerLogements + deps.
- 4A (1cda531) : code vivant détaché (garde bouton, semainesUtilisateur, lien fiche, reinitialiserFiltres, activeFilterCount, envoyerAlerte→rythme null).
- 4B (9f46959) : code mort supprimé (241 lignes : états, fonctions, useEffect, useMemo, constantes SYMMETRIC/ASYMMETRIC_OPTIONS/RYTHME_LABELS).
Conséquences actées :
- envoyerAlerte : critère « rythme » de l'alerte désormais toujours null. À rebrancher sur les vraies semaines → DETTE #97.
- Tiroir « Filtres » à repenser (cohérence futur modèle semaines) → DETTE #98.
- #95 (responsive barre /recherche) confirmé en runtime (affichage étroit bugué en DevTools ouverte), reste ouvert.
Reste pièce 5b : (5b-2) porter le look pilule homepage dans RecherchePage.css scopé .recherche-hero (avance #95) ; (5b-3, différé) composant <SearchBar> partagé. Override manuel des semaines (retiré) à rebâtir plus tard en vrai sélecteur de semaines réelles (aligné #93 / recherche-à-la-semaine).

---

## 2026-06-14 (conv 57) — audit source villes + décision (point 1 du reste conv 56)
Audit lecture seule : homepage = liste de lancement en dur (10 bretonnes), dupliquée 6× ; inscription perso = VILLES_FRANCE (181) ; aucune notion de couverture en base.
Décision : homepage suggère les villes de lancement, consolidées en source unique (pas la liste France-entière, pas une dérivation annonces différée). Détail → DETTE #78.
T2 fait (commit 5f9b84c, validé runtime) : module sterny-react/src/data/villes-lancement.js créé (VILLES_DISPONIBLES verbatim + VILLES_COORDS pour T3) ; HomePage.jsx importe la source unique au lieu de sa constante locale. Zéro changement de comportement (« ren »→Rennes, « par »→« arrive bientôt » identiques).
T3 entamé : HomePage (T2) + RecherchePage migrés sur le module (commits 5f9b84c, 0603966). T3 EN PAUSE ; 5 consommateurs restants (InscriptionPartagerPage, CompleterProfilPage, InscriptionRecherchePage, DashboardLocatairePage, ModifierProfilPage), repris après la barre.
Pivot (demande Côme) : refonte barre /recherche (pièce 5b). Audits faits (2 barres + zone de retrait). Plan acté — Option B : (5b-1) retirer de la barre le champ « Mon rythme » abstrait + filtre Type d'alternance + calendrier « Mes dates » (couplé au rythme abstrait, fiction §29) + filtres dépréciés type_alternance/rythme_pattern + machinerie calendrier (selectedRhythm, genererPatternCalendrier, useEffect seed, handleRythmeSelect/handleCalendarDateClick) ; re-câbler hasRythme sur semainesUtilisateur. Barre → Ville seule, matching conservé via déduction. (5b-2) porter le look pilule homepage dans RecherchePage.css scopé .recherche-hero → avance le fix racine #95. (5b-3, différé) composant <SearchBar> partagé plus tard.
Override manuel des semaines : retiré maintenant, à rebâtir en vrai sélecteur de semaines réelles aligné #93 / recherche-à-la-semaine. Cœur non soldé de #78 : normalisation canonique + dérivation villes-avec-annonces.
Polish homepage (en passant) : message no-match aligné sur les suggestions (commit 4bbfd14) ; clic sur une suggestion de ville lance la recherche directement, plus besoin de re-cliquer la loupe (commit 5f44650).

---

## 2026-06-14 (conv 56 — suite) — suggestions de la barre homepage alignées sur la pilule

**Commité (local, non poussé) :** 000a237 — fix(home): suggestions de villes alignées sur la pilule (suite #95). HomePage.css + HomePage.jsx.

**Fait :** l'autocomplétion de villes de la barre homepage est alignée sur la barre :
- Re-style pour matcher la pilule : panneau blanc, survol gris neutre (au lieu de pêche/orange), bords 999px, ombre alignée, écart respiré, espace sous la barre dans le hero (padding-bas 96px).
- Largeur = barre entière (jusque sous la loupe). Fix collision #95 : `.search-field` était forcé en `position: relative` par la jumelle nue de RecherchePage.css → on force `.hero .search-field { position: static }` + `.hero .search-bar { position: relative }`, la boîte s'ancre sur la pilule. Retrait aussi du `position:relative` inline du champ (HomePage.jsx).
- Texte des items aligné sous la saisie (padding-left 36px).

**Reste (à reprendre en nouvelle conv) :**
- **Point 1 — raccorder les suggestions à la vraie liste de villes disponibles** (même source qu'à l'inscription). Aujourd'hui la homepage a sa propre logique (Rennes + « STERNY arrive bientôt » sinon). Chantier fonctionnel/données, lié au référentiel villes DETTE #78. À auditer : source des villes à l'inscription vs homepage, puis brancher.
- (b) Refonte barre /recherche (champ rythme abstrait + filtres dépréciés rythme_pattern/type_alternance).
- Point 3 mobile homepage : différé au chantier mobile global (DETTE #44).

---

## 2026-06-14 (conv 56) — pièce 5 (a) : barre de recherche homepage affinée + collision #95 (volet homepage) réglée

**Commité (local, non poussé) :** 68d221e — fix(home): barre de recherche affinée + collision CSS #95 (volet homepage). 2 fichiers (HomePage.css, HomePage.jsx).

**Polish desktop de la barre (validé runtime) :**
- Ombre adoucie : `0 8px 24px rgba(0,0,0,0.12)` (liseré blanc retiré, redondant avec le border).
- Hauteur réduite : input/bouton 40px, padding barre 4px, marge bouton 3px → pilule ≈ 54px (finesse Google/Airbnb).
- Placeholder « Ex: Rennes, Nantes... » → « Dans quelle ville cherches-tu ? » (tutoiement, oriente vers la ville).

**Cause racine élucidée** (les réductions de taille ne prenaient pas) : `.search-field` et son `input` étaient NON scopés dans HomePage.css → même spécificité que leurs jumelles dans RecherchePage.css (chargé après) → RecherchePage gagnait et forçait `input: 48px` + 8px de padding vertical. Fix : scoping `.hero` sur les 14 sélecteurs `.search-field`/`.search-btn` de HomePage.css (0,2,0 > 0,1,0), aucune valeur changée, RecherchePage.css et `@media` mobile non touchés. → volet homepage de la DETTE #95 réglé.

**Reste pièce 5 :**
- (b) Refonte barre /recherche : retrait du champ « rythme » abstrait (déduit du profil) + retrait des filtres/colonnes dépréciés `rythme_pattern` et `type_alternance`.
- Point 3 du polish homepage NON fait : bouton loupe pleine largeur en mobile (`@media ≤768px`, `align-items:stretch`, `.search-bar`/`.search-field` encore non scopés en mobile — cf. #95).
- Dettes liées ouvertes : #95 (volet RecherchePage + @media mobile), #96 (code mort homepage).

## 2026-06-13 (conv 55) — Décision recherche : vitrine visiteur vs matching connecté (fond tranché, pré-visuel)

Décision produit actée (→ VISION). Le visiteur non-connecté ne reçoit pas de matching (rythme inconnu) : vitrine par ville, annonces sans compatibilité. À l'arrivée sur /recherche, modal d'invitation à créer un compte par-dessus les résultats (fond flouté, fermable par croix — invitation, pas mur). Matching par semaines exclusif au connecté. La promesse produit devient la carotte d'acquisition.

Conséquence d'exécution (déjà VISION §557) : retrait des 2 filtres dépréciés de RecherchePage — type_alternance (l.602-603), rythme_pattern (l.612-616).

Champ « Mon rythme » abstrait (symmetric/asymmetric/custom) : fiction au sens §29, à retirer de la barre. Saisie manuelle « MES DATES » (override déduction, l.311) : conservée côté connecté, à découpler du pattern abstrait (sort exact tranché au visuel).

Audit barre (lecture seule, conv 55) : sterny-react/src/pages/public/RecherchePage.jsx = 4 champs (Ville, Type, Mon rythme conditionnel, Mes dates) + bouton. Câblage pièce 1 à préserver (l.6, 264-275, 310-314, 667-693). Barre identique connecté/visiteur aujourd'hui.

Reste (pièce 5) : direction visuelle (Côme) → refonte barre visiteur → modal invitation → retrait filtres dépréciés. Une tranche à la fois.

---

## 2026-06-13 (conv 55) — pièce 5 entamée : modal visiteur + barre homepage ville-seule

**Contexte.** Pièce 5 du socle recherche = nettoyage des barres (la barre demandait encore un rythme désormais déduit) + cas visiteur non-connecté. Décision « vitrine visiteur » déjà loguée (VISION + commit docs 31c8c5c) : un visiteur sans EDT voit une vitrine par ville (pas de matching), avec un modal d'invitation à créer un compte.

**Livré conv 55 :**
- **Modal d'invitation visiteur** sur /recherche (commit feat d7cc0f1) : InvitationModal.jsx/.css, affiché si `!user` à l'arrivée, fond flouté + croix (invitation, pas mur). Grammaire calquée sur RhythmRequiredPopup (référent modales, DETTE #81).
- **Barre homepage en « ville seule »** (commit feat de cette clôture) : ne demande plus que la ville pour lancer la recherche (retrait UI des champs Type d'alternance / Rythme / Dates — états/handlers conservés, nettoyage = DETTE #96). Style pilule (radius 999px) + bouton loupe rond orange. Pont ville homepage → /recherche?ville=X déjà câblé. Validé runtime desktop.

**Bug CSS résolu en passant :** la pilule ne s'appliquait pas car `.search-bar` est une classe globale dupliquée — RecherchePage.css:108 (`border-radius:14px`) écrasait HomePage. Fix : scoper la règle homepage en `.hero .search-bar` (0,2,0). Tracé en DETTE #95.

**Reste pièce 5 :**
- Polish finesse de la barre homepage (ombre lourde, hauteur, finition mobile : bouton loupe pleine largeur en colonne) → à reprendre œil neuf.
- Refonte de la barre de /recherche (retrait du champ « rythme » abstrait + retrait des filtres/colonnes dépréciés rythme_pattern et type_alternance).

---

## 2026-06-12 (conv 54 suite) — CHANGEMENT DE CAP : priorité à la recherche (cœur de la mise en relation)

**Décision (Côme).** Réordonner les chantiers. La recherche est le cœur de Sterny (proposer les bonnes annonces selon le rythme) ; construire la fin du parcours (candidature, contrat) avant elle = bâtir le toit avant les fondations.
**Nouvel ordre de travail :** recherche/homepage (liées) → page logement (qui change avec le nouveau modèle) → candidature → (plus loin) contrat. Suit le parcours réel de l'utilisateur ET l'ordre des dépendances.
**Pause actée :** les chantiers de refonte du dashboard (états vides, etc.) sont mis EN PAUSE.
**Déclencheur :** la conception de l'auto-sélection des semaines à la candidature a révélé que la déduction des semaines (croisement rythme × ville × offre, règle posée cette session) EST la logique de matching/recherche. Impossible de bâtir la candidature proprement sans avoir d'abord posé la recherche. L'extraction WeekGrid tentée puis annulée était le symptôme du mauvais ordre.
**Rien de perdu :** (1) la fondation de données #93 (candidatures.semaines_demandees + table semaines_reservees, TRANCHE 1 livrée) sert directement la recherche (couverture par semaine = offre moins registre) ; (2) la règle de déduction conçue se reprend telle quelle dans la recherche.
**Réordonnancement #93 :** tranche C (couverture calculée + visibilité par semaine) migre dans le chantier recherche (#48) ; tranche A (capture candidature) passe en fin ; tranche B (verrou signature) plus loin (contrat, gated avocat).
**Garde :** la recherche (#48) est un gros chantier (bloquant pré-prod, 6 sous-problèmes : scoring, présentation non-décourageante, composition multi-logements « jusqu'à tout combler », tension hôte/locataire, UX du parcours fragmenté, promesse produit). À DÉCOUPER en tranches, ne pas refaire d'un bloc.
**Prochain pas :** démarrer la recherche par un audit lecture seule de l'existant, puis un premier petit morceau — pas tout d'un coup.

---

## 2026-06-12 (conv 54) — DETTE #93 TRANCHE 1 livrée : fondation de données multi-locataires (validée runtime)

**Périmètre : fondation de données seulement, additive, zéro changement de comportement.** Capture UI, refonte verrou signature, calcul couverture/visibilité = sessions séparées (non touchés).
**Livré (commit feat sur feat/unification-inscription) :**
- Migration 20260612130950 : colonne `candidatures.semaines_demandees` jsonb NOT NULL DEFAULT '[]' (la demande = lundis ISO). Backfill auto par le défaut, aucune semaine fabriquée pour les candidatures existantes ; insert LogementPage inchangé.
- Migration 20260612130951 : table registre `semaines_reservees` (id uuid pk ; annonce_id NOT NULL FK annonces CASCADE ; semaine date ; contrat_id + locataire_id NULLABLES FK contrats/users CASCADE ; created_at). Contraintes : UNIQUE(annonce_id, semaine) = exclusion dans la base ; CHECK ISODOW=1 (refuse toute date non-lundi) ; RLS ENABLE sans policy (verrouillée côté API client, aucun code ne la lit/écrit en T1).
- `seed.sql` : annonce test → disponibilites_pattern = 4 lundis (2026-09-07/09-21/10-05/10-19) ; candidature test → semaines_demandees = 2 lundis (09-07, 10-05). Registre seedé VIDE (aucun contrat signé = état correct).
**Validé runtime (local 54322) :** db reset rejoue 11 migrations + seed sans erreur. Unicité : 2e insert (2026-09-07) rejeté sur semaines_reservees_annonce_semaine_key. Lundi : 2026-09-08 (mardi) rejeté sur semaines_reservees_semaine_is_monday. (psql absent du PATH hôte → tests via docker exec conteneur DB.)
**Dette transitoire tracée (#93) :** contrat_id/locataire_id nullables en T1 → resserrer NOT NULL au lot signature.
**Reste #93 (sessions séparées) :** (A) UI capture des semaines à la candidature ; (B) refonte verrou signature (supprimer disponible=false + auto-refus + paiement_ok → INSERT registre + NOT NULL + policies RLS registre) ; (C) couverture calculée + visibilité filtrée par semaine. + pont UI « candidature acceptée → contrat » (lot mûr conv 52, indépendant).
**Working tree (ne jamais stager) :** bypass CreerAnnoncePage.jsx, lot 2 #83 DashboardProprietaire .jsx/.css, docs untracked.

---

## 2026-06-12 (conv 53) — Conception du modèle multi-locataires (DETTE #93) : faite et loguée

**Session de CONCEPTION (aucun code).** Trois livrables.
- **(a) Analyse Airbnb (mécanique/UX seulement)** : candidature Sterny = « demande de réservation » Airbnb (hôte accepte, non-exclusif jusqu'au verrou). 3 calendriers à croiser (offre du logement + demande de chaque locataire, chacun un sous-ensemble de son hors-rythme). Conflit Sterny = au niveau de la semaine, pas de l'annonce.
- **(b) Modèle de capacité — CONÇU, validé** (schéma réel audité) : (1) `candidatures.semaines_demandees` jsonb ; (2) table registre 1-ligne-par-semaine + UNIQUE(annonce_id, semaine) ; (3) couverture calculée, jamais stockée. Capacité = ensemble des semaines libres, pas un nombre. Verrou #93 reconçu : suppression disponible=false + auto-refus + paiement_ok ; remplacés par insertion au registre + visibilité par intersection de semaines. `annonces.disponible` déprécié.
- **(c) Juridique parqué** : 4 points avocat → QUESTIONS-PROFESSIONNELS Q-AVO-006 à 009.

**Audit schéma (lecture seule)** : annonces sans capacité, disponible binaire. candidatures sans semaines, CHECK = {en_attente,acceptee,refusee}, AUCUNE unicité. contrats = période globale sans semaine, 1 contrat = 1 locataire. Drift paiement_ok confirmé.

**Décisions loguées** : VISION (section multi-locataires étoffée) ; DETTE #93 (« conçu ») ; idees-en-attente (recherche à la semaine) ; QUESTIONS-PROFESSIONNELS (Q-AVO-006 à 009).

**Emboîtement** : #93 = offre (1 logement, N locataires) ; #48 = demande (1 locataire, N logements + score).

**Reste (implémentation, sessions séparées)** : migration `semaines_demandees` + table registre + unicité ; refonte verrou signature ; couverture + visibilité filtrée par semaine ; UI semaines à la candidature. + pont UI « candidature acceptée → contrat » (lot mûr conv 52, distinct). Working tree inchangé (ne jamais stager : bypass CreerAnnoncePage, lot 2 #83, untracked docs).

---

## 2026-06-11 (conv 52 suite) — Audit maillon « acceptée → contrat » + décision conception multi-locataires
**Audit lecture seule (cartographie) :** le maillon candidature acceptée → contrat a un TROU CENTRAL = le pont UI manque. Après acceptation, aucun bouton ne mène au contrat, ni côté hôte ni côté locataire (candidature acceptée orpheline dans le dashboard fusionné). MAIS la plomberie existe : /contrat-location?match_id=<candidature_id> (ContratLocationPage, src/pages/transaction/) fait find-or-create du contrat, gère la signature (réelle : hash + IP + signatures_audit), puis renvoie vers /paiement. État mort à brancher : locataireAccepte (calculé, jamais affiché). Seul tunnel existant vers le contrat = ancien DashboardProprietairePage (/match-confirmation), non raccordé au fusionné.
**Prochain lot d'exécution identifié (mûr, indépendant de la décision multi) :** le PONT UI — bouton « acceptée → contrat » dans le dashboard fusionné (+ brancher locataireAccepte). Tester jusqu'à l'arrivée sur la page contrat, S'ARRÊTER avant la signature.
**Décision produit actée (→ VISION) :** conception du modèle multi-locataires (#93) engagée DÈS MAINTENANT. Principe : « jamais de match parfait » (couverture partielle gérée explicitement). Méthode : analyse Airbnb (mécanique/UX uniquement, pas le juridique). Conception en conversation dédiée.
**Gated juridique rappelés :** signature eIDAS niveau 1 sans PDF (P0, avocat) ; sous-location multi-occupants (avocat) ; paiement (non audité).
**Reste :** pont UI (à construire) ; conv dédiée multi-locataires ; #76 ; #94 ; #92 refus (gated) ; lot copie UI (accents libellés statiques).

---

## 2026-06-11 (conv 52) — Accents badges candidature côté locataire/hôte (cohérence conv 50)
**Livré (commit 3800d51, à pousser)** : les libellés de badge de statut candidature qui affichaient « Acceptee »/« Refusee » sans accent sont corrigés en « Acceptée »/« Refusée » dans les 2 blocs restants du dashboard fusionné : « Tes candidatures » (envoyées par le locataire) et « Tes candidatures envoyées » (vue hôte). Aligne sur « Candidatures reçues » déjà corrigée en conv 50. Affichage uniquement (statutLabel) ; statutClass et la valeur DB ('acceptee'/'refusee') inchangés. Validé runtime côté locataire (db reset → accept hôte → badge « Acceptée »). Bloc 3 (hôte) non testable avec le seed actuel (aucune candidature envoyée par l'hôte), fix identique au bloc 1, couvert par revue de diff.
**Suivi (commit 7511b97)** : le « Bonjour Lea » au dashboard était une donnée de seed ('Lea'), PAS un bug d'app — audit confirme zéro normalisation sur l'affichage du prénom (les normalize() du front servent au matching/recherche). seed.sql corrigé 'Lea'→'Léa', db reset, prénom 'Léa' confirmé en base. Lot copie distinct identifié (accents des libellés statiques de l'UI), non traité.
**Reste** : #92 refus/annulation + motif (gated avocat immo + DPO) ; #76 (pastille ville les_deux) ; #93 (capacité §1 + verrou signature + drift paiement_ok) ; #94 (expéditeur système) ; suite revue MVP (création/affichage annonce → match → contrat → signature → paiement).

---

## 2026-06-11 (conv 51) — #92 partie simple livrée : message d'acceptation au locataire (re-route cloche → messagerie)
**Livré (commit fe46fd0, poussé)** : à l'acceptation d'une candidature, `handleAccepterCandidature` (DashboardLocatairePage.jsx) envoie automatiquement un message au locataire dans la messagerie (table `messages`), en best-effort (un échec n'altère ni l'acceptation ni l'UI). Texte personnalisé au prénom : « Salut {prénom} ! Bonne nouvelle, j'ai accepté ta candidature. N'hésite pas si tu as des questions. ». expediteur_id = hôte (imposé RLS), destinataire_id = locataire, annonce_id rattaché (prépare la future carte). Validé runtime (db reset + accept → message reçu dans /messages côté locataire).
**Pivot de canal acté** : la cloche de notifications est ABANDONNÉE — NotificationBell + HamburgerMenu (seuls lecteurs de notifications_in_app) ne sont montés nulle part = code mort (→ DETTE #21). Les notifs candidature passent désormais par la messagerie. L'insert notifications_in_app du 1er essai a été retiré.
**Limite actée** : pas d'expéditeur « système/Sterny » possible (RLS messages impose expediteur = auth.uid()) → le message vient de l'hôte (→ DETTE #94).
**Périmètre #92** : SEULE l'acceptation est livrée. Refus + annulation + motif restent GATÉS (avocat immo + DPO).
**Reste** : accent « Acceptée » côté locataire (badge Tes candidatures, NON fait) ; #92 refus/motif (gated) ; #76 (pastille ville les_deux) ; #93 (capacité §1) ; suite revue MVP.

---

## 2026-06-11 (conv 50) — M4 livré : accepter/refuser/annuler candidature côté hôte (#90 résolue)
**Livré (commit a6a7802, poussé)** : dashboard hôte — Accepter/Refuser (en_attente) + Annuler (acceptee/refusee → en_attente) par candidature reçue, via modale de confirmation (forme #81, Accepter vert / Refuser rouge / Annuler navy, lien Retour gris). Transition candidatures.statut conforme CHECK ; non-exclusif ; réversible ; maj UI locale sans reload ; RLS candidatures_update suffisante. Accents badges corrigés.
**Étape 5 candidature bouclée côté hôte** (M1 candidater → M4 accepter/refuser/annuler).
**Décisions loguées** : non-exclusivité + réversibilité (VISION) ; notifs locataire + justification → DETTE #92 (gated juridique).
**Flags audit → dettes** : #93 (capacité §1 + verrou signature ; + notes paiement_ok drift et UPDATE USING(true)).
**Reste** : #76 (pastille ville les_deux) ; notif locataire (#92) ; suite revue MVP (création/affichage annonce, match→contrat→signature→paiement). Rappel : le bloc conv 49 en tête mentionnait #9 comme encore présente — #9 est résolue (corrigé ici).

---

## 2026-06-10 (conv 49) — Env local seedé (#91 résolue) + M2a validé runtime

**DETTE #91 RÉSOLUE.** `supabase/seed.sql` peuple un scénario de test étape 5 : 2 comptes auth (hote@/locataire@sterny.test, mdp `sterny-dev`, via crypt/gen_salt('bf') + auth.identities), leurs profils public.users, 1 annonce Rennes, 1 candidature en_attente. `supabase db reset` rejoue les 9 migrations (dont fix #14) puis le seed sans erreur. **Convention actée : le seed ne s'exécute QUE via `db reset`** (garantit #14 appliqué avant l'INSERT candidature).

**Fix #14 reconfirmé sur base fraîche** : l'INSERT candidature du seed déclenche trg_notif_candidature → notif pour l'hôte (destinataire = annonces.user_id), lien=/dashboard.

**M2a VALIDÉ RUNTIME** (connecté hote@sterny.test en local) : la candidature de Léa s'affiche dans « Candidatures reçues » (badge En attente) alors que l'annonce est à Rennes et la ville d'école de l'hôte = Nantes → le filtre ville parasite est bien retiré.

**Console au test** : 2 dettes connues, non bloquantes — #71 (mur :4747/health ERR_CONNECTION_REFUSED, bruit Agentation) et #9 (2× 400 sur .../created_at.desc = candidatures lues par user_id au lieu de locataire_id, isolée par try/catch, n'empêche pas M2a). #9 désormais confirmée en runtime.

**Working tree (ne jamais stager)** : bypass CreerAnnoncePage, lot 2 #83 proprio, 3 untracked docs.

**Reste** : #76 (pastille « 🔍 Nantes » affichée à tort pour l'hôte) ; M4/#90 (accepter/refuser côté hôte) ; suite revue MVP étape 5.

---

## 2026-06-10 (conv 48) — Étape 5 candidature : audit complet + fix M2a (non testé runtime) ; découverte env local vide

**Audit flux candidature (lecture seule, 2 passes Claude Code) :**
- M1 insertion (clic « Candidater ») : OK, débloqué par #14. LogementPage.jsx:727-735 (insert {annonce_id, locataire_id, message, statut:'en_attente'}).
- M2a lecture candidatures reçues : DashboardLocatairePage.jsx:317-342. Filtre ville parasite `.eq('ville', userData.ville_ecole)` (l.319+321) qui masque les candidatures reçues quand l'annonce n'est pas dans la ville d'école. FIX appliqué (filtre supprimé, charge toutes les annonces de l'hôte par user_id), diff validé par revue, NON testé runtime.
- M2b lecture candidatures envoyées hôte : l.306-315, 400 sur `candidatures.user_id` (colonne inexistante → doit être `locataire_id`) = DETTE #9 requalifiée. Latéral (try/catch isolé l.314, n'impacte pas M2a). NON corrigé.
- M2-RLS : policies SELECT en USING(true) sur candidatures ET annonces → PAS la cause du 400. Note sécurité : toutes les candidatures lisibles par tout authentifié → à verser Catégorie B (conformité).
- M3 rendu « Candidatures reçues » : DashboardLocatairePage.jsx:955-989, affichage seul (avatar/nom/école/badge statut), OK.
- M4 accepter/refuser côté hôte : ABSENT du dashboard fusionné. Transition en_attente→acceptee/refusee n'existe que dans ContratLocationPage. = feature manquante (nouvelle dette).

**Working tree (non commité, à ne pas perdre) :** patch M2a dans DashboardLocatairePage.jsx (suppression du filtre ville, l.319-323) — à TESTER en runtime puis committer une fois l'env local monté. + bypass CreerAnnoncePage, lot 2 #83, 3 untracked docs (ne jamais stager).

**Découverte env (majeure) :** la base LOCALE (54322) ne contient qu'1 compte (comefourel@gmail.com), 0 annonce, 0 candidature. Toutes les données de test (12 comptes seed, annonce Rennes, come.fourel@rennes.archi.fr) sont sur la base DISTANTE (rkffpmuhyvwwgfbdqmqr). Le dev se fait de facto sur le distant. `.env` pointe distant, `.env.local` pointe local (127.0.0.1:54321) et surcharge `.env` au `npm run dev` → ~1h de confusion local/prod pendant le test (reset mdp, insert candidature, vérif trigger #14 appliqués sur le DISTANT, pas le local). AUCUN test runtime local n'est possible tant que le local n'est pas peuplé.

**Prochaine session (dédiée) :** monter un environnement de test local propre (seed reproductible, vérifier trigger #14 en local, `supabase db reset`), PUIS valider M2a en runtime et reprendre la revue MVP étape 5 (puis construire M4).

---

## 2026-06-10 (conv 47 suite) — Bandeau alerte locataire : accents + casse normale globale

**Livré (validé runtime, build avant push) :**
- `DashboardLocatairePage.jsx` : accents du bandeau alerte (l.725 "etre notifie des qu'" → accentué ; l.727 "Creer une alerte" → "Créer" accentué).
- `CreerAnnoncePage.css` : retrait de `text-transform:uppercase !important` + `letter-spacing:1px !important` de la règle globale `.btn` (l.1593). Effet GLOBAL : tous les `.btn` de l'app repassent en casse normale (CTA dashboard, RecherchePage, MatchConfirmation, page Créer annonce). Validé par Côme.

**Origine :** la fuite `.btn` !important de CreerAnnoncePage mettait les CTA en majuscules mais pas le bouton alerte (`.alerte-bandeau-btn`, sans `.btn`) → incohérence de casse repérée sur capture. Diagnostic + traçage : DETTE #88.

**Décision casse :** casse normale partout (après allers-retours). Uppercase fuyant retiré ; le reste de la fuite (`.btn` taille !important) reste en DETTE #88.

**Working tree (ne jamais stager) :** CreerAnnoncePage.jsx (bypass), DashboardProprietairePage lot 2 #83 (.jsx/.css), 3 untracked docs.

---

## 2026-06-10 (conv 47) — Refonte dashboard locataire Lot 2 : états vides dégonflés

**Livré (validé runtime, build avant push) :** les 4 encarts état vide du dashboard locataire (Favoris, Candidatures, Tes annonces, Candidatures reçues) sont dégonflés.
- `DashboardLocatairePage.css` : `.empty-icon`/`.empty-icon svg`/`.empty-text` scopés sous `.dashboard-container` + valeurs réduites (cercle 64->44px, icône 28->20px, marges 16->10 et 20->14). JSX inchangé (4 blocs dupliqués inline, pas de composant <EmptyState/>).
- Effet double : dégonflage + neutralisation de la collision globale `.empty-icon` côté locataire (DETTE #87, même famille que #86).

**Validé par Côme en npm run dev :** rendu compact OK, cercle conservé tel quel (44px).

**Reste / parqué (refonte dashboard) :** bouton CTA orange des états vides (« Parcourir les annonces ») proportionnellement gros — classe probablement partagée `.btn-orange`, à auditer avant de toucher ; header/bloc ville ; mobile/responsive ruban rythme ; revue proprio (icônes titres + #86 proprio + scope `.empty-icon` proprio + œil #83 + /profil).

**Working tree (ne jamais stager) :** DashboardProprietairePage lot 2 #83 (.jsx/.css), bypass CreerAnnoncePage, 3 untracked docs.

---

## 2026-06-10 (conv 46 suite) — Ruban « Ton rythme » navigable

**Livré (validé runtime + build vert) :** la carte rythme passe de statique à navigable.
- RythmeCarousel.jsx : état `offset` (décalage de la fenêtre vs semaine courante), flèches chevron ‹ ›, bouton « Aujourd'hui » (apparaît dès offset ≠ 0), bornes (flèches désactivées au début/fin du rythme connu). Badge « Cette semaine / Prochaine semaine » affiché uniquement à offset 0. Fenêtre fisheye (WINDOW=3, 7 tuiles, placeholders hors bornes) conservée.
- Flèches = chevrons nus gris (sans cercle) pour s'accorder aux tuiles carrées ; bloc [‹ ruban ›] recentré dans la carte.
- Tuiles latérales : date de début seule (« 8 juin ») via nouveau helper `formatWeekStartFR` (formatters.js) — évite le débordement des libellés au passage d'un mois à l'autre (« 29 juin–5 juillet »). Tuile centrale : garde la plage complète.

**Décision design actée :** la version « fisheye avec relief » de Côme est conservée ; un bandeau plat uniforme a été proposé puis rejeté (« trop plat »). Marquage semaine courante = liseré/badge, pas un gros bloc.

**Parqué (refonte dashboard) :** Lot 2 états vides ; header/bloc ville ; mobile/responsive du ruban (non-responsive, largeurs fixes — DETTE à créer quand on attaque le mobile) ; revue proprio (retirer aussi les icônes, #86, œil #83, /profil).

**Idée loguée (idees-en-attente) :** indicateur de couverture logement sur les tuiles (rainure « planche à découper » vert/rouge) — dépend de la donnée match→contrat, bloquée par DETTE #14, à construire en session dédiée.

---

## 2026-06-09 (conv 46) — Refonte hiérarchie dashboard locataire : Lot 1 (titres + carte rythme)

**Objectif :** rendre /dashboard (locataire/fusionné) propre et hiérarchisé. Diagnostic conv 45 repris. Correction factuelle : le titre de la carte rythme n'était PAS gris/style auth (note conv 45 démentie) mais déjà orange uppercase — seule vraie différence avec les `.dp-card-title` = l'icône carrée.

**Cible visuelle actée :** (1) carte rythme = carte « héros » / point d'entrée du dashboard (cohérent VISION §1, le rythme = cœur de Sterny), distinguée par son contenu (ruban coloré), pas par un style de carte différent ; (2) une seule grammaire de carte ; (3) titres purement typographiques, icônes déco retirées (cohérent design-rules : couleur de marque réservée aux éléments à fort impact) ; (4) voix tutoiement.

**Livré (Lot 1, validé runtime + build vert) :**
- DashboardLocatairePage.jsx : retrait des 7 icônes `.dp-card-icon`. Titres passés en tutoiement + accents (Tes locations actives, Tes favoris, Tes candidatures, Ton/Tes annonce(s), Ton propriétaire, Candidatures reçues, Tes candidatures envoyées).
- RythmeCarousel.css : `.rythme-card` alignée sur `.dp-card` (radius 16, border 1px, padding 24, box-shadow `0 4px 20px rgba(30,41,59,0.06)`) ; `.rythme-title` alignée (15px, letter-spacing 2px). `min-height:204px` + `margin-bottom:16px` conservés (équilibre interne = Lot 3).

**Décision copie loguée :** Sterny tutoie l'utilisateur sur le dashboard (cohérent avec « Bonjour X », « Clique… », « Active une alerte »). Libellés 1ʳᵉ personne (« Mes… ») abandonnés. Convention à tenir sur les futures pages.

**Divergence assumée :** CSS partagé `.dp-card-icon`/`.dp-card-title` (dans DashboardProprietairePage.css) non touché → le dashboard proprio garde ses icônes. À résorber lors de la revue proprio parquée. État final cohérent.

**Reste / parqué (refonte) :** Lot 2 = dégonfler les états vides (cercle 64px + texte + bouton, trop volumineux) ; Lot 3 = header/bloc ville + équilibre interne ruban rythme (ruban calé à gauche, vide à droite — mini-audit RythmeCarousel requis) ; polish copie hors titres (« cœur », « Créer », « être notifié », « proprietaire » du corps) = lot copie parqué.

**Working tree (ne jamais stager) :** DashboardProprietairePage lot 2 #83 (.jsx/.css), bypass CreerAnnoncePage, 3 untracked docs.

---

## 2026-06-09 (conv 45 suite) — #76 mono corrigé + #86 locataire validé

**Origine :** en voulant aérer le dashboard locataire, Côme constate que le bloc « ville + bouton + » manque sous « Bonjour Côme » = symptôme de #76. Vérif base locale (locataire) : `ville_ecole='Rennes'` + `statut_ville_ecole='recherche'`, colonne dépréciée `ville` VIDE → wizard conforme, dashboard qui lit la mauvaise colonne. #76 = bug de lecture (note conv 43 démentie).

**Livré (feat) :** helper `getVillesUtilisateur(user)` dans `utils/deriveVilleColonnes.js` ; branché sur le cas MONO (gate + affichage + flux recherche). Bloc « Rennes + bouton + » ré-affiché. Validé runtime.

**#86 débloqué :** modale « Ajouter une ville de recherche » s'ouvre enfin (fix `55c8a97` validé). Couverture #86 : /parametres + dashboard locataire.

**Reste / parqué :** (1) cas les_deux #76 (mapping figé à dériver de `statut_*`, non testable sans compte les_deux) ; (2) refonte visuelle hiérarchie du dashboard — objectif initial de la session, reporté après #76 : titres de sections incohérents (carte rythme style auth vs sections orange+icône), point d'entrée visuel, équilibre carte rythme. Séquencage technique-avant-esthétique conforme à l'ordre initial.

**Working tree (ne jamais stager) :** DashboardProprietairePage lot 2 #83 (.jsx/.css), bypass CreerAnnoncePage, 3 untracked docs.

---

## 2026-06-09 (conv 45) — Fix régression bloquante /dashboard (page blanche)

**Régression P0 corrigée (commit df84781).** /dashboard (locataire/fusionné, sert les 3 profils alternants) rendait une page blanche : TypeError: Cannot read properties of null (reading 'rhythm_calendar') à DashboardLocatairePage.jsx:662. Cause = la carte rythme conv 44 (commit 83f1951) lisait userData.rhythm_calendar SANS chaînage optionnel, alors que tout le reste du fichier est en userData?. ; au 1er render userData est null → crash → React démonte l'arbre. Déjà poussé sur origin → /dashboard cassé pour tous les comptes (local + prépod).

**Fix** : l.662 userData.rhythm_calendar → userData?.rhythm_calendar. Au 1er render weeks reçoit undefined, déjà géré par RythmeCarousel (état vide). Validé runtime + build vert.

**Leçon** : la carte rythme conv 44 n'avait été validée qu'en maquette, pas runtime sur /dashboard avec un userData réel ; la réserve n°3 de sa création s'est matérialisée. Bruit console concomitant (Agentation :4747 ERR_CONNECTION_REFUSED) = DETTE #71, non lié.

**Reprise étape 2 (dashboards)** : revue DashboardProprietairePage — fix #86 proprio prêt (override scopé .dashboard-proprio-container .modal-overlay { display:flex }), œil #83 lot 2 proprio patché non commité, bug /profil sans DETTE (à créer). Working tree à ne jamais stager : lot 2 #83 proprio (.jsx/.css), bypass CreerAnnoncePage, 3 untracked docs.

---

## 2026-06-09 (conv 44) — Carte « Ton rythme » (carrousel) sur DashboardLocatairePage

**Livré (voir git log pour l'état).** Carte rythme sur /dashboard, visible par les 3 profils alternants (insérée hors blocs conditionnels, entre header et LOCATIONS ACTIVES). Composant `components/rhythm/RythmeCarousel.jsx` (+ `.css`).

**1er lecteur de `rhythm_calendar` en prod** (jusqu'ici « aucun lecteur aval », audit conv 37). Lit `userData.rhythm_calendar` déjà chargé via `select('*')`. Format confirmé : `{ week_start:"YYYY-MM-DD" lundi, status:'school'|'company' }`.

**Logique** : centre = 1ʳᵉ semaine ≥ lundi courant (sinon dernière connue) ; fenêtre ±3 (`WINDOW`) ; slots hors bornes = placeholders gris → équilibre quand le passé est absent (capture futur-only #80). Helpers réutilisables ajoutés : `currentMondayISO` (academicYear.js), `formatWeekRangeFR(ws,{tight})` (formatters.js).

**Design (validé en maquette)** : carte blanche dp-card-like (`margin-bottom:16px` aligné sur `.dp-card`), titre style auth, tuiles dégradées + filet de lumière (école orange / entreprise navy / passé gris), bloc central 116px coloré selon statut + halo radial de carte teinté. École et Entreprise = design identique. Pas de légende, pas d'icône interne. « Voir le détail » retiré (aucune surface rythme → lien mort évité, #82b).

**À caler en live si besoin** : `WINDOW` si le ruban flotte sur carte large ; `padding`/`min-height` vertical ; `text-align` titre.

---

## 2026-06-09 (conv 43) — Bilan MVP étape 2 : DashboardLocatairePage (refactor email_proprietaire + fix #86 + découverte gate ville #76)

**Audit lecture seule DashboardLocatairePage (/dashboard, sert les 3 types alternants).** Structure saine : route sous DashboardLayout (auth only, aucun filtre type_user) ; aucune sortie anticipée composant → pas de risque « page blanche » ; 0 champ password (hors #83) ; appels sortants = send-alert-email, delete-account, export-data, send-proprietaire-invitation.

**Commit 5827005 — refactor(dashboard) : code mort email_proprietaire retiré.** `from('users').update({ email_proprietaire })` visait une colonne ABSENTE de users (n'existe que sur mises_en_relation) → no-op silencieux ; son unique lecteur (fallback « old hote users ») renvoyait toujours undefined → mort. Retirés en paire (23 suppressions). Envoi (invoke send-proprietaire-invitation) + persistance (insert mises_en_relation) inchangés. VALIDÉ runtime : /dashboard charge intégralement, 0 erreur/log `users`/`email_proprietaire` (filtre console).

**Commit 55c8a97 — fix(dashboard) #86 instance n°2 : override scopé modale ville.** `.dashboard-container .modal-overlay { display:flex }` (spécificité > globale), pattern identique au fix /parametres (1898c81). Non-régressif. ⚠️ NON validé runtime : la modale reste inatteignable (voir gate ci-dessous) — commit sur revue, validation différée à la levée du gate #76.

**Découverte (→ #76) : bascule les_deux + ajout de ville CASSÉS.** Le menu « + » (qui ouvre la modale ville ET « proposer mon logement » → bascule les_deux) est gaté l.610 par `userData.ville` (colonne dépréciée NON peuplée par le wizard actuel). Pour tout compte du nouveau parcours, ce champ est vide → le menu « + » ne se rend jamais → la montée locataire→les_deux et l'ajout d'une ville de recherche sont INACCESSIBLES (feature documentée « en place », CONTEXTE §3), et la modale #86 est inatteignable par ce chemin. Correctif = lire ville_ecole/ville_entreprise (chantier #76, après fige de convention).

**Observations à arbitrer (chantier UX dashboards) :** (1) ordre invoke-avant-insert dans envoyerMiseEnRelation → si l'envoi Resend échoue, l'UI reste bloquée sur « Envoi en cours… » et aucune trace n'est gardée ; (2) la carte « Mon propriétaire » s'affiche côté recherche alors que c'est l'alternant qui PROPOSE qui a un proprio à parrainer — qui doit la voir ? ; (3) flux parrainage non testable bout-en-bout en local (send-proprietaire-invitation envoie toujours via Resend, jamais Mailpit).

**Working tree (ne pas stager hors validation) :** Dashboard proprio lot 2 #83 (.jsx/.css), bypass CreerAnnoncePage.jsx, 3 untracked docs.

**Parqués sur cette page :** détection les_deux fragile (statuts, l.104) + lecture userData.ville dépréciée → #76 ; CSS mort .modal-pwd-group → ménage CSS dédié ; accents manquants (« etre notifie », « Creer », « coeur », « candidate a un ») → polish copie groupé.

**Suite étape 2 :** DashboardProprietairePage (débloquer #86 côté proprio, valider l'œil #83 moitié proprio, traiter bug /profil). Puis le gate ville #76 (débloque la bascule les_deux + permet de valider la modale #86).

---

## 2026-06-09 (conv 42) — Bilan MVP étape 2 (dashboards) : /parametres réparée + DETTE #86

**Démarrage étape (2) DASHBOARDS** du bilan MVP (revue page-par-page, visuel + fonctionnel). Audit lecture seule : DashboardLocatairePage (fusionnée, /dashboard), DashboardProprietairePage (/dashboard/proprietaire), DashboardAdminPage ; garde commune DashboardLayout = auth only, aucun filtre type_user (tri par la donnée) ; grammaire `.dp-card` des deux côtés.

**3 trous /parametres corrigés au fil de l'eau (3 commits) :**
- `b56ce1f` fix : page ne rendant que navbar+footer → `.select('… photo_url')` visait une colonne inexistante (réelle = `photo_profil_url`) → échec silencieux → userData null → return null. Validé runtime (connecté).
- `1898c81` fix : boutons « Changer mdp » / « Supprimer compte » semblaient morts → modales montées mais masquées par collision CSS globale `.modal-overlay` (DETTE #86). Override scopé `.parametres-container .modal-overlay { display:flex }`. Validé.
- `6562990` feat : œil afficher/masquer sur les 2 champs de la modale mdp (lot 2 #83, **moitié parametres**). Validé visuellement.

**DETTE #86 créée** (P1, systémique) : `.modal-overlay` redéfinie en conflit dans plusieurs CSS globaux ; le display:none de ContratLocationPage gagne la cascade → masque toute modale sans `.active` dans la zone authentifiée. Fix racine = unifier la convention (chantier dédié, touche ContratLocationPage P0 juridique).

**Lot 2 #83 scindé** : moitié parametres livrée (6562990) ; **moitié Dashboard proprio NON commitée** (œil dans une modale .modal-overlay masquée par #86 sur cette page) → reportée à la revue du dashboard proprio.

**Reste /parametres (non bloquant, tracé) :** accents manquants dans tous les libellés (« Parametres », « SECURITE », « Derniere », « DONNEES », « Deconnexion »…) → polish copie (commit séparé). Structure de page jugée saine MVP (profil, sécurité, export RGPD, suppression, déconnexion).

**Working tree volontairement sale (rappel) :** moitié proprio lot 2 #83 (DashboardProprietairePage .jsx/.css), bypass CreerAnnoncePage.jsx, 3 untracked docs — ne jamais stager.

**Suite étape 2 :** revue DashboardLocatairePage (/dashboard), puis DashboardProprietairePage (débloquer #86 + valider œil proprio + traiter /profil). Bug /profil ouvert (conçue pour profil tiers via ?user_id= ; lien nu cassé pour non-admin) → décision produit à prendre, vérifier d'abord s'il a déjà une DETTE.

---

## 2026-06-08 (conv 41) — Re-skin InscriptionProprietairePage sur grammaire wizard

**Re-skin proprio LIVRÉ** (commit feat — voir git log). `InscriptionProprietairePage.jsx` + `.css` migrés de la grammaire bespoke `ip-*` vers les composants canoniques du wizard, comme ConnexionPage (conv 40) :
- `AuthScreenContainer` remplace `.ip-page`/`.ip-card` (+ suppression du `maxHeight:536px` inline qui plafonnait la carte ; on garde le min-height partagé pour laisser grandir).
- `TextInput` (œil intégré) remplace les `<input>` maison `.ip-group` + le toggle TEXTE `.ip-toggle`.
- `PrimaryButton` remplace `.ip-submit` + spinner maison.
- `OrSeparator`, `GoogleSignInButton` + `AppleSignInButton` (rangée locale `.ip-oauth-row`, labels courts).
- `BottomAuthLinks` pour le footer (branche normale) → « Retour · Déjà un compte ? Se connecter » (l'ancien « Déjà inscrit ? » devient « Déjà un compte ? »). Branche erreur conservée en local (`.ip-back`/`.ip-error`).
- Titre = réplique locale `aw-screen-title` (DETTE #68), identique à ConnexionPage (marges vérifiées égales, pas de collision globale).

**Espacements alignés sur le wizard alternant** (après audit comparatif) : gap formulaire 14→16px, gap grille Prénom/Nom 8→12px, ajout de `flex:1` sur `.ip-form` + `margin-top:auto` sur le wrapper du bouton (bouton plaqué en bas de la carte, comme `.ial-btn-continuer`). Champs eux-mêmes déjà identiques (même `TextInput` : radius 12px / height 44px).

**Placeholders alignés** sur le tutoiement du wizard : « Ton prénom » / « Ton nom » / « Ton adresse email ». Mot de passe laissé en « 6 caractères minimum » (cohérent avec la validation proprio `< 6` — voir DETTE #85).

**CSS mort supprimé** : bloc code parrainage `.ip-parr-*` (champ retiré de longue date) + toutes les classes `.ip-*` rendues mortes par le passage aux composants partagés (vérifié par grep classe-par-classe).

**Logique INTOUCHÉE** (re-skin visuel pur) : décodage token `?r=`, callback OAuth (CHECK 1/2 + extraction nom Google/Apple + INSERT users), `handleGoogleSignup`/`handleAppleSignup` (`redirectTo` ?r=token), `handleSubmit` email (signUp + INSERT `parrain_id`), shake, states. Le re-skin NE résout PAS #55/#70/#84.

**Validé visuellement** (npm run dev) : proprio raccord avec le wizard alternant (champs, espacements, position du bouton), titre /connexion non impacté.

**Nouvelle DETTE #85** : incohérence longueur min mot de passe entre parcours (alternant « 8 » / proprio « 6 »).

**Reste auth avant les dashboards (étape 2 du bilan MVP)** : activer providers OAuth Supabase (#84) + test OTP Mailpit (depuis conv 31).

---

## 2026-06-08 (conv 40) — Bilan complétude MVP + refonte auth (connexion, navbar)

**Nouveau cap.** Démarrage d'un bilan de complétude vers un MVP testable bout-en-bout (inscription → mise en relation → contrat → paiement, en local/préprod). Méthode : revue page-par-page « jusqu'à ce que ça bloque », visuel + fonctionnel ; on corrige au fil de l'eau et on ne passe à la suite que si tout marche. Ordre de construction retenu : (1) auth, (2) dashboards, (3) recherche + création annonce, (4) affichage annonces, (5) candidater + valider candidature, (6) match fonctionnel (contrat / signature / paiement).

**Périmètre matching MVP — ACTÉ.** « Être matché » = deux profils compatibles mis en relation, compatibilité évaluée sur `disponibilites_pattern` (saisi à la main). Le matching automatique via `rhythm_calendar` est POST-MVP (voir DETTE #48), hors périmètre MVP.

**Vérifications fondatrices (Claude Code, lecture seule) :**
- Routing inscription SAIN : le wizard `InscriptionAlternantPage` est bien routé sur `/inscription/alternant` sous Layout public (pas de 404), tous les CTA pointent dessus. La route legacy `/inscription/recherche` est encore déclarée mais orpheline (nettoyage mineur, T6).
- Contrat BDD inscription SOLIDE : la RPC `complete_inscription_alternant` écrit une fiche `users` complète (type_user, 4 colonnes ville/statut, rhythm_calendar, profil_complet, identité, école/année/filière, naissance/sexe), SECURITY INVOKER, idempotente (ON CONFLICT id DO UPDATE), versionnée en migration.
- Audits d'avril (AUDIT-FONCTIONNEL 30/04, INVENTAIRE 25/04) PÉRIMÉS sur la partie inscription (ils décrivent la legacy, antérieurs au wizard conv 28-39) MAIS ENCORE FIDÈLES pour matching / contrat / paiement (ces zones n'ont pas bougé depuis avril — confirmé par les dates git).

**Livré et poussé cette session :**
- `af767fc` feat(auth): refonte ConnexionPage sur grammaire wizard + bouton Apple + animation d'entrée. Migration de la grammaire bespoke `cx-` vers les composants canoniques du wizard (AuthScreenContainer, TextInput avec œil intégré, PrimaryButton, OrSeparator, GoogleSignInButton + AppleSignInButton). Logique de login préservée. Validé visuellement + login email/mdp testé OK.
- `04532f0` feat(nav): CTA auth contextuels selon la page. « Se connecter » masqué sur /connexion, « S'inscrire » masqué sur /inscription*, « S'inscrire » en style discret sur /connexion.

**À faire (runtime / config) :**
- Providers OAuth Google/Apple À ACTIVER côté Supabase : le clic OAuth échoue en local avec « Unsupported provider: provider is not enabled » — c'est de la CONFIG (activer les providers + créer les credentials Google Cloud / Apple Developer), PAS un bug code (URL authorize bien formée). Voir nouvelle DETTE #84. Prérequis au test OAuth réel.
- Test runtime inscription E-1 → E-7 via Mailpit (chemin OTP) toujours NON FAIT (depuis conv 31).

**Findings de bilan (trous bloquants, déjà tracés dans DETTE-TECHNIQUE) :**
- DETTE #14 (P0) ✅ RÉSOLUE 2026-06-10 : trigger `trg_notif_candidature` corrigé — la fonction lit désormais `annonces.user_id` (hôte) au lieu de `annonces.proprietaire_id` (inexistant). Les candidatures s'enregistrent à nouveau ; la chaîne aval (mise en relation → contrat → paiement) est débloquée. SQL appliqué en prod via Dashboard, conservé dans supabase/migrations/20260610181122_fix14_trigger_notif_candidature.sql. Détail dans DETTE-TECHNIQUE #14.
- Signature électronique (ContratLocationPage) = eIDAS niveau 1, sans PDF → P0 juridique, validation avocat requise.
- Paiement : create-stripe-checkout + stripe-webhook déployées ; send-recu-paiement NON déployée ; chaîne jamais testée bout-en-bout.
- /profil (chargement infini) et /parametres (rend que le footer) cassés ; descente `les_deux` non implémentée.

**Working tree (rappel) :** lot 2 DETTE #83 (Dashboard proprio + Paramètres) patché non commité/non validé, bypass `CreerAnnoncePage.jsx`, 3 untracked `docs/` — ne jamais stager.

---

## 2026-06-07 (conv 39) — #83 lots 1 & 4 poussés, lot 3 abandonné, lot 2 en attente ; nouveau cap : bilan complétude MVP

- **#83 lots 1 et 4 LIVRÉS + POUSSÉS** (9e3f802..7f2e795) : lot 1 (commit 70704d5, œil sur les 4 champs mdp des pages profil ModifierProfilPage + ModifierProfilProprietairePage) ; lot 4 (commit 7f2e795, œil sur ConnexionPage en remplacement du toggle texte .cx-toggle). Les deux validés visuellement.
- **#83 lot 3 ABANDONNÉ** : InscriptionRecherchePage = page legacy vouée à suppression (unification Q3 redirection 301 + T6 ; principe anti-double-travail IR/CP, DETTE #61). Le wizard E-7 (parcours cible) a déjà l'œil via TextInput. Modifs IR restaurées (git restore), jamais commitées.
- **#83 périmètre FIGÉ** (grep global type="password") : seuls les 4 champs du lot 2 restent (DashboardProprietairePage 831/835 + ParametresPage 135/139). EtapeCreationCompte = TextInput (déjà équipé). DashboardLocatairePage = CSS .modal-pwd-group résiduel SANS input password en JSX → rien à équiper.
- **#83 lot 2 PATCHÉ (build vert) mais NON validé / NON commité** (working tree : DashboardProprietairePage .jsx/.css + ParametresPage .jsx/.css). Pattern : import PasswordRevealButton, 2 states de visibilité LOCAUX par page (sur Paramètres : locaux, jamais dans le hook useAccountActions), wrapper .pw-field, type dynamique, classe pw-has-reveal, règle CSS .modal-pwd-group input.pw-has-reveal { padding-right: 44px } (spécificité 0,2,1) dans le .css de chaque page.
- **Validation lot 2 BLOQUÉE** par 2 bugs préexistants (hors #83) + pas de compte proprio de test : /parametres (ParametresPage) ne rend QUE le footer ; /profil (ProfilPage) affiche alert « Utilisateur non spécifié » + chargement infini.
- **Auth local** : mdp du compte de test comefourel@gmail.com réinitialisé via SQL (crypt/bcrypt, auth.users, base locale 54322) ; le 400 connexion = mdp oublié (email bien confirmé). Valeur communiquée hors doc.
- **NOUVEAU CAP** : avant toute nouvelle dette cosmétique, chantier prioritaire = bilan de complétude vers un MVP testable bout-en-bout (inscription → matching → contrat → paiement) : cartographier pages OK/cassées/manquantes × parcours, prioriser. Session dédiée, fondée sur AUDIT-FONCTIONNEL-2026-05-04 + INVENTAIRE-PLATEFORME + DETTE-TECHNIQUE.
- **Reprise #83** : régler /parametres ou tester via Dashboard proprio → valider lot 2 → commit feat (git add 4 fichiers par chemin) → push → bouclé.

---

## 2026-06-07 (conv 38) — DETTE #83 lot 0 : composant PasswordRevealButton (œil) + PasswordGate

- **Approche actée (b)** : composant réutilisable contrôlé pour les inputs password natifs, PAS migration vers TextInput (TextInput = composant auth-wizard à grammaire stricte ; 5/6 cibles hors auth → migration = refactor risqué pour gain cosmétique ; l'œil est déjà autonome donc extractible mécaniquement).
- **Créé** : `components/PasswordRevealButton.jsx` + `.css` (dans components/ racine, réutilisable hors auth). Contrôlé (props `visible`/`onToggle`/`disabled`, la page tient l'état). SVG + CSS repris de l'œil TextInput, classes `pw-field`/`pw-reveal`/`pw-has-reveal`, a11y identique (type=button, aria-pressed, aria-label dynamique, focus-visible orange). Convention : masqué = œil ouvert, affiché = œil barré. `.pw-reveal` en inline-flex centré.
- **PasswordGate (pilote)** : state `showPassword`, input dans `.pw-field`, `type` dynamique. Écran tout-inline → `padding-right` 44px posé EN INLINE (`.pw-has-reveal` neutralisée par l'inline → retirée) ; `marginBottom: 12px` déplacé de l'input vers `.pw-field` (sinon la marge gonfle la hauteur du conteneur côté bas → œil trop haut). Validé visuellement (œil aligné, bascule, hover orange, focus clavier, pas de chevauchement).
- **Reste #83** : lot 1 (ModifierProfilPage + ModifierProfilProprietairePage) ; lot 2 (DashboardProprietairePage + ParametresPage) ; lot 3 (InscriptionRecherchePage, lecture 8ter renforcée) ; lot 4 (ConnexionPage : remplacer le toggle texte par l'œil, retirer `.cx-toggle`/`.cx-password`). 1 lot = 1 commit feat. Sur ces écrans (className, pas de padding inline) `.pw-has-reveal` jouera normalement ; vérifier au cas par cas le centrage vertical (marge à déplacer sur le wrapper si besoin).
- **#62 (autofill) / #65 (capitalize)** restent OUVERTES, sans incidence sur #83.
- **Suite conv 38 (post-lot-0)** : lot 1 (ModifierProfilPage + ModifierProfilProprietairePage, 4 champs) PATCHÉ — composant + 2 states de visibilité par page, `.pw-field` autour de l'input seul, règle CSS locale de spécificité par page pour la réserve 44px (padding via sélecteurs descendants plus spécifiques que `.pw-has-reveal`). **NON validé visuellement, NON commité** (working tree). Lots 3/4 (InscriptionRecherchePage routée /inscription/recherche + ConnexionPage) : prompt de patch préparé ; selon `git status`, patch éventuellement appliqué en working tree, **NON validé, NON commité**. Lot 4 = remplacement du toggle TEXTE `.cx-toggle` par l'œil (réutilise `.cx-password` déjà position:relative + state `showPassword` ; padding-right 85→44 ; suppression `.cx-toggle`/`:hover`).
- **⚠️ Working tree non propre à l'ouverture conv 39** : outre le bypass CreerAnnoncePage + 3 untracked préexistants, des fichiers code de #83 (lot 1 ± lots 3/4) sont modifiés NON commités. **Source de vérité = `git status`.** Reprise : valider visuellement chaque écran puis committer par lot (feat, `git add` par chemin explicite ; ne jamais embarquer un lot non validé).
- **Reste #83 après conv 38** : valider+committer lot 1 (profils) ; valider+committer lots 3/4 (inscription/connexion) ; faire lot 2 (DashboardProprietairePage + ParametresPage, non commencé). Puis #83 bouclé.

---

## 2026-06-07 (conv 37) — DETTE #82 (a) : navigation d'année illimitée + année académique septembre→août

- **Audit dashboard (lecture seule)** : aucune surface de rythme au dashboard — `rhythm_calendar` n'est ni lu/affiché ni édité hors du wizard (`RhythmCalendarPreview` = dev-only ; `RhythmManualBuilder` importé seulement par E-5). Seul chemin d'écriture actif = E-7 via `complete_inscription_alternant` (remplacement total). Les RPC `confirm_rhythm_calendar` / `confirm_rhythm_calendar_manual` existent sans appelant front (vestiges parser). Aucun lecteur aval de `rhythm_calendar` (le matching lit `disponibilites_pattern`, saisi à la main). → **point (b) de #82 recadré et PARQUÉ** (détail DETTE #82).
- **(a) navigation illimitée vers le futur LIVRÉE** (commit feat 7f3e782). Flèches E-5 (`InscriptionAlternantPage`) : interrupteur 2 positions → vrai pas-à-pas `previousAcademicYear` / `nextAcademicYear` ; plancher = année courante (flèche gauche désactivée au plancher), pas de plafond futur ; `e5NextYear` supprimé.
- **`candidateAcademicYears` dérivé des données** (`RhythmManualBuilder`) : ne renvoie plus `[défaut, suivante]` en dur mais les années distinctes présentes dans une liste de lundis (via `academicYearForMonday`). Hydratation (lundis de `initialCalendar`) + materialize (lundis du Set `clicked`) couvrent toutes les années renseignées, sans plafond.
- **Année académique redéfinie septembre → août** (décision produit conv 37, validée visuellement) :
  - `academicYear.js` : `firstMondayForAcademicYear` = lundi de la 1ʳᵉ semaine dont le JEUDI est en septembre Y (et non la semaine contenant le 1er sept) ; `academicYearForMonday` classe par le mois du JEUDI (lundi + 3 j), bascule septembre → une semaine de fin août appartient à l'année dont elle est l'AOÛT DE FIN (= année précédente). Remplace le correctif d'août intermédiaire (sens inverse).
  - `RhythmManualBuilder` : `generateWeeks` (52 fixe) → `weeksForAcademicYear` (52 ou 53 semaines, s'arrête à la frontière) ; tuilage parfait, sans trou ni doublon. `TOTAL_WEEKS` supprimée.
  - Effet affichage : chaque année = 12 colonnes SEP→AOÛ identiques (plus de colonne d'août parasite en tête, plus de décalage inter-années).
- **Aucun impact BDD** : `rhythm_calendar` stocke des lundis absolus, l'année est dérivée à l'affichage. Format, RPC, schéma inchangés ; aucune migration (cohérent VISION « stocker la semaine datée, dériver l'année »).
- **Validé visuellement** (npm run dev) : structure SEP→AOÛ identique sur 2028-2029 et années « 1er sept = lundi » ; semaine de fin août en dernière colonne de l'année précédente ; round-trip E-5↔E-7 conservé.
- **Note conv 37** : référentiels écoles/filières (E-4) très incomplets → consigné dans `idees-en-attente.md`.
- **Reste #82** : (b) parqué (surface dashboard rythme). **Prochains chantiers** : #83 (œil champs password natifs + ConnexionPage), #76 (cohérence 4 colonnes dashboard), #78 (normalisation villes), #79 (comptes auth orphelins), #75 (Studio local).

---

## 2026-06-07 (conv 36 — suite) — Popups frères unifiés : RhythmRequiredPopup aligné sur le modal Q8

- **Découverte d'audit** : le popup « Complète ton calendrier » EST `RhythmRequiredPopup` (auth-wizard), pas un overlay distinct. C'était déjà le pattern de référence de conv 34 (#81). Côme préférant le rendu du modal Q8 « Vérifie ton planning » et voulant que les deux popups frères se ressemblent, on a aligné RhythmRequiredPopup SUR Q8 (et non l'inverse).
- **⚠️ Nuance de convention** : conv 34 posait RhythmRequiredPopup comme référence ; cette session inverse le sens (Q8 fait foi visuellement). Les deux popups seront repris par des designers plus tard — ne pas re-inverser entre-temps.
- **Changements RhythmRequiredPopup (commit feat — voir git log)** : overlay `rgba(15,20,35,0.85)` → `rgba(30,41,59,0.5)` (animation conservée) ; panel max-width 460 → 400 ; titre 18 → 20px ; corps gris `#4B5563` → navy `#1E293B` ; icône calendrier retirée + règle CSS `.aw-rrp-icon` supprimée. Action inchangée : 1 seul `PrimaryButton` (RRP a une seule issue, contrairement à Q8 bouton + lien — on aligne le design, pas le nombre d'actions).
- **Copie resserrée** : corps → « Ça permet à Sterny de te mettre en relation. » + « Tu pourras le modifier plus tard. » (suppression de « C'est ce qui… » et de « Ça prend 2 minutes », infantilisant).
- **Validé visuellement** (npm run dev, popup E-5 déclenché en confirmant sans semaine cochée).

## 2026-06-07 (conv 36) — Œil afficher/masquer mot de passe (TextInput) + récap E-7 en mots-résumés

- **Œil livré** (commit feat 71c019b) sur le composant partagé `TextInput` (auth-wizard). Rendu UNIQUEMENT si `type === 'password'` ; autres usages (email, OTP, texte) strictement iso-comportement.
- **Implémentation** : état local `isPasswordVisible` + `inputType` calculé ; `<input>` enveloppé dans `.aw-textinput-field` (relative) ; bouton `.aw-textinput-reveal` absolute à droite, 2 SVG inline ouvert/barré (trait 1.5px, gris `#94A3B8` → hover orange `#E8622A`). Convention : masqué = œil ouvert, affiché = œil barré.
- **Accessibilité** : `type="button"`, `aria-label` dynamique, `aria-pressed`, `:focus-visible` orange, `disabled` propagé.
- **#62 (autofill) / #65 (capitalize) non touchés**. Pas de nouvelle prop (E-7 passe déjà `type="password"`).
- **Audit clé** : ConnexionPage n'utilise PAS TextInput (toggle TEXTE maison `.cx-password`) ; beaucoup de champs password sont des inputs natifs hors TextInput → non couverts → DETTE #83.
- **Récap E-7 — libellés SERVICE en mots-résumés** (commit feat — voir git log) : map `TYPE_USER_LABELS` (EtapeCreationCompte.jsx) passée de phrases à mots-résumés : locataire → « Recherche », hote → « Propose », les_deux → « Recherche et propose ».
- **Validé visuellement** (npm run dev, E-7).
- **Prochains chantiers** : refonte du modal « Complète ton calendrier » (aligner sur la grammaire du modal #81 / RhythmRequiredPopup) ; reste #82 (nav >2 ans + upsert post-inscription) ; généralisation œil #83.

## 2026-06-06 (conv 35) — DETTE #80 résolue : builder E-5 bloque passé + semaine en cours, capture du futur uniquement

- **DETTE #80 RÉSOLUE** (commit fix 5ea6964 ; docs : présent commit — vérifier git log). RhythmManualBuilder.jsx uniquement.
- **Blocage élargi** : helper module unique `isWeekBlocked(week, mondayCurrentTs)` = `week.mondayTs <= mondayCurrentTs` (seuil lundi `<=`) → bloque le passé **et la semaine ISO en cours** (avant : seuil jeudi `<` qui laissait la semaine en cours cliquable). Seule comparaison de date du fichier.
- **3 chemins alignés** sur ce prédicat : `pastWeekStarts` (→ rendu grisé + `disabled`/`tabIndex`/`aria` + garde `toggleWeek`), hydratation `initialPast`, `materialize`.
- **Capture du futur uniquement** : `materialize` skippe les semaines bloquées → `rhythm_calendar` ne contient plus de semaines passées/en cours synthétiques. **Asymétrie hydratation/materialize de #82 lot 1 résorbée.**
- **Wording cellule bloquée** : « Semaine déjà passée » → « Semaine passée ou en cours » (title + aria-label).
- **Défaut du sélecteur d'année : INCHANGÉ** (décision produit conv 35, logée VISION). On garde l'année courante par défaut même quasi passée ; gris + flèches signalent « passe à l'année suivante ».
- **Validé visuellement** (npm run dev) : semaine en cours grisée/non-cliquable, tooltip OK, compteur sans passé/courant, round-trip E-5↔E-7 conservé.
- **Réserve (VISION §151)** : avant de fiabiliser le flux paiement/matching, vérifier qu'aucun code aval ne suppose un `rhythm_calendar` complet 52 semaines. Risque faible aujourd'hui (moteur pas encore bâti).
- **Prochains chantiers** : reste #82 (nav >2 ans + écriture ajout/upsert post-inscription) ; œil afficher/masquer mot de passe sur le TextInput partagé.

## 2026-06-06 (conv 34) — DETTE #81 résolue : refonte du modal de confirmation Q8

- **DETTE #81 RÉSOLUE** (commit feat 86e6cc7 ; docs : présent commit — vérifier git log). Modal Q8 « Vérifie ton planning » (RhythmManualBuilder.jsx + .css) refondu et poussé sur origin.
- **Cible corrigée après audit des modales existantes** : le bon référent n'était PAS la « grammaire carte wizard » (.aw-screen-card) inscrite à l'origine dans #81, mais le **pattern popup maison RhythmRequiredPopup** (popup frère, même dossier auth-wizard, même builder, même rôle message + action). Décision actée.
- **Forme (panel)** : radius 20, borderless, ombre sombre `0 24px 64px rgba(0,0,0,0.25)`, max-width 400, hauteur auto (épouse le message, plus de min-height), padding 32 ; titre + corps centrés.
- **Disposition** : `PrimaryButton` importé (composant partagé auth-wizard, couplage assumé), pleine largeur, « Confirmer mon planning » ; lien « Revenir au calendrier » centré dessous (style `.aw-bottom-auth-link` recopié sur un `<button>`, sans border-top). Remplace les 2 anciens boutons côte à côte ; classes `.rmb-modal-btn-primary` / `.rmb-modal-btn-secondary` supprimées.
- **Wording resserré** : titre « Vérifie ton planning » ; corps « Assure-toi d'avoir coché les bonnes semaines d'école. Une erreur peut te faire croiser l'autre alternant, ou payer une semaine que tu n'occupes pas. » (1re phrase = vérification, pas consigne). ⚠️ Toujours sous réserve validation avocat (DETTE #45, commentaire TODO conservé).
- **Conservé** : portal createPortal(document.body), overlay (--rmb-*), handlers, .rmb-modal-error.
- **Prochains chantiers** : DETTE #80 (semaines passées/en cours sur l'union + asymétrie hydratation/materialize) ; reste #82 (élargissement >2 ans, upsert post-inscription) ; œil afficher/masquer mot de passe sur TextInput partagé.

## 2026-06-05 (conv 33) — #82 lot 1 : accumulation multi-années dans le builder E-5

- **Préalable #82 levé** (audit lecture seule, logué en VISION + DETTE #82) : socle data déjà multi-années-ready (colonne `rhythm_calendar` jsonb sans CHECK ; RPC `complete_inscription_alternant` valide lundi/status/unicité sans cap ni borne d'année, écrit tel quel ; builder émet déjà `{week_start, status}`). Aucune migration, aucune modif RPC.
- **Lot 1 livré (RhythmManualBuilder.jsx, commit feat bb1f354 — vérifier git log)** : reset au changement d'année supprimé (`useEffect([effectiveYear])` + `yearHydratedRef` + import `useRef` retirés) → les cases s'accumulent (Set keyé par lundi absolu). `materialize` réécrit sur l'union des années **renseignées** (décision (b) : ≥1 semaine cochée), dédup + tri ; inversion `villeRecherchee` préservée. Helper module `candidateAcademicYears()` = source unique partagée hydratation + materialize.
- **Bug round-trip corrigé** : l'hydratation de `clicked` ne restaurait que l'année par défaut → l'année suivante vidée au Retour sur E-5. Étendue à l'union des années candidates. Validé visuellement (aller-retour E-5↔E-7, les 2 années survivent, compteur cumulé).
- **Garde « semaines passées → company » retiré de `materialize` → renvoyé à #80** (sans impact transactionnel, VISION §141-143). Asymétrie hydratation (exclut le passé) / materialize (ne l'exclut plus) à résorber avec #80.
- **Flèches de navigation + consigne discrète E-5 : FAITES et poussées** (09db163 feat flèches côté page, a580970 style consigne builder). Déroulant d'année remplacé par « ‹ année › » (côté page, builder inchangé) ; consigne en hint gris centré.
- **Reste #82** : intégration #80 (semaines passées sur l'union) + élargissement au-delà de 2 ans (nav hors domaine défaut/suivante) + écriture ajout/upsert post-inscription.
- **Prochain chantier — DETTE #81 (NON commencé)** : refonte du modal de confirmation Q8 « Vérifie ton planning » dans la grammaire carte wizard.

## 2026-06-05 (conv 32 — suite) — E-5 aligné sur la grammaire wizard (commit b3619e2)

Chantier E-5 (étape calendrier de rythme du wizard d'inscription) commité :
- RhythmManualBuilder rendu pilotable depuis la page (props renderYearSelector / year / onYearChange / renderActions / onChange ; forwardRef expose requestConfirm). La preview dev reste iso-comportement via les valeurs par défaut.
- util partagé src/utils/academicYear.js (année académique par défaut + suivante).
- E-5 rend le sélecteur d'année (CustomSelect) + le bouton Continuer côté page ; la modale de confirmation passe par un portal (plein écran).
- Allègements texte : sous-titre retiré, consigne raccourcie, compteur sans /52, modale tutoyée.

Deux chantiers ouverts à traiter en conv fraîche (DETTE #81 et #82 + note VISION) :
1. Modale Q8 à aligner sur la grammaire des cartes wizard.
2. Capture multi-années à l'inscription (décision produit + architecture data).

Non traité dans ce lot : DETTE #80 (semaines passées/en cours non bloquées) reste ouverte — à reprendre avec le chantier multi-années (synergie).

## 2026-06-04 (conv 32) — Livrable #2 : confirmation email locale (code OTP) testée bout-en-bout

- **Livrable #2 BOUCLÉ.** Confirmation email locale activée par CODE 6 chiffres (pas lien magique) : `enable_confirmations = true` + nouveau template `supabase/templates/confirmation.html` (`{{ .Token }}`, couleurs Sterny) + déclaration `[auth.email.template.confirmation]` dans `config.toml`. Commit feat c5104b0.
- **Test bout-en-bout VALIDÉ en local** (Mailpit :54324) : E-1 → E-7 → écran code « VÉRIFICATION » → saisie du code → `verifyOtp(type 'email')` → RPC `complete_inscription_alternant` → `/dashboard` (« Bonjour Côme »). signup 200 vers le local, ligne `users` créée (vérifié Network).
- **Bascule de test (env local)** : `.env.local` (gitignoré) créé pour pointer le front vers le Supabase local — `VITE_SUPABASE_URL=http://127.0.0.1:54321` + clé anon locale (variable `VITE_SUPABASE_KEY`). ⚠️ Tant que ce fichier existe, `npm run dev` pointe LOCAL ; le supprimer pour repointer la prod du `.env`.
- **Piège env confirmé** : `config.toml` n'est relu qu'au **redémarrage** de la stack (`supabase stop && supabase start -x studio,imgproxy`, cf. DETTE #75). `db reset` écarté (destructif, ne recharge pas la config auth).
- **À FAIRE AU DÉPLOIEMENT (ne pas oublier)** : aligner la config email PROD (confirmation activée + template **code** côté Supabase prod / Resend) pour que le flux OTP de E-7 marche aussi en prod. Committer `enable_confirmations=true` dans le `config.toml` versionné implique qu'un futur push de config activerait la confirmation en prod — souhaitable, mais à valider au déploiement.
- **Reste mission conv 32** : (2) refonte design E-5 + DETTE #80 (bloquer semaines passées + semaine en cours ; trancher défaut année — VISION §149 = année courante + suivante ; conservation descriptive → décision à loguer en VISION) ; (3) œil afficher/masquer mot de passe sur le TextInput partagé (commit séparé).
- **Commits conv 32** : c5104b0 `feat(auth)` confirmation email locale + `docs` (état exact : git log). Antérieurs (E-7 feat+docs conv 31, 022baba…) toujours **non poussés**.

## 2026-06-04 (conv 31) — Écran client E-7 livré (signUp + OTP + RPC) + récap E-7

- **Écran E-7 construit et validé visuellement (NON poussé).** Composant co-localisé `EtapeCreationCompte.jsx` (E-6 inline, mais E-7 porte un state local + hooks → composant obligatoire), branché dans `InscriptionAlternantPage.jsx` sur `state.currentStep === 7`, avant le placeholder. Deux phases : 'form' (récap + mot de passe → signUp) et 'otp' (code 6 chiffres → verifyOtp → RPC).
- **Flux** : signUp({email, password}) → si session immédiate (confirmation email désactivée) → RPC directe ; sinon écran code → verifyOtp({email, token, type:'email'}) → RPC `complete_inscription_alternant` → navigate('/dashboard'). Email déjà utilisé détecté via message 'already registered' ET `identities.length === 0` (obfuscation Supabase quand confirmation activée). verifyOtp type 'email' ('signup' déprécié).
- **Garde-fou réessai** : état local `accountCreated` → après échec RPC sur le chemin confirmation-OFF, recliquer saute signUp et rappelle la RPC (idempotente ON CONFLICT id). Plus de blocage 'email déjà utilisé'.
- **Miroir sessionStorage** (`sterny_e7_otp_pending`) : snapshot { email, p_profile, p_rhythm_calendar, p_rhythm_source } écrit au passage form→otp, relu au montage (reprise après refresh sur l'écran code), purgé à la réussite RPC. Jamais le mot de passe, jamais de token.
- **Dérivation 4 colonnes côté client** : util `deriveVilleColonnes.js` (réutilisable dashboard #76), conforme VISION §65-86 (colonne = nature, statut = action). rhythm_source = 'manual' en dur ; date FR→ISO via parseDateFRtoISO.
- **Récap (RecapBlock)** : paires libellé/valeur inline (NOM, EMAIL, SERVICE, VILLE/VILLES, RYTHME), 3 classes ajoutées dans RecapBlock.css ; titre "Récapitulatif" retiré (en-tête RecapBlock désormais conditionnel à title/editable) ; bouton ancré en bas via margin-top:auto (technique E-6).
- **Confirmation email encore DÉSACTIVÉE en local** → écran code pas encore activable ; testé via le chemin direct (signUp → session → RPC → dashboard).
- **Reste mission conv 31 → conv 32** : livrable #2 = enable_confirmations=true + template {{ .Token }} + test bout-en-bout E-1→dashboard via Mailpit (:54324). NON FAIT.
- **Œil afficher/masquer mot de passe** : décidé (pas de champ confirmation), à implémenter sur le TextInput partagé — conv 32, commit séparé.
- **Dettes ouvertes** : #79 (comptes auth orphelins), #80 (E-5 semaines passées/en cours sélectionnables). Refonte design E-5 (signalée conv 31, cf. conv 28) → chantier dédié conv 32.
- **Commits conv 31** : feat E-7 + docs (état exact : git log). Antérieurs (022baba, 2174212…) toujours non poussés.

## 2026-06-03 (conv 30) — DETTE #77 soldée (capture nature les_deux E-4) + ouverture sujet villes

- **DETTE #77 RÉSOLUE (commit 022baba)** : capture de la nature pour le cas les_deux en E-4. Réutilisation de la question de nature de la mono posée sur la ville PROPOSE (slot ville_entreprise) ; nature de la ville CHERCHE (slot ville_ecole) DÉDUITE opposée. Champ unifié `nature_ville` (mono + les_deux) ; `ecole_emplacement` abandonné. Garde-fou : question unique → « deux écoles » non représentable. validateE4 les_deux exige nature_ville.
- **Visuel acté** : 3 questions (pas affirmations), typo .ial-step-subtitle comme la mono, sous-titre générique « Renseigne tes deux villes » retiré, options « École / Entreprise » (valeurs 'ecole'/'entreprise' inchangées), resserrage .ial-nature-question margin-top 16→10px (partagé mono+les_deux).
- **Sémantique pour E-7 / dérivation #76** : en les_deux, nature_ville = nature du slot ville_entreprise (= propose) ; ville_ecole (= cherche) = nature opposée ; statuts dérivés à E-7 (propose→'hote', cherche→'recherche').
- **Scope acté — combos cherche×2 / propose×2** : non capturables à l'inscription (2 emplacements imposent 1 propose + 1 cherche). À vérifier côté dashboard, qui ne sait peut-être pas gérer 2 statuts identiques (le modèle n'a qu'un statut par colonne). Pas un repli acquis.
- **Commits conv 30** : 06dcca4 (docs conv 29), 022baba (feat #77). Non poussés (état exact : git log).
- **Nouveau sujet → DETTE #78** : villes en texte libre acceptées → normalisation canonique requise pour le matching (reco Mapbox). Non bloquant E-7. 1re étape = audit AutocompleteInput.
- **Reste du plan E-7** : (a) écran client E-7 (signUp + OTP 6 chiffres + RPC complete_inscription_alternant → dashboard) ; (b) dérivation des 4 colonnes/statuts côté client (#76) ; (c) config email locale + tests bout-en-bout. Puis villes (#78).

## 2026-06-02 (conv 29) — Capture nature ville en E-4 + décision conv 12 révisée

- **Découverte en cadrant E-7** : l'E-4 ne capturait pas la NATURE des villes (école/entreprise), info indispensable au matching (la dispo d'un logement se dérive du rhythm_calendar + de la nature de la ville). Non dérivable a posteriori (un locataire peut chercher dans sa ville d'école OU d'entreprise, CONTEXTE §3).
- **Décision produit — conv 12 (DETTE #64) RÉVISÉE** : la suppression du choix école/entreprise est revenue sur. Écran E-4 épuré → une question claire suffit. Nature réintroduite en E-4. VISION inchangée (le code revient à la ligne §65-86).
- **Livré (commit dc8eabe, non poussé)** : capture nature pour locataire/hote (mono-ville). Champ d'état `nature_ville` ('ecole'|'entreprise') ; CustomSelect sous le champ ville ; question dynamique reprenant la ville saisie (« Rennes, c'est ta ville d'école ou d'entreprise ? ») au style step-subtitle ; `validateE4` l'exige pour locataire/hote. CAPTURE SEULE : le remplissage des 4 colonnes ville/statut depuis (ville + nature_ville + type_user) se fera à l'assemblage E-7.
- **Méthodo (itérations visuelles)** : IntentCardRadio rejeté (comme en conv 12), radios natifs « pas pro », retour au CustomSelect (cohérent avec le champ sexe E-6) = retenu. Leçon : ne pas itérer un style à l'aveugle par prompts ; polish bespoke reporté à une phase design.
- **les_deux NON traité** (capture encore par action, sans nature ni statuts) → DETTE #77, à faire avant E-7.
- **Cohérence 4 colonnes en aval encore KO** (dashboard lit à l'envers du wizard, statuts jamais remplis) → DETTE #76, chantier distinct de E-7.
- **Ordre restant** : (a) les_deux (capture nature) → (b) écran E-7 (signUp + OTP + RPC qui assemble p_profile) → (c) config email locale + tests bout-en-bout. Puis cohérence dashboard (#76).
- **Annexes confirmées** : miroir sessionStorage débloqué (note ligne 69 = handoff email seulement) ; supabase-js ^2.100.1 (type de verifyOtp à confirmer à l'écran code).

## 2026-06-02 (conv 28) — Retrait photo du wizard (E-6 = date + sexe)

- **Étape 3 du plan E-7 SOLDÉE.** Photo de profil retirée du wizard d'inscription (commit ca8d87c, branche feat/unification-inscription, non poussé). E-6 ne capture plus que date_naissance + sexe. Validé visuellement (E-1 → E-7, navigation OK). Retrait : photo_profil_url du state (useInscriptionWizard.js), import + states/refs + handlers + bloc JSX photo (InscriptionAlternantPage.jsx), sélecteurs .ial-e6-photo-* / .ial-e6-info-* (InscriptionAlternantPage.css). Aucun impact E-7 : la RPC ne consomme pas photo_profil_url.
- **Décision actée — PhotoCropperModal CONSERVÉ.** Composant NON supprimé : utilisé par src/dev/AuthWizardSandbox.jsx + réutilisable en post-inscription (progressive profiling, photo redemandée sur dashboard / au clic Postuler, cf. VISION bloc photo conv 26). Retrait = sortir du wizard uniquement.
- **Décision actée — PAS de fusion d'E-6 maintenant.** E-6 réduit à 2 champs reste une étape autonome. Fusion reportée (toucherait numérotation E-1…E-7, barre de progression, reducer, branchement E-7). À reconsidérer en passe dédiée une fois E-7 branché, si pertinent.
- **DETTE #66 RÉOUVERTE** : le retrait de la photo crée un vide vertical dans la carte E-6 (2 champs en haut, bouton Continuer en bas, carte à 536px). Polish à arbitrer par Côme dans npm run dev, idéalement post-E-7. Voir DETTE-TECHNIQUE #66.
- **Observé (hors-scope, à traiter ailleurs)** :
  - Header affiche un avatar connecté (« CF ») sur /inscription/alternant pendant le parcours d'inscription. À diagnostiquer (session dev résiduelle vs ligne test founder DETTE #72) + définir le comportement attendu d'une session active sur le wizard. Rattaché à DETTE #70 + chantier E-7/OAuth.
  - E-5 (builder calendrier) : mise au propre visuelle non finalisée (signalé par Côme). À préciser et finir plus tard.
- **Ordre restant (plan E-7)** : (4) écran client E-7 — signUp + OTP email + appel RPC complete_inscription_alternant ; (5) config email locale + tests bout-en-bout. Push quand le lot est jugé prêt (état exact des commits à pousser : voir git log / git status).

## 2026-06-02 (conv 27) — DETTE #74 résolue + RPC E-7 testée et commitée

- **DETTE #74 RÉSOLUE.** `supabase db reset` rejoue les 8 migrations depuis zéro sans erreur. Fix : dump remote_schema.sql (1973 l.) intégré dans la migration initiale vide 20260421082830 ; migration 090000 rendue idempotente (2 index IF NOT EXISTS + DROP POLICY IF EXISTS sur 4 policies) ; supabase/seed.sql vide. Détail + caveat prod (migration list avant push) dans DETTE #74.
- **Décision actée** : réutilisation du dump existant (~21-24 avril) comme baseline, sans régénérer depuis la prod (audit a confirmé un dump propre et rejouable). Variante "dump frais" écartée.
- **DETTE #75 créée** : conteneur Studio local unhealthy → `supabase start` complet échoue ; contournement `supabase start -x studio,imgproxy` ; CLI Supabase obsolète (v2.90.0 → v2.104.0). Non bloquant.
- **Consigne local** : ne pas insérer dans la table alertes en local (triggers HTTP non neutralisés tapent la prod). Voir note DETTE #74.
- **RPC E-7 `complete_inscription_alternant`** : TESTÉE fonctionnellement en local (user confirmé créé → jeton → appel REST authentifié), ligne users conforme (profil_complet, 4 champs ville/statut, dates MIN/MAX, calendrier 4 semaines) + idempotence `ON CONFLICT (id)` vérifiée (1 seule ligne après 2 appels). Migration commitée (rollback vérifié, gardé en local). Signature : `(p_profile jsonb, p_rhythm_calendar jsonb, p_rhythm_source text)`, SECURITY INVOKER, id = auth.uid(), aucune dérivation des 4 champs ville (déléguée au client).
- **À durcir (revue sécurité, cf DETTE #73)** : la RPC accorde `EXECUTE` à `anon` (hérité de l'`ALTER DEFAULT PRIVILEGES` du dump). Non exploitable (garde `auth.uid()` → erreur 28000), mais `REVOKE EXECUTE ... FROM anon` recommandé en défense en profondeur.
- **Convention repo notée** : `supabase/_rollback/` est gitignoré → les rollbacks ne sont jamais versionnés (artefacts locaux uniquement).
- **Ordre restant** : (1) infra locale DETTE #74 OK → (2) test fonctionnel RPC E-7 OK → (3) retrait photo E-6 (PhotoCropperModal + photo_profil_url hors du wizard) → (4) écran client E-7 (signUp + OTP + appel RPC) → (5) config email locale + tests bout-en-bout.

## 2026-06-02 (conv 26) — Décision photo + audit E-7

- **Décision produit** : photo de profil RETIRÉE du wizard, rejoint la bio en post-inscription (progressive profiling). E-6 réduit à date_naissance + sexe. VISION mise à jour (bloc photo/bio). Effet de bord à arbitrer plus tard : E-6 à 2 champs, fusion éventuelle.
- **Chantier code induit** : retirer PhotoCropperModal + photo_profil_url du state de useInscriptionWizard.js et de la branche E-6 d'InscriptionAlternantPage.jsx (à faire avant E-7).
- **Audit E-7 (lecture seule) effectué** : aucun trigger auth→users (la RPC devra INSÉRER) ; RPC modèle confirm_rhythm_calendar_manual récupérée ; builder E-5 confirmé capture-only ; RecapBlock réutilisable ; password déclaré mais jamais saisi (à saisir à E-7) ; RLS INSERT users en WITH CHECK(true) — DETTE #73.
- **Ordre de travail** : logs (ce commit) → retrait photo E-6 → RPC complete_inscription_alternant → écran E-7 → config email locale + tests.
- **RPC E-7 écrite (non testée, NON commitée)** : `complete_inscription_alternant` + rollback dans `supabase/migrations/20260602120000_*` et `supabase/_rollback/` (UNTRACKED — ne pas committer tant que non testé). PK `users_pkey` confirmée → `ON CONFLICT (id)` OK. Pattern repris de `confirm_rhythm_calendar_manual` : INSERT one-pass, `rhythm_import_id` NULL, pas d'insert rhythm_imports, `p_rhythm_source` en paramètre, `date_naissance` sans contrôle d'âge (parqué).
- **BLOCAGE** : `supabase start` échoue → DETTE #74 (env local non reproductible). Tests E-7 en pause tant que l'infra locale n'est pas réparée.
- **Détour env résolu** : disque Mac plein (purge 16 Go caches Xcode), Docker redémarré, Claude Code réinstallé (binaire natif perdu pendant le disque plein).
- **Ordre révisé** : (1) réparer infra locale DETTE #74 → (2) appliquer + tester RPC E-7 → (3) retrait photo E-6 → (4) écran client E-7 → (5) config email locale + tests.

## 2026-06-02 (conv 25) — sujet 1 (textes) soldé : popup Q9 finalisé, Q8 gelée

- **RhythmRequiredPopup (Q9)** finalisé (commit deb9f5f) : wording raccourci (« Complète ton calendrier » / « C'est ce qui permet à Sterny de te mettre en relation. Ça prend 2 minutes, tu pourras le modifier plus tard. ») + largeur portée à 460px pour matcher la carte du wizard. Longueur/lisibilité/layout uniquement. Composant localisé dans `components/auth-wizard/`.
- **Modale Q8 du builder** laissée INTACTE : longueur = fond juridique gelé, compaction reportée à l'avocat (DETTE #45 complétée : drift Q9 + correction chemin).
- **Piste design (non-dette)** : le popup « fait template SaaS IA » (icône pastille + centrage + bouton orange pleine largeur). À reprendre en phase design avec designer/DA, post-fonctionnel. Pas inscrit en dette (bruit).
- **Sujet 1 CLOS.** Prochain : E-7 (écriture finale inscription) — cadrage déjà présenté conv 25, en attente de validation Côme avant tout code.

## 2026-06-01 (soir) — finitions builder calendrier (a/b/d)

- **(a) Header de mois** — initiale ambiguë (J×3, M×2) → 3 lettres horizontales, police 11px, `letter-spacing: 0` (commit c6f2eb4). Rendu compact lisible dans la colonne ~28px.
- **(b) Garde-fou « calendrier indispensable »** — nouvelle prop `onEmptyConfirm` sur `RhythmManualBuilder` ; à 0 semaine cochée, le clic sur « Confirmer mon planning » déclenche directement `RhythmRequiredPopup` côté wizard (skip de la modale d'avertissement interne du builder) ; `handleE5Confirm` garde sa vérif défensive `hasSchoolWeek` (commit 096093d).
- **(d) Semaines passées** — restyle aligné design system : fond clair `--rmb-bg-empty`, contour `border: 1.5px solid #94A3B8` + diagonale 1.5px `#94A3B8`, les deux en gris secondaire officiel de la plateforme, sans `opacity` (commit 15b811c). Variables `--rmb-past-bg` et `--rmb-past-border` devenues inutilisées (à nettoyer avec DETTE #56).
- **Reste ouvert** : (c) textes modale d'avertissement interne du builder + `RhythmRequiredPopup` trop longs → raccourcir (suivi sous DETTE #45, wording en attente d'avis avocat). Puis E-7.

## 2026-06-01 — Builder calendrier : refonte visuelle layout livrée + finitions identifiées

- **Builder calendrier (RhythmManualBuilder) refondu visuellement (commit 995898f)** : les 12 mois tiennent dans la carte sans scroll horizontal. Cadre interne `.rmb-root` retiré (`padding: 0`, sans fond/bordure/ombre/radius) ; `--rmb-cell-size: 24px` ; `--rmb-month-gap: 4px` ; `.rmb-grid` sans `overflow-x` ; `.rmb-month-column` en `flex: 1 1 0` + `min-width: 0` (les 12 colonnes partagent la largeur) ; `.rmb-cell` responsive (`width: 100%` + `aspect-ratio: 1` + `max-width: var(--rmb-cell-size)`). En-têtes de mois = initiale 1 lettre.

- **Reste ouvert sur le builder (prochaine session)** :
  - (a) **Lisibilité des noms de mois** — l'initiale seule est ambiguë (J×3 jan/juin/juil, M×2 mars/mai) ; le 3-lettres empilé verticalement a été testé et REJETÉ (pas propre) ; pistes : 3 lettres pivotées à 90° (writing-mode) OU numéro du lundi affiché dans les cases.
  - (b) **Garde-fou « calendrier indispensable »** à déplacer pour qu'il se déclenche dès le 1er clic sur « Confirmer mon planning » à 0 semaine, au lieu d'apparaître après la modale d'avertissement.
  - (c) **Textes modale d'avertissement + pop-up trop longs** (→ DETTE #45).

## 2026-05-31 (suite) — Conv Claude.ai 24 : modèle auth/écriture/vérification verrouillé (avant tout code)

- **signUp à E-7 (fin), pas avant.** Email saisi à E-1 (gardé en mémoire), utilisé au signUp E-7. Aucune écriture `users` avant E-7 ; écriture **one-pass** à E-7.
- **Vérification email OBLIGATOIRE** (Confirm email reste ON) mais par **code OTP 6 chiffres saisi en ligne**, pas par lien. Implé : template email Supabase `{{ .ConfirmationURL }}` → `{{ .Token }}` ; `verifyOtp({type:'email'})` valide l'email ET ouvre la session (conserve le mot de passe).
- **Flux E-7** : « Finaliser » → signUp → envoi code → saisie code sur place → verifyOtp → écriture fiche one-pass → `/dashboard`. La personne ne quitte jamais la page.
- **E-5** : `RhythmManualBuilder` passe en **capture-only** — émet `rhythm_calendar` dans le state du wizard, n'appelle PLUS sa RPC `confirm_rhythm_calendar_manual` ; `rhythm_import_id = NULL`.
- **Reprise** : aucune sauvegarde d'avancement ; abandon = recommencer. Tradeoff accepté (pas de relance des abandons). Réévaluable si la plateforme grossit.
- **Constats audit (lecture seule)** : pas de miroir sessionStorage (mémoire React seule) ; aucun signUp dans `InscriptionAlternantPage` aujourd'hui ; le builder s'auto-persiste aujourd'hui (à changer) ; le parcours OAuth INSERT à E-2 via `handleE2Continue` (asymétrie à revoir au déparquage OAuth).
- **Caveat implé** : le changement de template email est **global** au projet Supabase → impacte aussi le signUp email proprio (parqué). À gérer quand on touchera l'email.
- **Ordre de travail** : E-5 capture (builder capture-only) → E-7 (signUp + code + verifyOtp + écriture one-pass + template) → polish (DETTE #54).

## 2026-05-31 — Conv Claude.ai 20→23 (cluster T4 OAuth) : boutons posés, complétion PARKÉE — recentrage sur fin inscription email

### Bloc 1 — Livré sur la branche (cluster T4, non poussé — voir git log pour l'état exact)

- Refonte `GoogleAuthHandler` → `OAuthHandler` générique : routeur pur, plus aucun INSERT au callback. Monté global (App.jsx:98), agit sur '/', '/connexion', '/completer-profil' et tous les `/inscription/*` SAUF `/inscription/proprietaire` (HANDLER_BYPASS_ROUTES).
- Boutons OAuth + callback sur `InscriptionProprietairePage` ; boutons OAuth en E-1 + INSERT users sur `InscriptionAlternantPage` ; fix layout boutons côte à côte.
- Conv 23 : commit docs Q-AVO-005 (révision loyer en cours de contrat) ; checkpoint OAuth NON TESTÉ (timing callback combo getSession + onAuthStateChange, redirect user déjà inscrit, welcome modal proprio) — parké.

### Bloc 2 — Décision stratégique (conv 23) : recentrage

L'OAuth se branche sur le wizard et n'a pas de fin propre : ce qui définit "inscription terminée" est E-7 (écriture en base), pas encore construit. Débugger la complétion/redirection OAuth avant E-7 revient à définir la sortie d'un tunnel non percé. Décision actée : finir d'abord l'inscription email (E-5 capture rythme + E-7 écriture one-pass), PUIS rebrancher et débugger l'OAuth. Cluster complétion/routage OAuth entièrement parké.

### Bloc 3 — Découverte d'archi à trancher : sémantique de `profil_complet`

`OAuthHandler` route tout profil `profil_complet=false` vers `/inscription/alternant` sans regarder `type_user` → un proprio incomplet est jeté dans le wizard alternant. Cause profonde : avec l'unification inscription + compléter-profil, l'étape "compléter profil" disparaît ; une ligne `users` n'existe que quand l'inscription est finie → `profil_complet=false` ne devrait jamais exister, et le "Cas B" du handler est un vestige de l'ancienne persistance progressive. Reco (à valider et loguer dans VISION au retour OAuth) : router sur l'existence de la ligne, jamais sur `profil_complet`. Tracé DETTE #70.

### Bloc 4 — État branche post-conv 23

Branche `feat/unification-inscription`, jamais poussée sur origin (état exact : git log). `CreerAnnoncePage.jsx` bypass DEV toujours non commité (ne jamais stager). 3 fichiers untracked préexistants intacts.

Conv 23 FERMÉE. Conv 24 à ouvrir sur E-5 (capture rythme) + E-7 (RPC écriture one-pass), avec les docs de référence.

## 2026-05-11 — Conv Claude.ai 19 : T3 livrée — ChoixInscriptionPage en aiguillage minimal click direct

### Bloc 1 — Contexte ouverture conv 19

Conv 19 ouverte pour reprise from-scratch de T3 après dérive conv 18 (7 itérations sans livraison). Méthode imposée : mockup textuel exhaustif validé avant tout patch.

### Bloc 2 — Évolution UX du pattern écran 0 en 3 mockups successifs

1. **Mockup v1** (validé en début de conv) : 2 cartes radio alternant/proprio + zones conditionnelles. Zone alternant = input email + Continuer + OrSeparator + Google. Zone proprio = Continuer. Apple sorti écran 0.
2. **Mockup v2** (mi-conv) : suppression gros sous-titre 24px navy après audit IR/CP (la grammaire wizard ne l'utilise pas). Remplacement footer custom par `<BottomAuthLinks showSignInLink />` partagé.
3. **Mockup v3 FINAL** : refonte en pur aiguillage. Click direct sur carte → navigate immédiat. Plus de zone conditionnelle, plus d'input email, plus d'OAuth. Justification : la zone conditionnelle alternant faisait déborder le min-height 536px de la card, créant une déformation verticale incohérente avec la grammaire wizard. Préservation dimensions card prioritaire.

### Bloc 3 — Livraison effective

- Refonte `ChoixInscriptionPage.jsx` (~73 → 58 lignes) : suppression state/handlers email/loading/loadingGoogle, suppression imports TextInput/PrimaryButton/OrSeparator/GoogleSignInButton/supabaseClient.
- Réécriture `ChoixInscriptionPage.css` (~187 → 25 lignes) : suppression `.cip-screen`, `.cip-card`, zones conditionnelles. Conservation `.aw-screen-title` réplique locale + `.cip-cards-stack { flex: 1 }` (pattern E-2 strict).
- Extension `IntentCardRadio.jsx` + `.css` : prop `subtitle` optionnelle rétrocompatible (modif T1 mineure, ajoutée pendant mockup v1 et conservée pour usages futurs même si pas utilisée par ChoixInscriptionPage final).
- Pré-remplissage email InscriptionAlternantPage (commit f0fe666 conv 18) conservé silencieux.
- Spec § 3.4 réécrite amendement conv 19 v3 final.

### Bloc 4 — Leçons méthodologiques de conv 19

10+ itérations de patch successif sur ChoixInscriptionPage avant convergence visuelle. Root cause méthodologique : Claude n'a pas vérifié systématiquement comment les pages similaires (E-1, E-2 wizard, ConnexionPage) appliquaient la grammaire visuelle avant de produire mockup et prompts. À chaque écart visuel soulevé par Côme, Claude découvrait un pattern partagé qu'il avait reproduit en local par erreur (wrapper page, classes card, footer, animation stagger, position bouton).

Règle métho ajoutée à `CONTEXTE-PROJET.md` (nouvelle section 8 ter) : lire 1-2 pages similaires comme exemple AVANT tout patch sur une page d'auth ou de wizard, identifier la grammaire effective, ne jamais créer de wrapper/footer/classe locale qui duplique un pattern partagé sans validation explicite Côme.

### Bloc 5 — Hors scope conv 19 — reporté T4 conv 20

Côme a constaté en fin de conv 19 que `/inscription/alternant` E-1 et `/inscription/proprietaire` ne contiennent pas/plus les boutons OAuth Google et Apple attendus dans la nouvelle architecture (écran 0 = aiguillage pur). Ce sujet relève de la tranche T4 du chantier UNIFICATION-INSCRIPTION (refonte GoogleAuthHandler → OAuthHandler générique + ajout boutons OAuth en E-1 + adaptation InscriptionProprietairePage). T4 tracée spec § 4.5.2 / § 4.6 / § 7.3.4 et DETTE #55. Conv 20 à ouvrir avec cadrage spec préalable.

### Bloc 6 — État branche post-conv 19

`main` : `11f0e0f` (prod inchangée). `feat/unification-inscription` : HEAD = commit T3 (sha à confirmer post-commit ci-dessous), ~18 commits ahead `origin/main`. Working dir post-commit : 1 modified `CreerAnnoncePage.jsx` (bypass DEV DETTE #1-4 intact) + 3 untracked préexistants. Push manuel par Côme attendu.

Conv 19 FERMÉE.

---

## 2026-05-10 — Conv Claude.ai 18 : T3 reportée + pré-remplissage email livré (commit f0fe666)

### Bloc 1 — Contexte d'ouverture conv 18

Conv 18 ouverte pour la tranche T3 du chantier UNIFICATION-INSCRIPTION : refonte de `ChoixInscriptionPage` en layout 2 niveaux selon spec § 3.4 amendement conv 17 (2 cartes radio alternant/proprio + zones conditionnelles OAuth). Première session Claude Code de mise en œuvre concrète. Estimation initiale spec : "courte 1h" — refonte cosmétique + branchement.

### Bloc 2 — Dérive UX successive en 7 itérations

7 patches successifs sur `ChoixInscriptionPage.jsx` + `.css` au cours de la session, chaque retour visuel de Côme amenant une révision du pattern précédent :

1. Patch 1 — Implémentation initiale spec § 3.4 amendement conv 17 (2 cartes radio + zones conditionnelles OAuth). Constat Côme : "page vide à l'arrivée, mauvaise affordance".
2. Patch 2 — Suppression cartes radio, retour pattern spec § 3.4 originale (3 boutons OAuth alternant visibles + lien proprio gris en bas). Décision Claude.ai d'annuler l'amendement conv 17, validée par Côme.
3. Patch 3 — Alignement design strict sur étape E-1 du wizard (titre `.aw-screen-title` local, wrapper `.cip-form` flex 1, lien proprio collé en bas via `margin-top: auto`).
4. Patch 4 — Suite à constat Côme ("ça ne va pas, hors codes standards"), refonte vers pattern saisie email standard : input email + `<PrimaryButton>Continuer</PrimaryButton>` + OAuth row 50/50 + footer custom local "Propriétaire ? · Déjà un compte ? Se connecter" + pré-remplissage email E-1 via `location.state`.
5. Patch 5 — Suite à constat Côme ("déséquilibre row 50/50 vs Continuer pleine largeur"), passage des OAuth en pleine largeur empilés verticalement (Google puis Apple) avec labels longs ("Continuer avec Google" / "Continuer avec Apple"). Suppression de la grid `.cip-oauth-row`.
6. Patch 6 — Ajout placeholder "Ton adresse email" sur input + bouton Continuer collé en bas via `margin-top: auto` cohérent E-1.
7. Constat final Côme : "il faut absolument d'abord demander si la personne est alternant ou propriétaire". Retour exigé sur le pattern à 2 cartes radio en premier (= amendement conv 17 que Claude.ai avait proposé d'annuler en début de conv).

Diagnostic : approche "patch puis on ajuste si ça ne va pas" inefficace sur cet écran. Méthodologie correcte = mockup textuel exhaustif validé par Côme AVANT tout code, listant tous les détails visuels (spacing, traits, animations, hauteurs, états transitoires, etc.). Critique méthodologique formulée par Côme et acceptée par Claude.ai.

### Bloc 3 — Décision de clôture sans livrer T3

Décision Côme + Claude.ai à 22h05 : clôture conv 18 sans livrer T3. Revert intégral des 2 fichiers `ChoixInscriptionPage.jsx` + `ChoixInscriptionPage.css` à leur état HEAD pré-conv 18. T3 entièrement remise à zéro, à refaire en conv 19 avec cadrage propre.

Conservation et commit isolé du pré-remplissage email côté `InscriptionAlternantPage.jsx` (12 lignes : import `useLocation` + `useEffect` qui lit `location.state?.email` au mount et appelle `setField('email', initialEmail)`). Modif neutre, indépendante du pattern futur de l'écran 0, utile dès qu'un écran 0 transmettra un email via state.

Commit `f0fe666` `feat(auth): pré-remplissage email E-1 depuis location.state` — 1 fichier, 12 insertions.

### Bloc 4 — État spec UNIFICATION-INSCRIPTION § 3.4

Spec NON modifiée en conv 18. Le pseudo-code § 3.4 reflète encore l'amendement conv 17 (2 cartes radio + zones conditionnelles OAuth visibles à la sélection alternant). Décision Côme conv 18 confirme cette intention de base ("il faut d'abord demander alternant ou proprio") MAIS les détails du pattern (saisie email vs aiguillage, position OAuth row vs empilé, hauteur card, traits séparateurs, animations entre zones, gestion proprio dans footer ou ailleurs) restent à arbitrer en conv 19 sur la base d'un mockup exhaustif AVANT tout patch.

### Bloc 5 — Mémoire des décisions UX successives prises conv 18 (utiles conv 19)

Pour ne pas refaire les mêmes erreurs en conv 19, traces des décisions actées ce soir :

- Pattern "saisie email direct sur l'écran 0" + bouton Continuer = sémantique cohérente Sterny (orange = action de validation, pas action de choix). Confirmé par Côme.
- Pré-remplissage E-1 via `react-router state` est le bon canal (éphémère, cohérent Q5). Déjà commité, infrastructure en place.
- OAuth row 50/50 ne fonctionne pas visuellement avec Continuer pleine largeur (déséquilibre). Si OAuth restent dans la card finale, les empiler en pleine largeur OU sortir l'un des deux providers (Apple non critique web-only).
- Bouton Continuer doit être en bas de card (signature wizard E-1 stricte, `margin-top: auto`).
- Convention placeholder "école 2" : "Ton adresse email" pour le champ email (tutoiement sans verbe).
- Cas proprio : la position "lien gris en bas avec margin-top auto" et le footer custom local "Propriétaire ? · Déjà un compte ? Se connecter" ont tous deux été testés. Aucun n'a satisfait Côme. À arbitrer conv 19 sur mockup propre.
- Trait de séparation gris sous le bouton Continuer : critique explicite Côme conv 18, à anticiper en conv 19 dans le mockup.
- Cohérence titre : `WizardTitle` composant partagé (margin-bottom 16) diverge de `.aw-screen-title` classe locale wizard (margin-bottom 32). Le wizard utilise la classe locale. Pour cohérence stricte avec E-1, l'écran 0 devra aussi utiliser `.aw-screen-title` locale (ou aligner le composant partagé sur 32 — refactor transverse hors scope).

### Bloc 6 — État final branche post-conv 18

`main` : `11f0e0f` (prod sterny.co inchangée). `feat/unification-inscription` : HEAD = `f0fe666` (commit pré-remplissage email), 16 commits ahead `origin/main` (15 précédents + 1 conv 18). Push manuel par Côme attendu.

Working dir post-conv 18 :
- 1 modified : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` (bypass DEV préexistant DETTE #1-4, intact).
- 3 untracked : `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` + 2 fichiers spikes pdf-js (préexistants).
- `ChoixInscriptionPage.jsx` + `.css` revertés à HEAD, plus modified.

Conv 18 FERMÉE. Conv 19 à ouvrir pour reprise T3 from-scratch après cadrage mockup exhaustif (étape de cadrage en début de conv 19 — pas de prompt Claude Code tant que mockup non validé par Côme).

---

## 2026-05-07 (suite quater) — Conv Claude.ai 17 : audit OAuth + alignement docs T4

### Contexte d'ouverture conv 17

Conv 17 ouverte pour la tranche T4 du chantier UNIFICATION-INSCRIPTION : écran 0 OAuth + refonte `GoogleAuthHandler` → `OAuthHandler` générique non-intercepteur. Décision en début de conv : audit lecture pure de l'existant OAuth d'abord, puis arbitrages produit en discussion, puis alignement docs si nécessaire. Pas de patch de code dans la conv 17, exécution reportée en conv 18.

### Audit OAuth lecture pure produit

Rapport d'audit cartographique du flow OAuth existant (produit par Claude Code dans le terminal, non commité). Constats :

- `GoogleAuthHandler` global monté à la racine d'`App.jsx` — composant invisible 128 lignes, 2 rôles couplés (routage + INSERT users avec `type_user` lu depuis `sessionStorage.signup_type`).
- `HANDLER_BYPASS_ROUTES = ['/inscription/alternant']` — patch transitoire avant refonte T4.
- 3 surfaces consommatrices de `signInWithOAuth` : `ConnexionPage`, `InscriptionRecherchePage` (legacy), `InscriptionProprietairePage`. Toutes provider `'google'`. Aucune ne fait sa propre détection de session, toutes dépendent du handler global.
- Wizard `/inscription/alternant` aujourd'hui OAuth-blind : `useInscriptionWizard.js` fait `getSession()` au mount mais n'exploite pas le résultat pour pré-remplir E-1 depuis `user_metadata`.
- Aucune route `/auth/callback` définie. Apple OAuth non branché en prod (composant `AppleSignInButton.jsx` existe T1 commit `a70d69b` mais consommé uniquement par `AuthWizardSandbox` dev).
- DETTE #52 (5 bypass DEV `CompleterProfilPage`) : 1 seule occurrence trouvée au lieu des 5 mentionnées dans la dette. Caduque par suppression `CompleterProfilPage` en T7. À mettre à jour dans DETTE-TECHNIQUE quand calme (pas urgent).

### Constat structurant ayant raccourci la conv

Relecture spec UNIFICATION-INSCRIPTION § 2.4 + § 3.4 + § 4.5.2 + § 4.6 + § 7.3 a révélé que les arbitrages (a) point de départ OAuth, (b) refonte handler, et (d) pré-remplissage E-1 étaient déjà actés en cadrage conv 2 du 3 mai. Le seul vrai arbitrage encore ouvert en conv 17 portait sur (c) Apple maintenant ou différé, et sur le sort du CTA proprio sur `ChoixInscriptionPage` (désalignement entre VISION §6 paragraphe 2 mai soir bis qui supprimait le CTA et VISION §6 précision 3 mai qui mentionnait "la page d'arrivée sur /inscription").

### Décisions actées

1. **CTA proprio conservé sur `ChoixInscriptionPage`** (contrairement à la spec initiale qui le supprimait). Justification : porte d'entrée pour le proprio invité revenant sans son lien d'invitation. Sur clic Continuer carte proprio sans token → routage vers `/inscription/proprietaire` qui affiche message d'aide explicite sur la page elle-même (pas de redirection 301 silencieuse).

2. **Layout 2 niveaux sur `ChoixInscriptionPage`** : niveau 1 = 2 cartes radio (alternant / proprio) toujours visibles, niveau 2 = 3 boutons OAuth conditionnels (Google/Apple/Email) qui n'apparaissent qu'après sélection carte alternant. Si carte proprio sélectionnée → 1 bouton "Continuer" simple qui route vers `/inscription/proprietaire`. Pas de boutons OAuth proprio sur `/inscription` — les boutons OAuth proprio (Google + Apple + email/password) vivent sur `/inscription/proprietaire` elle-même (cohérent avec le fait que le token `?r=` n'est jamais présent à l'arrivée sur `/inscription`).

3. **Apple OAuth branché en T4** (pas différé). Bouton Apple ajouté à `ChoixInscriptionPage` en T3 (parcours alternant) et à `InscriptionProprietairePage` en commit 2/2 de T4 (parcours proprio). Configuration provider Apple côté Supabase Dashboard en action manuelle parallèle (credentials Apple Developer déjà actifs côté Côme). DETTE #51 (AppleAuthHandler dédié) résolue par construction par l'`OAuthHandler` générique de T4 — pas de composant Apple séparé à créer.

### Alignement docs livré

Commit `648e471` `docs(spec): align UNIFICATION + VISION on conv 17 T4 decisions` — 2 fichiers, 99 insertions / 65 deletions :

- `docs/VISION-ARCHITECTURE.md` : §6 paragraphe 2 mai soir bis (ligne 316, retrait CTA → conservation CTA + message d'aide sur page) + §6 précision 3 mai point 1 (ligne 355, amendement conv 17 avec 2 chemins a/b et justification du maintien CTA).
- `docs/recherche/UNIFICATION-INSCRIPTION.md` : §2.4 (phase auth amont, refonte complète layout 2 niveaux + 4 sous-sections de flow), §3.4 (écran 0 ChoixInscriptionPage, amendement conv 17 + nouveau pseudo-code Card 2 cartes + zones conditionnelles), §7.3.3 (commit msg T3 ajusté), §7.3.4 (T4 enrichi avec ajout Apple + action manuelle Supabase Dashboard), §7.3.5 (T5 garde proprio avec message sur page sans redirect 301).

### Code à livrer (reporté en conv 18 et suivantes)

- T3 : refonte `ChoixInscriptionPage` layout 2 niveaux + boutons OAuth conditionnels alternant + Apple. Première session Claude Code de mise en œuvre du chantier UNIFICATION-INSCRIPTION en cours. Suit le plan §7.3.3 mis à jour.
- T4 commit 1/2 : refonte `GoogleAuthHandler.jsx` → `OAuthHandler.jsx` générique non-intercepteur, suppression INSERT users, exclusion route `/inscription/proprietaire`. Suit le plan §7.3.4 mis à jour.
- T4 commit 2/2 : adaptation `InscriptionProprietairePage.jsx` (INSERT côté page DETTE #55 + ajout bouton Apple). Indissociable du commit 1/2, même session Claude Code.
- T5 : garde durcie `/inscription/proprietaire` avec message d'aide affiché sur la page (pas de redirect 301) + suppression `InscriptionPartagerPage` (Q9). Suit le plan §7.3.5 mis à jour.

Action manuelle Côme à faire en parallèle de T4 commit 1/2 : Supabase Dashboard → Auth → Providers → activer Apple → coller les credentials Apple Developer (Service ID, Team ID, Key ID, secret).

### Limitations format docs

4 endroits où les fences ` ``` ` ont disparu dans `UNIFICATION-INSCRIPTION.md` pendant les str_replace correctifs (limitation du wrapper 5-backticks utilisé dans le prompt) : §3.4 pseudo-code `[Card]`, §7.3.4 commit messages 1/2 et 2/2, §7.3.5 commit message. Lisibilité préservée, à réparer en cosmétique si nécessaire (pas bloquant pour l'exécution T3-T5).

### État final branche post conv 17

`main` : `11f0e0f` (prod inchangée). `feat/unification-inscription` : HEAD = `648e471` (commit alignement docs), 15 commits ahead `origin/main` (10 conv 13/14/15 + 4 conv 16 + 1 conv 17). Working dir : 1 modified `CreerAnnoncePage.jsx` (bypass DEV intact, DETTE #1-4) + 3 untracked préexistants.

Conv 17 FERMÉE après audit OAuth lecture pure + alignement docs. Aucun code applicatif livré dans cette conv. Conv 18 à ouvrir pour exécution T3 (première session Claude Code concrète du chantier UNIFICATION-INSCRIPTION en cours).

---

## 2026-05-07 (suite ter) — Conv Claude.ai 16 sujet 2 : fix dropdown AutocompleteInput dans card

### Décision actée

**Dropdown `AutocompleteInput` clampé à la card avec cap à 3 options visibles** (commit `3f8e4da`). Composant partagé `auth-wizard/AutocompleteInput`. Le dropdown reste rendu via `createPortal(document.body)` en `position: absolute`, mais sa `maxHeight` est désormais calculée dynamiquement au focus : mesure du parent `.aw-screen-card` via `inputRef.closest('.aw-screen-card')` (fallback `window.innerHeight` si hors-card), puis `maxHeight = min(140, max(0, cardBottom - inputBottom - 6))`. La constante 140 correspond à 3 options × ~44px + 8px de padding interne (alignement avec `option { padding: 11px 16px; font-size: 14px }` et `portal { padding: 4px 0 }`). CSS `max-height: 180px → 140px` harmonisée comme fallback.

Comportement résultant : pour les inputs en haut de la card (École, Année), le dropdown prend ses 140px pleins en dessous. Pour les inputs en bas (Filière E-3, ville_ecole E-4 cas les_deux), il s'étend jusqu'au bord bas de la card et couvre visuellement le bouton Continuer + lien Retour pendant son ouverture — comportement souhaité (l'utilisateur est en train de choisir une option, le bouton ne lui sert à rien à ce moment-là, dès qu'il sélectionne une option le dropdown se ferme et le bouton réapparaît).

### Démarche d'arbitrage

5 approches testées avant convergence : smart positioning bascule au-dessus (refusé — masque les inputs du dessus), `maxHeight` avec marge fixe 100px en bas (laisse de l'espace blanc inutile), mesure du bouton Continuer avec arrêt 8px avant son bord haut (dropdown trop petit, 1-2 options visibles seulement), arrêt au bord bas du bouton (légèrement mieux mais 2-3 options tronquées), enfin arrêt au bord bas de la carte avec cap 140px (validé). Leçon : ne pas pré-jouer le smart positioning quand la vraie contrainte est de respecter les limites de la carte et d'accepter le recouvrement temporaire des éléments du bas pendant l'ouverture du dropdown.

### Hors scope reporté

- **`CustomSelect` a la même lacune théorique** (positionnement absolute toujours en dessous, `max-height` fixe 240px). Aucun bug utilisateur remonté à ce stade et après la refonte E-6 conv 15 le dropdown sexe n'est plus en bas de card. À porter le pattern de clamp si problème observé plus tard. Pas de DETTE créée pour l'instant.

### État final branche post sujet 2 conv 16

`main` : `11f0e0f` (prod inchangée). `feat/unification-inscription` : HEAD = `3f8e4da` (commit fix dropdown), 14 commits ahead `origin/main` (10 conv 13/14/15 + 4 conv 16 dont 1 docs sujet 1). Working dir : 1 modified `CreerAnnoncePage.jsx` (bypass DEV intact, DETTE #1-4) + 3 untracked préexistants.

Conv 16 FERMÉE sur ses 2 sujets initiaux. Conv 17 réservée à l'écran 0 OAuth (T4 chantier UNIFICATION-INSCRIPTION cf. spec § 2.4 et § 4.5).

---

## 2026-05-07 (suite bis) — Conv Claude.ai 16 sujet 1 : polish PhotoCropperModal + harmonisation libellé "Non précisé"

### Décisions actées

1. **Polish design `PhotoCropperModal` aligné sur grammaire wizard unifiée** (commit `df9184b`). Composant partagé `auth-wizard/PhotoCropperModal` (extrait T1 commit `a70d69b` conv 8). 4 modifs ciblées :
   - Titre "RECADRER" promu de kicker gris discret (11px / weight 700 / `#94A3B8`) vers titre wizard orange centré (16px / weight 300 / letter-spacing 2px / `#E8622A`). Variante "tight space" du `.aw-screen-title` adaptée au modal 360px (au lieu du 18px / ls 3px de la version card 460px).
   - Bouton X repositionné en `position: absolute; top: 12px; right: 12px;`. Wrapper `.aw-cropper-header` supprimé, `.aw-cropper-modal` reçoit `position: relative` pour ancrage.
   - Slider zoom enfin labellisé : `<label className="aw-cropper-zoom-label">ZOOM</label>` ajouté au-dessus du slider, aligné sur la grammaire labels uppercase 11px / 700 / ls 1px / `#1E293B` / DM Sans, identique aux 4 composants `auth-wizard/` déjà alignés (TextInput, AutocompleteInput, CustomSelect, TextArea, conv 14). Wrapper `.aw-cropper-zoom` passé en flex column gap 8px.
   - Slider `<input type="range">` reçoit `id="aw-cropper-zoom-input"` + `htmlFor` sur le label + `aria-label="Zoom"` (accessibilité pour lecteurs d'écran).
   - Hors scope volontaire : bouton "Appliquer" (44px / 14px) inchangé. Pas un label, donc pas dans la grammaire labels uppercase. Si harmonisation 48px souhaitée plus tard avec `.ial-btn-continuer`, sujet à part.
   - Impact : E-6 wizard prod (`InscriptionAlternantPage` branche `currentStep === 6`) + dev sandbox section 11. Pages legacy `CompleterProfilPage` et `ModifierProfilPage` ont leur propre cropper local (pas l'unifié `auth-wizard/PhotoCropperModal`) donc pas impactées par ce patch.

2. **Harmonisation libellé UI "Non précisé" pour valeur BDD `non-precise`** (commit `4256d59`). Audit en cours de session a révélé 3 libellés UI différents pour la même valeur BDD :
   - Wizard E-6 (`InscriptionAlternantPage` ligne 438) : "Préfère ne pas répondre" — trop long pour le dropdown CustomSelect, débordait visuellement.
   - `ModifierProfilPage` ligne 570 : "Non precise" — accent manquant, typo legacy corrigée au passage.
   - `CompleterProfilPage` ligne 870 : "Non précisé" — déjà correct, non touché.

   Wizard + ModifierProfilPage alignés sur "Non précisé". Valeur BDD `'non-precise'` inchangée partout (cohérent avec `validateE6` du hook `useInscriptionWizard.js` qui accepte `['homme', 'femme', 'autre', 'non-precise']`). Note legacy : `CompleterProfilPage` est destinée à disparaître en T7 du chantier UNIFICATION-INSCRIPTION, mais l'aligner aurait été cohérent en attendant — ici elle l'était déjà donc rien à faire.

### Sujet restant conv 16

- **Fix dropdown filière E-3 qui déborde de la card** : régression du fix conv 9 (limitation à 4 suggestions au focus). `AutocompleteInput` rend son dropdown en `position: absolute` sous l'input filière, qui déborde visuellement quand l'input est en bas de la card 536px. Vrai fix = smart positioning (mesurer place dispo, basculer au-dessus si pas la place en dessous). Composant partagé donc impact aussi E-4 villes. À traiter dans la suite de conv 16.

### Sujet reporté en conv 17

- **Écran 0 OAuth** : T4 chantier UNIFICATION-INSCRIPTION (cf. spec § 2.4 et § 4.5). Hors polish design. Reporté de conv 16 → conv 17 (rappel conv 15).

### État final branche post sujet 1 conv 16

`main` : `11f0e0f` (prod inchangée). `feat/unification-inscription` : HEAD = `4256d59` (commit fix wording sexe), 12 commits ahead `origin/main` (10 conv 13/14/15 + 2 conv 16). Working dir : 1 modified `CreerAnnoncePage.jsx` (bypass DEV intact, DETTE #1-4) + 3 untracked préexistants.

---

## 2026-05-07 (suite) — Conv Claude.ai 15 bloc 3 : refonte E-6 (DETTE #66 RÉSOLUE) + clôture conv

### Décisions actées

1. **DETTE #66 RÉSOLUE** — Refonte design E-6 sur grammaire wizard unifiée. Suppression du grid 2 colonnes asymétrique (photo gauche / champs droite). Suppression du badge orange "+" sur le cercle photo. Photo centrée 80×80 en haut de la card avec lien "Ajouter une photo" + ⓘ tooltip centrés sous le cercle. Date de naissance et sexe placés côte à côte dans une grille 2 colonnes (`.ial-e6-row`) responsive (1 col en < 480px). Tooltip ⓘ basculé en bulle flottante `position: absolute` avec flèche pointant vers le bas, donc plus aucun impact sur la hauteur de carte à son ouverture/fermeture. Le contenu E-6 final rentre largement sous 464px de hauteur interne, donc la card reste plafonnée à `min-height: 536px` (référence `.aw-screen-card`) — strictement la même hauteur que les autres étapes.

2. **Bio supprimée d'E-6** — Conformément à la décision produit actée bloc 2 (amendement VISION). La prop `bio` retirée du state initial de `useInscriptionWizard.js`. La bio reste éditable dans `ModifierProfilPage` post-inscription.

### Code livré

- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` — branche E-6 restructurée : photo centrée, wrapper `.ial-e6-row` grille 2 colonnes pour date+sexe, tooltip déplacé dans nouveau wrapper `.ial-e6-info-wrap` relative pour positionnement absolute du tooltip text.
- `sterny-react/src/pages/auth/InscriptionAlternantPage.css` — suppression `.ial-e6-grid`, `.ial-e6-fields-cell`, `.ial-e6-photo-badge`. `.ial-e6-photo-block` repassée en flex-column align-items center. `.ial-e6-photo-circle` 64→80px. `.ial-e6-row` créée (grid 2 cols 1fr 1fr gap 14). `.ial-e6-info-wrap` créée (position relative inline-flex). `.ial-e6-info-text` réécrite intégralement en bulle absolute avec flèche bas via pseudo-éléments. Mobile responsive `.ial-e6-row` repasse 1 colonne sous 480px.
- `sterny-react/src/hooks/useInscriptionWizard.js` — `bio: ''` retirée du state initial (commentaire de référence VISION ajouté).

### Sujets reportés (à traiter en conv 16)

- **Polish design `PhotoCropperModal`** : labels et typo du modal cropper photo à aligner sur la grammaire wizard unifié (uppercase 11px ls 1px pour le label slider zoom, titre `aw-screen-title` orange centré, etc.). Composant partagé donc impacte plusieurs consommateurs (E-6 wizard + legacy `CompleterProfilPage` + `ModifierProfilPage`).
- **Fix dropdown filière E-3 qui déborde de la card** : régression d'un fix antérieur. `AutocompleteInput` dropdown s'affiche en `position: absolute` sous l'input filière (situé en bas dans la card 536px) → déborde visuellement. Vrai fix = "smart positioning" (afficher au-dessus si pas la place en dessous). Composant partagé donc impacte E-3 et E-4.

### Sujet reporté en conv 17

- **Écran 0 OAuth** : déplacé de conv 16 → conv 17. T4 chantier UNIFICATION-INSCRIPTION, hors polish design. Cf. bloc 2 conv 15.

### Clôture conv 15

Conv 15 fermée sur ses 2 objectifs initiaux : refonte E-2 (DETTE #67 + DETTE #63 résolues) + refonte E-6 (DETTE #66 résolue). DETTE-TECHNIQUE mise à jour. VISION enrichie de 3 décisions produit conv 15 : bio retirée d'E-6 + principe d'incitation post-inscription, pattern de candidature à profil incomplet (post-T7, requires legal consult), page "Mes documents" dans burger dashboard.

---

## 2026-05-07 (suite) — Conv Claude.ai 15 bloc 1 : refonte E-2 sur pattern IR legacy

### Décisions actées

1. **DETTE #67 RÉSOLUE** — Refonte `IntentCardRadio` sur pattern IR legacy compact (référence : `InscriptionRecherchePage.jsx` step 1 "intent"). Padding 12/16, border-radius 12, gap 12. Icône 36×36 disque gris #F4F5F7 + SVG #6B7280 qui s'orange-ifie léger en selected (rgba 0.1). Hover orange + translateY(-2px) + box-shadow douce. Suppression prop `description` et wrapper `.aw-intent-card-content`. Animation stagger via `@keyframes awIntentCardFadeIn` 0.4s, delays 0.16/0.24/0.32s passés inline côté E-2 et sandbox section 12.

2. **DETTE #63 RÉSOLUE** — Les 3 SVG Material Symbols (loupe / maison / flèches bidirectionnelles, repris d'IR legacy step 1) sont injectés en prop `icon` sur les 3 IntentCardRadio d'E-2. Plus d'icône manquante.

3. **Wording E-2 raccourci** : "un ou des logements" → "un logement", "d'alterner mon logement" → "mon logement". Suppression des descriptions sous-label parce que le contexte wizard alternant suffit.

4. **Mot-clé typographié orange uppercase 14px** : nouvelle classe `.aw-intent-card-keyword` { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #E8622A; }. Itération validée après essai 11px label-style trouvé trop petit/déséquilibré sur la phrase autour. Suppression de l'ancienne classe `.ial-card-keyword` orpheline dans `InscriptionAlternantPage.css`.

### Code livré

- `sterny-react/src/components/auth-wizard/IntentCardRadio.jsx` — suppression prop `description` + wrapper `.aw-intent-card-content`.
- `sterny-react/src/components/auth-wizard/IntentCardRadio.css` — refonte complète sur pattern IR legacy + nouvelle classe `.aw-intent-card-keyword`.
- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` — branche E-2 : 3 SVG Material loupe/maison/flèches en prop `icon`, label raccourci, span keyword renommé `aw-intent-card-keyword`, animation delays inline.
- `sterny-react/src/pages/auth/InscriptionAlternantPage.css` — suppression `.ial-card-keyword`.
- `sterny-react/src/dev/AuthWizardSandbox.jsx` — section 12 alignée sur la nouvelle API.

### Sujets restants conv 15

- **DETTE #66** : Polish design E-6 (carte étirée, photo + bio + date_naissance + sexe). À reprendre après l'audit OAuth.
- **Audit écran 0 OAuth** (Google / Apple) : ouvert en milieu de conv 15. Lecture pure d'abord pour cartographier ce qui existe.

---

## 2026-05-07 (suite) — Conv Claude.ai 15 bloc 2 : audit OAuth + cadrage écran 0 unifié reporté en conv 16

### Constat de l'audit OAuth (lecture pure, non-commité)

OAuth Google existe en prod sur 3 pages legacy : `/connexion` (`.cx-google`), `/inscription/recherche` step 2 (`.ir-google`), `/inscription/proprietaire` (`.ip-google`). Tous actifs avec `signInWithOAuth({ provider: 'google' })` et `redirectTo` vers `/dashboard` ou `/dashboard/proprietaire`. `GoogleAuthHandler.jsx` global (monté dans `App.jsx`) post-traite la session OAuth et route vers dashboard ou `/completer-profil` selon présence du profil.

OAuth Apple : composants UI prêts dans `auth-wizard/` (`AppleSignInButton.jsx` + `OAuthButton.jsx` + `OAuthButton.css`) mais aucun handler `signInWithOAuth({ provider: 'apple' })` en prod. Provider Apple non configuré Supabase. Cohérent avec roadmap (non-urgent, validation 3 semaines).

Wizard unifié `/inscription/alternant` : aucun OAuth, aucun écran 0 OAuth. Le bypass `HANDLER_BYPASS_ROUTES = ['/inscription/alternant']` dans `GoogleAuthHandler.jsx` est en place pour empêcher le handler global d'intercepter — confirme l'intention de gérer OAuth localement dans le wizard une fois branché.

Composants `auth-wizard/` prêts mais consommés uniquement par le sandbox dev (`AuthWizardSandbox.jsx`) : `OAuthButton.jsx`, `GoogleSignInButton.jsx`, `AppleSignInButton.jsx`, `OrSeparator.jsx`, `OAuthButton.css`. Tout est aligné sur le pattern legacy 48px / border-radius 12 / hover orange #E8622A + translateY(-1px).

### Décision actée

L'écran 0 OAuth (Email / Google / Apple en amont du wizard `/inscription/alternant`) est la **tranche T4 du chantier UNIFICATION-INSCRIPTION** (cf. spec § 2.4 et § 4.5), pas du polish design. Reportée en **conv Claude.ai 16 dédiée**. Périmètre prévisible : (a) arbitrage routing — réécrire `ChoixInscriptionPage` vs nouvelle page intermédiaire vs E-0 dans le wizard, (b) refonte `GoogleAuthHandler` global en `OAuthHandler` générique non-intercepteur pour `/inscription/alternant`, (c) branchement provider Apple côté Supabase si décidé, (d) logique de pré-remplissage E-1 depuis `user_metadata` Google/Apple (full_name, email, photo).

Suite conv 15 : enchaînement sur DETTE #66 (E-6 polish design) puis clôture.

---

## 2026-05-07 — Conv Claude.ai 14 : E-6 fonctionnel + refactor labels — design pas finalisé

### Décisions actées

1. **Amendement spec sexe — 4 valeurs** : `homme` / `femme` / `autre` / `non-precise`. Aligne le wizard sur le legacy ModifierProfilPage / CompleterProfilPage. Logué dans UNIFICATION-INSCRIPTION §1.2.7.

2. **Amendement spec date_naissance — input texte JJ/MM/AAAA** : helpers extraits dans `utils/dateHelpers.js`, conversion ISO différée à la RPC E-7. Aligne sur le pattern legacy. Logué dans UNIFICATION-INSCRIPTION §3.10.

3. **Pas de check d'âge ≥ 18 ans frontend** : en attente arbitrage professionnel Q-AVO-001 + Q-DPO-002 (existantes).

4. **Refactor labels auth-wizard transverse** : CustomSelect.css + TextArea.css alignés sur le pattern TextInput / AutocompleteInput (uppercase 11px 700 letter-spacing 1px). Impact assumé sur IR legacy `/inscription/recherche` (labels en MAJUSCULES jusqu'à T7 retrait).

5. **Nouvel ordre stratégique T2** : E-6 → E-7 → 5/5 → DETTE #54 + E-5 (clôture). Le `rhythm_calendar` (E-5) est le principe fondateur Sterny et mérite la clôture du chantier T2.

### Code livré

- `sterny-react/src/utils/dateHelpers.js` (nouveau, 142 lignes) — 4 helpers parse/format date FR ↔ ISO.
- `sterny-react/src/hooks/useInscriptionWizard.js` — import isValidDateFR + validateE6 (date_naissance + sexe obligatoires, photo + bio optionnels).
- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` — branche if (currentStep === 6) avec photo upload Storage + cropper modal + tooltip ⓘ + bouton placeholder dans le fallback (skip E-5 pour test).
- `sterny-react/src/pages/auth/InscriptionAlternantPage.css` — classes E-6 photo-block + photo-circle + photo-badge + photo-link + info-btn + info-text.
- `sterny-react/src/components/auth-wizard/CustomSelect.css` — labels uppercase.
- `sterny-react/src/components/auth-wizard/TextArea.css` — labels uppercase.

### Sujets design ouverts (à reprendre conv 15 dédiée)

- **DETTE #66** : Polish design E-6 (carte trop étirée). 6 itérations design tentées en conv 14 sans validation visuelle. Code fonctionnel, design non validé.
- **DETTE #67** : Refonte E-2 sur pattern IR legacy (cartes radio plus pro que IntentCardRadio actuel). Détecté en fin conv 14 lors de la consultation `/inscription/recherche`.

### Prochaines étapes

- Conv 15 dédiée polish wizard (E-2 + E-6 a minima).
- Une fois polish OK : reprise chantier T2 dans l'ordre stratégique acté (E-7 → 5/5 → DETTE #54 + E-5 clôture).

### État final branche post-conv 14

`feat/unification-inscription` : 3 nouveaux commits (refactor labels + feat E-6 + docs clôture). Total 4 commits ahead `origin/main` (avec `d681171` de la conv 13). Working dir attendu post-commits : 1 modified `CreerAnnoncePage.jsx` (bypass DEV intact) + 3 untracked préexistants intacts.

---

## 2026-05-06 (soir bis) — Conv Claude.ai 13 : amendement persistance progressive acté

### Décision actée

Option b1 retenue après arbitrage : report intégral des écritures BDD à E-7 + miroir `sessionStorage` côté client pour le pattern de reprise. Annule la spec UNIFICATION-INSCRIPTION §1.5 "Sauvegarde progressive" et §2.5 dans leur ensemble. Rationalisation : cohérence avec l'implémentation livrée E-1 à E-4 (qui n'a jamais matérialisé la sauvegarde progressive), atomicité de la RPC E-7 conservée, coût ~2-3h en T2 5/5 contre ~1-2 jours de refonte rétroactive sur 4 sous-commits déjà livrés.

### Logs effectués

- UNIFICATION-INSCRIPTION.md §1.5 : encart d'amendement après le paragraphe "Sauvegarde progressive".
- UNIFICATION-INSCRIPTION.md §2.5 : note d'annulation en tête de section, contenu d'origine conservé pour traçabilité.
- VISION-ARCHITECTURE.md §6 : nouvelle sous-section "Persistance progressive — amendement post-spec acté le 6 mai 2026" pointant vers UNIFICATION-INSCRIPTION §1.5.

### Conséquence pour la suite T2

T2 5/5 "pattern de reprise + persistance state" reste un sous-commit normal du chantier UNIFICATION-INSCRIPTION (pas une dette technique). Conception attendue : sérialisation/désérialisation du state du hook `useInscriptionWizard` via `sessionStorage`, lecture au mount, écriture à chaque transition d'étape, purge à l'aboutissement de la RPC E-7. Détail à arbitrer en conv dédiée.

### État final branche post-conv 13

`main` : `11f0e0f` (prod inchangée). `feat/unification-inscription` : HEAD = nouveau commit docs après commit `6cc8a72`. Working dir attendu post-commit docs : 1 modified `CreerAnnoncePage.jsx` (bypass DEV) + 3 untracked préexistants intacts.

---

## 2026-05-06 (soir) — Conv Claude.ai 12 : DETTE #64 résolue par simplification produit

### Bloc 1 — Décision produit actée

DETTE #64 (design UI E-4 toggle ville à finaliser) résolue par simplification produit plutôt que par polish design. Décision Côme en début de conv 12 : pour `locataire`/`hote`, une seule ville suffit (la ville où l'utilisateur cherche/propose un logement). Pour `les_deux`, deux villes avec labels explicites ("Ville où tu proposes" / "Ville où tu cherches"). Plus de toggle école/entreprise dans l'UX, plus de design à finaliser.

Convention de stockage BDD associée (Option C, slot non sémantique) :
- Mono-ville : `ville_entreprise` rempli + `statut_ville_entreprise = type_user`. Colonnes école NULL.
- les_deux : `ville_entreprise` = ville propose (statut `hote`) + `ville_ecole` = ville cherche (statut `locataire`).

VISION §3 et §6 mis à jour en conséquence.

### Bloc 2 — Périmètre commit feat bea05cd (5 fichiers, +72 / −161)

- `useInscriptionWizard.js` : `validateE4` simplifiée. Mono-ville : `ville_entreprise NOT NULL` → "Veuillez choisir une ville". les_deux : 2 villes NOT NULL → "Veuillez renseigner tes deux villes". Statuts dérivés à l'INSERT E-7, plus stockés dans le state.
- `InscriptionAlternantPage.jsx` : branche E-4 réécrite (86 → 50 lignes), sous-titre `.ial-step-subtitle` aligné typographiquement sur les labels AutocompleteInput, retrait du handler `handleRadioVille` et de l'import `WizardStepSubtitle`.
- `InscriptionAlternantPage.css` : suppression des classes obsolètes `.ial-radio-*` et `.ial-toggle-*` (~57 lignes). Ajout `.ial-step-subtitle` (uppercase 11px 700 Navy gauche) et `.ial-field-label` (14px 500 Navy pour les sous-labels du cas les_deux).
- `AutocompleteInput.jsx` : auto-capitalize première lettre par défaut (prop `capitalizeFirst = true`, opt-out via `={false}` pour cas futurs). Retrait du cap `.slice(0, 4)` sur la liste filtrée.
- `AutocompleteInput.css` : ajout `overscroll-behavior: contain`, `max-height` ajusté de 220px à 180px pour empêcher le dropdown de chevaucher le bouton Continuer.

### Bloc 3 — Conventions actées en conv 12

- **Pattern sous-titre wizard** : classe locale `.ial-step-subtitle` alignée typographiquement sur les labels d'inputs (uppercase 11px 700 Navy). Utilisée quand un écran a une question explicite portée par le sous-titre (E-4) plutôt que par les labels d'inputs (E-3 a des labels descriptifs auto-portés).
- **Convention slot BDD pour villes** : non sémantique, documentée en VISION §3.
- **Auto-capitalize** : composant-level pour AutocompleteInput, par défaut activé. Pour les autres types d'inputs texte (TextInput, textarea, inputs natifs), à propager — cf. nouvelle DETTE #65.

### Bloc 4 — État final branche post-conv 12

`main` : `11f0e0f` (prod inchangée). `feat/unification-inscription` : HEAD = `bea05cd` (commit feat conv 12), 3 commits ahead `origin` au moment de l'écriture de ce bloc.

Working dir post-commit feat (avant commit docs) : 1 modified `CreerAnnoncePage.jsx` (bypass DEV intact) + 3 untracked préexistants intacts.

### Bloc 5 — Prochaines étapes T2

Sous-commits T2 restants après E-4 :
- **E-5 calendrier RhythmManualBuilder** (spec § 3.9). Prérequis bloquant : DETTE #54 refonte responsive RhythmManualBuilder pour intégration card 460px.
- **E-6 profil personnel** (spec § 3.10).
- **E-7 mot de passe + signUp Supabase**. Conv dédiée recommandée.
- **5/5 : pattern de reprise + persistance state**.

---

## 2026-05-06 — Conv Claude.ai 11 : sous-commit E-4 livré + dette design tracée

### Bloc 1 — Phases d'écriture E-4

Conv 11 a livré l'écran E-4 villes & statuts_villes du wizard unifié sur la branche feat/unification-inscription, par 4 phases incrémentales + 3 patches visuels itératifs sur retours Côme :

- **Phase 0 (lecture pure préalable)** : restitution complète de `InscriptionAlternantPage.jsx` (268 lignes post-conv 10), `useInscriptionWizard.js` (217 lignes post-conv 9), composants partagés (`AutocompleteInput`, `CustomSelect`, `IntentCardRadio`, `WizardProgressBar`), `inscription-options.js`, `InscriptionAlternantPage.css`, table 1.3 § 1.3 UNIFICATION-INSCRIPTION, DETTE #50 couplage `statut_ville_*`. Discovery clé : aucun composant ville/Mapbox extrait dans `components/`, pas d'intégration Mapbox côté frontend Sterny — décision actée de partir sur liste statique de communes françaises (cohérence E-3 ECOLES/ANNEES_ETUDES/FILIERES).
- **Phase 1 (validateE4)** : ajout de la fonction exportée `validateE4(state)` après `validateE3` dans `useInscriptionWizard.js` (+36 lignes). Logique : 2 villes toujours requises (NOT NULL), statuts conditionnels selon `type_user` — `locataire`/`hote` = exactement 1 statut activé, `les_deux` = 2 statuts activés. Tous les 8 cas table 1.3 couverts.
- **Phase 2 (VILLES_FRANCE)** : nouvelle constante exportée dans `inscription-options.js`, 83 communes françaises ordre alphabétique Title Case (top 50 communes par population + villes alternance représentatives). Pattern parallèle à ECOLES/ANNEES_ETUDES/FILIERES.
- **Phase 3 (câblage page + CSS)** : 5 sous-modifs dans `InscriptionAlternantPage.jsx` (3 imports + 3 handlers `handleE4Change`/`handleRadioVille`/`handleE4Submit` + branche `if state.currentStep === 4` avec UI conditionnelle 3 cas locataire/hote/les_deux) + ajout classes CSS `.ial-radio-section`, `.ial-radio-question`, `.ial-toggle`, `.ial-toggle-btn` dans `InscriptionAlternantPage.css`. Build local OK 994ms.
- **3 patches visuels itératifs sur retours Côme** : (1) compactage `IntentCardRadio` via variante `.compact`, retiré ensuite — (2) bascule vers segmented control gris façon iOS, kill outline natif + focus orange propre — (3) refonte 2 cartes blanches indépendantes avec bordure orange au sélectionné + shadow orange douce. Affichage des noms de villes réels dans le toggle quand saisis (`state.ville_X.trim() || fallback générique`), `aria-label` fixe pour les lecteurs d'écran.

### Bloc 2 — Périmètre commit feat (4 fichiers, +304 / −1)

Commit feat E-4 livré : `55475d4` sur `feat/unification-inscription`.
- `sterny-react/src/data/inscription-options.js` (modified — +85 lignes constante VILLES_FRANCE)
- `sterny-react/src/hooks/useInscriptionWizard.js` (modified — +36 lignes `validateE4`)
- `sterny-react/src/pages/auth/InscriptionAlternantPage.css` (modified — +57 lignes classes E-4)
- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` (modified — +125 / −1 imports + handlers + branche E-4)

`CreerAnnoncePage.jsx` (bypass DEV) intact en working dir post-commit. 3 untracked préexistants intacts.

### Bloc 3 — Dette design toggle ville tracée

Le design UI du toggle ville (cas `locataire`/`hote`) n'a pas atteint le standard "à la hauteur de Sterny" par Côme malgré 5 itérations visuelles successives en conv 11. Sujet identifié comme un brief de design plutôt qu'un détail CSS. Tracé en DETTE #64 dans `DETTE-TECHNIQUE.md`. Plan de résolution : conv dédiée avec brief enrichi (références visuelles d'apps "à la hauteur" + description de ce qui plaît). Le E-4 reste fonctionnel et accessible — seul le polish design est à faire.

### Bloc 4 — Conventions actées en conv 11

- **Liste statique de villes françaises** : pattern figé pour la saisie de villes dans le wizard d'inscription. Source : `sterny-react/src/data/inscription-options.js` → `VILLES_FRANCE`. 83 communes au commit initial, enrichissable progressivement. Pas de fallback Mapbox côté frontend. **Périmètre géographique à confirmer** : intention stratégique de Côme évoquée en clôture conv 11 — lancement Sterny en Bretagne + Nantes en premier pour densifier offre/demande sur zone restreinte avant scaling national. La liste actuelle pourra être restreinte (sous-ensemble Grand Ouest) ou conservée selon la décision finale post-échanges avec parties prenantes (Pauline Leboissetier Initiative Rennes, Le Poool, etc.). Pas bloquant pour le sous-commit E-4 livré.
- **Convention placeholder autocomplete** : "Tape les premières lettres" pour villes (cohérence avec école E-3, dérogation acceptée à la convention école 2 stricto sensu).
- **Validation E-4** : 2 villes NOT NULL + cohérence `statut_ville_*` / `type_user` (cf. table 1.3). Pas de regex sur les villes (saisie libre acceptée).

### Bloc 5 — Prochaines étapes T2

Sous-commits T2 restants après E-4 :
- **Conv 12 (ou ultérieure) — design UI E-4** : refonte du toggle ville à partir d'un brief de design enrichi (DETTE #64). Pas bloquant pour les sous-commits suivants.
- **E-5 calendrier RhythmManualBuilder** (spec § 3.9) — intégration du composant existant au wizard. Prérequis bloquant : DETTE #54 refonte responsive RhythmManualBuilder pour intégration card 460px.
- **E-6 profil personnel** (spec § 3.10) — date_naissance, sexe, photo_profil_url, bio.
- **E-7 mot de passe + signUp Supabase** — INSERT users + UPDATE complet + envoi mail confirmation. Conv dédiée recommandée.
- **5/5 : pattern de reprise + persistance state** (refresh page, navigation arrière depuis étape ultérieure).

### État final branche post-conv 11 (avant docs commit)

main : `11f0e0f` (prod sterny.co inchangée). `feat/unification-inscription` : HEAD = `55475d4` — sous-commit E-4 livré localement, pas encore poussé sur origin (au moment de l'écriture de ce bloc).

Working dir post-commit feat (avant commit docs) :
- 1 modified : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` (bypass DEV préexistant tracé en DETTE-TECHNIQUE.md).
- 3 untracked : `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` + 2 fichiers spikes pdf-js (préexistants).

---

## 2026-05-05 (suite) — Conv Claude.ai 10 : sous-commit progress bar livré

### Bloc 1 — Phases d'écriture progress bar

Conv 10 a livré le sous-commit `feat(auth-wizard): introduce WizardProgressBar on E-1, E-2, E-3 wizard screens` (commit bcbaf88) sur la branche feat/unification-inscription par 3 phases incrémentales :

- **Phase 0 (lecture pure préalable)** : restitution de WizardProgressBar.jsx (32 lignes), WizardProgressBar.css (47 lignes), InscriptionAlternantPage.jsx post-conv 9 (264 lignes), et extrait spec UNIFICATION-INSCRIPTION § 3.5/3.6/3.7 (lignes 370-510). Découverte clé : le composant accepte la prop `showLabel` (défaut `false`) qui contrôle l'affichage du texte "Étape N — Nom" au-dessus de la barre. Les props `stepLabel` et `stepNumber` sont ignorées si `showLabel=false`.
- **Phase 1 (vérification --accent)** : grep `--accent` dans `sterny-react/src/` confirme la définition au scope `:root` dans `index.css` ligne 29 (`--accent: #E8622A;`). Aucun risque de barre invisible. La couleur orange Sterny s'applique automatiquement via `var(--accent)` ligne 44 de WizardProgressBar.css.
- **Phase 2 (édition)** : 4 modifs str_replace dans `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` — 1 import `WizardProgressBar` (ligne 14, dans le bloc d'imports auth-wizard) + 3 instances JSX `<WizardProgressBar progress={N/7} />` insérées juste après `<h1 className="aw-screen-title">INSCRIPTION</h1>` dans chacune des 3 branches `if (state.currentStep === N)` (E-2 ligne 112, E-1 ligne 156, E-3 ligne 221). Aucune modif du hook `useInscriptionWizard.js`, du CSS local `InscriptionAlternantPage.css`, ni du fallback (écrans E-4 à E-7 non encore implémentés). Build OK 996ms, +0.09 kB JS bundle.

### Bloc 2 — Décision showLabel=false

Décision actée en début de conv 10 sur retour Côme : `showLabel` laissé à `false` (défaut du composant). Donc seule la barre orange 2px sous "INSCRIPTION" est visible, sans texte "Étape N — Nom" au-dessus. Rendu minimaliste cohérent avec le design Sterny (navy + orange + DM Sans, peu d'éléments textuels parasites).

Conséquence sur l'insertion : les props `stepLabel` et `stepNumber` sont retirées du JSX (code mort si `showLabel=false`). Si retour visuel ultérieur amène à les réintroduire, opération réversible en ~30 secondes (changer 3 instances).

Cette décision dévie de l'intention implicite de la spec § 3.5/3.6/3.7 qui écrivait `<WizardProgressBar progress={N/7} stepLabel="..." stepNumber={N}>` avec valeurs précises. Elle est tracée comme amendement de la spec (cf. UNIFICATION-INSCRIPTION § 3.5 amendement 5 mai 2026 conv 10).

### Bloc 3 — Validation visuelle

Côme a validé visuellement les 3 écrans (E-1, E-2, E-3) via `npm run dev` après build local. La barre orange 2px apparaît bien centrée sous "INSCRIPTION", largeur de remplissage progressive (1/7 ≈ 14%, 2/7 ≈ 29%, 3/7 ≈ 43%), espacement vertical cohérent. Pas de patch correctif nécessaire.

### Bloc 4 — Prochaines étapes T2

Sous-commits T2 restants après progress bar :
- **E-4 villes / statuts_villes** (spec § 3.8) — UI conditionnelle selon `type_user` (locataire / hote / les_deux). E-4 sera câblée nativement avec `<WizardProgressBar progress={4/7} />`. Effort estimé : ~1h Claude Code (densité moyenne, plus dense que E-3 à cause de la logique conditionnelle 3 cas).
- **E-5 calendrier RhythmManualBuilder** (spec § 3.9) — intégration du composant existant au wizard.
- **E-6 profil personnel** (spec § 3.10) — `date_naissance`, `sexe`, `photo_profil_url`, `bio`.
- **E-7 mot de passe + signUp Supabase** — INSERT users + UPDATE complet + envoi mail confirmation. Conv dédiée recommandée.
- **5/5 : pattern de reprise + persistance state** (refresh page, navigation arrière depuis étape ultérieure, etc.).

### État final branche post-conv 10

main : 11f0e0f (prod sterny.co inchangée). feat/unification-inscription : HEAD = bcbaf88 — sous-commit progress bar livré sur origin.

Working dir post-conv 10 (avant commit docs) :
- 1 modified : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` (bypass DEV préexistant tracé en DETTE-TECHNIQUE.md).
- 3 untracked : `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` + 2 fichiers spikes pdf-js (préexistants).

---

## 2026-05-05 (soir) — Clôture conv Claude.ai 9 : sous-commit 4/5 livré (E-3 Études)

### Bloc 1 — Phases d'écriture E-3 école / année d'études / filière

Conv 9 a livré l'écran E-3 du wizard unifié sur la branche feat/unification-inscription, par 4 phases incrémentales + 3 patches itératifs sur retours visuels Côme :

- **Phase 0 (lecture pure préalable)** : restitution de InscriptionAlternantPage.jsx (204 lignes), useInscriptionWizard.js, composants partagés AutocompleteInput.jsx/css et CustomSelect.jsx/css déjà extraits dans auth-wizard/. Découverte : les 2 composants existent depuis avant T1 (47 fichiers dans auth-wizard/ vs 17 extraits T1) et n'étaient consommés QUE par la sandbox dev — réutilisation directe sans extraction préalable.
- **Phase 1 (création données)** : nouveau fichier sterny-react/src/data/inscription-options.js avec 3 export const : ECOLES (30), ANNEES_ETUDES (initialement 11 puis enrichi à 38), FILIERES (30). ES modules pur, ordre figé.
- **Phase 2 (validateE3 dans hook)** : ajout fonction exportée validateE3(state) après getE1InvalidFields. Logique : 3 champs requis non vides après trim → "Veuillez remplir tous les champs", sinon null.
- **Phase 3 (câblage E-3 dans la page)** : 4 imports (AutocompleteInput, validateE3, données — CustomSelect importé puis retiré au patch suivant), 2 handlers (handleE3Change avec clearError on typing, handleE3Submit avec validation + setTimeout 3000ms réutilisant errorTimerRef partagé top-level), branche if (state.currentStep === 3) insérée juste avant le fallback. JSX : <AuthScreenContainer>, <h1 className="aw-screen-title">INSCRIPTION</h1>, container .ial-form avec 3 champs verticaux, bouton .ial-btn-continuer natif (cohérence E-1/E-2, pattern margin-top: auto), <AuthErrorBanner> conditionnel ou <BottomAuthLinks> sinon.
- **Patch 3-bis (CustomSelect → AutocompleteInput pour année)** : retour visuel Côme — le CustomSelect avec option "Autre" était un cul-de-sac (string "Autre" stockée en BDD, pas de saisie libre). Bascule sur AutocompleteInput qui autorise la saisie libre. Liste ANNEES_ETUDES enrichie 11 → 38 cursus alternance France 2026 (recherche poussée Onisep, AnAF, alternance-professionnelle.fr). Suppression de "Autre" (escape hatch inutile avec un autocomplete qui accepte la saisie libre).
- **Patch 3-ter (alignement labels uppercase)** : retour visuel Côme — labels E-1 sont uppercase 11px / 700 / letter-spacing 1px alors que .aw-autocomplete-label rendait en title case 13px / 600. Modification CSS du composant partagé (font-size 13→11, weight 600→700, ajout text-transform: uppercase + letter-spacing: 1px). Impact collatéral assumé : sandbox section 7. Aucune modif JSX requise (text-transform CSS).
- **Patch 3-quater (dropdown 8 → 4 entrées)** : retour visuel Côme — le dropdown filière à 5 entrées dépassait encore le bord inférieur de la card. Réduction des 2 occurrences de slice(0, 5) à slice(0, 4) dans AutocompleteInput.jsx. 4 entrées au focus laissent ~34px de marge.

### Bloc 2 — Périmètre commit feat (5 fichiers)

4 modified, 1 nouveau :
- sterny-react/src/hooks/useInscriptionWizard.js (modified — validateE3 ajoutée +13 lignes)
- sterny-react/src/pages/auth/InscriptionAlternantPage.jsx (modified — 4 imports + 2 handlers + branche E-3, ~50 lignes)
- sterny-react/src/components/auth-wizard/AutocompleteInput.jsx (modified — slice 8→4, 2 lignes modifiées)
- sterny-react/src/components/auth-wizard/AutocompleteInput.css (modified — labels uppercase 11px / 700 / letter-spacing 1px, 5 lignes modifiées)
- sterny-react/src/data/inscription-options.js (NEW — 3 constantes ECOLES (30) + ANNEES_ETUDES (38) + FILIERES (30))

CreerAnnoncePage.jsx (bypass DEV) intact en working dir post-commit, comme attendu. 3 untracked docs préexistants intacts.

### Bloc 3 — Décisions actées et conventions nouvelles

Issues du chantier UNIFICATION-INSCRIPTION § 3.7 (cf. amendement conv 9 dans la spec elle-même) :
- **Validation E-3** : 3 champs requis non vides après trim. Pas de regex.
- **Pas d'UPDATE BDD à E-3** : tout en mémoire jusqu'à E-7 (alignement § 3.5.1). La spec § 3.7 ligne 505 mentionnait UPDATE intermédiaire — obsolète.
- **Pas d'astérisque** : required={false} sur les 3 composants, validation 100% JS.
- **Bouton Continuer toujours actif** : pattern E-1 (bannière 3000ms au submit invalide).
- **Pas de WizardStepSubtitle** : aligné sur E-1/E-2.

Décisions visuelles nouvelles (conv 9) appliquées au composant partagé AutocompleteInput :
- **Labels uppercase 11px / 700 / letter-spacing 1px** (alignement TextInput E-1, modif CSS du composant partagé). Impact sandbox section 7 assumé.
- **Dropdown limité à 4 suggestions au focus** : pragmatique pour ne pas dépasser le bord inférieur de la card.
- **Bouton Continuer = `<button className="ial-btn-continuer">` natif** : cohérence E-1/E-2 (margin-top: auto). Le composant <PrimaryButton> partagé reste utilisé en sandbox dev mais pas en wizard production.

Décision architecturale :
- **AutocompleteInput pour année d'études** (au lieu de CustomSelect) : permet saisie libre, plus inclusif pour cursus rares.
- **Fichier neuf data/inscription-options.js** : source unique réutilisable pour E-3 et potentiellement E-4 (villes), E-6 (sexe options).

### Bloc 4 — Découvertes techniques

- **Composants AutocompleteInput et CustomSelect existaient déjà** dans auth-wizard/ depuis avant T1. Aucun consommateur en production — seule la sandbox dev les utilisait.
- **Homonymie function CustomSelect dans InscriptionRecherchePage.jsx ligne 49** : composant local IR avec API différente (props onOpenChange). Pas de risque de collision (imports explicites).
- **SET_FIELD générique** dans le hook (ligne 67) : fonctionne pour n'importe quel field déclaré dans l'état initial. Câblage E-3 sans toucher au reducer.
- **Ordre physique des branches if dans la page** : E-2 (88) → E-1 (131) → E-3 (insertion conv 9) → fallback. Convention transitoire jusqu'à T7 (refactor cosmétique de réorganisation logique).
- **errorTimerRef partagé top-level** ligne 41 : accessible par tous les handlers. handleE3Submit le réutilise pour clearer un éventuel timer E-1 résiduel.

### Bloc 5 — Prochaines étapes T2

**Priorité tout début conv 10** : sous-commit `feat(auth-wizard): introduce WizardProgressBar on E-1, E-2, E-3 wizard screens` **AVANT** la livraison E-4. Décision conv 9 : la progress bar (composant déjà extrait T1, présent dans auth-wizard/WizardProgressBar.jsx) doit être réintroduite sur tous les écrans wizard implémentés. Spec § 3.5 / 3.6 / 3.7 la prévoyait initialement avec `progress={N/7} stepLabel="..." stepNumber={N}`. Conv 7 et 8 avaient reporté l'introduction ("décision globale wizard à prendre quand on l'introduira sur tous les écrans"). Conv 9 acte la réintroduction simultanée car elle "fait vivre le formulaire et sert de ligne conductrice" (retour Côme). E-4 sera ensuite câblée nativement avec `progress={4/7}`.

Sous-commits T2 restants après progress bar :
- **5/5 : pattern de reprise + persistance state** (refresh page, navigation arrière depuis étape ultérieure, etc.).

Avant 5/5, livraisons E-4, E-5, E-6, E-7 attendues :
- **E-4 villes / statuts_villes** (spec § 3.8) — UI conditionnelle selon type_user.
- **E-5 calendrier RhythmManualBuilder** (spec § 3.9) — intégration du composant existant au wizard.
- **E-6 profil personnel** (spec § 3.10) — date_naissance, sexe, photo_profil_url, bio.
- **E-7 mot de passe + signUp Supabase** — INSERT users + UPDATE complet + envoi mail confirmation. Conv dédiée recommandée.

### État final branche post-conv 9

main : 11f0e0f (prod sterny.co inchangée). feat/unification-inscription : HEAD docs après HEAD feat — sous-commit 4/5 livré.

Working dir post-conv 9 :
- 1 modified : CreerAnnoncePage.jsx (bypass DEV préexistant tracé en DETTE-TECHNIQUE.md).
- 3 untracked : docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md + 2 fichiers spikes pdf-js (préexistants).

## 2026-05-05 — Clôture conv Claude.ai 8 : sous-commit 3/5 livré (commit fb14252)

### Bloc 1 — Phases d'écriture E-2 type_user

Conv 8 a livré l'écran E-2 du wizard unifié sur la branche feat/unification-inscription, par 7 phases incrémentales étalées sur 1 session :

- **Phase 1 (lecture pure IntentCardRadio)** : restitution intégrale du JSX (39 lignes) et CSS (91 lignes) du composant partagé livré en T1 (commit a70d69b), démo sandbox section 12 (lignes 205-242), et grep d'occurrence dans InscriptionRecherchePage. Découvertes clés : (a) le composant accepte une prop `label` typée ReactNode (pas seulement string), permettant d'injecter du JSX inline pour les mots-clés MAJUSCULE ; (b) IR n'utilise PAS IntentCardRadio mais une classe locale homonyme `.intent-card`, donc aucune dépendance à respecter.
- **Phase 2 (lecture pure préalables)** : useInscriptionWizard.js (204 lignes), InscriptionAlternantPage.jsx + .css, et 6 composants Wizard (Title, ProgressBar, StepSubtitle, PrimaryButton, BottomAuthLinks, AuthScreenContainer). Découverte clé : `state.type_user` (snake_case BDD) déjà initialisé à `null` dans le hook (ligne 39), action `SET_FIELD` permettant directement l'écriture, aucun gap d'API à corriger.
- **Phase 3 (écriture initiale E-2)** : 3 IntentCardRadio (locataire/hote/les_deux) avec textes alignés sur la sandbox de référence + spec § 7.3.2, bouton Continuer désactivé tant que `!state.type_user`, BottomAuthLinks avec `onRetour={goToPrevStep}` (cohérence E-1).
- **Phase 4 (itérations visuelles)** : 7 ajustements successifs sur le rendu E-2 — suppression de la question "Tu cherches, tu proposes, ou les deux ?" jugée trop volumineuse, mots-clés CHERCHE/PROPOSE/DEUX en MAJUSCULE inline via `.ial-card-keyword`, test des couleurs (orange #E8622A → navy #1E293B → slate-700 #334155), test du poids (700 → 600 → 700), nettoyage final : MAJUSCULE + letter-spacing 1px + weight 700 hérité + couleur héritée (label slate-700).
- **Phase 5 (check icon adouci)** : remplacement du caractère unicode `✓` par un SVG Material Symbols Rounded weight 700 inline (path d="M389-227..."), 14×14px dans le rond 22×22px, color: currentColor (hérite blanc quand sélectionné, transparent sinon).
- **Phase 6 (autofill Chrome)** : neutralisation du fond bleu auto-fill via règle CSS `.ial-form input:-webkit-autofill` scopée à E-1 (box-shadow inset 1000px white + transition 9999s pour empêcher le retour du bleu au focus).
- **Phase 7 (fix navigation)** : régression identifiée — clic Continuer sur E-2 ramenait à E-1 visuellement parce que le rendu E-1 était le `return` par défaut sans condition, donc capté par tous les `currentStep` autres que 2. Wrap E-1 dans `if (state.currentStep === 1)`, ajout d'un `return` final fallback "Étape N — À implémenter" pour les étapes 3 à 7 (toutes à venir), avec BottomAuthLinks `onRetour={goToPrevStep}`.

### Bloc 2 — Périmètre commit fb14252 (4 fichiers, +130 / −84)

4 modified, 0 nouveau :
- `sterny-react/src/components/auth-wizard/IntentCardRadio.jsx` (modified — caractère ✓ remplacé par SVG Material Rounded inline)
- `sterny-react/src/components/auth-wizard/IntentCardRadio.css` (modified — label color #1E293B → #334155 slate-700, cleanup font-size/weight sur le check devenus inutiles avec SVG)
- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` (modified — branche `if (currentStep === 1)`, branche `if (currentStep === 2)` réécrite avec 3 IntentCardRadio + mots-clés inline, fallback E-3+ placeholder, retrait de `.ial-btn-precedent`)
- `sterny-react/src/pages/auth/InscriptionAlternantPage.css` (modified — ajout `.ial-cards-stack` flex 1, `.ial-card-keyword` MAJUSCULE letter-spacing, `.ial-placeholder-content` réutilisée pour fallback, bloc autofill webkit ; suppression `.ial-placeholder-text` et `.ial-btn-precedent` devenus inutiles)

`CreerAnnoncePage.jsx` (bypass DEV) intact en working dir post-commit, comme attendu. 3 untracked docs préexistants intacts.

### Bloc 3 — Conventions actées et décisions visuelles nouvelles

Issues du chantier UNIFICATION-INSCRIPTION § 7.3.2 :
- **Valeurs `type_user`** : exactement `"locataire"` / `"hote"` / `"les_deux"` (alignement contrainte CHECK BDD + démo sandbox).
- **Préservation de saisie utilisateur** : `state.type_user` survit aux navigations Continuer/Retour à l'intérieur de la page car `useInscriptionWizard` instancié une seule fois au mount du composant. Refresh de page = perte (à corriger en 5/5 persistance state).
- **Pas de WizardProgressBar en E-2** : aligné sur l'absence de WizardProgressBar en E-1 (décision globale wizard à prendre quand on l'introduira sur tous les écrans).
- **Pas d'icône dans IntentCardRadio E-2** : aligné sur la démo sandbox section 12 qui n'en passe aucune. La prop `icon` reste optionnelle, ajout futur trivial (cf. nouvelle DETTE #63).

Décisions visuelles nouvelles (conv 8) :
- **Hiérarchie typo des cartes type_user** : mot-clé en MAJUSCULE + letter-spacing 1px, sans surcharge de couleur ni de poids supplémentaire (héritage parent). Cette décision contourne DETTE #60 par un patch local `.ial-card-keyword` plutôt qu'une refonte du composant partagé. DETTE #60 reste donc active pour les autres usages futurs de IntentCardRadio.
- **Couleur des labels IntentCardRadio (composant partagé)** : passage de navy `#1E293B` (slate-900) à slate `#334155` (slate-700). Adoucit visuellement les cartes sans perdre la lisibilité. Impact sandbox section 12 (cohérent — c'est l'évolution voulue).
- **Check icon IntentCardRadio (composant partagé)** : passage du caractère unicode `✓` à un SVG Material Symbols Rounded weight 700 inline. Plus rond, plus pro, sans pointes acérées. Couleur via `currentColor` pour préserver la logique CSS existante (transparent au repos, blanc quand sélectionné).
- **Autofill Chrome neutralisé sur .ial-form** : règle scopée à E-1 pour l'instant, à promouvoir dans `TextInput.css` quand E-3+ auront leurs propres inputs (cf. nouvelle DETTE #62).

### Bloc 4 — Pattern fallback placeholder pour étapes non implémentées

Nouveau pattern introduit par la conv 8 dans `InscriptionAlternantPage.jsx` : la fonction de rendu commence par `if (state.currentStep === 1) { return E-1 }`, puis `if (state.currentStep === 2) { return E-2 }`, puis un `return` final fallback qui rend un placeholder générique "Étape N — À implémenter" avec un bouton Retour via `BottomAuthLinks onRetour={goToPrevStep}`. Le `currentStep` peut prendre n'importe quelle valeur entre 3 et 7 (clamp via `Math.min(TOTAL_STEPS=7, currentStep+1)` dans `goToNextStep`), le placeholder affiche dynamiquement le numéro d'étape via `{state.currentStep}`. Aucune perte de saisie ou sélection : tout reste dans le state du hook tant que la page n'est pas refreshée. Quand E-3 à E-7 seront implémentées (sous-commits 4/5+), elles s'ajouteront simplement comme nouvelles branches `if` avant le fallback.

### Bloc 5 — Prochaines étapes T2

Sous-commits T2 restants :
- **4/5 : E-7 mot de passe + signUp Supabase** + INSERT initial users + UPDATE complet avec toutes les données du state + envoi mail confirmation + écran "Vérifie ta boîte mail". Conv dédiée recommandée vu la densité technique (auth, BDD, mail). Préalable : décider si on implémente E-3/E-4/E-5/E-6 avant E-7, ou si on saute directement à E-7 pour valider le flow auth bout-en-bout (reco : implémenter E-3 → E-7 dans l'ordre, sinon le placeholder fallback brouille le test du flow auth en E-7).
- **5/5 : pattern de reprise + persistance state** (refresh page, navigation arrière depuis étape ultérieure, etc.).

E-3 (école/année/filière), E-4 (villes/statuts), E-5 (calendrier RhythmManualBuilder), E-6 (date naissance/sexe/photo/bio) probablement scindables en sous-commits supplémentaires entre 3/5 et 4/5, à arbitrer en démarrage conv 9.

### État final branche post-conv 8

- `main` : 11f0e0f (prod sterny.co inchangée).
- `feat/unification-inscription` : fb14252 (HEAD) — sous-commit 3/5 livré sur origin.

Working dir post-conv 8 :
- 1 modified : `CreerAnnoncePage.jsx` (bypass DEV préexistant tracé en DETTE-TECHNIQUE.md).
- 3 untracked : `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` + 2 fichiers spikes pdf-js (préexistants).

Confirm email Supabase : laissé ON. Continuera à casser `/inscription/proprietaire` méthode email en prod jusqu'à livraison T4 (DETTE #55).

---

## 2026-05-04 ter — Clôture conv Claude.ai 7 : sous-commit 2/5 livré (commit 852846d)

### Bloc 1 — Phases d'écriture E-1 méthode email

Conv 7 a livré l'écran E-1 du wizard unifié sur la branche feat/unification-inscription, par 5 phases incrémentales :

- **Phase 4a (lecture pure d'IR)** : restitution intégrale du JSX et CSS d'InscriptionRecherchePage (étape 2 identité, lignes 467-507) + analyse comparative IR vs E-1 cible. Découverte importante : zone identité IR contient 4 champs (Nom, Prénom, Email, Téléphone), pas 5 — le mot de passe IR est en étape 4 (hors scope E-1). Ordre IR à inverser pour E-1 (Prénom → Nom → Téléphone → Email).
- **Phase 4a-bis (lecture pure working dir)** : 6 fiches API sur useInscriptionWizard.js, TextInput.jsx + .css, AuthErrorBanner.jsx + .css, AuthScreenContainer.css. 11 découvertes consignées dont 2 gaps d'API du hook (setGlobalError manquant, validateE1Email module-private) et le besoin de découpler hasError/error sur TextInput.
- **Phase 4b (écriture)** : enrichissement du hook (export validateE1Email, ajout getE1InvalidFields, setGlobalError exposé), ajout prop hasError sur TextInput, écriture from-scratch de InscriptionAlternantPage.jsx + .css. Validation locale au submit, bordure rouge sur champs invalides, bannière AuthErrorBanner 3000ms (timer géré côté page), préservation de saisie. Build Vite OK 966ms.
- **Phase 4d (ajustements UX post-test visuel)** : forwardRef sur TextInput + 4 refs sur les inputs (Entrée → champ suivant, Entrée sur Email → submit), Prénom + Nom côte à côte (.ial-form-row grid 2 colonnes desktop / 1 colonne mobile <480px), suppression BackLink, BottomAuthLinks unifié "Retour · Déjà un compte ? Se connecter".
- **Phase 4e (stabilité layout vertical)** : margin-bottom titre 24 → 32px (anticipation WizardProgressBar), .ial-form flex: 1 + .ial-btn-continuer margin-top: auto (Continuer poussé en bas du form), .ial-placeholder-content + .ial-btn-precedent margin: auto auto 0 auto pour stabilité visuelle E-1 ↔ E-2 (pas de saut au changement d'étape).

### Bloc 2 — Périmètre commit 852846d (11 fichiers, +545 / −75)

7 modified + 4 nouveaux :
- `sterny-react/src/hooks/useInscriptionWizard.js` (modified — exports validateE1Email/getE1InvalidFields + setGlobalError)
- `sterny-react/src/components/auth-wizard/TextInput.jsx` (modified — prop hasError + forwardRef)
- `sterny-react/src/components/auth-wizard/AuthScreenContainer.css` (modified — Fix B card défensif : margin 0 auto + flex-shrink 0)
- `sterny-react/src/dev/AuthWizardSandbox.jsx` + `.css` (modified — Fix B section 17 démo composants)
- `sterny-react/src/pages/auth/InscriptionAlternantPage.jsx` + `.css` (modified — réécriture intégrale)
- `sterny-react/src/components/auth-wizard/AuthErrorBanner.jsx` + `.css` (nouveau — bannière globale prop unique message, auto-hide géré par parent)
- `sterny-react/src/components/auth-wizard/ErrorMessage.jsx` + `.css` (nouveau — composant erreur per-field générique, livré pour usages futurs du wizard, non utilisé en E-1)

`CreerAnnoncePage.jsx` (bypass DEV) intact en working dir post-commit, comme attendu.

### Bloc 3 — Conventions actées appliquées

Issues du chantier UNIFICATION-INSCRIPTION § 3.5.1 amendement conv 6 :
- **Placeholder école 2** (instruction tutoyée sans verbe) : "Ton prénom" / "Ton nom" / "Ton numéro de téléphone" / "Ton adresse email". Ne s'applique pas rétroactivement à `InscriptionRecherchePage.jsx` ni `CompleterProfilPage.jsx` (cf. DETTE #61).
- **Préservation de saisie utilisateur** : aucune valeur ne disparaît en cas d'erreur de validation. La saisie reste dans le state global `useInscriptionWizard`, l'erreur se manifeste par bordure rouge sur le champ + bannière 3000 ms.

### Bloc 4 — Prochaines étapes T2

Sous-commits T2 restants :
- **3/5 : E-2 type_user** (3 IntentCardRadio "cherche / propose / les deux"). Nouvelle conv recommandée — la lecture du composant `<IntentCardRadio>` existant (livré dans T1, commit a70d69b) est le préalable.
- **4/5 : E-7 mot de passe** + signUp Supabase + INSERT initial users + envoi mail confirmation + écran "Vérifie ta boîte mail".
- **5/5 : pattern de reprise** + persistance state (refresh page, navigation arrière depuis étape ultérieure, etc.).

E-3 à E-6 (école / villes / dates / photo) probablement scindables en sous-commits supplémentaires selon complexité, à arbitrer en démarrage conv 8.

### État final branche post-conv 7

- `main` : 11f0e0f (prod sterny.co inchangée).
- `feat/unification-inscription` : 852846d (HEAD) — sous-commit 2/5 livré sur origin.

Working dir post-conv 7 :
- 1 modified : `CreerAnnoncePage.jsx` (bypass DEV préexistant tracé en DETTE-TECHNIQUE.md).
- 3 untracked : `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` + 2 fichiers spikes pdf-js (préexistants).

Confirm email Supabase : laissé ON. Continuera à casser `/inscription/proprietaire` méthode email en prod jusqu'à livraison T4 (DETTE #55).

---

## 2026-05-04 bis — Clôture conv Claude.ai 6 : DETTE #58 résolue + école 2 actée + sous-commit 2/5 reporté

### Bloc 1 — Phase de mise en condition

Reprise sur la base du brief de démarrage conv 6 (3 marqueurs validés en début de session : header ETAT-COURANT 2026-05-04, DETTE #58 dans DETTE-TECHNIQUE, 2 encarts amendement UNIFICATION-INSCRIPTION § 3.5.1 et § 7.3.2).

Décisions préliminaires actées en début de conv :
- Décision 1 : Option 2 avec 2 affinements sur le sort du Fix B uncommitted. Conserver fichiers réutilisables (ErrorMessage.jsx + .css, AuthErrorBanner.jsx + .css, useInscriptionWizard.js refondu globalError, AuthScreenContainer.css fix défensif, AuthWizardSandbox section 17). Reverter InscriptionAlternantPage.jsx + .css ET TextInput.css (2 affinements vs reco conv 5). Nettoyer chirurgicalement useInscriptionWizard.js des helpers obsolètes (mapSupabaseSignUpError + submitE1Email + branche password de validateE1Email + state submitting + reducer SET_SUBMITTING).
- Décision 2 : Découpage T2 validé (2/5 E-1 méthode email from-scratch / 3/5 scindable en 3a/3b/3c selon écrans / 4/5 E-7 mdp + signUp + INSERT + UPDATE + mail / 5/5 pattern de reprise précédé de cadrage produit dédié).

Prompt Claude Code n°1 livré — revert sélectif. 3 fichiers revertés à HEAD. useInscriptionWizard.js nettoyé chirurgicalement (-86 lignes, passe de 268 à 181 lignes). Build OK 1.02s. Aucun commit créé. Note : HEAD réel = 9a349b0, pas 9a36d99 comme indiqué dans le brief de démarrage conv 6 (9a349b0 = commit docs clôture conv 5 qui n'a touché que les .md, donc reverts équivalents).

### Bloc 2 — DETTE #58 résolue (commit d91b5d6)

Audit lecture pure phase 0 du composant <TextInput> et du pattern label IR canonique. Découverte importante : la prop placeholder était DÉJÀ supportée dans la signature actuelle ET déjà transmise à l'<input> natif (lignes 8 + 32 de TextInput.jsx). DETTE #58 effective réduite de 3 à 2 changements réels :
- (a) Style label aligné IR : .aw-textinput-label passe de 13px/600/lowercase à 11px/700/uppercase + letter-spacing 1px (margin-bottom: 6px délibérément non ajouté car gap: 6px du parent .aw-textinput compense).
- (b) Retrait du span.aw-textinput-required (astérisque visuelle * orange) en JSX + suppression du bloc CSS associé. Prop required conservée dans la signature et transmise à <input> natif (validation HTML).

Sandbox section 4 ramenée à 3 instances cohérentes pattern IR (vide-avec-placeholder / rempli / en erreur) après plusieurs allers-retours sur le placeholder de l'instance 1 (Saisis ton prénom → Marie → Ton prénom). Itinéraire qui a fait émerger la décision école 2 (cf. bloc 3).

Commit d91b5d6 sur origin/feat/unification-inscription. 3 fichiers / +6 / -9 lignes. Strictement atomique grâce à un add chirurgical sur AuthWizardSandbox.jsx (procédure backup → checkout HEAD → réapplique modif ciblée → add → restore) qui a permis de stager UNIQUEMENT le hunk DETTE #58 (1 ligne placeholder section 4) en laissant les 3 hunks Fix B (import ErrorMessage + hooks emShakeRef/emErrorVisible + section 17 entière) en working dir uncommitted.

### Bloc 3 — Convention école 2 actée pour le wizard unifié

Décision Côme conv 6 actée pendant la validation visuelle DETTE #58 :
- Convention placeholder = "instruction tutoyée" (école 2). Exemples canoniques : "Ton prénom", "Ton nom", "Ton adresse email", "Ton numéro de téléphone", "Ta ville". Pas de verbe "saisis" / "entre" / "indique" — directement le complément avec "Ton" / "Ta" + nom du champ.
- Justification Côme : exemples concrets (école 1 : "Marie", "Dupont") risquent de perturber utilisateurs avec ces noms réels et "Dupont" trop connoté placeholder cliché. École 2 cohérente avec le tutoiement déjà appliqué partout sur Sterny ("Trouve ton logement", navbar).
- Périmètre acté : convention naît avec le wizard unifié. NE S'APPLIQUE PAS rétroactivement à InscriptionRecherchePage.jsx ni CompleterProfilPage.jsx qui restent en école 1 jusqu'à leur dépréciation. Justification : ces 2 pages sont vouées à être remplacées par le wizard dans T2-T7, modifier maintenant = double travail.
- Le commit DETTE #58 (d91b5d6) a déjà appliqué l'école 2 dans la sandbox <TextInput> (placeholder "Ton prénom").
- Convention "préservation de saisie utilisateur" actée en parallèle : à toute étape du wizard, la valeur saisie ne doit jamais être effacée par une erreur de validation. Erreur s'affiche en complément (bordure rouge sur le champ + bannière <AuthErrorBanner> 3000 ms remplaçant <BottomAuthLinks>).

Audit IR/CP fait par Claude Code en début de prompt n°3 (12 placeholders école 1 identifiés sur 25 placeholders totaux) puis prompt annulé. Tableau d'audit conservé dans la conversation Claude.ai 6 si besoin de l'exploiter en DETTE #61 plus tard.

### Bloc 4 — DETTE #59 + #60 + #61 créées (cf. DETTE-TECHNIQUE.md)

Trois nouvelles DETTES tracées en clôture conv 6, issues des remarques de Côme pendant la validation visuelle de la sandbox /dev/auth-wizard-sandbox :
- DETTE #59 — Retrait flèche ← dans <BackLink> ("ça fait pas pro").
- DETTE #60 — Hiérarchie typographique IntentCardRadio (mettre en avant "cherche / propose / les deux").
- DETTE #61 — Bascule placeholders IR/CP sur école 2 si IR/CP survivent au-delà du wizard unifié.

### Bloc 5 — Sous-commit 2/5 reporté à conv 7

Sous-commit 2/5 (E-1 méthode email from-scratch sur la base du JSX exact d'IR) NON entamé en conv 6. Reporté à conv 7 par décision Claude.ai en accord avec Côme. Justification : sujet trop important architecturalement pour être codé en bout de conv saturée. La conv 6 a déjà comporté 12+ phases (lecture 6 docs + revert + DETTE #58 phase 0/1/2 + corrections sandbox successives + commit chirurgical + audit IR/CP annulé). Le sous-commit 2/5 définit le pattern E-1 du wizard pour tout le reste du chantier T2-T7 — il mérite une conv 7 fraîche démarrant directement sur la phase de lecture exhaustive d'IR avec énergie cognitive intacte.

### État final du chantier UNIFICATION-INSCRIPTION fin conv 6

Sprint 1 ouvert. T1 livrée (commit a70d69b sur main). T2 partiellement codée :
- Sous-commits 0, 1, 1-bis, 1-ter ✅ (commits 52d6e79 / f0ec0b4 / 838f027 / 45777b9 sur branche feat/unification-inscription)
- Sous-commit DETTE #58 hors-T2 ✅ (commit d91b5d6 sur branche feat/unification-inscription)
- Sous-commits 2/5, 3/5, 4/5, 5/5 restants

main toujours sur 11f0e0f (prod sterny.co inchangée). La branche feat/unification-inscription accumule les sous-commits T2 + DETTE #58 jusqu'à T7 avant merge en main.

État working dir fin conv 6 (préservé pour conv 7) :
- 5 modified : AuthScreenContainer.css (Fix B), AuthWizardSandbox.css (Fix B section 17), AuthWizardSandbox.jsx (Fix B 3 hunks restants après add chirurgical DETTE #58), useInscriptionWizard.js (refonte globalError + nettoyage chirurgical), CreerAnnoncePage.jsx (bypass DEV préexistant intouché)
- 7 untracked : 4 Fix B (ErrorMessage.jsx + .css, AuthErrorBanner.jsx + .css), 3 docs préexistants (audit + spike pdf-js)

Ces 9 fichiers Fix B + le rendu E-1 from-scratch à venir formeront le périmètre du sous-commit 2/5 en conv 7 (cf. cadrage Q1 de Claude.ai conv 6 sur le périmètre du commit).

Confirm email Supabase : laissé ON. Continuera à casser /inscription/proprietaire méthode email en prod jusqu'à livraison T4 (DETTE #55). Acceptable parce que aucun proprio réel ne s'inscrit en prod.

---

## 2026-05-04 — Clôture conv Claude.ai 5 : audit IR/CP + 5 décisions design + pivot mdp en E-7

### Bloc 1 — 7 itérations sur sous-commit 2/5 avant pivot

Itérations livrées en conv 5 (toutes uncommitted en fin de conv) :
- 2.A : composant <ErrorMessage> partagé créé + démo sandbox section 17 (4 cellules d'usage)
- 2.B : logique E-1 méthode email codée dans useInscriptionWizard.js (5 champs + signUp Supabase + mapping erreurs par-champ + écran 5 inputs verticaux dans InscriptionAlternantPage.jsx)
- Fix card étirée (faux positif sur la largeur — la card faisait bien 460px depuis le début, c'était la longueur verticale qui posait question)
- Fix A : compactage spacing (gap label↔input 6→8px, margin-bottom inter-groupes 14→12px)
- Fix B : refonte modèle d'erreur frontend en bannière unique <AuthErrorBanner> remplaçant <BottomAuthLinks> 2s + Prénom/Nom côte à côte (.iap-row 1fr 1fr)

Tous ces fichiers existent en working dir mais ne sont pas committés. Branche feat/unification-inscription reste à HEAD = 9a36d99 (clôture conv 4).

### Bloc 2 — Audit lecture pure IR + CP (fin de conv 5)

Constat : le code livré en 2.B + Fix B ne reproduit pas fidèlement le pattern IR/CP existant en prod. Audit lecture pure de InscriptionRecherchePage (625 lignes JSX, 637 lignes CSS) + CompleterProfilPage (1125 lignes JSX, 759 lignes CSS) conduit en fin de conv 5.

Découvertes clés :
- IR a 4 étapes (intent → identité → alternance → mot de passe), pas 1 étape de 5 champs comme spec UNIFICATION § 3.5.1
- Le mot de passe vit en étape 4/4 finale, pas en E-1
- Aucun sous-titre dans IR ni CP (CP a explicitement {/* subtitle removed */})
- Labels 11px uppercase weight 700 letter-spacing 1px navy (style "petite caps"), pas 13px lowercase
- Placeholders présents dans tous les inputs ("Dupont", "Marie", "marie@email.com", "06 12 34 56 78")
- Aucun indicateur * sur les required, validation au submit avec message global
- Pattern d'erreur IR/CP : message global remplace .ir-back / .cp-back pendant 3000ms (pas 2s), shake bouton synchrone — exactement le pattern Fix B mais avec 3s
- Bouton OAuth Google IR : présent à étape 2 d'IR, après "Continuer" + séparateur "ou" — pattern legacy avant la décision Q5 d'écran 0 refondu

### Bloc 3 — 5 décisions actées en conv 5

D1 — Mot de passe en E-7 (dernière étape) : aligné IR. Le signUp Supabase + INSERT initial users + UPDATE complet se feront tous à E-7 en RPC atomique ou séquence client-side (à arbitrer en T7). Pendant E-1 à E-6 l'utilisateur n'a pas de session Auth ; tout est stocké en mémoire React. L'écran "Vérifie ta boîte mail" intervient après le submit final E-7, pas entre E-1 et E-2.

D2 — Sous-titre "Tes informations de contact" supprimé : aligné IR/CP.

D3 — Layout strict IR : labels 11px uppercase weight 700 letter-spacing 1px navy + placeholders dans inputs + pas d'astérisque. Implique modification du composant T1 <TextInput> partagé (impact sandbox AuthWizardSandbox.jsx — 16 sections existantes vont changer d'apparence pour s'aligner sur le design canonique IR/CP).

D4 — Durée d'affichage erreur : 3000ms (aligné IR/CP). La constante GLOBAL_ERROR_DISPLAY_MS dans InscriptionAlternantPage.jsx passera de 2000 à 3000.

D5 — OAuth Google reste sur écran 0 (/inscription, ChoixInscriptionPage refondu en T3). NE PAS reproduire le bouton Google de l'étape 2 d'IR dans InscriptionAlternantPage. Pattern IR sur ce point est legacy avant la décision Q5 + écran 0 refondu (cf. UNIFICATION § 3.4 et § 4.5.2).

### Bloc 4 — Conséquences sur le découpage T2

Le découpage des sous-commits T2 acté en conv 4 (sous-commits 2/5 = E-1 méthode email + écran Vérifie ta boîte mail + INSERT initial users post-confirmation) est CADUC.

Nouveau découpage proposé pour conv 6 (à arbitrer définitivement en démarrage conv 6) :
- Sous-commit 2/5 — E-1 méthode email refait from-scratch sur la base du JSX exact d'IR : 4 champs (Prénom, Nom, Téléphone, Email — pas de mdp), validation locale, navigation E-2 placeholder. Aucun signUp, aucun INSERT BDD, aucune session Auth créée.
- Sous-commit 3/5 — E-2 (type_user) + E-3 à E-6 (placeholders ou contenu réel selon arbitrage)
- Sous-commit 4/5 — E-7 = mdp + signUp + INSERT initial users + UPDATE complet avec toutes les données du state + envoi mail confirmation Supabase + redirection écran "Vérifie ta boîte mail"
- Sous-commit 5/5 — Pattern de reprise (user revient après abandon, session Auth absente parce que pas encore créée — comportement à définir)

### Bloc 5 — État du code en fin de conv 5 (working dir non committé)

Fichiers créés (4) : ErrorMessage.jsx + ErrorMessage.css (2.A), AuthErrorBanner.jsx + AuthErrorBanner.css (Fix B).
Fichiers modifiés (7) : AuthScreenContainer.css (fix card défensif), AuthWizardSandbox.jsx + .css (démo ErrorMessage section 17), useInscriptionWizard.js (refonte globalError + validateE1Email + mapSupabaseSignUpError + submitE1Email), InscriptionAlternantPage.jsx + .css (rendu E-1 méthode email avec Prénom/Nom côte à côte), TextInput.css (gap 6→8).

Aucun de ces fichiers n'est committé. Branche feat/unification-inscription reste sur 9a36d99.

Décision pour conv 6 :
- Soit reverter intégralement ces modifs et repartir from-scratch sur la base du JSX d'IR
- Soit conserver les fichiers réutilisables (ErrorMessage.jsx + AuthErrorBanner.jsx restent valides comme composants partagés ; useInscriptionWizard.js refondu globalError est valide ; AuthScreenContainer.css fix défensif est valide), et reverter uniquement le rendu JSX d'InscriptionAlternantPage.jsx + .css

Recommandation : conserver les fichiers réutilisables (option 2). Les composants <ErrorMessage> et <AuthErrorBanner> sont alignés sur IR/CP dans leur fonctionnement, juste leur durée d'affichage et leur usage diffèrent. La refonte du hook en globalError est plus simple que l'ancien errors objet et reste pertinente. Seul le rendu JSX d'InscriptionAlternantPage doit être refait sur la base du code IR. Validation finale en démarrage conv 6.

### État final du chantier UNIFICATION-INSCRIPTION fin conv 5

Sprint 1 ouvert. T1 livrée (commit a70d69b sur main). T2 partiellement codée :
- Sous-commits 0, 1, 1-bis, 1-ter ✅ (commits 52d6e79 / f0ec0b4 / 838f027 / 45777b9 / 9a36d99 sur branche feat/unification-inscription)
- Sous-commit 2/5 codé en conv 5 mais NON COMMITTÉ et architecture invalidée par les 5 décisions acted — à reprendre en conv 6
- Sous-commits 3, 4, 5 restants

Aucun changement visible pour les utilisateurs de sterny.co (main reste sur 11f0e0f). La branche feature accumulera les nouveaux sous-commits T2 jusqu'à T7 avant merge en main.

Confirm email Supabase : laissé ON (réactivé en début conv 5). Continuera à casser /inscription/proprietaire méthode email en prod (DETTE #55 enrichie) jusqu'à livraison T4. Acceptable parce que aucun proprio réel ne s'inscrit en prod.

---

## 2026-05-03 ter — Conv 4 : T2 sub-commits 0/1/1-bis/1-ter livrés sur branche feat/unification-inscription

### Bloc 1 — Branche feature créée et 4 commits poussés

Branche `feat/unification-inscription` créée à partir de `main` (HEAD = 11f0e0f, clôture conv 3). 4 commits poussés sur origin, prod (sterny.co) inchangée.

| Hash | Sous-commit | Sujet |
|---|---|---|
| 52d6e79 | sub-0 (hors compteur) | fix(auth): exclude /inscription/alternant from GoogleAuthHandler interception |
| f0ec0b4 | sub-1/5 | feat(auth-wizard): scaffold InscriptionAlternantPage + useInscriptionWizard hook |
| 838f027 | sub-1bis (hors compteur) | fix(auth-wizard): align InscriptionAlternantPage rendering with existing inscription pages |
| 45777b9 | sub-1ter (hors compteur) | fix(auth): hide signup CTA on auth routes + unify BottomAuthLinks across wizard steps |

### Bloc 2 — Sous-commit 0 (52d6e79) : fix handler

Patch chirurgical transitoire dans `GoogleAuthHandler.jsx` : ajout d'un tableau `HANDLER_BYPASS_ROUTES = ['/inscription/alternant']` qui exclut le wizard alternant de l'interception du handler. Sans ce fix, le handler aurait redirigé l'utilisateur vers `/completer-profil` avant même que `useInscriptionWizard` puisse monter et faire son SELECT users. Refonte complète prévue en T4 (OAuthHandler générique) qui ajoutera `/inscription/proprietaire` au tableau (cf. UNIFICATION-INSCRIPTION § 4.5.3).

### Bloc 3 — Sous-commit 1 (f0ec0b4) : scaffold

Création du squelette technique sans logique BDD : page `InscriptionAlternantPage.jsx` (77 lignes) + custom hook `useInscriptionWizard.js` (120 lignes, useReducer, 15+ champs state, 5 actions wrappées) + CSS (23 lignes) + route `/inscription/alternant` dans `App.jsx`. Détection `authMethod` au mount via `session.user.app_metadata.provider`. Aucun INSERT/UPDATE BDD — placeholders d'étape navigables E-1 à E-7. JSDoc pédagogique en tête de useInscriptionWizard.js pour expliquer useReducer (premier usage par Côme).

### Bloc 4 — Sous-commit 1-bis (838f027) : fix design alignment

13 divergences corrigées entre rendu T1/T2 initial et rendu cible des pages `/inscription` + `/inscription/recherche` existantes. Modifs sur 6 composants `auth-wizard/` partagés (WizardTitle.css, WizardProgressBar.jsx + .css, AuthScreenContainer.css, BackLink.css) + nouveau composant `BottomAuthLinks.jsx` pour ligne combinée "Retour · Déjà un compte ? Se connecter". Ajout `min-height: 536px` sur `.aw-screen-card` pour stabilité visuelle entre étapes du wizard. WizardProgressBar : nouvelle prop `showLabel` (default false) — sandbox `/dev/auth-wizard-sandbox` mise à jour avec démo (3 instances avec label, 1 sans).

### Bloc 5 — Sous-commit 1-ter (45777b9) : navbar masquée + label "Retour" uniforme

Modif transversale `Navbar.jsx` + `HamburgerMenu.jsx` : CTA "S'inscrire" masqué sur les routes `/inscription/*` et `/connexion` (HIDE_SIGNUP_ROUTES + check `useLocation().pathname.startsWith()`). Label "Retour" uniforme sur toutes les étapes du wizard (suppression du distinguo "← Précédent" suggéré initialement, alignement 1:1 sur le pattern IR/CI). Ajout d'une section démo "10-bis. BottomAuthLinks (3 variants)" dans la sandbox.

### Bloc 6 — Décisions prises pendant la conv 4

- **Confirm email Supabase** : a été activé en début de conv 4 (Supabase Studio → Authentication → Sign In/Providers → User Signups → Confirm email ON), nécessaire pour le sous-commit 2 (écran "Vérifie ta boîte mail"). **Désactivé en fin de conv 4** suite à la découverte qu'il casse le parcours proprio email en prod (cf. mise à jour DETTE #55). À **réactiver impérativement** au début du sous-commit 2 en conv 5, et à laisser ON en permanence après livraison T4.
- **URL Configuration Supabase** : Site URL = `https://sterny.co`. Redirect URLs = 3 entrées (`https://sterny.co/**`, `http://localhost:5173/**`, `https://sterny-*.vercel.app/**`).
- **Configuration Vercel** : compte Vercel = `come-1859s-projects` (pas `comefourel-sterny` comme initialement supposé). URL preview branche feature = `https://sterny-git-feat-unification-inscription-come-1859s-projects.vercel.app`. Deployment Protection laissée activée par défaut sur le plan Hobby.
- **Pattern OAuth écran 0 ChoixInscriptionPage refondue (T3)** : 3 boutons OAuth + email à intégrer en T3 suivront le pattern row icônes seules façon Mistral (Apple, Google) sans label texte, + bouton email pleine largeur séparé en dessous. Justification : compacité, alignement design Sterny, pas de modification de la card 460×536. À détailler dans le mockup T3 le moment venu (cf. UNIFICATION-INSCRIPTION § 3.4 à enrichir).
- **Sous-commit 2 architecture** : décidé en conv 4 que le sous-commit 2 démarrera par la création d'un composant `<ErrorMessage>` partagé (aligné 1:1 sur le pattern IR/CI) + démo dans la sandbox **avant** le branchement sur la logique réelle de validation E-1. Cette étape permet à Côme de valider visuellement le rendu d'erreur (couleur, position, comportement shake) avant que la logique soit codée.

### État final du chantier UNIFICATION-INSCRIPTION fin conv 4

Sprint 1 ouvert. T1 livrée (commit a70d69b sur main). T2 partiellement livrée sur branche `feat/unification-inscription` :
- Sous-commits 0, 1, 1-bis, 1-ter ✅
- Sous-commits 2, 3, 4, 5 restants (~3-4h Claude Code cumulées)

Prochaine étape : conv 5 dédiée au sous-commit 2 (E-1 méthode email + écran "Vérifie ta boîte mail" + INSERT initial users post-confirmation). Confirm email Supabase à réactiver au démarrage de la conv 5.

Aucun changement visible pour les utilisateurs de sterny.co (main reste sur 11f0e0f). La branche feature accumulera les sous-commits T2 jusqu'à T7 avant merge en main.

---

## 2026-05-03 bis — Démarrage Sprint 1 chantier UNIFICATION-INSCRIPTION : T1 livrée

### Bloc 1 — DETTE #56 créée (commit 6c480f0)

Découverte par grep préalable T1-PARTIE-1 : 43 occurrences hardcodées de #dc2626 (rouge danger, 6 occurrences) et #059669 (vert succès, 37 occurrences) dans la base CSS, aucune n'utilise var(--error) / var(--success). Tracée comme dette de tokenisation systématique, priorité faible, hors scope T1-T9.

### Bloc 2 — T1 livrée (commit a70d69b)

Tranche 1 du plan d'implémentation UNIFICATION-INSCRIPTION § 7.3.1. 43 fichiers, +2284 / -2 lignes.

Créés dans sterny-react/src/components/auth-wizard/ :
- 17 composants/hooks publics : AuthScreenContainer, WizardProgressBar, WizardTitle, WizardStepSubtitle, TextInput, TextArea, CustomSelect, AutocompleteInput, PrimaryButton, GoogleSignInButton, AppleSignInButton, OrSeparator, BackLink, PhotoCropperModal, IntentCardRadio, RecapBlock, RhythmCalendarPreview, RhythmRequiredPopup, InfoBox + hook useShakeButton.
- 1 sous-composant privé interne : OAuthButton (mutualisation Google + Apple, hors compteur 17).

Créés dans sterny-react/src/dev/ : AuthWizardSandbox.jsx + .css. Route /dev/auth-wizard-sandbox accessible directement par URL, non linkée (convention héritée des 3 autres routes /dev/* existantes).

Modifiés :
- sterny-react/src/index.css : tokenisation --accent-hover (#D4571F nouveau), --error (#ff6b6b → #dc2626), --success (#51cf66 → #059669). DETTE #31 et DETTE #53 résolues localement (cf. DETTE #56 pour le reste de la base).
- sterny-react/src/App.jsx : ajout import + route /dev/auth-wizard-sandbox.

### Bloc 3 — Décisions clés Sprint 1 conv 3

- Q-T1.A : sandbox éphémère sur route permanente non linkée /dev/auth-wizard-sandbox (alignée sur les 3 routes /dev/* existantes), pas de wrap import.meta.env.DEV.
- Q-T1.B : ordre d'extraction en 4 vagues — hook → atomes purs → atomes avec deps → composés lourds.
- Q-T1.C : <PrimaryButton> = base .cx-submit (ConnexionPage) + :hover:not(:disabled) de .ci-btn (ChoixInscriptionPage) + :disabled propre de .ci-btn. API : children, onClick, type, disabled, loading (spinner), className, style, ref (forwardRef pour useShakeButton).
- Q-T1.D : <GoogleSignInButton> + <AppleSignInButton> distincts en API publique, mutualisation interne via <OAuthButton> sous-composant privé. Hauteur 48px fixe (corrige incohérence 44px de InscriptionProprietairePage qui sera reprise en T4).
- Q-T1.E : écrasement --error / --success dans T1. Liste brute du grep préalable révélait 5 usages var(--error/success) tous dans RecherchePage.jsx (harmonisation visuelle bénigne) vs 43 hardcodés ailleurs (objet de DETTE #56).

### État final du chantier UNIFICATION-INSCRIPTION

Sprint 1 ouvert, T1 livrée. Prochaine étape : T2 (création InscriptionAlternantPage.jsx from-scratch, durée estimée 4-5h Claude Code, dépendances : T1 only). T2 à ouvrir en nouvelle session Claude.ai 4 dédiée pour préserver la précision du contexte.

Pages d'inscription/connexion actuelles intouchées (ChoixInscriptionPage, InscriptionRecherchePage, CompleterProfilPage, ConnexionPage, InscriptionProprietairePage, InscriptionPartagerPage). Aucun changement visible pour les utilisateurs après push T1.

---

## 2026-05-03 — Clôture conv Claude.ai 2 chantier UNIFICATION-INSCRIPTION

### Bloc 1 — Sections 3-7 du doc cadrage UNIFICATION-INSCRIPTION

5 commits successifs sur main, validés visuellement avant push à chaque étape :

- `380e592` — Section 3 design des écrans : 14 sous-sections couvrant Écran 0 + E-1 à E-7 + pop-up RhythmRequiredPopup, 17 composants/hooks à créer dans tranche 1, 5 patterns audit § 7 arbitrés, bouton principal aligné sur pattern existant des pages d'auth, stepper enrichi sans le total "sur 7", E-5 dans card 460px (prérequis DETTE #54).
- `c69374e` — Section 4 gestion 3 méthodes auth : 10 sous-sections, signatures Supabase Auth exactes (signUp, signInWithOAuth Google + Apple), refonte GoogleAuthHandler → OAuthHandler générique, DETTE #51 résolue par cette refonte (caduque), migration INSERT users hors handler (Q5) couvrant alternant + proprio, § 4.5.3 cas particulier route /inscription/proprietaire exclue, § 4.10 dépendance critique InscriptionProprietairePage doit faire son propre INSERT (DETTE #55), Apple Hide My Email géré en transparence, pattern de reprise détaillé.
- `187b072` — Section 5 table 9 parcours bout-en-bout : 9 parcours alternant (3 type_user × 3 méthodes auth), état BDD attendu colonne par colonne, variations par dimension, table croisée 3×3, 7 tests transverses, 5 critères de succès/échec, parcours proprio hors scope (tracé via DETTE #55).
- `9fe17be` — Section 6 sujets RGPD juridiques : index de 5 sujets + 1 bonus à examiner avec professionnels avant lancement, source unique référencée QUESTIONS-PROFESSIONNELS.md, identifiants Q-DPO-NNN / Q-AVO-NNN / Q-ASS-NNN, aucun lancement sans validation préalable.
- `4a9d515` — Section 7 plan d'implémentation séquencé : 9 tranches T1 à T9 détaillées (objectif, fichiers, critères de succès, plan de rollback, durée, commit message), diagramme de dépendances, plan de rollback global, 6 sous-tâches transverses non séquencées, stratégie 4 sprints, estimation 19h-28h Claude Code total.

### Bloc 2 — Doc consolidé QUESTIONS-PROFESSIONNELS.md créé

Création du nouveau doc `docs/recherche/QUESTIONS-PROFESSIONNELS.md` source unique pour préparer les RDV pros pré-lancement. Structure 7 sections (Avocat, Avocat/DPO, Notaire, Assureur, Banque, Expert-comptable, Développeur) + sujets transversaux + table de suivi tabulaire. 19 questions pré-remplies avec identifiants `[Q-XXX-NNN]` (4 Q-AVO + 7 Q-DPO + 1 Q-ASS + 7 Q-DEV). Sections Notaire / Banque / Expert-comptable à étoffer dans les sessions ultérieures. La section Développeur permet à Côme de présenter rapidement (5-10 min) les choix structurants techniques de Sterny à un dev rencontré pour recueillir un avis externe.

### Bloc 3 — MAJ DETTE-TECHNIQUE.md

- DETTE #51 (AppleAuthHandler dédié) marquée **CADUQUE** — résolue par la refonte OAuthHandler générique (cf. UNIFICATION-INSCRIPTION § 4.5.2).
- Création DETTE #54 — Refonte responsive RhythmManualBuilder pour intégration card 460px du parcours unifié. Prérequis bloquant de la tranche T8.
- Création DETTE #55 — Adaptation parcours proprio post-suppression INSERT OAuthHandler (Q5). Intégrée comme commit 2/2 de la tranche T4.

### Bloc 4 — MAJ VISION-ARCHITECTURE.md §6

Ajout d'un nouveau paragraphe "Précision sur le parcours propriétaire" après "Périmètre élargi du chantier" qui documente : (1) UX du proprio invité revenant sans le lien (message de redirection explicite à concevoir), (2) réversibilité stratégique (garde implémentée comme flag isolable, pas logique enchevêtrée).

### État final du chantier UNIFICATION-INSCRIPTION

**Statut** : doc cadrage finalisé sur 7 sections (1-2 en conv 1 le 2 mai nuit, 3-7 en conv 2 le 3 mai). Implémentation pas encore démarrée. Prêt pour Sprint 1 (T1 extraction des 17 composants partagés en `components/auth-wizard/`) dès prochaine session Claude Code.

**Validation requise avant lancement opérationnel** : RDV pro à organiser (avocat + DPO en priorité) pour arbitrer les 12 questions pré-remplies dans `QUESTIONS-PROFESSIONNELS.md` sections 1-2-4. Sans ces validations, l'implémentation peut avancer mais aucun lancement n'est envisageable.

**Décisions clés de la conv 2** : Q-S3.A (sexe conservé tant que finalité non validée), Q-S3.B (écriture progressive BDD à chaque "Continuer"), Q-S3.C (2 URL distinctes /inscription + /inscription/alternant), refonte OAuthHandler générique unique, DETTE #51 caduque, DETTE #54 + #55 créées, précision Q8 réversibilité parcours proprio.

---

## 2026-05-02 nuit — Audit design visuel + sections 1-2 du doc cadrage UNIFICATION-INSCRIPTION

### Bloc 1 — Audit design visuel des 2 pages wizard

Document `docs/_audit/AUDIT-DESIGN-INSCRIPTION-2026-05-02.md` produit (393 lignes, dossier gitignoré). 8 sections couvrant : inventaire CSS, design tokens, descriptions visuelles InscriptionRecherchePage et CompleterProfilPage (8 axes a-h chacun + 9ᵉ axe cropper pour CP), comparaison tableau, 12 composants extractibles, recommandation parcours unifié.

Recommandation principale : design hybride IR+CP pour `InscriptionAlternantPage`. Squelette IR (animation appliquée), bouton 48px IR, sous-titre dynamique par étape CP, hover input CP, OAuth + séparateur "ou" IR, cropper photo CP, shake bouton sur erreur IR.

Manques à designer ex nihilo : étape calendrier E-5 (intégration `RhythmManualBuilder` dans card 460px ou plein écran), étape récap E-7, pop-up RhythmRequiredPopup, écran de choix méthode auth en début de parcours.

### Bloc 2 — Création doc cadrage `docs/recherche/UNIFICATION-INSCRIPTION.md`

Sections 1-2 finalisées :
- Section 1 : modèle BDD final consolidé (51 colonnes catégorisées, écritures par étape, table des cas `(statut_ville_*, type_user)`, mécanisme RPC atomique recommandé)
- Section 2 : séquence des 7 étapes (E-1 Identité → E-2 Type de profil → E-3 Études → E-4 Villes → E-5 Calendrier saisie manuelle → E-6 Profil → E-7 Validation finale), justification ordre, conditions de skip, phase auth amont 3 méthodes, persistance progressive et reprise, routing et URLs.

Sections 3-7 à produire en nouvelle conv Claude.ai 2 dédiée :
- 3. Design des écrans (audit design disponible)
- 4. Gestion des 3 méthodes auth
- 5. Table des 9 parcours bout-en-bout à tester
- 6. Sujets RGPD et juridiques
- 7. Plan d'implémentation séquencé

### Bloc 3 — Décisions actées Q-S1.A à D + Q-S2.A

- Q-S1.A : `telephone` obligatoire à l'inscription (E-1), validation format simple, pas de SMS, RGPD à signaler section 6
- Q-S1.B : Option A — saisie systématique des 2 villes (école + entreprise) pour tous les type_user, pas de message explicatif particulier
- Q-S1.C : `sexe` à 3 valeurs `'homme' / 'femme' / 'autre'`, validation frontend, pas de CHECK BDD, finalité métier à clarifier section 6 RGPD (sinon retrait du champ)
- Q-S1.D : pas de parrainage entre alternants pour le lancement, `parrain_id` et `code_parrainage` toujours NULL en sortie. Parrainage proprio reste en place inchangé.
- Q-S2.A : E-5 = saisie manuelle assistée uniquement via `RhythmManualBuilder`. Pas d'upload planning dans le parcours unifié (parser hors-ligne, abandon production acté 29 avril 2026, VISION §5 et §7 risque 4).

### Bloc 4 — Création DETTE #53

Variables sémantiques `--error: #ff6b6b` et `--success: #51cf66` divergent du design system Sterny INVENTAIRE §9.1 (`#dc2626` et `#059669`). Découverte par audit design § 2. Faible criticité, à harmoniser dans une passe design tokens.

### Bloc 5 — Saturation conv 1 et plan de relance

Saturation détectée à mi-parcours du livrable (sections 3-7 restantes). Coupure propre actée pour préserver la précision sur la suite. Nouvelle conv Claude.ai 2 à ouvrir avec les 5 docs de référence + audits + doc cadrage déjà commencé. Message de relance préparé par Claude.ai 1 pour démarrage immédiat de Claude.ai 2.

---

## 2026-05-02 soir bis — Audit lecture-seule pages inscription + élargissement scope chantier unification

### Bloc 1 — Audit produit par Claude Code

Document `docs/_audit/AUDIT-INSCRIPTION-2026-05-02.md` produit (467 lignes, dossier `docs/_audit/` gitignoré). 9 sections couvrant : routing inscription complet, ChoixInscriptionPage, InscriptionRecherchePage, InscriptionProprietairePage, InscriptionPartagerPage, CompleterProfilPage, GoogleAuthHandler, modèle BDD `users` complet (51 colonnes catégorisées), 12 incohérences observées.

### Bloc 2 — 5 découvertes majeures

1. `/inscription/proprietaire` publiquement accessible sans token de parrainage (anomalie vs CONTEXTE-PROJET §3).
2. `InscriptionPartagerPage` est une page fantôme : seul lien actif depuis `UserDropdown` est sémantiquement faux (un user connecté ne peut pas se réinscrire), schéma BDD incohérent vs `InscriptionRecherchePage` chemin partage.
3. `GoogleAuthHandler` fait des INSERT BDD au callback (`:96-105`), pas seulement de la redirection. Profil créé est ultra-minimal.
4. Aucun parcours d'inscription n'écrit `profil_complet = true` — cette colonne n'est mise à `true` que via `CompleterProfilPage`.
5. `InscriptionRecherchePage` écrit `type_user='locataire'` même quand intent='partage' (couplé DETTE #50).

### Bloc 3 — 8 décisions actées en cadrage Q8-Q15

- Q8 : durcissement garde `/inscription/proprietaire` (token obligatoire) + retrait CTA "Je suis propriétaire" sur `ChoixInscriptionPage`.
- Q9 : suppression `InscriptionPartagerPage` dans le même chantier.
- Q10 : `type_user` aligné sur choix explicite (intent partage → `'hote'`).
- Q11 : `users.a_logement` classée legacy (à ne plus écrire).
- Q12 : `profil_complet = true` mis en 1 passe à la sortie du parcours unifié.
- Q13 : photo et bio optionnelles + message confiance, complétion possible plus tard.
- Q14 : bypass DEV CompleterProfilPage caducs en sortie du chantier (logué DETTE #52).
- Q15 : champs `prenom/nom/date_naissance/sexe/ecole/annee_etudes/filiere` intégrés au parcours unifié, RGPD à signaler en section 6 du doc cadrage.

### Bloc 4 — Mises à jour docs

- VISION §6 sous-section "Parcours d'inscription unifié" : ajout d'un paragraphe "Périmètre élargi du chantier" qui consolide les 8 décisions.
- DETTE #52 créée (bypass DEV `CompleterProfilPage`).

### Bloc 5 — Suite immédiate

Rédaction de `docs/recherche/UNIFICATION-INSCRIPTION.md` section par section dans la même conv Claude.ai (hors scope code). Estimation 1h30-2h. Si saturation détectée, coupure propre + reprise en nouvelle conv avec docs à jour.

---

## 2026-05-02 soir — Décision Option A unification inscription + clôture session étape D

### Bloc 1 — Reprise et logging des dettes #47 et #48

Session démarrée sur le périmètre étape D (intégration `RhythmManualBuilder` dans `CompleterProfilPage`). Avant code : 2 dettes loggées et pushées :

- **DETTE #47** — Barre de recherche homepage propose un rythme abstrait obsolète. Désalignement code ↔ VISION §2. Plan : refonte post-Poool en session dédiée. Cas connecté (barre pré-remplie ville uniquement, accès direct `/recherche` sans modale) ajouté en complément de la dette principale.

- **DETTE #48** — Matching partiel et présentation du score de compatibilité. 6 sous-problèmes identifiés (algorithme de scoring, présentation non-décourageante, composition multi-logements en set cover, tension hôte ↔ locataire, UX parcours fragmenté, question stratégique de fond sur la promesse Sterny). Document de recherche `docs/recherche/MATCHING-PARTIEL.md` à produire post-Poool.

### Bloc 2 — Audit BDD `users.ville_recherchee` — note du Bloc 8 du 2 mai après-midi RECTIFIÉE

L'audit BDD a confirmé que la colonne `users.ville_recherchee` n'existe pas. Mais le grep code mené dans la foulée a révélé que **le modèle 2-villes officiel `(ville_ecole, statut_ville_ecole, ville_entreprise, statut_ville_entreprise)` existe déjà en BDD** et est écrit par `InscriptionRecherchePage`, lu par `ModifierProfilPage`, `ProfilPage`, `DashboardLocatairePage`.

**Conséquence** : la migration `users.ville_recherchee` proposée dans le Bloc 8 du 2 mai après-midi n'est pas nécessaire. La sémantique "ville recherchée" est dérivable du modèle existant via un helper `deriveVilleRecherchee(user)` à créer.

**Décision** : utiliser le modèle existant, pas de migration. Helper `deriveVilleRecherchee(user)` à créer dans le chantier unification inscription. Le modèle officiel est désormais documenté en VISION §3.

### Bloc 3 — Audit lecture-seule `CompleterProfilPage.jsx` — révélation du désalignement structurel

L'audit a révélé 3 trous structurels :

1. `CompleterProfilPage.jsx` n'écrit pas le modèle officiel `(ville_*, statut_ville_*)` — il écrit uniquement la colonne legacy `users.ville` + les colonnes dépréciées `type_alternance` et `rythme_alternance`.
2. Aucune étape `rhythm_calendar` n'existe dans le parcours actuel (à créer, pas à remplacer).
3. Un utilisateur qui s'inscrit via Google OAuth atterrit sur `CompleterProfilPage` sans passer par `InscriptionRecherchePage`, donc avec les 4 colonnes ville NULL — `villeRecherchee` indérivable.

**Conséquence** : le parcours d'inscription email et le parcours d'inscription Google OAuth produisent des états BDD différents. Dette structurelle, à corriger avant lancement opérationnel.

### Bloc 4 — Décision Option A actée : parcours d'inscription unifié

Plutôt que de coder l'étape D originelle sur `CompleterProfilPage` actuel (qui aurait été détruite à la refonte unification), décision actée : **fusionner `InscriptionRecherchePage` + `CompleterProfilPage` en un parcours d'inscription unifié unique**, accessible via les 3 méthodes d'authentification (email, Google OAuth, Apple OAuth).

**Ordre des chantiers post-démo réorganisé** :

1. Chantier unification inscription (Option A) — refonte from-scratch d'un parcours unique pour les 3 méthodes auth, avec saisie sur le modèle officiel `(ville_*, statut_ville_*)` et arrêt d'écriture des colonnes dépréciées.
2. Intégration `RhythmManualBuilder` + popup Q9 dans le parcours unifié (= ex-étape D, mais sur le bon socle).
3. DETTE #46 (multi-années) — séquençage à arbitrer selon priorité du moment.
4. DETTE #47 (refonte barre recherche) — séquençage à arbitrer.
5. DETTE #48 (matching partiel) — séquençage à arbitrer.

**Étape D originelle annulée en tant que telle** — son périmètre est intégré au chantier unification (refonte étape 2 saisie 4 colonnes ville, retrait écritures `type_alternance` et `rythme_alternance`) + à la session post-unification d'intégration `RhythmManualBuilder`.

**Justification d'ordre** : faire l'unification d'abord évite de toucher 2 fois à `CompleterProfilPage` (refonte étape D puis re-refonte unification), supprime le risque de double travail, et adresse le sujet d'inscription à la racine (la fondation de tout site).

Décision tracée en VISION §6 nouvelle section "Parcours d'inscription unifié".

### Bloc 5 — Nouvelles dettes loguées

- **DETTE #49** — Extraction des étapes de `CompleterProfilPage` en sous-composants. Bloquant : non. À séquencer avant ou pendant le chantier unification.
- **DETTE #50** — Couplage redondant `statut_ville_*` ↔ `type_user` dans `DashboardLocatairePage`. Bloquant : non, mais à fixer avant lancement.
- **DETTE #51** — Apple OAuth à implémenter dans le cadre du chantier unification. Bloquant : non strict, mais prioritaire post-démo.

### Bloc 6 — Idées en attente ajoutées

- Cas marginal `les_deux` qui propose 2 logements sans rien chercher.
- Audit sémantique de `users.ville_recherche_secondaire`.

### Bloc 7 — Saturation et prochaine session

Session productive : 4 dettes loguées proprement (#47, #48, #49, #50, #51), Option A actée comme cible architecture, modèle BDD officiel documenté en VISION §3, ordre des chantiers post-démo clarifié.

Avant fermeture : Côme upload dans le project knowledge claude.ai les 4 docs à jour : `DETTE-TECHNIQUE.md`, `VISION-ARCHITECTURE.md`, `ETAT-COURANT.md`, `idees-en-attente.md`. Sans cet upload, la prochaine session démarrera avec des docs périmés et risquera de re-proposer la migration `users.ville_recherchee`.

**Prochaine conv** : cadrage du chantier unification inscription. Livrable cible : document `docs/recherche/UNIFICATION-INSCRIPTION.md` — modèle BDD final consolidé, séquence des étapes du parcours unifié, design des écrans, gestion des 3 méthodes d'authentification (email, Google OAuth, Apple OAuth), table des 12 parcours à tester (4 `type_user` × 3 méthodes auth). Pas de code dans cette conv, juste cadrage.

**Conv suivantes** : implémentation par tranches commitables, tests bout-en-bout, puis intégration `RhythmManualBuilder` + popup Q9 dans le parcours unifié.

---

## 2026-05-02 après-midi — Étape C close (composant + preview livrés v1 démo) + arrêt sur DETTE #46 multi-années

### Bloc 1 — Étape C livrée par Claude Code

4 fichiers (3 créés, 1 modifié) :

- `sterny-react/src/components/rhythm/RhythmManualBuilder.jsx` (composant v1 desktop-only)
- `sterny-react/src/components/rhythm/RhythmManualBuilder.css` (CSS scopé préfixe `rmb-`)
- `sterny-react/src/dev/RhythmManualBuilderPreview.jsx` (preview 2 sections villeRecherchee)
- `sterny-react/src/App.jsx` (+2 lignes : import + Route `/dev/rhythm-manual-builder-preview`)

Convention import Supabase : `import { supabaseClient } from '../../config/supabase'`. RPC : `supabaseClient.rpc('confirm_rhythm_calendar_manual', { p_calendar })` — 6 RAISE EXCEPTION (28000 + 5×22023) mappés sur messages utilisateur.

Wordings Q8 verbatim de DETTE #45 collés tels quels avec commentaire `// TODO validation avocat avant production`.

### Bloc 2 — 3 corrections de décisions Q4/Q5/Q6 du bloc 2026-04-30 soir bis

**Q4 corrigée** : cadrage 52 semaines précis. Première week_start lundi 31 août, dernière week_start lundi 23 août, couverture jusqu'au dimanche 29 août inclus (52 semaines, 364 jours). Appliqué à toute année académique sélectionnée via le sélecteur Q11.

**Q5 corrigée** : cycle case simplifié à 2 états (cliqué/non-cliqué), induit par Q8 (sélection inverse).

**Q6 corrigée** : règle ISO du jeudi pour l'attribution semaine→mois (12 colonnes pile pour 52 semaines).

### Bloc 3 — Décisions Q10 (troncature) et Q11 (sélecteur d'année) appliquées

**Q10 — Troncature dynamique** : cases dont le jeudi est antérieur au lundi de la semaine ISO en cours sont affichées en gris désactivé (#E8EAF0 fond, opacity 0.5), non-cliquables, tooltip "Semaine déjà passée". À la matérialisation, auto-classées `status='company'` (cohérent VISION §3 alinéa "non-école = company par défaut").

**Q11 — Sélecteur d'année académique** : select natif toujours visible avec 2 options (année courante + suivante). Calcul de l'année par défaut selon mois courant : ≥9 → "Y - Y+1", ≤8 → "(Y-1) - Y". Validation 2 mai 2026 → "2025-2026".

**Compteur reformulé** : "X / 52 semaines sélectionnées" — un seul compteur, pas de pastilles, X compte uniquement les cases cliquées par l'utilisateur.

### Bloc 4 — Fix 1 appliqué après validation visuelle Côme

Le sélecteur d'année initial avait un toggle "(changer)" qui exigeait 2 clics avant ouverture du menu. Remplacé par select natif affiché en permanence — 1 clic suffit pour ouvrir le menu.

### Bloc 5 — Arrêt sur le multi-années — DETTE #46 créée

Côme a identifié pendant la phase code que la saisie de plusieurs années académiques en une fois (cas réel : utilisateur qui a déjà son nouveau planning) demande un cadrage architectural transversal qui dépasse le composant : modèle de stockage `rhythm_imports`, transitions entre années, contrats multiples successifs, matching de l'année active.

**Décision de gel pour la démo Le Poool** : la v1 du composant supporte 1 année académique à la fois, suffisant pour démontrer le concept. Le cas multi-années en saisie est marginal en démo.

**Cadrage multi-années reporté** : DETTE #46 créée dans `DETTE-TECHNIQUE.md`, à traiter en 1-2 sessions Claude.ai dédiées après la démo. Bloquant pré-production : aucun lancement opérationnel possible tant que le modèle multi-années n'est pas tranché.

### Bloc 6 — Ajouts VISION-ARCHITECTURE.md

**§3 — Distinction passé / présent / futur dans les flux financiers** : `rhythm_calendar` est descriptif, pas transactionnel. Date d'effet du contrat distincte de la date de signature. Consultation des plannings historiques = écran dashboard distinct.

**§10 — Pas de découpage technique imposé à l'utilisateur** : nouveau principe transversal acté. Les contraintes techniques (RPC, migrations, BDD) ne doivent jamais transparaître en friction côté utilisateur. Quand simplification technique vs fluidité utilisateur entrent en conflit, c'est l'utilisateur qui gagne. Origine : arbitrage du 2 mai après-midi sur la saisie multi-années.

### Bloc 7 — Enrichissement DETTE #45

Wording v1 modale Q8 trop dense pour être lu en pratique. Acceptable démo Le Poool, à réécrire en version compacte (≤ 60 mots, ≤ 10 secondes de lecture) avant production, en parallèle de la consultation avocat.

### Bloc 8 — Note pour étape D (intégration CompleterProfilPage)

Audit obligatoire en début d'étape D : vérifier si `users.ville_recherchee` existe en BDD. Si non, prévoir migration `ALTER TABLE users ADD COLUMN ville_recherchee text CHECK (ville_recherchee IN ('ecole', 'entreprise'))`.

L'étape D doit fournir cette valeur à la prop `villeRecherchee` du composant. Sans cette saisie, le composant ne peut pas appliquer la logique de sélection inverse Q8.

Origine : remarque produit de Côme du 2 mai après-midi : "une personne ne cherche pas forcément un logement pour son école".

### Bloc 9 — Saturation et prochaine session

Conv saturée. Bonne productivité globale (étape C livrée + 5 décisions logées dans VISION et DETTE), mais le multi-années dépasse le périmètre de cette conv et a été correctement identifié comme tel. Plutôt que de bâcler le cadrage architectural, on l'isole en DETTE #46 pour traitement dédié.

Avant fermeture : Côme upload dans le project knowledge claude.ai les 3 docs à jour : `ETAT-COURANT.md`, `VISION-ARCHITECTURE.md`, `DETTE-TECHNIQUE.md`. Sans cet upload, la prochaine session démarrera avec des docs périmés.

Prochaine conv : étape D (intégration CompleterProfilPage + pop-up Q9 + audit `users.ville_recherchee`) ou cadrage DETTE #46 multi-années — au choix selon priorité du moment, mais DETTE #46 doit passer avant tout codage de flux contrat/paiement.

---

## 2026-04-30 — Soirée stratégique : cadrage Initiative Rennes + lancement audit fonctionnel

### Cadrage Initiative Rennes

Premier échange téléphonique avec Pauline Leboissetier (chargée de mission Initiative Rennes) suivi d'un email de cadrage le 30 avril 2026 à 17h33. Initiative Rennes ne suivra pas Sterny en l'état (projet jugé pas suffisamment mature côté terrain et financier), mais a explicitement laissé la porte ouverte pour un retour ultérieur en demandant à être tenue informée. Trois pistes données par Pauline :

1. Le Poool (lepoool.com) — accompagnement à solliciter en priorité.
2. Maxime BOHELAY chez CAPEOS (Rennes Cedex) — m.bohelay@capeos.fr — 02 99 54 74 44 — 1er échange prévisionnel financier.
3. Aurélie DERRIEN chez SECOB (Cesson-Sévigné) — aurelie.derrien@secob.fr — 02 99 23 40 77 — 1er échange prévisionnel financier.

Checklist exacte des attentes du comité Initiative Rennes pour un futur retour Sterny :
- Offre : proposition de valeur, contenus.
- Marché et clientèle : segmentation rigoureuse.
- Concurrence et positionnement par rapport aux concurrents.
- Développement commercial : stratégie, moyens, actions, arguments.
- Équipe.
- Partie financière : construction du CA, réalisme, cohérence avec la stratégie commerciale, rentabilité, plan de financement.
- Premiers tests utilisateurs (POC) appréciés, avec contacts identifiés pour les tests / 1ers clients.
- Évolution du projet dans la durée (roadmap).

Le comité est particulièrement attentif à : segmentation clientèle, capacité à trouver des clients rapidement, positionnement du pricing, stratégie d'acquisition client, cohérence de l'équipe. Présentation attendue : concrète, synthétique, pragmatique.

Action : email de remerciement et plan d'action à rédiger avec parents le week-end du 1er-3 mai, programmé pour envoi automatique le lundi 4 mai à 7h30. Retour à Pauline planifié d'ici 3-4 semaines avec un point d'avancement.

Sujet à anticiper pour les RDV CAPEOS et SECOB : impact financier d'un futur passage à un prestataire eIDAS Lv2/Lv3 pour la signature électronique des baux (sujet déjà tracé dans VISION-ARCHITECTURE.md §10, à intégrer comme ligne du prévisionnel — pas une nouvelle dette à créer).

### Décision stratégique — Format de l'étude de marché

Pour pitch Le Poool / Initiative Rennes / financiers à ce stade : étude courte (10-15 pages), factuelle, basée sur verbatims d'entretiens (15-30 alternants cible), et non étude longue de type cabinet de conseil. Justification : à ce stade du projet (solo founder pré-traction), une étude longue est un signal négatif. La crédibilité vient de la proximité avec la cible.

### Décision opérationnelle — Séquençage 30 avril → 4 mai

- 30 avril soir : audit code statique lancé par Claude Code (commit `b3488c3`, document `docs/AUDIT-FONCTIONNEL-2026-05-04.md`). Vérification croisée effectuée : les 4 "trous critiques" remontés en synthèse correspondent à des dettes déjà tracées (DETTE #14, #17, #22, et VISION §10), pas à des découvertes. Le vrai apport du document est la cartographie page-par-page en section 2.
- 1er mai matin : audit fonctionnel manuel parcours locataire, en commençant par tester DETTE #14 (trigger candidature qui plante).
- 1er mai après-midi/soir : repos.
- 2 mai : audit fonctionnel manuel parcours hôte, les_deux, propriétaire, flux Stripe, flux signature.
- 3 mai matin : prépa étude de terrain (guide entretien, mails écoles, liste 15 alternants) + rédaction mail Pauline avec parents.
- 3 mai après-midi : compilation audit + mémo prépa appel Poool.
- 3 mai soir : programmer envoi mail Pauline pour 4 mai 7h30.
- 4 mai 9h30-10h30 : appel découverte Le Poool.
- 4 mai 11h-12h : envoi mails Le Poool confirmation, 2 écoles, 15 alternants, CAPEOS, SECOB.

### Outil — Signature email professionnelle Gmail

Signature texte sobre créée via générateur HubSpot le 30 avril, intégrée dans Gmail comme signature par défaut. Format : Modèle 3 HubSpot, police Arial moyenne, couleur principale `#1E293B`, lien `#E8622A`. Pas de logo ni photo de profil pour l'instant.

---

## 2026-05-01 matin — Étapes 1 et 2 du chantier RhythmManualBuilder closes

### Bloc 1 — Wording Q8 v3 + Q9 verrouillés, DETTE #45 à logger

3 itérations sur le wording de la modale Q8 (prévention au clic Confirmer) et du pop-up Q9 (action protégée sans planning saisi). Choix de vocabulaire actés et tracés pour validation avocat ultérieure :

- « colocataire » écarté (factuellement faux dans le modèle Sterny — pas de cohabitation, pas de loi ALUR, pas de responsabilité solidaire), remplacé par « un autre alternant ».
- « facturé » écarté (préjuge de l'émetteur de la facture dans la chaîne contractuelle, point non tranché tant que le montage juridique n'est pas validé), remplacé par « payer ».
- 2 risques utilisateurs énoncés en conséquences factuelles dans Q8 (présence simultanée dans le logement, paiement d'une semaine non occupée), aucune clause d'exonération.
- Vérification systématique de l'absence de 10 formulations contractuelles interdites (« vous reconnaissez », « vous acceptez », « Sterny ne pourra être tenu responsable », « à vos risques et périls », « vous êtes seul responsable », etc.).

Q9 : 3 amorces selon action protégée (Recherche, Créer une annonce, Candidater), bouton « Plus tard » qui ferme la pop-up sans rediriger.

DETTE #45 à logger dans `docs/DETTE-TECHNIQUE.md` : wording v1 à valider par avocat avant production. Couvre aussi le périmètre alternant↔alternant (ne couvre pas le cas propriétaire non-alternant) et la cohérence de la phrase « vous paierez » avec le modèle de facturation final. Localisation : commentaire `// TODO validation avocat avant production` à poser au-dessus des 2 textes dans le code source à l'étape 3.

Wordings exacts archivés dans la conv Claude.ai du 1er mai matin pour reprise étape 3.

### Bloc 2 — Migration BDD `rhythm_imports` Stratégie 2 — déjà appliquée, fichiers tracés

Migration prévue (Stratégie 2 actée le 30 avril soir bis Bloc 3) : 4 `DROP NOT NULL` sur les colonnes parser, recréation du CHECK `source_file_type` pour autoriser NULL, ajout colonne `source` avec CHECK sur 4 valeurs, ajout CHECK conditionnel `parser_llm_columns_required`.

Revue technique préalable demandée à Claude Code : verdict « OK sans correction nécessaire », avec coordination déploiement R4 mineur (appliquer migration avant frontend) et R2 sur le rollback non-idempotent si lignes non-legacy existent.

Fichiers créés dans le repo :
- `supabase/migrations/20260501113000_rhythm_imports_support_manual_input.sql` (54 lignes)
- `supabase/_rollback/20260501113000_rhythm_imports_support_manual_input_rollback.sql` (34 lignes, gitignoré conformément à INVENTAIRE §1)

Tentative d'exécution dans Supabase Dashboard SQL Editor le 1er mai 2026 à 11h30. Erreur retournée : `ERROR: 42701: column "source" of relation "rhythm_imports" already exists`. Le `BEGIN; ... COMMIT;` a annulé toute la transaction (atomicité OK, BDD intacte).

Diagnostic SQL complet effectué dans la foulée :

1. `information_schema.columns` sur `rhythm_imports` : 4 colonnes parser (`source_file_path`, `source_file_type`, `llm_provider`, `llm_model`) sont déjà nullable. Colonne `source` présente avec default `'parser_llm'::text`.
2. `pg_constraint` sur `rhythm_imports` : 5 CHECK constraints en place, dont les 3 nouvelles attendues — `rhythm_imports_source_file_type_check` (version avec `IS NULL OR ...`), `rhythm_imports_parser_llm_columns_required`, et la CHECK anonyme `rhythm_imports_source_check` générée par `ADD COLUMN`.

Conclusion : la BDD était déjà entièrement dans l'état cible avant la tentative d'exécution. Une migration équivalente a été appliquée à un moment antérieur sans être tracée dans `supabase/migrations/`. Cause probable : script ad-hoc lancé directement dans le Dashboard, ou migration créée en parallèle dans une autre conversation. Cas typique de **DETTE #15** (migrations désynchronisées de la prod), déjà tracée.

État des données existantes au moment du diagnostic : 8 lignes dans `rhythm_imports`, toutes avec un MIME type valide, aucune avec `source <> 'parser_llm'`. Aucun risque pour le rollback à ce stade.

Décision : **fichier de migration conservé pour traçabilité** (option B retenue), bloc de note historique inséré en tête du fichier expliquant le contexte de la tentative et son résultat. Le fichier ne doit pas être rejoué (planterait à nouveau sur le `ADD COLUMN source`). Si on veut formellement réenregistrer cet état dans l'historique des migrations Supabase, utiliser `supabase migration repair` (commande dédiée à ce cas).

**Conséquence opérationnelle** : la BDD est prête pour `RhythmManualBuilder` v1. Une ligne `source='manual_input'` avec `source_file_path=NULL` etc. peut être insérée dès l'étape 3.

### Bloc 3 — Étape 3 reportée en conv fraîche

Étape 3 du plan = prompt Claude Code pour générer `RhythmManualBuilder.jsx` (composant ~52 cases en grille 12 colonnes mensuelles, logique de sélection inverse selon ville recherchée, modale Q8 hardcodée, intégration BDD avec `source='manual_input'`).

Schéma utilisateur reçu en milieu de session (croquis sur papier quadrillé) : grille 12 mois × 5 lignes de cases, en-tête mois en haut, cases-fantômes pour les mois à 4 lundis. Cohérent avec le cadrage Q6 du 30 avril soir bis. Aucun impact BDD : le découpage visuel mensuel est un calcul frontend, le stockage `users.rhythm_calendar` reste un tableau plat ordonné par date du lundi.

Reco design (validée par Côme) : pour les cases-fantômes, ne rien afficher du tout (chaque mois est une colonne flex avec 4 ou 5 enfants, l'alignement reste correct par construction).

Décision de coupure : conv saturée après lecture des 4 docs de référence + 3 itérations de wording + audit Claude Code SQL + diagnostic en 3 requêtes successives. L'étape 3 demande de la précision sur un prompt long et bénéficie d'une conv neuve.

**À faire en début de prochaine conv** (avec les 4 docs + ce bloc fraîchement à jour comme brief) :

1. Récupérer les wordings exacts Q8 v3 et Q9 archivés dans la conv Claude.ai du 1er mai matin (à coller en pièce jointe ou à reformuler).
2. Vérifier l'existence et la signature de la fonction RPC `confirm_rhythm_calendar` dans le repo (`git show 65d81ca` + `grep -r "confirm_rhythm_calendar" sterny-react/ supabase/`) pour décider si elle peut être réutilisée pour le chemin manuel ou s'il faut une nouvelle RPC.
3. Rédiger le prompt Claude Code pour `RhythmManualBuilder.jsx` (composant ~52 cases, layout 12 colonnes, logique de sélection inverse selon ville recherchée, modale Q8 hardcodée avec commentaire `// TODO validation avocat avant production`, écriture BDD avec `source='manual_input'`).
4. **Étape 4 différée d'une session de plus** (intégration dans `CompleterProfilPage` + pop-up Q9) — ne pas tenter d'enchaîner étape 3 et 4 dans la même conv.

DETTE à logger dans `docs/DETTE-TECHNIQUE.md` à la fin de cette session ou en début de la suivante :

- **DETTE #45** : wording v1 modale Q8 + pop-up Q9 à valider par avocat (texte complet préparé dans la conv Claude.ai du 1er mai matin).

---

## 2026-04-30 soir bis — Suite session : audit fonctionnel parcours locataire + cadrage RhythmManualBuilder

### Bloc 1 — DETTE #14 confirmée empiriquement

Test SQL exécuté dans Supabase Dashboard SQL Editor (BEGIN / INSERT / ROLLBACK pour éviter de polluer la BDD avec une candidature de test). Comportement observé : la transaction plante avant que la ligne `candidatures` soit créée, avec le message d'erreur PostgreSQL :

    ERROR: 42703: column a.proprietaire_id does not exist
    QUERY: SELECT a.titre, a.proprietaire_id FROM public.annonces a WHERE a.id = NEW.annonce_id
    CONTEXT: PL/pgSQL function trigger_notif_candidature() line 7 at SQL statement

DETTE #14 passe du statut "validation empirique à faire" à "**confirmée empiriquement le 30 avril 2026 soir**".

**Conséquence produit** : aucune candidature ne peut aboutir en production tant que la dette n'est pas résolue. Tout le parcours locataire en aval (suivi candidature, match, signature contrat, paiement, restitution) est bloqué structurellement. Toute démo qui inclut le parcours locataire bout-en-bout est non-démontrable jusqu'au fix. Statut P0 bloquant pour démo.

**Décision sur le fix reportée en session stratégique dédiée**. Choix entre (A) ajouter une colonne `proprietaire_id` à `annonces` avec logique de parrainage propriétaire, ou (B) modifier la fonction trigger pour lire `user_id` à la place. Le choix touche au modèle de parrainage propriétaire (qui pointe vers qui dans la chaîne de contrat de sous-location) et ne se tranche pas dans le flux d'un audit fonctionnel.

**Discipline anti-redondance respectée** : DETTE #14 était déjà tracée depuis l'audit Zone 1 du 23 avril 2026, ce bloc met simplement à jour son statut de "à valider" à "confirmé".

**Reste de l'audit parcours locataire** : étapes 1 à 19 de la section 7.1 du document d'audit (`docs/AUDIT-FONCTIONNEL-2026-05-04.md`) à dérouler dans une session ultérieure (matin du 1er mai ou plus tard, selon arbitrage Côme).

### Bloc 2 — Bascule audit → cadrage `RhythmManualBuilder` v1 (chemin 3 VISION §5)

**Décision actée** : l'audit fonctionnel parcours locataire est suspendu en cours de bloc 1 pour cadrer puis coder la première version du composant de saisie manuelle de planning d'alternance. Justification : sans porte d'entrée alternant fonctionnelle pour le parcours d'inscription, la démo Le Poool du 4 mai 2026 n'a pas de pitch crédible. Le parser LLM est cassé (DETTE #37, taux d'erreur ≥50%), le chemin 1 pdf.js et le chemin 2 ImageData ne sont pas industrialisés en production, donc le chemin 3 saisie manuelle assistée doit être livré en premier. L'audit fonctionnel reprend après livraison du composant.

**Conformité VISION §5** : ce composant est la première matérialisation du chemin 3 défini comme « couche universelle pour tout document hors chemin 1 et 2, et fallback obligatoire ». Quand les chemins 1 et 2 seront industrialisés, ils alimenteront ce même composant en pré-remplissage, l'utilisateur valide ou corrige. Aucun travail jeté quand le parser sera de retour.

**9 décisions de design tranchées en session** :

1. **Nom et emplacement** : `sterny-react/src/components/rhythm/RhythmManualBuilder.jsx`, cohérent avec `RhythmFileUpload.jsx` et `RhythmCalendar.jsx` déjà existants.

2. **Rôle** : chemin autonome principal pour cette première version, indépendant de l'état du parser. Composant conçu pour accepter un calendrier vide (cas du jour) ou pré-rempli (futur, quand parser industrialisé).

3. **Contrat BDD** : identique à celui du système d'importation (`users.rhythm_calendar` jsonb + ligne dans `rhythm_imports` + `users.rhythm_import_id` pointant vers la nouvelle ligne). Pas de nouvelle colonne, pas de nouvelle table — voir Bloc 3 ci-dessous pour les ajustements de schéma nécessaires sur `rhythm_imports`.

4. **Période couverte** : année académique fixe lundi 31 août 2026 → dimanche 30 août 2027 (52 semaines ISO, format `YYYY-MM-DD` sur les `week_start` lundi). Pas de choix utilisateur sur les dates de début/fin dans cette première version. Cas tordus (étudiant en cours d'année, alternance chevauchant 2 années académiques) reportés post-démo.

5. **Granularité** : semaine binaire école/entreprise, conforme VISION §3. Pas de saisie jour par jour. Chaque case bascule entre 3 états : `null` (non renseigné), `school`, `company`.

6. **Layout visuel** : 12 colonnes verticales, une par mois (sept 2026 → août 2027), chaque colonne contenant 4 ou 5 cases-semaines selon le mois (la semaine est rattachée au mois qui contient son lundi). Forme générale rappelant l'égaliseur Deezer retourné vers le bas. Survol = info-bulle avec dates de la semaine. Code couleur : `null` gris clair `#F4F5F7` avec bordure fine, `school` orange `#E8622A`, `company` navy `#1E293B`. **Première version optimisée pour desktop uniquement** — la responsiveness mobile est à reprendre après refonte UX mobile globale (voir DETTE #44).

7. **Mode de saisie** : clic case par case. Cycle simple sur chaque case. Pas de drag/swipe dans cette première version.

8. **Logique de sélection inverse** : l'utilisateur clique uniquement sur les semaines où il sera présent dans le logement qu'il cherche. Les cases non-cliquées sont automatiquement classées en statut inverse. La logique d'inversion école↔entreprise est gérée par le frontend selon la ville recherchée (déjà connue dans le profil utilisateur à ce stade du parcours). En BDD, le contrat reste celui de VISION §3 (`status` valeurs `school` ou `company`). Trois éléments visuels permanents en haut du composant : phrase de consigne dynamique selon ville recherchée, légende permanente avec compteurs live, bouton "Confirmer mon planning". Au clic Confirmer, modale de prévention obligatoire (texte exact à valider en début de prochaine conv) expliquant la gravité d'une saisie incorrecte si le contrat de logement est déjà signé. **Wording à valider par avocat avant production** — le wording v1 fait le job pédagogique pour la démo Le Poool, pas plus.

9. **Intégration parcours d'inscription** : intégration dans `CompleterProfilPage` v1, après les étapes type_user/ville_ecole/ville_entreprise/ville_recherchée (ces villes sont prérequises pour la logique de sélection inverse Q8). Pas de blocage dur si l'utilisateur quitte sans saisir le calendrier. Pop-up explicatif au clic sur action protégée (Recherche, Créer une annonce, Candidater) qui propose 2 boutons : "Compléter mon planning maintenant" / "Plus tard". Wording de pop-up à valider avec le composant. Idée plus large de fusion `Inscription*Page` + `CompleterProfilPage` parquée dans `idees-en-attente.md` pour traitement post-démo.

**Conformité discipline anti-redondance** : croisement effectué en session avec VISION-ARCHITECTURE.md §5 et §6, DETTE #37 (parser cassé, raison fondatrice du chemin 3), DETTE #41 (3 erreurs résiduelles spike #2, sera traitée par le composant chemin 3). Aucune décision contradictoire avec ces sources, le chemin 3 est cadré conformément à la stratégie discriminante par format.

### Bloc 3 — Investigation schéma `rhythm_imports` et stratégie BDD pour saisie manuelle

**Vérifications SQL exécutées** : structure complète de `rhythm_imports`, contraintes CHECK, exemple de ligne réelle (parsing Mathis du 26 avril).

**Découverte structurelle** : la table `rhythm_imports` est fortement couplée au parser LLM dans son schéma actuel. 4 colonnes NOT NULL sans valeur par défaut n'ont aucun sens pour une saisie manuelle :

- `source_file_path` (chemin du fichier en Storage Supabase)
- `source_file_type` (MIME type)
- `llm_provider` (nom du fournisseur de modèle)
- `llm_model` (nom du modèle)

Une CHECK constraint supplémentaire renforce le couplage : `rhythm_imports_source_file_type_check` n'autorise que les valeurs `image/jpeg`, `image/png`, `image/heic`, `application/pdf`. Une saisie manuelle ne peut pas s'inscrire dans cette liste.

La CHECK `rhythm_imports_parsed_groups_required` (status = parsed/confirmed → parsed_groups NOT NULL) est en revanche satisfiable proprement par la saisie manuelle, qui produit naturellement un objet `parsed_groups` à un seul groupe (l'utilisateur lui-même) avec les 52 semaines de l'année académique 2026/2027.

**4 stratégies envisagées en session** :

1. Valeurs bidon (`'manual'` partout) — éliminée par la CHECK constraint sur `source_file_type`.
2. Migration BDD pour rendre les 4 colonnes nullable + ajouter une colonne `source` discriminante (`parser_llm` / `manual_input` / `parser_pdfjs` / `parser_imagedata`).
3. Bypass complet : écrire seulement `users.rhythm_calendar`, ne pas créer de ligne dans `rhythm_imports` pour la saisie manuelle.
4. Version sans persistance BDD (sessionStorage uniquement) — éliminée car ne résout pas l'objectif initial du chemin 3 (plateforme cohérente derrière le calendrier saisi).

**Stratégie 2 retenue**. Justification : c'est la seule qui (a) atteint l'objectif fonctionnel, (b) prépare proprement les chemins 1 et 2 du parser quand ils seront industrialisés (la colonne `source` permettra de discriminer les 4 types d'origine), (c) respecte VISION §6 multi-fichiers et historique sans créer d'exception pour la saisie manuelle, (d) maintient un audit-trail BDD propre.

**Migration SQL à préparer en début de prochaine conv** :

- `ALTER COLUMN source_file_path DROP NOT NULL`
- `ALTER COLUMN source_file_type DROP NOT NULL`
- `ALTER COLUMN llm_provider DROP NOT NULL`
- `ALTER COLUMN llm_model DROP NOT NULL`
- Recréation de `rhythm_imports_source_file_type_check` pour autoriser explicitement `NULL`
- `ADD COLUMN source text NOT NULL DEFAULT 'parser_llm' CHECK (source IN ('parser_llm', 'manual_input', 'parser_pdfjs', 'parser_imagedata'))`

**Risque migration** : faible. Sterny n'a pas d'utilisateurs réels actifs aujourd'hui, c'est exactement le bon moment pour faire ça proprement. Migration à valider en revue par Côme avant exécution sur la base de production.

### Bloc 4 — Clôture conv et bascule prochaine session

État de la session Claude.ai du 30 avril 2026 soir bis : conv arrivée en zone de saturation après cadrage 9 questions et investigation BDD. Le dev React (composant) + la migration BDD réclament de la précision et bénéficient d'une conv fraîche.

**À faire en début de prochaine conv** (avec les 4 docs de référence + ce bloc fraîchement à jour comme brief) :

1. Valider le wording exact de la modale de prévention Q8 et du pop-up Q9
2. Préparer le SQL de migration `rhythm_imports` (Stratégie 2), revue + validation Côme avant exécution
3. Préparer le prompt Claude Code pour générer `RhythmManualBuilder.jsx` complet (52 cases, layout 12 colonnes mensuelles, logique de sélection inverse, intégration BDD avec colonne `source` après migration)
4. Intégration dans `CompleterProfilPage` avec ordre des étapes type_user → villes → calendrier
5. Pop-up explicatif sur les actions protégées (`/recherche`, `/annonce/creer`, candidature)
6. Tests en local avant commit

**Reprise audit fonctionnel parcours locataire** : reportée après livraison `RhythmManualBuilder` v1. Si le séquençage du 4 mai ne le permet pas, reportée au lendemain de l'appel Le Poool.

---

## 0. Session du 28 avril — Cadrage phase spike technique, plan de spikes ordonné

**Contexte** : ouverture session Claude.ai en suite directe de la clôture Axe 1 du 30 avril. Bascule recherche → spike actée. Objectif : produire un plan de spikes ordonné (pas le spike lui-même), avec cadrage chiffrable par spike (fixture cible, mesures, go/no-go, livrables, conventions).

**Décisions actées dans la session** :

1. **Démarrage par Mathis + Matthieu, pas Martin.** Les deux fixtures favorables (PDFs vectoriels avec texte intra-cellule) sont prioritaires car elles éclairent la décision DETTE #37. Logique : si on ne sait pas atteindre >95% sur les cas faciles, le pipeline cloud est éliminé même sur cas faciles → bascule claire vers saisie manuelle assistée. Si on y arrive, la stratégie devient discriminante par format ("PDFs Hyperplanning et assimilés au parser, le reste en saisie manuelle"). Martin (image raster) est traité dans un second temps avec Florence-2 / Surya / algo manuel ImageData.

2. **Plan de spikes ordonné en 4 spikes prioritaires sur les 8 envisagés en clôture du 30 avril** :
   - **Spike #1 — pdf.js `getOperatorList()`** (F1 T1) sur Mathis + Matthieu. Local, gratuit, sans setup cloud. Audit étape 0 de 30 min sur les `OPS.*` rencontrés pour trancher entre fonds vectoriels (scénario A : on continue) / fonds rasterisés (scénario B : on ferme et bascule sur #2) / hybride (scénario C : décision au cas par cas). Si scénario A : reconstruction de la grille + extraction couleur + texte intra-cellule, ~3-4h additionnelles. Estimation totale 3-5h.
   - **Spike #2 — Google Vision OCR `DOCUMENT_TEXT_DETECTION`** (F3 T1) sur Mathis + Matthieu. Conditionnel : ouvert si #1 échoue sur la couleur OU si signal redondant utile. Estimation 2-3h hors setup GCP.
   - **Spike #3 — Google DocAI OCR + `compute_style_info`** (F5) sur Mathis + Matthieu. Conditionnel : ouvert si #1 et #2 ne couvrent pas la couleur. Estimation 2-3h.
   - **Spike #4 — Azure DI Layout + STYLE_FONT** (F2 T5) sur Mathis + Matthieu. Comparaison directe avec #3 sur mêmes fixtures, mêmes mesures. Estimation 3-4h dont ~1h-1h30 setup Azure complet.

3. **Réordonnancement vs plan de clôture du 30 avril** : pdf.js (anciennement spike #6) remonte en #1 car sur PDF vectoriel la vraie question est "couleur de fond extractible programmatiquement" pas "OCR FR fiable", et pdf.js peut potentiellement répondre aux deux (texte natif via `OPS.showText` + couleur via `OPS.setFillRGBColor`) en local sans setup cloud. Vision OCR descend en #2.

4. **GCP en setup tâche de fond pendant #1** : Côme provisionne compte GCP + billing + projet + activation Vision API + DocAI API en parallèle de l'exécution du spike #1, pour ne pas bloquer #2 et #3 quand ils s'ouvriront.

5. **Critère go/no-go avec projection 3→2 statuts pour Matthieu** : la légende source de Matthieu compte 3 catégories (cours / examens / révisions) à mapper sur les 2 statuts business (school/company). Le seuil de succès est "≥80% des cellules rattachables à un **statut business final** correspondant à la vérité terrain", pas "≥80% de mots OCR détectés". Mapping retenu : Cours/Formation/Examens/Révisions/Soutenance/Rattrapages → `school` ; cellule vide → hypothèse `company` à valider contre vérité terrain dans le spike #1 (point critique pour tout le pipeline cloud sur Matthieu — si l'hypothèse est fausse, aucune des 3 candidates cloud ne distingue "vide-vacances" de "vide-entreprise").

6. **Convention de stockage des spikes** : nouveau dossier `docs/spikes/` à la racine du repo. Sous-dossiers nommés `YYYY-MM-DD-NN-nom-court/` (préfixe date pour tri chrono, NN sur 2 digits = numéro spike, nom court = technique). Chaque sous-dossier contient `run.{ts,mjs,js}` script reproductible, `fixtures/` copies locales des PDFs testés, outputs bruts (`output-<fixture>.json`), `RESULTS.md` synthèse. Garde-fous : pas dans `sterny-react/`, pas dans `supabase/functions/`, code throwaway non bundlé en prod.

7. **Template `RESULTS.md` standardisé** réutilisable pour tous les spikes : 6 sections (1. Question à laquelle ce spike répond, 2. Méthode, 3. Résultats chiffrés avec tableau de mesures vs cible go/no-go + tableau vérité terrain, 4. Verdict go/no-go, 5. Apprentissages, 6. Décision suite). Métadonnées en tête : date, durée réelle vs estimation, coût réel vs estimation, statut, décision suite.

**Vérité terrain à établir avant le spike #1** : Côme prépare la vérité terrain Matthieu (M1 CCA + M2 CCA, statut school/company par semaine ISO) à la main avec PDF sous les yeux. Format CSV proposé en session, ~30-45 min de saisie. La vérité terrain Mathis (1 groupe, ~53 semaines) est rapide à établir au moment du spike. La vérité terrain Martin existe déjà partiellement (10 premières semaines de FA CG2P G1 saisies en session du 27 avril).

**Question ouverte non tranchée cette session** : statut des cellules vides dans le calendrier Matthieu. L'hypothèse "vide = company" est l'hypothèse fondatrice du pipeline cloud sur Matthieu, son invalidation entraîne la bascule pure et simple sur saisie manuelle assistée pour les formats type Matthieu. À fermer définitivement dans le spike #1 RESULTS.md.

**Étape 0 du spike #1 close le 28 avril** : commit 1920e35. Verdict scénario A confirmé sur Mathis (1380 setFillRGBColor, 0 paintImage*) et Matthieu (~144 setFillRGBColor par page, 0 paintImage*). Investissement étape 1A (extraction réelle fills + texte) justifié et engagé. Sous-dossier spike créé : `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/` avec RESULTS.md sections 1-3 remplies, sections 4-6 en placeholder.

**Étape 1A du spike #1 close le 28 avril** : commit e9dc421. pdf.js `getOperatorList()` confirmé comme voie viable pour extraire la structure d'une grille de calendrier sur PDF vectoriel.

- **1A.1 — Investigation** : les 4 hypothèses des notes techniques sur la structure des opérateurs pdf.js v5.7.284 sont **toutes contredites** par la réalité observée. `setFillRGBColor` reçoit `["#rrggbb"]` (pas `[r,g,b]`), `constructPath` a un format Path API moderne avec actionCode + bbox pré-calculée (pas `[opsArray, argsArray, minMax]`), 0 occurrence d'`OPS.transform` (pas de CTM à tracker), `OPS.fill`/`OPS.eoFill` séparés absents (action fusionnée dans `constructPath` args[0]). Conséquence : machine à états radicalement simplifiée, durée totale 1A ~50 min vs 3-4h estimées en cadrage.

- **1A.2 — Extraction principale** : sortie JSON par fixture, exploitable directement par 1B. Mathis p1 = 634 fills RGB (8 couleurs : `#ffffff`×284, `#00ccff`×170 cyan dominant, `#00ff00`×89 vert, `#c0c0c0`×47, `#000000`×32, `#ff8080`×10 rose, `#404040`×1, `#262626`×1), 250 fills non-RGB ignorés (TilingPattern × 125 sources, sans impact métier), 482 textes. Matthieu p1 = 245 fills (7 couleurs : `#bfbfbf`×89, `#000000`×76, `#ffff00`×54 jaune, `#ff0000`×15 rouge, `#83e28e`×9 vert, `#f7c7ac`×1 saumon, `#c1f0c8`×1 vert clair), 0 ignoré, 699 textes. Matthieu p2 = 252 fills (même palette), 707 textes. Texte parfaitement décodé malgré warning `standardFontDataUrl` cosmétique (accents, mots métier `Toussaint`, `Examens`, `Révisions`, `Pâques`, `Rattrapages`, `Soutenance`, noms de mois français complets).

- **1A.3 — Validation visuelle SVG** : 3 SVGs produits (102.5 / 89.6 / 91.1 Ko), Y-axis option 2 (pré-calcul). Verdict Côme : **A — extraction fidèle pour les 2 fixtures**. Anomalie connue sans impact métier : titre Mathis rendu en gris par défaut dans le SVG (TilingPattern non décodé). Hypothèse `#000000`/`#bfbfbf` Matthieu = bordures fines confirmée visuellement (pas des fills de cellule pleins).

- **Apprentissages portés en mémoire** dans `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/RESULTS.md` §5 (4 points : tableau de divergence pdf.js v5 réutilisable pour futurs spikes, pattern clipping save→eoClip→endPath→eoFill sans surestimation visible des bbox, TilingPattern limite connue sans impact métier, warning standardFontDataUrl cosmétique).

**Étape 1B (matching contre vérité terrain) — ouverte 28 avril après-midi** : voir bloc "Suite 28 avril après-midi" ci-dessous. Verdict global du spike #1 et décision F1/F2/F3 sur le pipeline parser Sterny restent en placeholder jusqu'à clôture de 1B (et 1C si nécessaire).

**Modifs working tree historiques toujours préservées** : `CreerAnnoncePage.jsx` (bypass DEV) + `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (audit Zone 1 en attente de relecture).

### Suite 28 avril après-midi — Ouverture spike 1B + consigne pédagogique transverse

**Étape 1B.1 — Préparation vérité terrain Mathis (3 commits docs, pas de code applicatif)**

- `2cae874` chore(spike-01): gitignore *.csv in fixtures
- `3a4e024` docs(spike-01): mention ground-truth CSVs in fixtures README
- `fbde82f` docs(spike-01): add ground-truth methodology to RESULTS section 3

Format CSV vérité terrain figé : 5 colonnes uniformes pour Mathis et Matthieu (`groupe`, `week_start_iso`, `statut_observe_pdf`, `statut_business`, `notes`). Une ligne par semaine ISO. La séparation `statut_observe_pdf` / `statut_business` permet de corriger la projection couleur → statut métier sans re-saisir le CSV si elle se révèle fausse en 1B.4.

Squelette CSV Mathis généré côté Claude.ai (54 lignes, lundis du 2025-09-01 au 2026-09-07, groupe `R_CA_A3_2025-2026`) puis saisi manuellement par Côme dans `fixtures/mathis-ground-truth.csv` (gitignored, non commité). **Saisie terminée le 28 avril vers 17h**. Résultat : 18 semaines école + 36 semaines entreprise = 54 semaines au total. Crosscheck légende PDF : 18 semaines école = match exact avec la mention "18 semaines de formation au centre" affichée dans le PDF. Crosscheck extraction 1A : 89 fills verts ÷ 5 jours/sem = 17,8 sem école attendues vs 18 saisies (écart 0,2 négligeable) ; 170 fills cyan ÷ 5 jours/sem = 34 sem entreprise attendues vs 36 saisies (écart de 2 sem expliqué par les 10 jours fériés roses absorbés dans le statut dominant cyan et les semaines de bordure école↔entreprise). Structure des blocs école : 3 blocs principaux (6+6+5 sem) + 1 semaine de rentrée 2026/2027 visible en chevauchement = cohérent avec un calendrier d'alternance.

**Consigne pédagogique transverse**

Décision actée pendant la session 1B.1 : Claude doit expliquer plus simplement, sans abréviation non-définie ni jargon décoratif. La règle est ajoutée en sous-section `### Niveau d'explication attendu` à la fin de §8 de CONTEXTE-PROJET.md. Elle s'applique à toute future session Claude.ai et à Claude Code (enregistrée en feedback memory locale dans `~/.claude/projects/-Users-comefourel-Dev-sterny/memory/feedback_pedagogy.md`).

- `acd9028` docs(contexte): add pedagogy rules for Claude explanations

**Découverte technique secondaire (DETTE #37 confirmée empiriquement)**

Claude.ai a tenté de lire directement le PDF Mathis uploadé pour valider la structure de grille, et s'est trompé — conclusion erronée que le calendrier était jour-par-jour alors qu'il est semaine-par-semaine. Côme l'a corrigé immédiatement. À retenir : sur les questions de structure visuelle PDF, Claude.ai s'appuie sur l'observation de Côme, pas sur sa propre lecture.

**État Git fin de bloc** : HEAD = `acd9028`. 4 nouveaux commits depuis la clôture 1A (`09b444e`). Working tree inchangé hors les 3 modifications historiques préservées (CreerAnnoncePage.jsx, audit Zone 1, notes techniques spike).

**Prochaine étape** : 1B.2 — Reconstruction de grille Mathis depuis `output-mathis-cells.json`. Prompt Claude Code 1B.2 à rédiger en ouverture de la prochaine session (CSV Mathis désormais disponible dans fixtures/, relu côté Claude.ai).

### Suite 28 avril fin de journée — Clôture étape 1B.2 (jalon majeur spike #1)

**Étape 1B.2 — Reconstruction de grille Mathis et matching contre vérité terrain**

Verdict atteint : **signal fort, 100% de match cellule-par-cellule** (54/54 semaines correctement classées). pdf.js getOperatorList officiellement confirmé comme voie viable pour le pipeline parser Sterny sur les PDFs Hyperplanning. Décision DETTE #37 directement éclairée par ce chiffre.

Approche retenue et validée empiriquement :
- Ancrage par texte ISO (annotations "L XX (S YY)" extraites du PDF servant de référence pour caler les fills colorés)
- Squelette accumulateur 54 entrées avec votes[] par semaine
- Agrégation par couleur dominante avec confidence calculée

3 commits :
- `8ead1aa` feat(spike-01): script 1B.2 grid reconstruction and ground-truth matching for Mathis
- `aeca1c6` chore(spike-01): outputs 1B.2 - Mathis grid + match report (100% score)
- `7fbaef8` docs(spike-01): close 1B.2 - Mathis 100% match, learnings 5.5 5.6

Anomalies portées en mémoire pour la production (sans impact sur le score) :
- 7 semaines à votes faibles (1-4 votes au lieu de 5) sur les bordures du calendrier — Hyperplanning n'affiche pas tous les jours sur ces semaines de bordure. Comportement réel du PDF, pas un bug du script. À traiter en production par un seuil de confidence plus exigeant et remontée à l'utilisateur.
- 8 semaines à votes mixtes (5 votes mais couleurs différentes) — typiquement un jour férié rose isolé dans une semaine cyan/verte. Règle de majorité fonctionne.
- 16 fills orphelins sans rattachement à une semaine — légende du PDF affichée hors-grille, sans incidence.

**Apprentissages techniques portés dans `RESULTS.md` §5.5 et §5.6** :
- Découverte 5.5 : annotations ISO rendues en 2 items texte distincts par pdf.js, pattern d'extraction à 2 passes nécessaire
- Découverte 5.6 : modèle de grille jour-par-jour vertical pour Mathis (chaque colonne X = un mois, chaque rangée Y = un jour-du-mois)

**Décision d'architecture actée** : le pattern accumulateur est promu au rang de contrat de données central du parser Sterny. Tous les spikes futurs (#2 Vision OCR, #3 DocAI) déposeront leurs votes dans la même structure. À documenter dans VISION-ARCHITECTURE.md (prochain prompt séparé).

**État Git fin de bloc** : HEAD = `7fbaef8`. 9 commits non-pushés depuis la clôture 1A (`09b444e`). Working tree inchangé hors les 3 modifications historiques préservées (CreerAnnoncePage.jsx, audit Zone 1, notes techniques spike).

**Prochaine étape** : 1B.6 — adaptation du script à Matthieu. 3 difficultés majeures absentes de Mathis : (1) calendrier civil jour-par-jour avec agrégation jour→semaine côté code, (2) 2 pages M1 + M2, (3) hypothèse fragile "cellule vide = company" à valider ou invalider. Le score Mathis seul ne suffit pas pour acter la décision globale F1/F2/F3 sur le pipeline parser. Verdict global du spike #1 reste en placeholder.

### Étape 1B.6.1 partielle — analyse exploratoire Matthieu (28 avril nuit + 29 avril après-midi)

**Étape 1B.6.1 — Cartographie des fills Matthieu et détection d'anomalies**

Session Claude.ai consacrée à l'analyse purement exploratoire du JSON output-matthieu-cells.json (2 pages) avant écriture du script de matching 1B.6.2. Aucune modification de code applicatif. Aucun commit de code. Validation par 11 inspections successives via jq sur les outputs 1A.2.

**Structure des couleurs métier confirmée** :
- #ffff00 jaune = cours (statut school) — 54 fills sur p1, 58 sur p2 dont bandeaux à exclure (width > 700)
- #ff0000 rouge = examens / soutenance / rattrapages (statut school) — 15 fills p1, 18 p2
- #83e28e vert saturé = révisions (statut school) — 9 fills par page, distribution identique (5 jours en Janvier 5-9 + 4 jours en Avril 27-30)
- #c1f0c8 vert pâle = légende uniquement, aucune cellule métier dans la grille — à filtrer (1 fill par page en colonne Mai, position y proche du minimum global)
- #bfbfbf gris + #000000 noir = bordures fines et glyphes — à filtrer
- Pas de fill #ffffff blanc dans Matthieu (contrairement à Mathis qui en avait 284). La grille est définie uniquement par les bordures, donc une "cellule vide" est l'absence de fill métier dans la zone géométrique d'un jour.

**2 anomalies de mise en page détectées (à gérer dans 1B.6.2)** :

1. **Fills jaunes multi-mois sur M1 uniquement** : 5 fills de largeur ~211-214 px (vs 70-80 px pour une cellule normale) à x=369.24 et x=77.88 dans les colonnes Septembre/Octobre et Décembre/Janvier. Ces rectangles représentent des cours qui s'étendent visuellement sur 2-3 colonnes mensuelles consécutives. Côme confirme à l'œil : effet de mise en page lié à des colonnes de mois étroites. Implication 1B.6.2 : déplier ces fills en cellules-jour multiples selon les colonnes mois traversées (vote par mois traversé).

2. **Fills rouges multi-colonnes sur M2 uniquement** : 4 fills de largeur ~149 px en début Mai (jours 4-7). Le rectangle déborde visuellement sur Avril mais correspond bien à des jours de mai (validation visuelle Côme). Implication 1B.6.2 : même logique de dépliage que pour le jaune M1, mais le centre x reste en colonne Mai.

**1 trou de couverture pdf.js confirmé** :

Sur la Soutenance M2 (semaine du 1 juin 2026), Côme observe 5 cellules rouges visuelles (lundi 1 → vendredi 5 juin) mais pdf.js n'extrait que 3 fills #ff0000 (lundi 1 → mercredi 3 juin). Les jours 4 et 5 juin sont absents du JSON sous toute couleur proche du rouge (filtre RGB élargi exécuté, aucun résultat). Aucun compteur "non supporté" du JSON ne signale ce manque (unsupportedFillsCount = 0 sur les 2 pages). Phénomène silencieux, qualitativement préoccupant. Tracé en DETTE #40.

**Mapping géographique p1 vs p2 (jours école identifiés par couleur et par mois)** :

| Période | M1 (p1) | M2 (p2) |
|---|---|---|
| Cours jaunes (cellules normales hors bandeaux) | 48 jours, étalés Sept→Avril | 57 jours, étalés Sept→Avril |
| Cours jaunes "multi-mois" à déplier | 5 fills (largeur ~211-214) × ~3 cellules ≈ 15 jours additionnels | 2 fills (largeur ~151.56 à x=433.44, y=240 et 252, traversée Mars+Avril) × 2 cellules = 4 jours additionnels — découvert pendant la génération du squelette CSV par generate-matthieu-skeleton.mjs |
| Examens rouges Janvier | 5 jours (12-16) | 5 jours (12-16) |
| Examens rouges Mai | 4 jours (4-7) | 4 jours (4-7, fills élargis) |
| Soutenance rouge Juin | 0 | **5 jours visuels (1-5) dont 2 ratés par pdf.js** |
| Rattrapages rouges Juin | 5 jours (22-26) | 5 jours (15-19) |
| Révisions vertes Janvier | 5 jours (5-9) | 5 jours (5-9, identique) |
| Révisions vertes Avril | 4 jours (27-30) | 4 jours (27-30, identique) |
| Total jours école estimés | ~86 (incluant dépliage M1) | ~88 (Soutenance comptée à 5) |

Cohérence : 2 plannings sur la **même année académique 2025-2026** (M1 et M2 à des cohortes différentes mais même école), avec révisions et examens partagés (l'école les fixe), cours différents (matières spécifiques par master), Soutenance unique à M2 fin mai/début juin.

**Hypothèse "cellule vide = company" non encore validée** : étape 1B.6.1 close partiellement. La validation finale nécessite la saisie manuelle de la vérité terrain Matthieu (108 lignes au total : 54 semaines × 2 groupes), à faire hors session par Côme avec PDF sous les yeux. Borne temporelle de la saisie : la vérité terrain s'arrête à la dernière semaine couverte par le PDF (mois de juillet 2026, à confirmer visuellement par Côme). Les semaines au-delà du PDF (août 2026 et après) gardent les colonnes statut_observe_pdf et statut_business vides dans le CSV — elles seront ignorées par le matching 1B.6.2 (script à coder pour filtrer les lignes col 4 vide). Logique : on ne mesure pas la qualité de l'extraction pdf.js sur des semaines absentes du PDF source.

**Squelette CSV pré-rempli généré** : fichier fixtures/matthieu-ground-truth.csv (gitignored), 7 colonnes (groupe, week_start_iso, statut_observe_pdf, statut_business, proposition_pdfjs, confiance_proposition, notes). Les 2 colonnes statut_observe_pdf et statut_business sont vides à remplir par Côme. Les colonnes proposition_pdfjs et confiance_proposition sont auto-générées par le script throwaway generate-matthieu-skeleton.mjs (à supprimer en clôture spike) à partir de l'extraction pdf.js, comme aide à la saisie. Une fois la saisie complétée, comparaison automatique côté script 1B.6.2.

**État Git fin de bloc** : pas de commit de code applicatif. 2 commits docs uniquement (ce bloc d'ETAT-COURANT + ajout DETTE #40). Working tree inchangé hors les 3 modifications historiques préservées. Le script generate-matthieu-skeleton.mjs et le CSV matthieu-ground-truth.csv ne sont pas versionnés (script throwaway + CSV gitignored).

**Prochaine session** : 1B.6.2 — écriture du script etape-1b-6-grid-and-match-matthieu.mjs après que Côme ait complété la vérité terrain. Reprendre avec le message d'ouverture préparé en fin de session 1B.6.1.

### Questions produit + architecture en parking — discussion 29 avril après-midi

Trois discussions ouvertes en marge de la session 1B.6.1, à traiter dans des sessions dédiées séparées. Aucune n'est tranchée à ce jour. Documentées ici pour ne pas se perdre.

**Question 1 — Modèle de couverture temporelle du rhythm_calendar**

Un planning scolaire couvre 1 année universitaire (typiquement septembre→juillet). Mais un contrat d'alternance peut durer 2 ou 3 ans. Sterny doit-il ne couvrir que le PDF (approche minimaliste) ? Extrapoler en company sur les périodes hors PDF (approche déductive) ? Demander à l'utilisateur la durée totale de son contrat et orchestrer une chaîne de plannings successifs (approche déclarative) ?

Reco provisoire de Côme (à valider en session dédiée) : approche déclarative, avec :
- Champ durée totale d'alternance demandé à l'inscription
- Page profil à créer avec deux actions distinctes (modifier le planning de l'année en cours vs ajouter le planning de l'année suivante)
- Fusion automatique des plannings successifs en un rythm_calendar continu côté dashboard
- Affichage explicite "tu es en entreprise" pendant les périodes creuses inter-plannings (juillet-août)
- Notification active à la rentrée pour rappeler l'upload du nouveau planning

Cas limite identifié : changement d'école entre années universitaires (M1 école A → M2 école B). Approche pressentie : la fusion gère naturellement ce cas grâce à la période creuse incompressible entre fin juillet et début septembre. Mais la **faisabilité juridique** du changement d'école en cours de contrat d'alternance n'est pas évidente — beaucoup d'entreprises financent la formation et le changement d'école peut nécessiter un avenant. À soumettre à un avocat spécialisé en droit du travail / formation professionnelle dans la consultation professionnelle obligatoire pré-lancement (cf. VISION §9).

À traiter en session dédiée Couverture Temporelle.

**Question 2 — Principe de flexibilité BDD pour Sterny**

Côme part de zéro sur beaucoup de domaines (cf. CONTEXTE §1). Il va inévitablement découvrir des cas non anticipés en exploitation réelle. Si la BDD est conçue de manière rigide, chaque découverte demandera une migration SQL coûteuse et ralentira la réactivité au pire moment.

Direction privilégiée (à formaliser en session dédiée) : adopter un mix de colonnes typées (pour ce qui est stable et critique : signatures de bail, paiements, dates ISO de contrats) et de colonnes jsonb (pour ce qui est susceptible d'évoluer dans les 12 premiers mois : préférences alternant, métadonnées de planning, parcours d'alternance, attributs descriptifs des annonces). Le principe doit être ajouté à VISION-ARCHITECTURE pour être appliqué à toute nouvelle table créée.

Implication pour la question 1 : ne pas créer de colonnes séparées users.alternance_start_date / users.alternance_end_date / users.alternance_duration_years, mais une unique colonne users.alternance_metadata jsonb avec structure documentée mais évolutive.

À traiter en session dédiée Flexibilité BDD, après consolidation de la phase 1 pour ne pas faire évoluer le schéma sur des features encore en mouvement.

**Question 3 — Vigilance horaire de Claude**

Règle ajoutée à CONTEXTE-PROJET §6 le 29 avril 2026. Claude doit demander l'heure si elle conditionne son conseil, plutôt que de la déduire d'indices indirects (noms de fichiers, métadonnées de captures, etc.).

### Étape 1B.6.2 — Reconstruction grille + matching Matthieu (29 avril après-midi)

Commit `b9e74b1`. Script `etape-1b-6-grid-and-match-matthieu.mjs` créé (777 lignes). Reconstruction de grille calendaire civile pour les 2 groupes M1 CCA et M2 CCA, agrégation jour→semaine ISO, déduplication par jour unique, politique de majorité 3/5, matching contre vérité terrain saisie main par Côme (108 lignes).

**Score consolidé Matthieu : 98.1% (106/108)**

- M1 CCA : 96.3% (52/54), 2 unknown localisés zone Mars (semaines 2 mars + 16 mars)
- M2 CCA : 100% (54/54), DETTE #40 absorbée par majorité 3/5

**Pattern d'erreur des 2 unknown M1** : ces 2 semaines sont en colonne Mars où les 5 fills jaunes "multi-mois" M1 (width ~211-214) sont dépliés en 1 vote par mois traversé, pas 1 vote par jour-cellule. Une semaine de cours réelle qui n'est représentée que par des fills multi-mois sur un seul mois reçoit donc 2 votes au lieu de 5, déclenchant le statut `unknown` (politique majorité 3/5 stricte, identique Mathis 1B.2). Pré-screening basse confiance à la génération du squelette a identifié exactement ces 2 semaines (ventilation 0 haute / 0 moyenne / 2 basse). Calibration du pré-screening jugée correcte. Stratégie alternative "1 vote par jour-cellule traversé" non implémentée car ferait gagner 2 cellules sur 108 au prix d'un risque de surcomptage ailleurs.

**Anomalie attendue Soutenance M2 absorbée** : pdf.js extrait 3 fills rouge sur 5 visuels (DETTE #40), mais la politique majorité 3/5 considère 3/5 ≥ 3 comme suffisant pour `status = school`. Confidence dégradée à 0.6 au lieu de 1.0, signal correct du contrat accumulateur (VISION §4). Plafond théorique M2 = score obtenu M2 = 100%.

**Verdict partiel spike #1 — pdf.js validé empiriquement sur PDFs vectoriels**

Mathis (1B.2, 100%, 54 semaines) + Matthieu (1B.6.2, 98.1%, 108 semaines) = 162 semaines testées sur 2 fixtures aux structures différentes (Hyperplanning 1 page 1 groupe / Master CCA 2 pages 2 groupes), score consolidé moyen 99.1%. Verdict cible ≥80% largement dépassé.

**pdf.js `getOperatorList` retenu comme candidate principale F1 pour les PDFs vectoriels.** Spikes #2 (Vision OCR), #3 (DocAI), #4 (Azure DI) deviennent **optionnels** — ils n'étaient prévus que comme conditionnels en cas d'échec pdf.js. Découverte F5 (Google DocAI `compute_style_info` exposant `backgroundColor`) reste référencée pour intégration future si jamais nécessaire.

**Reste à faire pour clore le spike #1 entièrement** :

- Spike Martin (image raster JPG, 4 groupes) : pdf.js inopérant par construction sur image. À traiter dans un spike dédié image raster (Florence-2 / Surya / algo manuel ImageData, technique à arbitrer).
- DETTE #37 (décision F1/F2/F3 sur le levier parser) : à formaliser une fois Martin tranché. Verdict probable : "stratégie discriminante par format" — PDFs vectoriels au pdf.js, images raster à la méthode retenue par spike Martin, fallback saisie manuelle assistée pour tout le reste.
- Clôture formelle du spike #1 : RESULTS.md final à rédiger (sections 4-5-6 actuellement en placeholder), suppression du script throwaway `generate-matthieu-skeleton.mjs`.
- Composant de saisie manuelle assistée (Levier 3 DETTE #37) : à concevoir comme fallback obligatoire (VISION §6 risque 1 et 4).

**État Git fin de bloc** : HEAD = `b9e74b1`. 6 commits non-pushés depuis la clôture 1A enrichie (`f959f6e`) : `a8aefb8`, `72f5f0c`, `712fc37`, `dbf6aec`, `651be24`, `b9e74b1`. Working tree historique préservé hors les 4 modifications connues (CreerAnnoncePage bypass DEV, audit Zone 1 untracked, notes techniques 1A, throwaway 1B.6.1).

**Prochaine session** : à arbitrer parmi spike Martin (suite naturelle pour finir #1), une session dédiée parquée (couverture temporelle / flexibilité BDD), ou tâche annexe (refonte UI rythme, fix z-index CompleterProfilPage/CreerAnnoncePage).

### Spike #2 Martin — Étape 0 audit faisabilité (29 avril fin de journée)

Squelette TypeScript Deno `etape-0-audit-faisabilite.ts` exécuté avec 13 cellules échantillons cliquées via outil throwaway `pick-coordinates.html` (créé puis supprimé dans le même commit de clôture). Pin `imagescript@1.2.17` requis pour stabilité Deno. Image décodée 720×1560 px, 13 hex extraits sans crash.

**Verdict étape 0 : GO cascade A** (algo manuel ImageData pure TypeScript).

- Sous-point 1 (décodage JPG Deno) : PASS.
- Sous-point 2 (palette extraite) : PASS. Gamme jaune `#ffff01` → `#e0de10`, gamme vert `#91cf52` → `#7cb145`.
- Sous-point 3 (distinguabilité au pixel près) : PASS pour le périmètre binaire jaune=school / vert=company. 56/78 paires testées avec Δmax > 50. Aucune paire jaune↔vert ne tombe sous le seuil 30. Toutes les confusions sous seuil sont intra-teinte (jaune-pur vs jaune-or, vert moyen vs vert foncé), explicables par la compression JPG.

**Apprentissage portant pour l'étape 1** : 3 points sur 13 (~23%) ont retourné des valeurs très foncées (`#2c5e00`, `#0c3b00`, `#3d3900`) qui ne sont ni jaune school ni vert company. Confirmé visuellement par Côme comme artefacts de clic sur bordure ou texte intra-cellule (hypothèse A). Le code de l'étape 1 doit moyenner plusieurs pixels par cellule au lieu d'un seul, pour absorber le bruit JPG et les artefacts d'échantillonnage.

Plan B magick-wasm non engagé. Cascade C/C bis restent en réserve documentaire.

**Reste à faire pour le spike #2** : étape 1 (détection de grille par projection + extraction couleur cellule par cellule + classification K-means K=2 + matching contre vérité terrain CSV 45 lignes), étape 2 robustesse 3 autres groupes FA si étape 1 valide ≥80%. RESULTS.md sections 4-5-6 remplies dans ce même commit de clôture étape 0.

**État Git fin de bloc** : HEAD = (hash du commit de clôture étape 0). Working tree historique préservé hors les 4 modifications connues.

### Spike #2 Martin — Étapes 1A, 1A bis, 1B (29 avril soirée)

3 étapes successives en suite directe de l'étape 0.

**Étape 1A — détection grille par gradient vertical sur image raster** : FAIL. Le détecteur sur-segmente hors grille (en-têtes confondus avec cellules) et sous-segmente intra-grille (bordures entre cellules de même couleur ratées). 49 cellules détectées au lieu de 45. Conclusion : abandon de la détection automatique, bypass par ancrage manuel.

**Étape 1A bis — division uniforme entre 2 ancrages cliqués manuellement** : PASS. Côme a cliqué semaine 1 (358, 537) et semaine 45 (357, 1204) via outil throwaway pick-coordinates.html. Le script découpe l'intervalle en 45 centres équidistants (step 15.16 px), Phase B (extraction couleur médiane multi-pixel filtrée luminance [80, 230]) appliquée sur chacun. 45 cellules extraites, 0 low_confidence, 0 bucket "autre", distribution 26 jaune + 19 vert.

**Étape 1B — matching cellule-par-cellule contre vérité terrain CSV** : score final **93.33% (42/45)**. Run 1 (Y_FIRST=535) : 84.44%. Run 2 après recalibrage (Y_FIRST=537, +2 px) : 93.33%, soit +4 cellules pour 2 pixels d'ancrage corrigé. 3 erreurs résiduelles persistantes sur semaines 2, 5, 9 — cellules à hex verdâtre ambigu (`#cdd72e`, `#bad431`, `#b7d332`), cause non tranchée en fin de session (voir DETTE #41).

**Verdict spike #2 : GO cascade A** (algo manuel ImageData pure TypeScript Deno) sur image raster JPG. Cible go/no-go ≥80% largement dépassée. Décision DETTE #37 désormais déblocable.

**Apprentissage majeur portant pour la production** : la précision de l'ancrage manuel est critique. 2 px d'erreur d'ancrage en haut = 4 cellules mal classées sur 44 (effet d'amplification cumulative). L'UI Sterny qui demandera à l'utilisateur de cliquer les ancrages doit prévoir un zoom élevé au clic (×3 ou ×4) et un mode de validation visuelle (markers superposés sur les 45 cellules calculées) avant confirmation.

**Reste à faire pour le spike #2** :
- Étape 2 robustesse sur les 3 autres groupes FA Martin : reportée, non bloquante pour DETTE #37.
- DETTE #41 à investiguer avant production : 3 erreurs résiduelles concentrées sur hex verdâtre ambigu, et observation Côme "tous les markers légèrement décalés vers le haut malgré recalibrage".
- Suppression des throwaway pick-coordinates.html et verify-grid-static.html : faite dans ce commit.
- Suppression du script étape 1A original (étape-1a-grille-couleurs.ts) et son output : faite dans ce commit (1A bis l'a remplacé).

**État Git fin de bloc** : HEAD = (hash du commit de clôture spike #2). Working tree historique préservé hors les 4 modifications connues.

**Décision DETTE #37 actable maintenant** : stratégie discriminante par format. À formaliser dans une session dédiée (rédaction de la décision dans VISION-ARCHITECTURE.md + clôture DETTE #37 + cadrage du composant saisie manuelle assistée).

### Suite 30 avril matin — Formalisation §5 (clôture stratégique DETTE #37) + investigation enrichie DETTE #41

Session ouverte avec le verdict spike #2 acquis la veille au soir (93.33% sur Martin FA CG2P G1, cascade A confirmée). DETTE #37 désormais actable, double objectif tenu : formaliser la décision d'architecture parser dans VISION-ARCHITECTURE.md, et reprendre dans la foulée l'investigation des 3 erreurs résiduelles (DETTE #41) sans laisser le sujet refroidir.

**Volet 1 — Formalisation §5 dans VISION-ARCHITECTURE.md (commit d26f6cb)**

Ajout de la section §5 "Stratégie discriminante par format source", qui devient la référence canonique sur l'architecture parser de Sterny. Trois chemins, un contrat de données commun (le squelette accumulateur de §4) :

- **Chemin 1 — PDFs vectoriels** : `pdf.js getOperatorList`. Validé empiriquement à 99.1% consolidé (Mathis 100%, Matthieu 98.1%, 162 semaines testées).
- **Chemin 2 — Images raster** : algorithme manuel sur `ImageData` en TypeScript Deno pur, avec ancrage manuel UI (l'utilisateur clique la première et la dernière semaine de son groupe, division uniforme entre les deux). Validé à 93.33% sur Martin FA CG2P G1.
- **Chemin 3 — Saisie manuelle assistée** : couche universelle pour tout document hors chemin 1 et 2, et fallback obligatoire. Joue aussi le rôle de couche de validation visuelle obligatoire pour les chemins 1 et 2 (cf. §6). Conception détaillée à venir en session dédiée.

Critère de discrimination à l'upload formalisé : inspection du MIME type, et pour les PDFs heuristique sur la présence d'instructions de dessin vectoriel exploitables (compter les `setFillRGBColor` retournés par `getOperatorList`, exiger un seuil minimal cohérent avec un calendrier d'alternance). Le seuil exact reste à valider sur fixtures avant industrialisation.

**DETTE #37 close stratégiquement, pas opérationnellement.** L'arbitrage F1/F2/F3 est tranché : levier 1 (autre LLM vision) éliminé empiriquement le 27 avril, leviers 2 (pipeline spécifique par format) et 3 (saisie manuelle assistée) retenus en combinaison sous forme de la stratégie discriminante. Le parsing par vision LLM pure est abandonné pour la production. L'implémentation production reste à faire : pipeline pdf.js intégré dans une Edge Function, pipeline algo manuel ImageData intégré côté serveur Deno, conception du chemin 3, intégration UX, investigation et résolution DETTE #41 avant industrialisation chemin 2.

**Conséquence pour le principe fondateur (§1)** : le rythme réel reste la seule source de vérité du matching, c'est la manière de l'extraire qui change. Reformulation de la promesse marketing actée : « uploade ton planning, on extrait ce qui est extractible automatiquement, tu valides ou complètes en quelques clics » plutôt que « uploade ton planning, tout est automatique en 30 secondes ». Honnêteté en amont cohérente avec le principe UX énoncé en §7 risque 4.

**Volet 2 — Investigation enrichie DETTE #41 (commit 9349d1a)**

Investigation menée en deux sessions de debug consécutives. Traces dans `debug-dette-41.ts`, `debug-dette-41-markers.png`, `debug-dette-41-colors.json`, `etape-1c-debug-palette-filter.ts`, `etape-1c-results.json` du dossier spike #2.

*Première session — échantillonnage multi-positions sur les 3 cellules erronées (semaines 2, 5, 9).* Pour chaque cellule, 13 hex échantillonnés à des positions précises autour du centre calculé (centre + 8 voisins ±5 px + 4 voisins ±10 px), plus le hex moyen filtré luminance 7×7. Constat : sur la semaine 2, dispersion énorme dans la fenêtre 7×7 (R varie de 74 à 255, B de 0 à 77) avec un gradient vertical lumineux→sombre. Sur les semaines 5 et 9, le centre lui-même est très sombre (luminance < 80, exclu par le filtre actuel) et un trait sombre horizontal traverse la cellule au niveau y=0 dans la fenêtre. Ces patterns sont **structurés**, pas aléatoires. → Hypothèse (a) bruit JPG **éliminée**. Les 13 hex échantillonnés ne sont pas similaires entre eux. → Hypothèse (b) cellule à teinte vert-citron uniforme **éliminée**. Les hex `#cdd72e`, `#bad431`, `#b7d332` ne sont pas des couleurs de cellules : ce sont des médianes calculées sur des fenêtres contaminées par un mélange jaune lumineux + vert moyen + sombre.

*Seconde session — approche B, filtre par distance euclidienne RGB à la palette extraite automatiquement.* Le filtre luminance [80, 230] remplacé par un filtre palette : extraction des centroïdes jaune et vert sur les 42 cellules non-erronées (`#f2f21f` jaune, `#96ca56` vert, cohérents avec la palette de l'étape 0 du spike), puis classification par distance euclidienne avec un seuil RAYON_PALETTE=80. Score : **91.11% (41/45)**, soit une régression d'une cellule vs le filtre luminance (93.33% au run 2 1B). Les 3 cellules erronées initiales (2, 5, 9) restent en erreur, et 1 nouvelle cellule (semaine 7) bascule en "ambigu".

*Pattern frappant dans la sortie 1C.* Sur les semaines 5, 7, 9, la fenêtre 7×7 contient exactement **21 pixels classés jaune et 21 pixels classés vert** (égalité parfaite, 7 pixels rejetés sur les 49 totaux). Une fenêtre 7×7 a 7 lignes de 7 pixels. La distribution 21+21+7 correspond précisément à 3 lignes complètes d'un côté, 3 lignes complètes de l'autre, 1 ligne médiane rejetée car à mi-chemin entre les deux centroïdes. Cela révèle que la frontière entre la cellule cible et la cellule adjacente passe **pile au milieu de la fenêtre 7×7**.

*Diagnostic structurel au 30 avril.* Le problème n'est ni couleur, ni bruit, ni alignement uniforme. C'est une **inexactitude cumulative de la division uniforme entre les 2 ancres cliquées**. Le step 15.16 px est arrondi à l'entier le plus proche par cellule, ce qui accumule des sous-pixels d'erreur jusqu'à ce que certains markers tombent pile sur des bordures inter-cellules. Aucun ajustement du filtre couleur (luminance, palette, ou autre) ne peut résoudre cela — c'est un défaut géométrique, à corriger côté géométrie. → Hypothèse (c) **recadrée** : pas un décalage uniforme vertical de tous les markers (« tous décalés vers le haut »), mais une accumulation d'erreurs de fraction de pixel qui se manifeste par chevauchement de bordures sur les cellules dont la position calculée tombe pile sur la frontière entre 2 cellules.

DETTE #41 reste **ouverte**. À reprendre lors du cadrage du chemin 3 (composant de saisie manuelle assistée), où elle se résoudra naturellement par la couche de validation visuelle obligatoire — ou disparaîtra si le rôle de l'algo automatique est reformulé en suggesteur plutôt qu'en pré-remplisseur (cf. question stratégique ci-dessous).

**Question stratégique parquée en fin de session — rôle de l'algorithme automatique dans la chaîne UX**

Question soulevée à froid en fin de session : le 99.1% chemin 1 et le 93.33% chemin 2 ne sont peut-être pas suffisants pour la production si l'utilisateur valide par réflexe sans relire, sur une cible « jeune alternant qui ne relira pas ». L'erreur validée sans contrôle se transforme en contrat signé avec un décalage de semaine, conséquences contractuelles et financières (cf. VISION §7 risque 4). Trois pistes ouvertes :

- *Piste 1* — recadrer le rôle de l'algo chemin 2 en « suggesteur » plutôt que « pré-remplisseur » : l'utilisateur construit son rythme, l'algo aide.
- *Piste 2* — recadrer le rôle de l'algo chemin 1 (PDF vectoriel) sous le même angle, même à 99.1%.
- *Piste 3* — repenser l'UX d'inscription complète, reformuler la chaîne de promesse (touche VISION §1 principe fondateur, sans le contredire).

Cette question touche §5 (formalisée le matin même) et §7 risque 4. Elle est susceptible de modifier la formulation de §5. Cadrage produit complet à mener avant toute décision. Session dédiée à ouvrir dans la foulée (objectif : ouverture le 30 avril après-midi, après quelques heures de pause pour laisser §5 se tester mentalement).

**Tâches de fond non priorisées** (rappel pour ne pas perdre)

- Étape 2 robustesse spike #2 : tester l'algorithme manuel ImageData sur les 3 autres groupes FA Martin (G2 GC2F, G3 GEMA LOG, G4 GEMA MD). Non bloquante pour DETTE #37, utile pour la mesure d'impact production.
- Investigation DETTE #41 à reprendre lors du cadrage du chemin 3 VISION §5.

**État Git fin de bloc**

HEAD = `9349d1a` sur main, synchronisé avec origin/main. 5 commits poussés sur les sessions du 29 avril soirée et du 30 avril matin : clôtures spike #1, clôture spike #2, décision DETTE #37 (formalisation §5) `d26f6cb`, investigation DETTE #41 `9349d1a`. Working tree historique préservé hors les 4 modifications connues : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` (bypass DEV), `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (untracked, attente relecture), `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/etape-1a-notes-techniques.md`, `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/generate-matthieu-skeleton.mjs`.

**Prochaine étape**

Ouverture de la session stratégique dédiée au rôle de l'algorithme automatique dans la chaîne UX, dans la foulée de la rédaction de ce bloc rétro. Trois pistes à examiner ensemble (suggesteur chemin 2, suggesteur chemin 1, refonte chaîne d'inscription complète).

### Suite 30 avril après-midi — Cadrage sujet 2 (rôle de l'algo dans la chaîne UX), bascule sur spike d'amélioration parser

Session ouverte sur la question stratégique parquée le matin (rôle de l'algorithme automatique dans la chaîne UX face à la cible « jeune alternant qui ne relira pas »). Le cadrage a abouti à un déplacement plus fondamental : avant de concevoir l'UX qui rattrape les erreurs du parser, on ré-investigue si le parser peut être amélioré au-delà des chiffres bruts actuels.

**Modèle utilisateur cible acté pour la conception du parcours rythme**

L'alternant cible est imprégné du réflexe vitesse hérité des plateformes courtes (réseaux sociaux à scroll continu, format TikTok). Sa posture par défaut sur tout écran est : échantillonner le début, extrapoler, valider. Sur un calendrier de 45-53 semaines affiché d'un coup, cette posture mène mécaniquement à valider sans détecter des erreurs logées hors des premières cellules — ce qui matérialise précisément le risque 4 de VISION §7. Les autres profils alternants (année 2 ou 3 prudents, profils `les_deux` plus engagés) existent mais ne sont pas le cas critique à protéger : ils prendront le temps quoi qu'il arrive, et un design calibré sur le profil à risque ne les pénalise pas. Les `proprietaire` non-alternants ne sont pas concernés par cette UX (ils ne valident pas de calendrier).

**Calcul de fréquence d'erreur en mode validation passive (ordres de grandeur)**

Sur le chemin 2 (image raster, 93.33% bruts) : ~75% des utilisateurs valident un calendrier comportant au moins une erreur réelle en mode scan rapide (3 erreurs en moyenne par calendrier de 45 semaines, échantillonnage utilisateur des premières cellules, statistiquement les erreurs tombent rarement dans les 5-10 premières). Sur le chemin 1 (PDF vectoriel, 99.1% bruts) : ~25% des utilisateurs valident un calendrier comportant au moins une erreur. Ces chiffres sont des ordres de grandeur dérivés des spikes #1 et #2, pas des prédictions statistiques précises.

**Intuition produit Côme — bascule de la session**

Constat : « 93.33% n'est pas un standard sérieux pour la vision Sterny ». À titre de comparaison de marché : OCR documentaire commercial 98-99.5%, lecture automatique de chèques bancaires 99.5-99.8%, OCR Google DocAI 98%+ sur du texte standard. À 93%, une plateforme grand public crée une expérience laborieuse même avec validation séquentielle UX bien conçue, parce que chaque utilisateur doit corriger en moyenne 3 cellules sur 45.

**Vérification exhaustive du panorama testé vs cartographié (effectuée pendant la session)**

Techniques **testées empiriquement** sur fixtures Sterny : Claude Sonnet 4.6 vision (~50% sur Martin et Mathis, échec), GPT-4o vision (5/10 sur 10 semaines Martin, échec), Gemini vision (4/10 sur 10 semaines Martin, échec), pdf.js getOperatorList (99.1% sur Mathis + Matthieu, succès), algo manuel ImageData (93.33% sur Martin G1, succès partiel).

Techniques **cartographiées dans PARSER-AXE-1-ETAT-DE-L-ART.md mais jamais testées empiriquement** : magick-wasm / ImageMagick WASM (F2 T1, candidate principale officielle Supabase, plan B non engagé sur spike #2), OpenCV.js (F2 T2), Google DocAI compute_style_info (F5, spike #3 plan original jamais lancé), Azure DI STYLE_FONT (F2 T5, spike #4 plan original jamais lancé), Adobe Extract (zone grise), Florence-2 zero-shot (F4 T4), Surya/Marker via API datalab.to (F4 T5), TATR (F4 T6, fallback réserve).

Techniques **disqualifiées par documentation sans test** : AWS Textract (n'expose pas couleur de fond), LayoutLMv3 / Donut / Pix2Struct (fine-tuning requis, dataset Sterny inexistant).

**Décision actée — bascule sur spike d'amélioration parser avant cadrage UX**

Le cadrage du composant de validation visuelle (séquentiel colonne par colonne avec assombrissement, idée Côme du brief design précédent) est **suspendu** le temps de mener un spike d'amélioration parser sur les techniques non-testées. Logique : on ne conçoit pas l'UX qui rattrape un mauvais signal tant qu'on n'a pas confirmé qu'on ne peut pas avoir un meilleur signal. Périmètre du spike :

- **Chemin 2 (image raster, cible >97-98%)** : tester en priorité magick-wasm (candidate principale officielle de la recherche), puis DocAI compute_style_info, puis Azure DI STYLE_FONT en redondance si besoin. Tester aussi une variante d'implémentation de l'algo manuel ImageData : homographie 3-4 ancres au lieu de division uniforme 2 ancres, qui résout précisément le défaut géométrique diagnostiqué dans DETTE #41 (inexactitude cumulative de la division uniforme, pattern 21+21+7).
- **Chemin 1 (PDF vectoriel, cible >99.7%)** : investiguer les trous silencieux pdf.js (DETTE #40, 2 cellules sur 5 manquantes sur Soutenance M2 Matthieu), élargir éventuellement la palette d'opérateurs PDF captés par le parser, et envisager une politique de majorité plus stricte (4/5 ou 5/5) avec remontée explicite des semaines sous le seuil de confiance.
- **Florence-2 / Surya / TATR** restent en réserve si les premiers tests plafonnent.
- **Hyperplanning API** : sortie du périmètre technique, basculée en sujet commercial (partenariats école) à porter quand le produit sera vendable.

**§5 et §6 de VISION-ARCHITECTURE non figés tant que le spike n'a pas livré ses résultats**

La sous-section "Posture de l'utilisateur cible et conséquence sur le design de validation" était envisagée pour ajout en VISION §6, elle n'est pas ajoutée maintenant : si le spike fait grimper le chemin 2 à 98%+, la conclusion produit pourrait être reformulée. La décision UX (validation séquentielle obligatoire vs alternative) est explicitement reportée à après le spike.

**DETTE #41 — décision opérationnelle reportée**

L'investigation enrichie du 30 avril matin reste valable (diagnostic structurel : inexactitude cumulative de la division uniforme). Mais la résolution opérationnelle dépend désormais des résultats du spike d'amélioration parser : si magick-wasm ou DocAI sortent à >97% sur Martin, l'algo manuel ImageData pourrait être abandonné au profit d'une autre technique, et DETTE #41 disparaîtrait par changement de chemin technique. Si l'algo manuel reste retenu, la variante homographie 3-4 ancres est la voie de résolution préférée.

**Auto-vigilance Claude — saturation de session signalée**

Cette conversation Claude.ai a couvert : sujet 1 (clôture rétro 30 avril matin avec un raté de lecture diff sur le commit c453ba9), cadrage modèle utilisateur sujet 2, discussion pattern UX validation séquentielle, vérification exhaustive du panorama des techniques (Claude.ai a re-proposé en début de session des techniques déjà cartographiées sans avoir vérifié dans les docs, redressé par Côme). Saturation pointée par Claude.ai en clôture de session pour ne pas enchaîner sur la rédaction du plan de spike dans une conv déjà chargée.

**État Git fin de bloc**

HEAD avant ce commit = `c453ba9`. Working tree historique préservé hors les 4 modifications connues : `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` (bypass DEV), `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (untracked, attente relecture), `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/etape-1a-notes-techniques.md`, `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/generate-matthieu-skeleton.mjs`.

**Prochaine étape**

Pause Côme, puis ouverture d'une nouvelle conversation Claude.ai dédiée : « Cadrage spike d'amélioration parser — exploration des techniques non testées (magick-wasm en tête, DocAI, Azure DI, homographie chemin 2, investigation chemin 1 DETTE #40) ». Brief de démarrage de cette nouvelle conv : les 4 docs de référence + PARSER-AXE-1-ETAT-DE-L-ART.md + ce bloc rétro comme contexte d'ouverture. Le travail de design composant de validation visuelle reste en attente après le spike.

### Suite 30 avril après-midi bis — Cadrage spike d'amélioration parser, plan validé

Session ouverte en suite directe de la clôture précédente (bloc Suite 30 avril après-midi), pour produire le plan ordonné et chiffré du spike d'amélioration parser. Pas le spike lui-même. Démarrage avec les 4 docs de référence + PARSER-AXE-1-ETAT-DE-L-ART.md chargés. Cadrage en mode question-réponse séquentiel sur 5 points avant rédaction du plan.

**5 décisions de cadrage actées**

1. **État Git et infra** : HEAD = `d6b3f13` (commit retro 30 avril après-midi), working tree historique préservé sur 4 modifs connues. GCP entièrement provisionné depuis le 28 avril : projet `sterny-492413` créé, billing actif (260€ de crédit, 89 jours), Cloud Vision API + Cloud Document AI API activées, clé API restreinte aux 2 APIs uniquement (bonne hygiène). Azure neutre — compte Microsoft créé sans abonnement, aucun setup intégré au plan. Aucun setup cloud à intégrer comme prérequis du spike.

2. **Périmètre du spike — strictement chemin 2 (Martin, image raster)**. Décision actée après identification d'une incohérence dans le brief de clôture du 30 avril après-midi : DocAI `compute_style_info` et Azure DI Layout+STYLE_FONT exposent la couleur du bounding box du **token** (mot), pas de la cellule entière. Sur Martin il n'y a pas de texte dans les cellules colorées, donc pas de signal exploitable. Ces 2 candidates sont pertinentes pour Mathis et Matthieu (PDFs avec texte intra-cellule, chemin 1), pas pour Martin. Posture acceptée : on cherche d'abord la solution pour le format qui ne marche pas (Martin à 93.33%) avant de tester le format qui marche (Mathis/Matthieu à 99.1%). Conséquence : DocAI / Azure / chemin 1 / F4 ML / Adobe Extract / Florence-2 / Surya / TATR sont tous **hors périmètre du spike actuel**.

3. **Ordre de test — séquentiel sans condition d'arrêt**. Variante (A') retenue contre une exécution parallèle. Homographie 3-4 ancres testée d'abord (modif géométrique localisée sur l'algo actuel, faible coût d'implémentation, traite directement le défaut diagnostiqué de DETTE #41). Magick-wasm testé ensuite **dans tous les cas** (pas de condition d'arrêt à mi-spike). Comparaison à froid à la fin sur les deux scores publiés. Justification : (a) le séquentiel respecte la convention de spikes posée le 28 avril (un dossier par technique, RESULTS.md standardisé), (b) le diagnostic produit par le spike #3 informe le tuning du spike #4, (c) charge cognitive divisée entre deux chantiers techniques au lieu de menée en parallèle. Aucune candidate sacrifiée.

4. **Base de mesure — vérité terrain sur les 4 groupes Martin (~180 sem)**. Variante (B) retenue contre G1 seul ou G1+G2 compromis. Posture qualité Côme : le score doit refléter les conditions réelles d'utilisation, pas les conditions où l'algo a été initialement réglé. Risque sinon de sur-ajustement involontaire à G1 (« overfitting » : un système qui marche très bien sur les données précises sur lesquelles il a été réglé mais échoue sur des données nouvelles parce qu'il a appris les particularités du training set au lieu de la règle générale). Sur 45 sem, 1 erreur = 2.2% de variation, bruit aussi gros que l'écart au seuil. Sur 180 sem, 1 erreur = 0.55%, lecture du score 4× plus serrée. Coût accepté : ~2h de saisie manuelle attentive de vérité terrain G2+G3+G4, fractionnée en 3 sessions de 30-45 min, AVANT que le spike démarre.

5. **F4 (Florence-2 / Surya / TATR) — hors plan, à cadrer séparément**. Variante (B) retenue contre un spike conditionnel chiffré-à-la-louche. Si homographie ET magick-wasm plafonnent tous les deux sous le seuil >97-98%, le spike actuel est clos avec ce constat et une **session de cadrage dédiée** est ouverte pour arbitrer entre (a) attaquer F4 ML (avec dépendance à un service externe payant, à cadrer produit), (b) basculer Martin sur le chemin 3 saisie manuelle assistée (cohérent avec VISION §5). Justification : F4 introduit une dépendance externe non-anodine qui mérite son propre cadrage produit, pas une décision dans le rush d'un spike qui plafonne.

**Principe acquis — mesure parser sur planning intégral**

Décision méthodologique acquise au point 4 du cadrage qui dépasse le spike actuel : pour tout spike de mesure du parser rhythm_calendar, la base de mesure doit couvrir **l'intégralité du planning fixture testé** (tous les groupes du PDF si applicable), pas un seul groupe sélectionné. Sinon le score mesure « la candidate marche sur le groupe que je connais » au lieu de « la candidate marche sur le planning tel qu'un utilisateur l'uploaderait ». Ce principe est inscrit dans VISION-ARCHITECTURE.md §4 (sous-section « Mesure d'une candidate parser »).

**Plan ordonné et chiffré du spike**

| Étape | Description | Durée |
|---|---|---|
| 0 | Saisie vérité terrain G2+G3+G4 (3 CSV gitignored) | 1h30 - 2h15 |
| 1 | Spike #3 homographie 3-4 ancres (1A implémentation, 1B mesure 4 groupes, 1C analyse) | 3-5h |
| 2 | Spike #4 magick-wasm (2A setup, 2B implémentation, 2C mesure, 2D comparaison vs spike #3) | 6-10h |
| 3 (cond.) | Robustesse multi-fixtures sur la candidate retenue | non chiffré |
| 4 | Update VISION / DETTE / ETAT-COURANT après verdict spike | 1h |

Total avant étape 3 : **11h30 - 18h15**, étalable sur 3-5 sessions.

**Convention de stockage des CSVs vérité terrain**

Décision actée à la question Q1 du plan : les CSVs vérité terrain G2/G3/G4 ne vont **pas** dans le dossier du spike #2 passé. Création d'un dossier partagé `docs/fixtures-ground-truth/martin/` à la racine `docs/`, contenant les 4 CSVs (G1 migré depuis le dossier spike #2 + G2/G3/G4 nouveaux). Tous gitignored par convention héritée du spike #2. Justification : la vérité terrain est un actif réutilisable au-delà du spike #2, donc ne doit pas vivre dans un dossier de spike technique passé. Tous les futurs spikes de mesure parser sur Martin pointent vers ce dossier partagé.

**Convention de stockage des nouveaux spikes**

- Spike #3 homographie : `docs/spikes/2026-04-30-03-homographie-3-4-ancres/`
- Spike #4 magick-wasm : `docs/spikes/2026-04-30-04-magick-wasm/`

Les deux respectent la structure standard (`run.{ts,mjs}`, `RESULTS.md` 6 sections, outputs JSON par groupe).

**Posture méthodologique pour le spike**

- Vérité terrain saisie d'abord, en bloc, avant tout code de spike. Pas de mesure préliminaire sur G1 seul tant que les 4 groupes ne sont pas couverts.
- Tuning des seuils morphologiques (spike #4) sur G1 uniquement (référence connue 93.33%), puis application sans nouveau tuning sur G2+G3+G4 pour éviter l'overfitting.
- Crosscheck systématique en fin de saisie de chaque vérité terrain : le compte des semaines `school` saisies doit être cohérent avec ce que la légende du PDF annonce.

**État Git fin de bloc**

HEAD avant ce bloc = `d6b3f13` (clôture session 30 avril après-midi). Aucun commit de code dans cette session de cadrage. La présente mise à jour de docs est commitée à la fin de la session avec message dédié.

**Prochaine étape**

Étape 0 du plan (saisie vérité terrain G2+G3+G4) à exécuter sur 2-3 sessions de saisie attentive. Une fois les 3 CSVs saisis et crosscheckés, ouverture d'une nouvelle conversation Claude.ai dédiée au spike #3 (homographie). Conv de cadrage actuelle clôturée par cette mise à jour de docs.

---

### Suite 30 avril après-midi (post-spike #3) — Nettoyage DETTE #42 avant ouverture spike #4

Session ouverte en suite directe de la clôture du spike #3 (commit `016182e` du 30 avril fin de journée — convention de séquence, pas timing horaire). Étape de propreté préalable au spike #4 : clôture de DETTE #42, créée par le spike #3 hors-scope (anomalies de saisie remontées par le run sans être corrigées dans le spike par discipline « une variable change à la fois »).

**Inspection préalable** : 4 CSVs vérité terrain Martin (G1, G2, G3, G4) confirmés à 46 lignes chacun, header uniforme à 5 colonnes (`groupe,week_start_iso,statut_observe_martin,statut_business,notes`). Périmètre des anomalies confirmé exact :
- 1 ligne fautive dans G3 sur 2026-10-12 (8 colonnes au lieu de 5)
- 1 ligne fautive dans G4 sur 2026-10-12 (8 colonnes au lieu de 5)
- 45 occurrences du label `FA_GEMA_LOG_G4_2026-2027` dans le fichier g4 à remplacer par `FA_GEMA_MD_G4_2026-2027`

**Corrections appliquées** : 3 sed sur disque, CSVs gitignored (convention héritée du spike #2) donc corrections sur disque uniquement, hors commit. Vérifications post-corrections nominales : 4 lignes 2026-10-12 à 5 colonnes propres, 0 occurrence du label fautif, 45 occurrences du label correct.

**État Git fin de bloc**

HEAD avant ce commit = `016182e`. Working tree strictement aux 4 modifs historiques connues. Le commit de clôture DETTE #42 ne porte que sur `docs/DETTE-TECHNIQUE.md` (ajout du statut de clôture) et `docs/ETAT-COURANT.md` (mise à jour métadonnée + ce bloc).

**Sous-bloc — Ouverture spike #4 magick-wasm (CONCEPTION.md créé)**

Sous-dossier `docs/spikes/2026-04-30-04-magick-wasm/` créé. CONCEPTION.md rédigé (141 lignes, 7 sections numérotées) couvrant les 2 missions du spike :
- Mission (a) — détection automatique de grille via opérations morphologiques magick-wasm (kernel horizontal long + kernel vertical long + intersection des masques → coins de cellule), alternative à l'ancrage manuel à 4 clics du spike #3.
- Mission (b) — pré-traitement d'image (modulate + level) en amont de l'échantillonnage couleur, pour résoudre le plafond classification couleur diagnostiqué par le spike #3 (DETTE #43, 10 erreurs sur hex jaune-verdâtres frontière).

Plan de mesures séquentielles à 3 scores : (i) baseline 94.44 % spike #3 rappelée, (ii) mission (a) seule, (iii) missions (a)+(b) combinées. Comparaison à froid pour isoler la contribution propre de chaque mission. Tuning sur G1 uniquement, application sans nouveau tuning sur G2+G3+G4. Cible >97 % consolidé sur 180 sem.

4 routes de repli cartographiées en cas de score insuffisant, par ordre d'engagement croissant : tuning prolongé magick-wasm, options 1 et 2 de DETTE #43 (élargir plage jaune ou k-NN), bascule F4 ML (cadrage produit séparé requis), bascule chemin 3 saisie manuelle assistée (VISION §5).

Exécution étape 2A close (création sous-dossier + CONCEPTION.md). Étapes 2B-2G du plan d'exécution pour exécution dans une nouvelle conversation Claude.ai.

**État Git fin de bloc**

HEAD avant ce commit = `780077e`. Working tree strictement aux 4 modifs historiques connues + nouveau fichier `docs/spikes/2026-04-30-04-magick-wasm/CONCEPTION.md`. Le commit de clôture porte sur ce CONCEPTION.md + cette mise à jour ETAT-COURANT.md.

**Prochaine étape**

Reprise dans une nouvelle conversation Claude.ai sur le spike #4. Brief de démarrage : les 4 docs de référence à jour + ce bloc rétro + CONCEPTION.md du spike #4 lu depuis le repo. Démarrage à l'étape 2B du plan d'exécution : scaffold run.ts + setup magick-wasm Deno + smoke test sur Martin (charger l'image, afficher les dimensions, valider l'environnement).

---

### Suite 30 avril fin de journée — Spike #3 homographie 4 ancres Martin exécuté

Session ouverte en suite directe de la clôture du cadrage (commit `c60a057`). Objectif unique de la session : exécuter le spike #3, étape 1 du plan validé (homographie 4 ancres sur le bloc Martin entier, cible >97 % sur 180 sem). Étape 0 (saisie vérité terrain G2/G3/G4) avait été finalisée entre les deux sessions, crosscheck légende validé en début de cette session.

**Décisions produit prises pendant la session (avant exécution du code)**

1. **Mapping couleur → statut (school/company) requiert validation utilisateur obligatoire**. Sur Martin, le PDF n'affiche pas de légende textuelle qui dirait quelle couleur signifie école et quelle couleur signifie entreprise. Le parser détecte des couleurs, pas des statuts. Conséquence inscrite en VISION-ARCHITECTURE §4 (nouvelle sous-section) : le pipeline parser doit toujours présenter à l'utilisateur, en fin d'extraction, un écran de confirmation du mapping couleur → statut, sinon risque d'inversion catastrophique du rythme.

2. **Stratégie d'ancrage pour le bloc Martin** : 4 clics au total sur les 4 coins extérieurs du bloc des 4 colonnes (G1 sem 1, G4 sem 1, G1 sem 45, G4 sem 45), une seule matrice d'homographie partagée par les 4 groupes. Justification : écart en X plus grand donc matrice plus stable, 4 clics au lieu de 16, mesure homogène valable partout simultanément.

3. **Versionnement intégral du dossier spike #3** : `anchors.json`, `pick-coordinates.html`, `output-g*.json` tous versionnés (pas de gitignore local). Reproductibilité d'un spike = actif d'équipe.

**Exécution du spike — passes 1A.2.a / 1A.2.b / 1A.2.c / 1A.2.d**

Conception (CONCEPTION.md), implémentation (run.ts en Deno + TypeScript, héritage textuel des fonctions du spike #2 sur extract/classify/match, 511 lignes), création de l'outil pick-coordinates.html (HTML statique 100 lignes, marqueurs visuels au clic, copie JSON), pick des 4 ancres par Côme (HG=357,538 / HD=584,537 / BG=357,1205 / BD=585,1204 — cohérence géométrique validée arithmétiquement), exécution Deno avec téléchargement imagescript@1.2.17, génération des 4 outputs JSON.

**Itération mid-run sur la vérité terrain** : le run a remonté 2 cellules (G3 sem 7 et G4 sem 7, 2026-10-12) avec `statut_observe_martin` vide dans les CSVs. Côme a relu le PDF, confirmé que ces cellules sont colorées en vert (company), corrigé les 2 lignes uniquement, relancé le run. Pas de révision pour faire matcher le score : correction de saisie incomplète repérée par le run, PDF en main. Le run a aussi remonté 2 anomalies de format CSV hors-scope (8 colonnes au lieu de 5 sur ces 2 mêmes lignes ; label groupe G4 incorrect sur 45 lignes) qui ont été loguées en DETTE #42 sans être corrigées dans ce spike.

**Scores finaux**

| Groupe | Score | Erreurs |
|---|---|---|
| G1 | 44/45 = 97.78 % | 1 |
| G2 | 44/45 = 97.78 % | 1 |
| G3 | 42/45 = 93.33 % | 3 |
| G4 | 40/45 = 88.89 % | 5 |
| **Consolidé** | **170/180 = 94.44 %** | **10** |

**Verdict du spike**

Hypothèse confirmée : l'homographie 4 ancres résout DETTE #41 (défaut géométrique de la division uniforme). Comparaison directe sur G1 entre spike #2 (2 ancres + division uniforme = 93.33 %) et spike #3 (4 ancres + homographie DLT = 97.78 %) : +4.45 points attribuables exclusivement au changement d'ancrage, toutes les autres variables du pipeline étant strictement identiques. DETTE #41 éligible à clôture, conditionnée au verdict du spike #4.

Plafond résiduel diagnostiqué : 10 erreurs sur 180 toutes du même profil `predit=company / observe=school` sur des hex jaune-verdâtres à la frontière du bucket de classification couleur. Pas un problème de positionnement géométrique. Logué en DETTE #43 (nouvelle).

Voir `docs/spikes/2026-04-30-03-homographie-3-4-ancres/RESULTS.md` pour le rapport complet (6 sections standard + annexes).

**Anomalies CSV remontées hors-scope du spike**

Loguées en DETTE #42 pour traitement dédié avant le spike #4 ou avant tout traitement cross-fixture :
1. Format à 8 colonnes (au lieu de 5) sur les lignes G3 sem 7 et G4 sem 7 des CSVs vérité terrain.
2. Label de groupe G4 = `FA_GEMA_LOG_G4_2026-2027` au lieu de `FA_GEMA_MD_G4_2026-2027` sur les 45 lignes du fichier g4 (probable copier-coller depuis G3).

**État Git fin de bloc**

HEAD avant ce commit = `c60a057`. Working tree historique préservé hors les 4 modifications connues (CreerAnnoncePage.jsx bypass DEV, AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md untracked, etape-1a-notes-techniques.md, generate-matthieu-skeleton.mjs).

**Prochaine étape**

Ouverture d'une nouvelle conversation Claude.ai dédiée au spike #4 magick-wasm (étape 2 du plan validé en session du 30 avril après-midi bis). Brief de démarrage : les 4 docs de référence à jour + ce bloc rétro + RESULTS.md du spike #3 comme contexte. Objectif du spike #4 : (a) tester la détection automatique de grille par opérations morphologiques magick-wasm comme alternative à l'ancrage manuel, (b) tester si le pré-traitement d'image magick-wasm améliore par effet de bord la robustesse du bucket couleur sur les teintes frontière jaune-verdâtres (mission complémentaire ajoutée par le verdict du spike #3, cf. DETTE #43).

---

## 0. Session du 27 avril — Cadrage parser, décision reportée à recherche profonde

**Contexte** : ouverture d'une nouvelle conversation Claude.ai avec les 5 docs de référence chargés. Objectif initial : trancher entre Leviers 1, 2, 3 documentés DETTE #37 et établir un plan d'implémentation pour le levier choisi.

**Tests effectués pendant la session** :

- **Vérification du caractère vectoriel du PDF Mathis** : texte sélectionnable dans Aperçu. Faisabilité technique d'extraction programmatique du texte confirmée. Faisabilité d'extraction des couleurs de fond cellule par cellule **non encore démontrée** — le caractère vectoriel du texte ne garantit pas que les fonds soient eux-mêmes vectoriels et lisibles. Reste un pari technique à confirmer par spike.
- **Test à la main de GPT-4o et Gemini sur Planning_Martin.JPG** (10 premières semaines de FA CG2P, G1, vérité terrain établie : school, school, company, school, company, school, company, school, school, school). Résultats : **GPT-4o 5/10 corrects (50%)**, **Gemini 4/10 corrects (40%)**. Au même niveau que le parser Claude vision actuel. **Levier 1 éliminé empiriquement** : tous les LLM vision actuels échouent au même niveau, la limite est structurelle (modalité vision sur classification couleur à grande échelle) et non spécifique à un provider.

**Ce qui n'a pas été tranché — et pourquoi** :

Aucun levier privilégié à l'issue de la session. La conversation a fait émerger qu'agir précipitamment sur un sujet qui touche au principe fondateur de Sterny (VISION §1) serait une erreur. Le parser n'est pas un détail d'implémentation, c'est l'argument de vente principal de la plateforme. Toute décision d'architecture doit reposer sur une **recherche technique approfondie** explorant l'ensemble des techniques disponibles, pas seulement les 3 options documentées DETTE #37 sur la base d'une seule conversation.

**Idées d'architecture émergées à explorer en session de recherche** :

- **Pipeline multi-signaux (architecture d'ensemble)** : aucune méthode prise seule n'étant fiable à 100% sur la classification couleur de cellule, combiner plusieurs signaux indépendants (couleur de fond, texte intra-cellule, position dans la grille, légende, métadonnées PDF, contraste avec voisines, patterns de répétition, cohérence en-têtes) pour atteindre une fiabilité >99% par convergence des méthodes. Lorsque plusieurs méthodes convergent : forte confiance. Lorsqu'elles divergent : remontée ciblée à l'utilisateur sur cette cellule précise. Architecture **honnête sur l'incertitude**, ce qui est rare et précieux.
- **Squelette de calendrier pré-généré + remplissage progressif annoté (structure de données centrale)** : pré-générer le squelette du calendrier dès qu'on connaît dates de début et fin de l'année scolaire (ex : 53 lundis du 2026-08-31 au 2027-08-30, toutes cellules à `status: null`). Chaque méthode d'extraction du pipeline multi-signaux dépose dans ce squelette ce qu'elle sait, avec une annotation de confiance par cellule. À la fin, certaines cellules sont **certaines** (plusieurs méthodes d'accord), d'autres **probables** (1-2 méthodes d'accord), d'autres **inconnues** (aucune méthode n'a su). Seules les cellules incertaines ou inconnues remontent à l'utilisateur pour validation ciblée — pas le calendrier entier. Pattern technique connu sous le nom **accumulateur** ou **structure de remplissage progressif**. Posée par Côme en session, intuition d'archi forte à creuser.
- **Principe UX de promesse non trahie** : voir VISION §5 risque 4, 4e mitigation ajoutée le 27 avril. À garder présent à l'esprit dans toute décision sur l'UI parser.

**Plan de la session de recherche profonde** :

1. **Axe 1 — État de l'art académique et open source.** Cartographie des techniques existantes pour : extraction de tableaux structurés (PDF vectoriel et raster), classification de couleur de fond de cellule, OCR couplé à analyse de mise en page, reconnaissance de structure de calendrier. Acteurs marché à creuser : Adobe Extract, Microsoft Azure Document Intelligence, Google Document AI, AWS Textract. Open source à explorer : pdfplumber, camelot, tabula-py, PaddleOCR, LayoutLMv3, DETR. Lectures académiques 2022-2025 sur "table structure recognition", "color classification document", "calendar parsing from images".
2. **Axe 2 — Inventaire exhaustif des signaux disponibles** dans les 5 fixtures (Martin, Mathis + 3 nouveaux plannings d'amis alternant à collecter). Pour chaque signal : présence, fiabilité d'extraction, indépendance vis-à-vis des autres signaux.
3. **Axe 3 — Identification des techniques candidates par signal**, leur maturité, leur faisabilité en stack JS/TS Deno (rappel : pas de Python, contrainte assumée), leur coût de calcul. Sortie : tableau "signal × technique × maturité × complexité × coût".
4. **Axe 4 — Esquisse de 2-3 architectures multi-signaux candidates** intégrant les 2 intuitions ci-dessus (pipeline multi-signaux + squelette accumulateur), avec logique de combinaison des signaux, protocole de gestion des désaccords, taux de fiabilité espéré.
5. **À ce stade seulement**, comparaison rationnelle à la saisie manuelle assistée et arbitrage final.

Cette session est probablement étalée sur 2-3 sessions Claude.ai consécutives (recherche, lecture de papiers, tests de libs sur fixtures), pas une session unique de 2h.

**Base de fixtures pour la session de recherche** :

- Plannings disponibles aujourd'hui : **3 fixtures** — (1) **Planning_Martin.JPG** : IUT Saint-Malo BUT 3 GEA, image JPG, 4 groupes (FA CG2P et autres), année 2026/2027, légende couleur seule (pas d'annotation textuelle dans les cellules). (2) **Planning_Mathis.pdf** : Hyperplanning R_CA_A3, PDF vectoriel confirmé, 1 groupe, légende textuelle explicite ("Formation au centre" / "En Entreprise" / "Jours fériés"). (3) **Plannig_Matthieu.pdf** *(typo "Plannig" volontairement préservée, c'est le nom réel du fichier)* : Master CCA (Comptabilité Contrôle Audit), école précise non indiquée dans le document, PDF probablement vectoriel (texte extractible), 2 groupes (Master 1 CCA + Master 2 CCA, un par page), année 2025/2026, structure **calendrier civil jour-par-jour** (colonnes = mois, lignes = jours 1-31) — différent de Martin et Mathis qui sont en grille semaine-par-semaine, donc ajoute une étape d'agrégation jour → semaine ISO au pipeline. **Légende à 3 statuts source** (plages de cours / plages d'examens / plages de révisions) à mapper sur 2 statuts cible (`school` / `company`). **Encodage hybride couleur + texte** : plusieurs cellules contiennent à la fois une couleur de fond ET un mot écrit (`Examens`, `Révisions`, `Soutenance`, `Rattrapages`) — cas particulièrement précieux pour tester un pipeline multi-signaux puisque la redondance permet de croiser deux sources d'information indépendantes par cellule.
- Révision par rapport au plan initial du 27 avril matin : la cible de 5 fixtures n'a pas été atteinte. Les screenshots reçus par Côme sont illisibles (qualité photo insuffisante) et ont été écartés. 3 fixtures restent une base utilisable mais minimale — la session de recherche doit en tenir compte dans son protocole de validation (un pipeline qui marche sur 3 fixtures n'est pas démontré sur 3, mais c'est mieux que sur 1).
- **Sourcing futur de fixtures** : la collecte continuera en parallèle de la recherche, en ciblant explicitement des PDF (Hyperplanning, exports Google Calendar, Word/Excel exportés en PDF) plutôt que des photos. Les screenshots et photos de mauvaise qualité ne sont pas exploitables pour mesurer un parser.

**Question produit ouverte à instruire pendant la session de recherche — quels formats accepter sur l'onboarding** :

Lien direct avec le sourcing de fixtures : si l'on conseille aux utilisateurs de fournir "un PDF ou doc de qualité", on simplifie le travail du parser mais on risque de **perdre des utilisateurs qui n'ont reçu leur planning qu'en photo via WhatsApp ou messagerie école** — cas réel chez des écoles qui ne distribuent pas de PDF. Cette tension entre exigence technique et inclusivité utilisateur est une **décision produit** à trancher avec les éléments techniques de la recherche en main. Hypothèses à explorer pendant la recherche :

- Faut-il accepter uniquement les formats où la fiabilité est démontrée (>95% au benchmark) et rediriger les autres vers la saisie manuelle assistée ?
- Faut-il accepter tous les formats avec une fiabilité variable et un message de transparence ("On a extrait 80% de ton planning, vérifie les semaines marquées en orange") ?
- Faut-il un onboarding différencié selon ce que l'utilisateur déclare avoir : "j'ai un PDF" → upload, "j'ai une photo" → saisie manuelle assistée directe, "j'ai rien" → saisie manuelle assistée ?

Pas de décision aujourd'hui — la question est notée pour traitement par la session de recherche, qui aura les éléments techniques pour l'éclairer.

**Aucun commit de code dans cette session** (cadrage pur).

---

## 0. Session du 28 avril — Recherche profonde Axe 1, Familles 1 et 2

**Contexte** : ouverture session Claude.ai avec les 5 docs de référence + suite directe du cadrage du 27 avril sur la DETTE #37 parser. Objectif : démarrer la recherche profonde Axe 1 (état de l'art académique et open source) avec méthodologie commit par famille validée.

**Méthodologie actée** : pour chaque famille technique, shortlist des candidates en 5-10 lignes → validation Côme → recherche détaillée des techniques retenues → commit d'ajout au doc (`docs(recherche): add family X to PARSER-AXE-1`). Doc vivant à `docs/recherche/PARSER-AXE-1-ETAT-DE-L-ART.md`.

**Livrables Git** :
- `f1de8fe` : squelette du doc + sous-dossier `docs/recherche/` créés en début de session.
- `21bc308` : Famille 1 cartographiée (extraction structurée PDF vectoriel) — 4 techniques + repoussoirs + transversal cloud. Candidate principale identifiée : pdf.js via `getOperatorList()` avec build `pdfjs-serverless` pour Edge Function. Spike technique recommandé sur Mathis et Matthieu avant toute décision d'architecture.
- `7af2979` : Famille 2 cartographiée (classification visuelle couleur de fond de cellule) — 6 techniques + verdict cloud approfondi. Candidate principale identifiée : `magick-wasm` (officiellement supporté par Supabase pour Edge Functions). Algo manuel ImageData identifié comme alternative légère pour premier spike. Vérification approfondie des 4 acteurs cloud : Google DocAI et AWS Textract pas de couleur de fond confirmé, **Azure DI expose `backgroundColor` via add-on STYLE_FONT** (utile pour Mathis/Matthieu mais pas Martin), Adobe Extract probable mais ambigu (à valider en spike).
- Famille 3 cartographiée (OCR couplé à analyse de mise en page) — 4 techniques + repoussoirs + transversal cloud. Candidate principale identifiée : **Google Vision OCR via `DOCUMENT_TEXT_DETECTION`** en `fetch()` direct depuis Deno (le SDK npm `@google-cloud/vision` est exclu, timeouts confirmés en Edge Function Supabase via discussion #36182). Tesseract.js documenté comme alternative locale mais pas viable comme candidate principale en l'état (compat Deno Edge Function non démontrée, bundle 15+ Mo en frottement avec la limite 20 Mo Supabase, qualité OCR français inférieure). Pattern spatial OCR identifié comme bloc d'orchestration applicatif indispensable (rattachement word → cellule, matching mots-clés métier, convergence multi-signaux). Cible primaire : Martin (raster) + tout cas futur fourni en image (photos WhatsApp). Cible secondaire : signal redondant pour Mathis et Matthieu si rastérisation pour cross-check. Distinction nette actée : Google Vision OCR ≠ Google Document AI Layout Parser (déjà disqualifié en Famille 2 sur la couleur de fond). Spikes recommandés : T1 sur Martin (~2-3h) puis T1 sur Mathis/Matthieu en mode redondance (~1h).

**Apprentissage méthodologique acté** : sur la Famille 2, la première version du livrable contenait 6 zones d'incertitude explicites dont 4 hypothèses non vérifiées. Côme a redirigé vers une vérification approfondie avant commit, ce qui a révélé 2 erreurs factuelles (Azure et Adobe disqualifiés à tort). **Règle pour la suite des sessions de recherche : aucune hypothèse non vérifiée ne doit être livrée comme conclusion provisoire — soit on vérifie, soit on dit explicitement "non vérifié, ne pas en tirer de conclusion".**

**Reste à faire dans l'Axe 1** : Famille 4 (ML appliqué aux documents type LayoutLMv3, Donut), Famille 5 (acteurs marché cloud transversal — partiellement déjà couvert via Familles 2 et 3, à compléter sur Adobe Extract OCR en spike groupé Famille 2 et sur Azure Read / AWS Textract DetectDocumentText en session suivante). Probablement 1 session Claude.ai supplémentaire pour Famille 4 puis une synthèse transversale Famille 5.

**Synchronisation project knowledge Claude.ai** : à effectuer après ce commit. Le project knowledge n'est pas synchronisé automatiquement avec le repo Git — il faut uploader manuellement les fichiers mis à jour via l'interface claude.ai. Fichiers à actualiser ou ajouter pour la suite : (1) `ETAT-COURANT.md` mis à jour par ce commit, (2) `docs/recherche/PARSER-AXE-1-ETAT-DE-L-ART.md` à ajouter (n'a jamais été uploadé dans le project knowledge).

**Aucun commit de code dans cette session** (pure recherche, doc uniquement). Modifs working tree historiques toujours préservées : `CreerAnnoncePage.jsx` (bypass DEV) + `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (audit Zone 1 en attente de relecture).

---

## 0. Session du 29 avril — Recherche profonde Axe 1, Famille 4

**Contexte** : ouverture session Claude.ai en suite directe de la session du 28 avril sur la recherche Famille 3. Objectif : démarrer la Famille 4 (ML appliqué aux documents) avec la même méthodologie shortlist → validation → recherche détaillée → commit.

**Livrables Git** :
- `d5c0e77` : Famille 4 cartographiée (ML appliqué aux documents) — 5 techniques principales + rappel TATR sous angle composant pipeline + 5 repoussoirs + section transversale "Modes de consommation" en 6 sous-sections (HF Inference Providers, HF Inference Endpoints, Replicate, Modal, RunPod, self-host) + recommandation Phase 1/2/3. Candidate principale identifiée : **Florence-2 (Microsoft, 2024)** en zero-shot via prompts (`<OCR>`, `<OCR_WITH_REGION>`, `<CAPTION_TO_PHRASE_GROUNDING>`), seule candidate F4 ne demandant pas de fine-tuning, à comparer en spike avec Vision OCR de F3 sur Martin et Matthieu côté qualité française. **Surya/Marker (datalab.to)** identifiée comme candidate sérieuse pour API hostée (apport double : structure de table de Martin + conversion Markdown de Mathis/Matthieu). **TATR** rouvert sous angle nouveau "composant ML d'extraction de grille pour Martin en fallback morphologique F2" — fallback en réserve, pas candidate primaire. **LayoutLMv3, Donut, Pix2Struct** disqualifiés en première intention (fine-tuning requis sur dataset Sterny inexistant) mais documentés pour traçabilité de l'état de l'art.

**Apprentissage méthodologique de la session** : la règle actée le 28 avril ("aucune hypothèse non vérifiée livrée comme conclusion provisoire — soit on vérifie, soit on dit explicitement non vérifié") s'est révélée particulièrement utile sur la Famille 4 où les modèles ML accumulent des chiffres difficiles à vérifier (latence exacte, pricing exact des providers, qualité française non documentée par benchmark public). Tous les éléments non vérifiables en session sont marqués ⚠️ explicitement dans le bloc Famille 4.

**Reste à faire dans l'Axe 1** : Famille 5 (acteurs marché cloud transversal — synthèse). Note : une partie de la Famille 5 a déjà été couverte transversalement dans les Familles 2 (Azure DI STYLE_FONT, Google DocAI sans backgroundColor confirmé, AWS Textract idem, Adobe Extract ambigu) et 3 (Google Vision OCR `DOCUMENT_TEXT_DETECTION`, mention de Adobe Extract OCR à compléter). Famille 5 sera donc plus une **synthèse cross-familles** qu'une exploration fraîche, à compléter sur Azure Read et AWS Textract `DetectDocumentText` côté OCR pur.

**Synchronisation project knowledge Claude.ai** : à effectuer après ce commit. Fichiers à actualiser dans le project knowledge claude.ai après cette session : (1) `ETAT-COURANT.md` mis à jour par ce commit, (2) `docs/recherche/PARSER-AXE-1-ETAT-DE-L-ART.md` à re-uploader (version commit `d5c0e77` avec Famille 4 incluse, remplace la version précédente).

**Aucun commit de code dans cette session** (pure recherche, doc uniquement). Modifs working tree historiques toujours préservées : `CreerAnnoncePage.jsx` (bypass DEV) + `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (audit Zone 1 en attente de relecture).

---

## 0. Session du 30 avril — Recherche profonde Axe 1, Famille 5 + clôture Axe 1

**Contexte** : ouverture session claude.ai en suite directe de la session du 29 avril sur la recherche Famille 4. Objectif : démarrer la Famille 5 (acteurs marché cloud transversal) avec la même méthodologie shortlist → validation → recherche détaillée → commit. Cadrage explicite en début de session : Famille 5 doit rester sobre, en synthèse cross-familles plutôt qu'en exploration fraîche, puisque F2 T5 et F3 T4 ont déjà couvert une partie significative du périmètre.

**Livrables Git** :
- `422a883` : Famille 5 cartographiée (acteurs marché cloud, synthèse transversale) — 4 acteurs détaillés (Google DocAI avec ses 3 processeurs distincts, Microsoft Azure DI Read + Layout rappel + Custom Neural traçabilité, AWS Textract DetectDocumentText vs AnalyzeDocument, Adobe Extract synthèse cross-F2/F3) + rappel Vision OCR + 3 acteurs volontairement écartés (Mistral OCR, Reducto/LlamaParse/Unstructured, Gemini File API) + tableau comparatif synthétique 4 axes (extraction structure / couleur de fond / OCR FR / pricing) sur 11 lignes (acteurs et sous-produits) + recommandation finale en 4 points avec hiérarchisation des 3 candidates retenues pour la phase spike technique.

**Découverte importante de la session — modification cartographie F2 T5** : Google DocAI **OCR Processor** (Enterprise Document OCR) avec premium feature `compute_style_info` expose `backgroundColor` au niveau token, exactement comme Azure DI STYLE_FONT mais via OCR Processor au lieu de Layout. F2 T5 avait correctement testé Layout Parser et conclu à l'absence de backgroundColor — cette conclusion reste vraie pour Layout Parser. Mais OCR Processor + premium feature n'avait jamais été investigué. Confirmé par doc officielle Google Cloud Document AI Enterprise OCR (2026-04-24 UTC) avec exemple JSON explicite. Limite identique à Azure DI : couleur du bounding box du token (mot), pas de la cellule entière. Pour Sterny : utile sur Mathis et Matthieu (texte intra-cellule), pas sur Martin (cellules colorées sans texte). Coût $7.50/1000 pages avec compute_style_info activé, soit **~2× moins cher qu'Azure DI Layout+STYLE_FONT à $16/1000**. À intégrer au spike F2 cloud déjà prévu en parallèle d'Azure DI.

**Apprentissage méthodologique de la session** : la règle actée le 28 avril ("aucune hypothèse non vérifiée livrée comme conclusion provisoire — soit on vérifie, soit on dit explicitement non vérifié") s'est révélée critique sur la Famille 5 où les pages produit cloud sont particulièrement remplies de marketing speak. Application stricte : tous les chiffres pricing avec date de page consultée, tous les `⚠️` explicites pour les capacités annoncées-non-vérifiées (notamment l'ambiguïté Adobe couleur de fond Technical Brief 2021 vs doc How-To 2026 — non tranchée par doc seule, à fermer en spike Free Tier). Le tableau comparatif final ne contient QUE des affirmations vérifiées par doc officielle ou des `⚠️` explicites.

**Reste à faire dans l'Axe 1** : **rien**. Axe 1 (état de l'art académique + open source + acteurs marché cloud transversal) **complet**. Bascule en phase spike technique actée, avec 3 candidates retenues hiérarchisées :
1. **Google Vision OCR** (F3 T1) — candidate primaire OCR, à tester sur Martin + Mathis + Matthieu
2. **Google DocAI OCR + `compute_style_info`** (F5) — candidate primaire couleur de fond, à tester sur Mathis et Matthieu, $7.50/1000
3. **Azure DI Layout + STYLE_FONT** (F2 T5) — candidate alternative couleur de fond, à comparer directement avec #2 sur les mêmes fixtures, $16/1000

Plus le spike Adobe Extract Free Tier en mode académique (fermeture zone grise) sans dépendance produit Sterny. Plus les recommandations Phase 1/2/3 de la Famille 4 (Florence-2 zero-shot sur Martin, Surya/Marker via API hostée datalab.to sur les 3 fixtures, TATR conditionnel).

**Synchronisation project knowledge claude.ai** : à effectuer après ce commit. Fichiers à actualiser dans le project knowledge claude.ai après cette session : (1) `ETAT-COURANT.md` mis à jour par ce commit, (2) `docs/recherche/PARSER-AXE-1-ETAT-DE-L-ART.md` à re-uploader (version commit `422a883` avec Famille 5 incluse, remplace la version précédente `d5c0e77`).

**Aucun commit de code dans cette session** (pure recherche, doc uniquement). Modifs working tree historiques toujours préservées : `CreerAnnoncePage.jsx` (bypass DEV) + `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` (audit Zone 1 en attente de relecture).

---

## 0. Session du 26 avril — Bloc B Étape 2 close fonctionnellement + découverte du problème parser

**Contexte** : ouverture d'une nouvelle conversation Claude.ai avec les 5 docs de référence chargés. Objectif initial : Bloc B Étape 2 (composant FileUpload standalone + invocation Edge Function parse-school-calendar). Reco Claude.ai en début de session = Option B (Étape 2 upload) plutôt qu'Option A (redesign visuel RhythmCalendar) pour boucler la chaîne UX bout-en-bout en priorité.

**Ce qui a été fait** :

- ✅ **Composant `RhythmFileUpload` créé** dans `sterny-react/src/components/rhythm/` (commit `7b33fa8`). 317 lignes. 6 états visuels (idle / dragging / uploading / parsing / success / error), validation client MIME (PDF/JPG/PNG/WebP) et taille (20 Mo max), invocation `parse-school-calendar` en `multipart/form-data` (contrat réel de l'Edge Function, l'EF gère elle-même l'upload bucket avec service_role), vérification post-invoke du statut `rhythm_imports.status` (cf. DETTE #19), gestion anti-race via `isMountedRef` + `dragCounterRef` + cleanup timer au démontage, transition `uploading` → `parsing` à 3 secondes, callbacks `onParsed` et `onError` typés sur 6 codes (`INVALID_MIME`, `FILE_TOO_LARGE`, `UPLOAD_FAILED`, `PARSE_FAILED`, `NETWORK_ERROR`, `UNAUTHORIZED`).
- ✅ **CSS dédié** `RhythmFileUpload.css` (196 lignes), composant nu, préfixe `rfu-`, CSS variables locales alignées tokens INVENTAIRE §9.1, hover Orange systématique, mobile <= 768px.
- ✅ **Page de preview** `RhythmFileUploadPreview.jsx` créée dans `sterny-react/src/dev/`, route `/dev/rhythm-file-upload-preview` ajoutée hors `<DashboardLayout/>`. 3 sections : composant nu + zone de log live des callbacks, composant dans `.dp-card`, RhythmCalendar conditionnel après upload réussi avec fetch `parsed_groups` depuis `rhythm_imports`.
- ✅ **Dépendance `lucide-react` ajoutée** au `package.json` (icônes UploadCloud, Loader2, CheckCircle2, AlertCircle). Validée comme dépendance standard du projet (cf. INVENTAIRE §9.6).
- ✅ **Sélecteur de groupe ajouté à la preview** (commit `6240162`) après découverte que le composant rendait par défaut le premier groupe sans laisser le choix sur un planning multi-groupes (cas Martin = 4 groupes). CSS dédié `RhythmFileUploadPreview.css`, préfixe `rfup-` (différent du composant lui-même), tabs horizontaux Orange actif / blanc inactif + hover Orange. Init auto sur premier groupe après parsing, reset propre. Cas 1 groupe (Mathis) → mention "Planning unique" sans tabs.

**Tests utilisateur** :

Tests fonctionnels validés ✅ :
- Test 2.1 (format non supporté) : `INVALID_MIME` levé, message clair, bouton Réessayer fonctionnel.
- Test 2.2 (fichier > 20 Mo) : `FILE_TOO_LARGE` levé.
- Chaîne UX bout-en-bout : upload Martin → parsing 40s → success → fetch BDD → rendu RhythmCalendar dans section 3.

Tests de fiabilité du parser ❌ — DÉCOUVERTE MAJEURE :
- **Planning_Martin.JPG** (4 groupes) : ~50% des cellules incorrectes sur les 4 groupes. Erreurs aléatoires, pas de pattern systémique. Le LLM vision semble faire du remplissage statistique quand il ne lit pas la couleur correctement.
- **Planning_Mathis.pdf** (1 groupe, format Hyperplanning trivial avec légende explicite) : également échec — blocs entiers de mois en école qui devraient être mélangés école/entreprise.

**Diagnostic stratégique** :

Le parser actuel (Claude Sonnet 4.6 via Edge Function `parse-school-calendar` v5) repose sur du **parsing par vision LLM pure**. Les calendriers d'alternance encodent l'information dans la **couleur de fond des cellules**, pas dans le texte. Les LLM vision actuels ne sont pas fiables sur de la classification couleur cellule par cellule à grande échelle (180-250 cellules). Limite **structurelle**, pas réparable par prompt engineering.

**Conséquence** : le principe fondateur de Sterny (VISION-ARCHITECTURE §1 — "le rythme réel extrait du planning scolaire est la seule source de vérité du matching") est en danger. Le risque #4 de VISION §5 (fiabilité perçue) s'est matérialisé bien au-delà du seuil acceptable.

**Décisions actées** :

1. **Le composant RhythmFileUpload reste en place sans modification** — la chaîne UX est techniquement bouclée, c'est uniquement le parser sous-jacent qui pose problème.
2. **3 leviers possibles** documentés dans DETTE #37 : (1) tester un autre LLM vision via providers/, (2) pipeline hybride extraction structurée + LLM pour mapping métier, (3) pivoter vers saisie manuelle assistée avec IA en pré-remplissage optionnel. **Reco actée** : combiner Levier 2 + Levier 3 sur le moyen terme.
3. **Une session dédiée à l'arbitrage stratégique du parser** est nécessaire avant toute autre avancée sur le chantier rhythm_calendar. Question préalable à se poser : "Si le parser ne peut être fiable qu'à 70-80%, suis-je prêt à pivoter vers une saisie manuelle assistée comme étape principale ?" Cette question touche au positionnement même de Sterny et à son argument de vente.

**3 dettes loguées en clôture** : DETTE #37 (parser non fiable — critique stratégique), DETTE #38 (info périmée signature RhythmCalendar dans ETAT-COURANT), DETTE #39 (UI RhythmFileUpload à reprendre lors du redesign Bloc B avec DETTE #36).

**Modifs non-commitées volontairement conservées locales** (inchangé depuis sessions précédentes) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans DETTE-TECHNIQUE
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A en attente de relecture

**Plan de la prochaine session — session dédiée arbitrage parser** :

1. Ouverture d'une nouvelle conversation Claude.ai avec les 5 docs chargés.
2. Cadrage produit en amont (avant code) : décision stratégique sur saisie manuelle assistée vs parser fiabilisé. Réflexion sur le positionnement Sterny si le parser n'est pas l'argument de vente principal.
3. Selon la décision : soit benchmark des 3 leviers sur les 2 plannings (Martin + Mathis), soit cadrage de l'UI saisie manuelle, soit les deux en parallèle.
4. Pas de code dans la première session — uniquement du cadrage et de la décision.

**Commits de la session du 26 avril (tous poussés sur `origin/main`)** :

- `7b33fa8` feat(rhythm): add RhythmFileUpload component + dev preview
- `6240162` fix(rhythm): add group selector to file upload preview

(+ ce 3e commit qui clôt la session sur la mise à jour des 3 docs de référence.)

---

## 0. Session du 25 avril fin de soirée bis — Bloc B Étape 1 close (v1 technique) + fix GoogleAuthHandler

**Contexte** : reprise du Bloc B Étape 1 après création de `INVENTAIRE-PLATEFORME.md`. Validation visuelle effectuée sur les 2 fixtures réelles (Martin IUT Saint-Malo BUT 3 GEA + Mathis Hyperplanning PDF R_CA_A3) dans la preview `/dev/rhythm-calendar-preview`.

**Ce qui a été fait** :

- ✅ **Bug latent corrigé** : `GoogleAuthHandler` (commit `9ea6e4d`) provoquait un redirect forcé vers `/dashboard` pour tout utilisateur logué sur toute route métier, pas seulement les callbacks OAuth. Ajout d'une garde de route au début du useEffect : `AUTH_CALLBACK_ROUTES = ['/', '/connexion', '/completer-profil']` + routes `/inscription/*`. Sur toute autre route, early return immédiat. Fix chirurgical, la cause racine (handler monté à la racine d'App.jsx avec mélange responsabilité auth callback + routing) reste à traiter en Phase 0bis (DETTE #34).
- ✅ **`RhythmCalendar.css` patché** selon décision INVENTAIRE-PLATEFORME §9.4 : retrait `background`, `border-radius`, `box-shadow`, `padding` sur `.rc-card` (en règle de base ET dans `@media (max-width: 480px)`), suppression complète du sélecteur `.rc-header`. Variables CSS, font-family et color conservés.
- ✅ **`RhythmCalendar.jsx` patché** : retrait des 2 occurrences de `<div className="rc-header">{groupLabel}</div>` (cas vide + cas normal). Le titre vient désormais du `.dp-card-title` parent.
- ✅ **`RhythmCalendarPreview.jsx` refondue** : 2 sections finales par fixture (Contexte dashboard cible avec wrap `.dp-card` + Contexte onboarding nu sans contenant). Wrappée dans `.dashboard-proprio-container` (signature container dashboard standard). Route déplacée hors `<DashboardLayout/>` pour éviter la redirection automatique.
- ✅ **Fixtures `martin.json` et `mathis.json` remplies** avec les données réelles parsées le 25 avril matin (Action A2). Martin : 4 groupes × 45 semaines, document_meta complet (IUT Saint-Malo, BUT 3 GEA, 2026/2027). Mathis : 1 groupe × 53 semaines, document_meta dégradé (school_name null, program_name "R_CA_A3" code technique).

**Décision design importante actée** :

**Le `RhythmCalendar` v1 visuel (calendrier vertical mois/semaines en cases) N'EST PAS la version cible.** La validation visuelle a confirmé que le rendu actuel est en dessous de la finesse Sterny appliquée sur le reste de la plateforme :

1. La représentation verticale par mois/cases ne raconte pas naturellement la temporalité de l'alternance.
2. Les chiffres isolés dans les cases sont sémantiquement vides (l'utilisateur doit décoder qu'il s'agit d'une semaine commençant ce lundi).
3. Le composant n'a pas la qualité visuelle attendue d'un élément central du dashboard alternant.

**Cible v2 envisagée** : calendrier horizontal type frise temporelle (passé → présent → futur de gauche à droite), passé compressé/atténué, futur mis en avant, blocs continus école/entreprise plutôt que cases isolées, curseur "Aujourd'hui" pour ancrer l'utilisateur dans le temps.

**La v1 actuelle reste posée** comme groundwork technique (plomberie composant + plomberie fixtures + pattern de wrap dans `.dp-card` + gestion des cas dégradés). Elle ne sera pas supprimée mais réécrite visuellement dans une session dédiée.

**Décisions méta actées** :

1. **Le redesign visuel mérite sa propre session** avec cadrage en amont : références visuelles, maquettes/croquis sur papier, validation des 2-3 directions possibles avant écriture de code. Pas de bricolage CSS en fin de soirée sur une feature aussi centrale.
2. **L'Étape 2 du Bloc B (importation drag-and-drop)** est indépendante du design visuel du composant d'affichage. Elle peut être attaquée en parallèle ou avant le redesign sans bloquer la chaîne.
3. **L'icône emoji 📅 dans la preview** est un raccourci de la preview, pas le rendu cible. La version finale dans `/dashboard` utilisera une vraie icône SVG (lucide-react ou équivalent) dans la pill `.dp-card-icon` au fond Orange pâle `#FFF1E8`, conforme à la grammaire dashboard documentée en INVENTAIRE-PLATEFORME §9.2.

**Modifs non-commitées volontairement conservées locales** (inchangé) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 en attente

**Plan de la prochaine session — 2 chantiers possibles au choix** :

1. **Bloc B Étape 2 — Importation drag-and-drop** (`FileUpload` standalone + invocation Edge Function `parse-school-calendar`). Indépendante du design visuel du composant d'affichage.
2. **Bloc B redesign visuel** — refonte du `RhythmCalendar` en frise horizontale, à attaquer après cadrage design en amont (références, maquettes, croquis).

**Commits de la session du 25 avril fin de soirée bis (poussés sur `origin/main`)** :

- `9ea6e4d` fix(auth): scope GoogleAuthHandler to auth callback routes only
- `599e045` feat(rhythm): close Bloc B Étape 1 (RhythmCalendar v1 technique)

(+ ce 3e commit qui clôt la session sur la mise à jour des docs de référence.)

---

## 0. Session du 25 avril fin de soirée — INVENTAIRE-PLATEFORME.md créé + dettes #21-#33 loguées

**Contexte** : session dédiée à l'exécution de la décision actée en session du 25 avril fin d'après-midi (création d'un 5e document de référence stable inventoriant l'état de la plateforme). Les deux audits prévus ont été exécutés en pure lecture, condensés en un seul document propre, puis poussés.

**Ce qui a été fait** :

- ✅ **Audit plateforme** : prompt Claude Code de pure lecture exécuté (`docs/_audit/AUDIT-PLATEFORME-2026-04-25.md`, 559 lignes, jetable, gitignoré). Couvre 8 sections : routes actives, pages principales, composants partagés, edge functions, tables BDD, buckets Storage, skills `.claude/`, conventions de structure. 51 routes inventoriées, 41 pages, 15 composants partagés, 18 edge functions, 17 tables.
- ✅ **Audit design** : second prompt Claude Code de pure lecture exécuté (`docs/_audit/AUDIT-DESIGN-2026-04-25.md`, 443 lignes, jetable, gitignoré). Couvre 8 sections : doctrine de la skill design, tokens couleur, typographie, espacements/layout, radius/shadows/transitions, patterns d'organisation des pages dashboard, écarts de RhythmCalendar, synthèse pour le doc cible. 20 tokens couleur identifiés, 18 tokens typo, 8 divergences skill/appliqué, 5 écarts RhythmCalendar.
- ✅ **`docs/INVENTAIRE-PLATEFORME.md` créé** (commit `e1249ef`, 474 lignes) : 11 sections couvrant arborescence, routes, pages, composants, edge functions, tables, buckets, skills, design system appliqué (section 9, la plus dense), conventions de code, anomalies pointant vers DETTE. Document conçu pour être stable — mis à jour uniquement sur changement structurel, pas à chaque session.
- ✅ **Décision design actée pour le Bloc B Étape 1** : `RhythmCalendar` doit être traité comme une **section complète**, pas un widget compact. À l'intégration dans `/dashboard`, `RhythmCalendar.css` doit perdre `background`, `border-radius`, `box-shadow`, `padding` sur `.rc-card` et le `.rc-header` doit être retiré. Le contenant et le titre viennent du parent `.dp-card` + `.dp-card-title`. Pour la page de preview standalone `/dev/rhythm-calendar-preview`, on wrap le composant dans une `.dp-card` factice côté preview, pas de prop `autonomous`. Documenté en section 9.4 de `INVENTAIRE-PLATEFORME.md`.
- ✅ **Convention `_audit/` formalisée** : ajout du pattern `_audit/` dans `.gitignore` racine (sous `_rollback/`), commité dans un commit atomique séparé (`3b14ad8`). Cohérent avec la convention `_rollback/` existante pour les snapshots locaux pré-DROP. Permet aux deux machines (Mac et tour Windows) de partager la même règle sans friction.
- ✅ **`CLAUDE.md` racine mis à jour** (commit `f6cd61f`) : ajout de `docs/INVENTAIRE-PLATEFORME.md` dans la liste des docs de référence à lire en début de session par Claude Code. 2 mentions "4 docs / 4 documents" passées à "5".
- ✅ **`CONTEXTE-PROJET.md` mis à jour** (commit `4b399c9`) : ajout du 5e doc dans l'arborescence section 5, harmonisation des mentions "4 docs" → "5 docs" (lignes 175 et 277).
- ✅ **13 dettes loguées dans `DETTE-TECHNIQUE.md`** (commit `29ae8fe`, 35 insertions, 1 deletion ciblée — phrase Planification réécrite, dettes #1-#20 préservées intégralement avec vérification MD5 du fichier en local) : composants morts (#21), doublon de route `/annonce/creer` (#22), placeholders (#23, #25), faux positifs de l'audit Zone 1 (#27, #28), constantes dupliquées (#30), variantes de couleurs Orange (#31, #32) et de fallbacks DM Sans (#33) à harmoniser. Toutes en Phase 0bis (catégorie C ménage).
- ✅ **Section 11 de `INVENTAIRE-PLATEFORME.md`** : pointe directement vers les numéros DETTE #21 à #33 plutôt que de répéter le contenu, traçabilité bidirectionnelle assurée.

**Décisions méta actées** :

1. **L'inventaire factuel devient un document de référence stable** au même titre que les 4 autres. Sa logique de mise à jour est différente : pas à chaque session mais uniquement sur changement structurel (création/suppression/fusion de page, composant majeur, edge function, table, bucket, ou pattern visuel structurant).
2. **Les rapports d'audit jetables atterrissent dans `docs/_audit/`** (gitignoré), pas committés. Servent d'étape intermédiaire entre exécution Claude Code et condensation en doc cible. Convention cohérente avec `supabase/_rollback/`.
3. **La grammaire effective des CSS prévaut sur la doctrine de la skill design ou du slash-command** en cas de divergence. La skill et le slash-command restent inspirants mais la référence opérationnelle est `INVENTAIRE-PLATEFORME.md` section 9.

**Modifs non-commitées volontairement conservées locales** (inchangé depuis sessions précédentes) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans `DETTE-TECHNIQUE.md`
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A en attente de relecture à tête reposée

**Étape utilisateur restante (à faire manuellement, hors Claude Code)** :

- Ajouter `docs/INVENTAIRE-PLATEFORME.md` au project knowledge Claude.ai pour que toute nouvelle conversation Claude.ai démarre avec les **5 docs** chargés.

**Plan de la prochaine session (reprise du Bloc B Étape 1 sur bases saines)** :

1. Ouverture d'une nouvelle conversation Claude.ai avec les **5 docs** chargés cette fois.
2. Patch sur `RhythmCalendar.css` selon la décision 9.4 de l'inventaire (composant nu, retrait `background`/`border-radius`/`box-shadow`/`padding` sur `.rc-card`, retrait `.rc-header`).
3. Patch sur la page de preview `RhythmCalendarPreview.jsx` : wrap dans une `.dp-card` factice + déplacement de la route preview sous `<DashboardLayout/>` pour validation en contexte réel.
4. Validation visuelle des 2 plannings (Martin JPG + Mathis PDF) dans la preview.
5. Décision sur le placement de `RhythmCalendar` dans `/dashboard` (probablement section dédiée "MON RYTHME" en haut, juste sous `.page-header`).
6. Commit de clôture Étape 1 + documentation des décisions actées (contrat unifié `weeks` à logger dans VISION §3, séparation `RhythmCalendar` / `RhythmGroupSelector` à logger dans ETAT-COURANT, convention couleurs à documenter dans `.claude/skills/design/` une fois validée).

**Commits de la session du 25 avril fin de soirée (tous poussés sur `origin/main`)** :

- `3b14ad8` chore(gitignore): ignore _audit/ folder for transient audit reports
- `e1249ef` docs: create INVENTAIRE-PLATEFORME.md
- `f6cd61f` docs(claude): reference INVENTAIRE-PLATEFORME.md in CLAUDE.md root
- `4b399c9` docs(contexte): list 5 reference docs in CONTEXTE-PROJET.md
- `29ae8fe` docs(dette): log 13 anomalies surfaced by 25 avril audits

(+ ce 6e commit qui clôt la session sur la mise à jour d'`ETAT-COURANT.md`.)

---

## 0. Session du 25 avril fin d'après-midi — Bloc B Étape 1 WIP + décision d'inventaire de plateforme

**Contexte** : démarrage du Bloc B Étape 1 (composant `RhythmCalendar` dumb readonly + page de preview dev). Le code a été écrit, le build passe, le commit WIP est poussé. **Mais la validation visuelle a été suspendue volontairement** suite à la mise au jour d'une faille structurelle dans notre infrastructure documentaire.

**Ce qui a été fait** :

- ✅ **Composant `RhythmCalendar` créé** dans `sterny-react/src/components/rhythm/` (JSX + CSS avec CSS variables + commentaire DESIGN DECISION). Dumb readonly, props uniquement, contrat d'entrée unifié `weeks: [{week_start, status}]` (format de `users.rhythm_calendar` matérialisé ET de `parsed_groups.groups[i].weeks` brut). Cas dégradés gérés (weeks vide/null, document_meta avec champs null ou codes techniques type `R_CA_A3` détectés via regex `pas d'espace + ≤ 12 chars`, status invalide, week_start mal formée).
- ✅ **Page de preview dev** créée dans `sterny-react/src/dev/RhythmCalendarPreview.jsx`, route `/dev/rhythm-calendar-preview` (placée hors `<Layout/>` dans cette première version), 2 fixtures JSON sur disque (`martin.json`, `mathis.json`) extraites des 2 lignes `rhythm_imports` existantes. Fixtures versionnées (pas de données personnelles).
- ✅ **Build clean** (npm run build → 918ms, 1450 modules, 0 erreur).
- ✅ **Commit WIP `8554879`** poussé sur `origin/main` : `feat(rhythm): WIP RhythmCalendar component + dev preview (validation pending)`. 8 fichiers, 544 insertions. Modifs volontairement non-commitées préservées (CreerAnnoncePage.jsx bypass DEV + docs/AUDIT-...md).

**Ce qui n'a PAS été fait dans cette session (et ne le sera pas avant l'inventaire)** :

- ❌ **Validation visuelle de la preview** sur les 2 plannings réels.
- ❌ **Décision finale sur le contenant du composant** (card autoportée vs nu, à trancher selon le contexte d'usage).
- ❌ **Décision finale sur le placement de la route preview** (sous Layout vs hors Layout).
- ❌ **Patch des 3 décisions actées en conv** (signature unifiée `weeks` à logger dans VISION §3, séparation `RhythmCalendar` / `RhythmGroupSelector` à logger ici, convention couleurs à documenter dans `.claude/skills/design/` une fois validée).

**Pourquoi cette suspension** :

Au cours de la session, Côme a relevé que Claude.ai mélangeait des noms de pages obsolètes dans son raisonnement (`DashboardLocatairePage`, `DashboardHotePage`, `DashboardLesDeuxPage`) alors que ces pages ont été **fusionnées en une seule `/dashboard`** depuis plusieurs sessions. Diagnostic : les 4 docs de référence couvrent la **vision** (où on va, principes), l'**historique** (ce qu'on vient de faire), les **conventions** (qui je suis, stack), et les **dettes** (bugs connus) — mais **pas l'inventaire stable de l'existant**. Conséquence : à chaque nouvelle session, Claude.ai comble les trous par des memories obsolètes ou des suppositions, ce qui crée des dérives silencieuses et fait travailler les deux Claudes "à l'aveugle".

**Décision actée** :

**Création d'un 5e document de référence stable : `docs/INVENTAIRE-PLATEFORME.md`**. Document factuel, statique, mis à jour uniquement quand une page/composant majeur est créé/supprimé/fusionné — pas à chaque session. Rejoint les 4 autres dans le brief automatique de chaque nouvelle conversation Claude.ai (project knowledge) et est pointé depuis `CLAUDE.md` racine pour Claude Code.

**Contenu prévu pour `INVENTAIRE-PLATEFORME.md`** :

1. Routes actives (path, page associée, sous quel layout, types d'utilisateurs concernés)
2. Pages principales (par dossier `pages/`, 2-3 lignes par page sur leur fonction et leur état stable)
3. Composants partagés (par dossier `components/`, 1 ligne par composant)
4. Edge Functions (état déployé/non-déployé/cassé, en lien avec DETTE #17)
5. Tables BDD critiques (liste de noms, le détail vit dans `supabase/remote_schema.sql`)
6. Buckets Supabase Storage
7. Skills `.claude/` (notamment `sterny-react/.claude/skills/design/`)
8. Conventions de structure (où vivent pages, composants, hooks, utils)

**Plan de la prochaine session (dédiée à l'inventaire)** :

1. Ouverture d'une nouvelle conversation Claude.ai avec les 4 docs de référence chargés.
2. Préparation par Claude.ai d'un prompt Claude Code de **pure lecture** (zéro modification) qui produit un rapport markdown structuré et exhaustif sur l'état actuel de la plateforme.
3. Travail à 2 sur le rapport pour le condenser en `INVENTAIRE-PLATEFORME.md` propre et stable.
4. Commit du fichier dans `docs/`.
5. Ajout de ce 5e doc au project knowledge Claude.ai.
6. Mise à jour de `CLAUDE.md` racine pour mentionner ce 5e doc dans la liste des docs à lire en début de session.
7. Mention dans `CONTEXTE-PROJET.md` (section à déterminer — probablement une nouvelle sous-section dans la section 1 ou une section 12 dédiée à la liste des docs de référence).

**Plan de la session SUIVANTE (reprise du Bloc B Étape 1 sur bases saines)** :

1. Ouverture d'une nouvelle conversation Claude.ai avec les **5 docs** chargés cette fois.
2. Décision finale sur le placement de `RhythmCalendar` dans le dashboard fusionné (probablement section dédiée "MON RYTHME" en haut, juste sous "Bonjour [Prénom]" + toggle ville).
3. Patch ciblé sur le composant : retrait du fond/radius/shadow/padding (Option B = composant nu, contenant fourni par le parent).
4. Patch sur la route preview : déplacement dans `<Layout/>` pour validation en contexte réel.
5. Enrichissement de la page preview avec 2 sections (contexte dashboard simulé + contexte onboarding nu).
6. Validation visuelle des 2 plannings.
7. Commit de clôture Étape 1 + commit séparé "docs: log Bloc B Étape 1 close" qui inclut les 3 décisions à logger (contrat unifié dans VISION §3, séparation RhythmCalendar/RhythmGroupSelector dans ETAT-COURANT, convention couleurs dans `.claude/skills/design/`).

**Modifs non-commitées volontairement conservées locales** (inchangé) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans DETTE-TECHNIQUE
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A en attente de relecture

---

## 0. Session du 25 avril après-midi — Bloc B Étape 0 close (fondation RPC atomique)

**Objectif tenu** : poser la fondation BDD du Bloc B (UI de validation visuelle obligatoire, VISION §4) avant d'attaquer les composants React. La transition `status='parsed' → 'confirmed'` d'une ligne `rhythm_imports` ne peut pas se faire en deux UPDATE séparés côté frontend (risque de désynchro entre `rhythm_imports.status` et `users.rhythm_calendar` si le 2e échoue) : il faut une transaction Postgres atomique.

**Cadrage stratégique du Bloc B (4 étapes séquentielles)** :

- **Étape 0** (cette session) : fonction RPC atomique `confirm_rhythm_calendar`.
- **Étape 1** : `RhythmCalendar` dumb readonly, testé sur les 2 lignes BDD existantes (Martin `id=69a564e5-1444-4a6b-940c-0d9222fcee7d` et Mathis `id=0ff13d90-c148-492c-a718-c4e57505c258`).
- **Étape 2** : `FileUpload` standalone (drag-and-drop, validation MIME côté client, upload bucket `rhythm-documents` + invoke Edge Function `parse-school-calendar`).
- **Étape 3** : `RhythmOnboarding` parent qui orchestre upload + sélecteur de groupe + appel RPC + navigation.
- **Étape 4** : intégration dans page onboarding nouvelle + 3 dashboards (locataire, hote, les_deux) en mode readonly.

**3 décisions d'architecture validées** :

1. **Atomicité par RPC Postgres**, pas par 2 UPDATE séparés via SDK (le réseau peut couper entre les 2 = état incohérent).
2. **Matérialisation de `users.rhythm_calendar`** dans la fonction RPC, pas de dérivation par JOIN. Raison : unifier le cas `document_import` et le cas futur `manual` (fallback prévu en VISION §5 risque 1) sous le même chemin de lecture côté matching, et éviter au code de matching de naviguer dans `parsed_groups[selected].weeks` (cohérent avec DETTE #19).
3. **`RhythmCalendar` purement dumb**, props uniquement (pas de fetch interne). Le parent (orchestrateur en onboarding, hook custom `useRhythmCalendar()` en dashboard) gère le fetch.

**Ce qui a été fait** :

- ✅ **Migration `20260425121949_confirm_rhythm_calendar_atomic_function.sql`** créée et appliquée en prod via `supabase db push`. Définit `public.confirm_rhythm_calendar(p_import_id uuid, p_group_id text) RETURNS jsonb`.
- ✅ **`SECURITY INVOKER`** : la RLS s'applique, l'utilisateur ne peut confirmer que ses propres imports. Pas d'escalade de privilèges.
- ✅ **Effets atomiques en transaction** :
  1. UPDATE `rhythm_imports` SET `selected_group_id`, `status='confirmed'`
  2. UPDATE `users` SET `rhythm_calendar` (matérialisation des semaines du groupe choisi), `rhythm_start_date` (MIN), `rhythm_end_date` (MAX), `rhythm_source='document_import'`, `rhythm_import_id`
- ✅ **Validation côté serveur** : auth check (`auth.uid()`), ligne existe, statut ≠ 'failed', parsed_groups non NULL, group_id présent dans `parsed_groups.groups[]`, weeks non vide. `RAISE EXCEPTION` typés (28000, P0002, 22023) consommables côté frontend pour messages d'erreur clairs.
- ✅ **Retour jsonb structuré** : `{ import_id, selected_group_id, weeks_count, rhythm_start_date, rhythm_end_date, status }` — le frontend récupère immédiatement de quoi mettre à jour l'UI sans nouvelle requête.
- ✅ **`GRANT EXECUTE TO authenticated`** + `COMMENT ON FUNCTION` pour le dashboard.
- ✅ **Vérification SQL passée** dans le dashboard Supabase : fonction présente, signature `(p_import_id uuid, p_group_id text)`, retour `jsonb`, sécurité `INVOKER`.
- ✅ **Commit `65d81ca`** poussé sur origin/main : `feat(rhythm): add confirm_rhythm_calendar atomic RPC function`.

**Décision technique actée** :

- **Le pattern "RPC atomique" devient la convention pour toute transition multi-table** sur le chantier rhythm_calendar. Raison : éviter par construction les états BDD désynchronisés. À reproduire pour les futures transitions (ex. lors d'un re-parsing avec écrasement de l'ancien import, ou de la migration de profil descendante `les_deux` → `locataire`/`hote` qui touche plusieurs tables).

**Vigilance signalée** :

- La policy RLS UPDATE sur `users` n'a pas de `WITH CHECK` (visible dans `supabase/remote_schema.sql` lignes 1381, 1397, 1746). Pour `confirm_rhythm_calendar` en `SECURITY INVOKER` ce n'est pas bloquant aujourd'hui (l'UPDATE passe). Mais quand on durcira cette policy en Catégorie B de l'audit Zone 1, il faudra valider end-to-end que la fonction continue de passer après ajout du `WITH CHECK`. À intégrer au plan de validation Catégorie B le moment venu.

**Modifs non-commitées volontairement conservées locales** (inchangé depuis sessions précédentes) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans `DETTE-TECHNIQUE.md`
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A en attente de relecture à tête reposée

**Plan de démarrage du Bloc B Étape 1** :

Création de `RhythmCalendar` dumb readonly, testé sur les 2 lignes BDD existantes ci-dessus. API minimale envisagée : `<RhythmCalendar parsedGroups={...} mode="readonly" selectedGroupId={...} onSelectGroup={...} />`. Charte design Sterny via `sterny-react/.claude/skills/design/`. Gestion explicite des `null` dans `document_meta` (DETTE #20). Pas de fetch interne, pas de side effect.

---

## 0. Session du 25 avril matin — Action A2 phase test close

**Objectif tenu** : valider le parser rhythm_calendar v5 sur 2 plannings réels avant d'enchaîner sur le Bloc B (composants UI). Tests menés via curl direct sur l'Edge Function `parse-school-calendar`, analyse des résultats côté terminal et côté BDD via SQL Editor.

**Ce qui a été fait** :

- ✅ **Test 1 — Planning_Martin.JPG (régression v4→v5)** : 222 Ko, IUT Saint-Malo BUT 3 GEA 2026/2027. HTTP 200, 42 s. Résultat persisté en BDD `id=69a564e5-1444-4a6b-940c-0d9222fcee7d`. 4 groupes détectés (FA CG2P, FA GC2F, FA GEMA LOG, FA GEMA MD), 45 semaines chacun, statuts strictement {school, company}, dates ISO du lundi confirmées (2026-08-31 = lundi). Document_meta complet (école, programme, année, locale fr). Aucune régression vs ligne v4 du 24 avril (`id=771afa43...`).

- ✅ **Test 2 — Planning_Mathis.pdf (validation branche PDF)** : 176 Ko, format Hyperplanning annuel dense. HTTP 200, 41 s. Résultat persisté en BDD `id=0ff13d90-c148-492c-a718-c4e57505c258`. `source_file_type='application/pdf'` confirmé, preuve que la branche PDF de la v5 fonctionne. 1 groupe (planning individuel), 53 semaines (année d'alternance complète), répartition 21 school / 32 company, statuts strictement {school, company}, aucun "vacation"/"holiday"/"break" (règle A2 respectée même sur format PDF dense).

- ✅ **Confirmations structurelles** : structure `parsed_groups` = `{ groups: [{group_id, group_label, weeks: [{week_start, status}]}], document_meta: {...} }` validée sur les 2 formats. Cohérent avec VISION-ARCHITECTURE section 3.

**Découvertes du test** :

1. **Asymétrie réponse client vs BDD** : la réponse JSON renvoyée par le curl contient `groups[].weeks = null` et `weeks_count: 0`, alors que les données en BDD contiennent les semaines complètes. Le client reçoit un `rhythm_import_id` qui lui permettra de lire la BDD via Supabase. Comportement intentionnel ou bug de sérialisation à investiguer hors phase test. Logué DETTE-TECHNIQUE.

2. **Fragilité du document_meta sur PDF Hyperplanning** : pour Planning_Mathis.pdf, `school_name: null`, `program_name: "R_CA_A3"` (code technique au lieu d'un libellé humain). C'est une limite du document source, pas un bug du parser. Le LLM extrait ce qui est disponible. Implication produit ajoutée à VISION-ARCHITECTURE section 5 et à VISION section 3.

3. **`parser_version` reste à 'v1'** sur les 3 lignes de test : v1 désigne la version sémantique de la sortie (structure JSON), pas la version de déploiement Supabase. Cohérent — la v5 a ajouté du support PDF et des règles, mais n'a pas changé le format de sortie.

**Décisions produit actées** :

1. Le parser v5 est validé pour les démos. Tests sur 2 formats réels OK, plus de doute sur le support PDF.
2. La phase de test d'Action A2 est officiellement close. Le commit de clôture est `test(parser): validated v5 on real plannings Martin JPG + Mathis PDF`.
3. Prochaine étape : ouverture d'une nouvelle conversation Claude.ai pour le Bloc B (composants UI `FileUpload` + `RhythmCalendar` visuel), en partant fraîche.

**Tâches de ménage à faire en fin de chantier rhythm_calendar** (logué pour ne pas oublier) :
- Nettoyer les fichiers de test du bucket `rhythm-documents` (Planning_Martin.JPG + Planning_Mathis.pdf uploadés par l'Edge Function lors des tests). Pas urgent (bucket privé, RLS, ~400 Ko cumulés).
- Investiguer l'asymétrie réponse client/BDD (DETTE #19).

**Plan de démarrage de la prochaine session** :

1. Ouvrir une nouvelle conversation Claude.ai avec les 4 docs de référence chargés.
2. Démarrer le Bloc B : composants UI `FileUpload` (drag-and-drop, validation MIME côté client, upload + appel Edge Function) + `RhythmCalendar` visuel (carrés fins par semaine, code couleur école/entreprise, interactions hôte pour ajustement manuel des disponibilités d'annonce).
3. Référence design : `sterny-react/.claude/skills/design/` (charte Sterny déjà documentée).

---

## 0. Session du 24 avril soir — Action A2 code (parser rhythm_calendar) + incident Resend n°2

**Contexte** : session dédiée au chantier central rhythm_calendar, ouverte avec les 4 docs de référence chargés. Objectif initial : audit du parser + ajout support PDF + test sur 2 plannings réels. Le test curl n'a pas été fait dans la session (clôturée pour cause de fatigue après 3h de travail), mais toutes les modifications code ont été faites, vérifiées, déployées en prod v5.

**Ce qui a été fait** :

- ✅ **Audit complet de l'état du chantier rhythm_calendar** : backend prêt à 95% (Edge Function déployée depuis le 21 avril en version 4, table `rhythm_imports` avec RLS + FK + index, colonnes `users.rhythm_calendar` et `users.rhythm_import_id` en place), frontend non branché (0 appel aux tables côté `sterny-react/`). Surprise positive : la fonction `matchScore` dans `RecherchePage.jsx` est déjà alignée sur la vision cible (dates ISO + `disponibilites_pattern`), pas de refactor moteur nécessaire, uniquement changement de source des inputs.
- ✅ **Dimensionnement du chantier complet** : 10 pages frontend à refactoriser pour supprimer les colonnes dépréciées (`rythme_pattern`, `type_alternance`, `rythme_alternance`), ~40 occurrences dispersées, concentration sur `RecherchePage.jsx` et `CreerAnnoncePage.jsx`. Estimation 10-14 sessions pour boucler le chantier (Blocs A-E).
- ✅ **Action A2 — phase code** : 3 fichiers modifiés dans `supabase/functions/parse-school-calendar/` :
  - `index.ts` : `application/pdf` ajouté à `ALLOWED_MIME_TYPES`, `MIME_TO_EXT` étendu, `MAX_FILE_SIZE` passé de 10 à 20 MB uniforme
  - `providers/anthropic.ts` : branchement dynamique `type: "document"` pour PDF / `type: "image"` pour images selon `mimeType`, `max_tokens` passé de 32000 à 8000
  - `prompts/school-calendar-v1.ts` : règle explicite ajoutée "les alternants n'ont pas de vacances scolaires, statut par défaut = company"
- ✅ **Bucket Supabase Storage `rhythm-documents`** : File size limit passé à 20 MB, `application/pdf` déjà dans la liste MIME autorisée (vérification dashboard, capture sauvegardée). Bucket privé confirmé (non-public), cohérent RGPD.
- ✅ **Redéploiement Edge Function** : `supabase functions deploy parse-school-calendar --project-ref rkffpmuhyvwwgfbdqmqr` lancé avec succès, version 5 en prod (script 82.24 kB).
- ✅ **2 plannings réels de test en place** dans `test-plannings/` (dossier gitignoré car données personnelles) :
  - `Planning_Martin.JPG` (222 Ko) : IUT Saint-Malo, BUT 3 GEA 2026-2027, 4 groupes (G1 CG2P, G2 GC2F, G3 GEMA LOG, G4 GEMA MD), 45 semaines, format tableau semaine par semaine avec couleurs jaune/vert
  - `Planning_Mathis.pdf` (180 Ko) : format calendrier annuel 12 colonnes de mois, tous les jours en lignes, format dense type Hyperplanning
  - Les 2 formats sont radicalement différents → combo idéal pour stresser le parser
- ✅ **Rotation clé Resend n°2 en 24h** après incident : la clé `Onboarding` créée le 23 avril a été exposée par inadvertance dans le terminal (confusion au copier-coller dans Apple Notes entre tokens `sbp_` Supabase et clés `re_` Resend). Clé révoquée sur dashboard Resend, nouvelle clé créée avec même scope (Sending access), secret `RESEND_API_KEY` mis à jour côté Supabase via `supabase secrets set`, test end-to-end confirmé (email de confirmation d'alerte reçu depuis sterny.co).

**Décisions produit actées** :

1. **Les alternants n'ont pas de vacances scolaires** : recherche web confirme qu'ils sont salariés (5 semaines de congés payés posés avec accord employeur, pas de calendrier des vacances scolaires). Le modèle binaire `school` / `company` du `rhythm_calendar` est donc fidèle à la réalité et doit rester tel quel. Logué dans VISION-ARCHITECTURE section 3.
2. **Mécanique d'ajustement manuel par l'hôte** : lors de la création d'annonce, `disponibilites_pattern` est pré-calculé automatiquement depuis le `rhythm_calendar` croisé avec la ville du logement, puis l'hôte peut modifier manuellement la liste (retirer des semaines où il reste chez lui, ajouter celles où il rentre chez ses parents). Cohérent avec le principe général de VISION section 4 : "la donnée automatique est une suggestion, l'utilisateur tranche". Logué aussi dans VISION-ARCHITECTURE section 3.
3. **Upload accepté : PDF + images**. Xlsx, docx, liens iCal hors-scope au moins pour la v1.
4. **Taille max uniforme à 20 Mo** pour PDF comme images. Simplifie l'UX.

**Ce qui n'a PAS été fait dans cette session** :

- ❌ **Test curl sur Planning_Martin.JPG et Planning_Mathis.pdf** : reporté à la prochaine session (fatigue à minuit). Le test est l'étape la plus importante pour valider le prompt LLM sur des vrais plannings — il faut y arriver frais.
- ❌ **Analyse du rapport de parsing** : groupes détectés, cohérence des dates ISO du lundi, qualité de l'extraction des semaines, présence de statuts hors `school`/`company`. À faire en même temps que le test curl.

**Ajustements à retenir pour la prochaine session** :

1. **Token Supabase** : garder à portée de main, préfixe `sbp_`, ne pas confondre avec la clé Resend (préfixe `re_`). Le tableau des préfixes ajouté dans CONTEXTE-PROJET section 7 sert de rappel.
2. **USER_JWT pour test curl** : récupérable via console DevTools de sterny.co avec la commande `copy(JSON.parse(localStorage.getItem('sb-rkffpmuhyvwwgfbdqmqr-auth-token')).access_token)` qui copie directement le token dans le presse-papiers. Plus rapide que la sélection manuelle dans Local Storage.
3. **Classement sécurité des commandes** : nouvelle règle projet — avant toute demande de copier-coller de terminal, Claude doit classer explicitement le risque (🔒 sensible / ⚠️ possible / ✓ propre). Documenté dans CONTEXTE-PROJET section 6.

**Plan de démarrage de la prochaine session (Action A2 — phase test)** :

1. Export `SUPABASE_ACCESS_TOKEN` + `USER_JWT` dans le terminal
2. Relance Claude Code dans la racine du repo avec un prompt de test curl sur Planning_Martin.JPG
3. Lecture du rapport JSON : groupes détectés, dates des 5 premières semaines, cohérence des lundis, statuts uniquement `school`/`company`
4. Si parsing Martin OK : même test sur Planning_Mathis.pdf (format plus dense, stress test)
5. Si parsing Mathis OK : Action A2 close, commit de fin d'Action A2 avec message "test(parser): validated on real plannings Martin JPG + Mathis PDF"
6. Enchaînement sur Bloc B : composants UI (`FileUpload` + `RhythmCalendar` visuel) — ouverture d'une nouvelle conversation Claude.ai pour partir sur une base fraîche

**Commits de la session du 24 avril soir** (à venir une fois les commits de clôture poussés) :
- 1 commit atomique `chore(gitignore): ignorer dossier test-plannings (données personnelles)`
- 1 commit principal `feat(parser): add PDF support + vacation rule + tune max_tokens in parse-school-calendar` avec les 3 fichiers Edge Function + 3 fichiers docs

**Modifs non-commitées volontairement conservées locales** (inchangé depuis session précédente) :
- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans DETTE-TECHNIQUE
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A, en attente de relecture à tête reposée

---

## 0. Session du 24 avril — Action 2 close (chantier email alertes)

**Objectif tenu** : remettre au propre le flow d'envoi des emails de confirmation d'alerte, après l'incident Resend du 23 avril (clé leakée et révoquée). La plateforme envoie à nouveau ses emails d'alerte, via un chemin unique, propre et mobile-ready.

**Ce qui a été fait** :

- ✅ **DROP du trigger `on_new_alerte` + fonction `handle_new_alerte`** en prod via Supabase SQL Editor (chemin cassé avec clé Resend révoquée en dur). Snapshot rollback créé dans `supabase/_rollback/handle_new_alerte_snapshot.sql` (local uniquement, gitignoré). Table `alertes` accepte à nouveau les INSERTs (ils rollback-aient probablement depuis le 23 avril soir à cause du trigger cassé).
- ✅ **Test de bout en bout de la clé Resend** via curl direct sur l'Edge Function `send-alert-email`. Confirmation que : la nouvelle clé créée hier est bien configurée dans le secret Supabase, le domaine `sterny.co` est bien vérifié dans Resend Domains, les 6 Edge Functions Resend (`send-alert-email`, `send-landing-email`, `send-proprietaire-invitation`, `send-recu-paiement`, `send-fin-bail-email`, `send-relance-impaye-email`) ont toutes accès à la clé.
- ✅ **Audit exhaustif des chemins d'insertion dans la table `alertes`** côté frontend. 4 chemins identifiés, 2 couverts correctement par un `supabaseClient.functions.invoke('send-alert-email')` (`PasswordGate.jsx`, `RecherchePage.jsx`), 2 non couverts (`CreerAlertePage.jsx`, `DashboardLocatairePage.jsx` branche CREATE).
- ✅ **Découverte** : le 2e trigger `send-alert-on-insert` sur `public.alertes` appelait bien l'Edge Function `send-alert-email`, mais avec un body `{}` vide en dur dans sa définition (`supabase_functions.http_request(url, 'POST', headers, '{}', '5000')`). Donc **aucun email d'alerte n'a jamais été envoyé via ce trigger depuis sa création**. La couverture email reposait uniquement sur les appels frontend existants, qui eux-mêmes ne couvraient que 2 des 4 chemins d'insertion. Résultat : alertes créées depuis `DashboardLocatairePage` ou `CreerAlertePage` = aucun email.
- ✅ **Suppression des pages orphelines** `CreerAlertePage.jsx` + `ModifierAlertePage.jsx` + leurs CSS + les 2 routes dans `App.jsx` (commit `4579927`). Aucun lien UI ne menait à ces pages (grep exhaustif sur `to=`, `href=`, `navigate()` incluant variantes single-quote et backtick : 0 match). Création/modification d'alerte centralisée dans `PasswordGate`, `RecherchePage` et la modale de `DashboardLocatairePage`.
- ✅ **Fix de l'invoke `send-alert-email`** dans `DashboardLocatairePage.jsx` branche CREATE (commit `ea8a3ba`). Pattern aligné sur `RecherchePage.jsx` : check d'erreur sur l'insert (`insertError` pour éviter le shadow du catch externe), puis invoke dans un try/catch interne avec `console.warn` si l'email échoue (l'alerte reste créée en BDD, l'email est traité comme non-bloquant). Build vérifié à chaque étape.
- ✅ **DROP du trigger `send-alert-on-insert`** en prod via Supabase SQL Editor. Snapshot rollback créé dans `supabase/_rollback/send_alert_on_insert_snapshot.sql`. Table `alertes` n'a plus AUCUN trigger actif.
- ✅ **Test end-to-end depuis l'UI** sur la page recherche : alerte créée, email de confirmation reçu, aucun warning en console, message UX correct.

**Décision produit actée** :

- **L'architecture des appels email passe de "trigger SQL" à "invoke frontend explicite"**, aligné avec l'arrivée de l'app mobile native (le même SDK Supabase existe en Swift, Kotlin, React Native, Flutter — l'invoke est trivialement dupliquable). Mise à jour de `VISION-ARCHITECTURE.md` section 8 pour refléter que l'app mobile est différée et non dépriorisée.

**Chantiers restants non traités aujourd'hui (logués en DETTE)** :

- DETTE #16 : design des 6 templates email Resend à refondre (non prioritaire, après ops techniques).
- DETTE #17 : 5 Edge Functions présentes en local mais non déployées en prod (dont `send-landing-email` qui est appelée par le frontend mais renvoie 404).
- DETTE #18 : audit des autres triggers SQL qui font des appels HTTP sortants (candidat : `trg_notif_candidature`, voir DETTE #14).

**Tâches non urgentes à planifier** :

- Intégration de **Sign in with Apple** (Apple Developer account déjà actif, reste flow OAuth frontend + config Supabase). Important pour la cible alternants (forte proportion d'utilisateurs iOS).
- Intégration de **Google OAuth en mode production** (actuellement en "testing"). Passage en production nécessite une vérification Google qui prend ~3 semaines et impose de retirer temporairement le logo Sterny du consent screen ou de le faire certifier. À planifier suffisamment à l'avance du lancement.
- Objectif commun : friction minimale à l'inscription, aligné avec le principe "5 minutes max pour entrer dans Sterny" de `VISION-ARCHITECTURE.md` section 4.

**Commits de la session du 24 avril (tous poussés sur `origin/main`)** :

- `4579927` chore(alerte): supprimer pages orphelines CreerAlertePage + ModifierAlertePage
- `ea8a3ba` fix(dashboard): invoquer send-alert-email après création d'alerte
- `659ba3d` docs: close Action 2 (chantier email alertes) — MAJ ETAT-COURANT, DETTE, VISION
- `3474de9` chore(gitignore): ignorer supabase/_rollback snapshots locaux

Pour vérifier l'état réel de la branche à tout moment : `git log --oneline -6` et `git log --oneline origin/main..HEAD`. Ne pas se fier à des descriptions d'état Git en markdown, qui deviennent obsolètes dès le commit suivant.

**Modifs non-commitées volontairement conservées locales** :

- `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans `DETTE-TECHNIQUE.md`
- `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — audit Zone 1 Catégorie A du 23 avril, en attente de relecture à tête reposée

**Snapshots rollback locaux** (dossier `supabase/_rollback/`, gitignoré via pattern `_rollback/` dans `.gitignore` racine) :

- `handle_new_alerte_snapshot.sql` (filet pour le DROP du matin du 24 avril)
- `send_alert_on_insert_snapshot.sql` (filet pour le DROP de l'après-midi du 24 avril)

**Plan de démarrage de la prochaine session** :

Les 4 commits du 24 avril sont pushés, rien à faire côté Git. Deux pistes au choix selon l'énergie et le temps disponible :

1. Reprendre la feuille de route originelle : audit Zone 2 (frontend complet) + Zone 3 (plan de transition détaillé vers `rhythm_calendar`), puis bascule `rhythm_calendar`.
2. À défaut ou en parallèle : Catégorie B de l'audit Zone 1 (RLS UPDATE, delete-account incomplet, export-data incomplet, Storage sécurité pièces d'identité) avant les démos BPI / Initiative Rennes.

---

## 1. Session du 23 avril soirée et fin de soirée — Catégorie A + incident Resend + nettoyage historique Git

**Ce qui a été fait** :

- ✅ **Catégorie A de l'audit Zone 1 close**. 3 dumps du schéma Supabase distant générés et versionnés (commit `6b0a8f8`, ex-`6460ab0` avant réécriture d'historique). Vérifications sur les 2 colonnes suspectes : `annonces.proprietaire_id` confirmé absent (vraie dette, loguée DETTE #14), `paiements_loyer.stripe_session_id` confirmé présent (faux positif, dette de traçabilité loguée DETTE #15).
- ✅ **Dette DETTE #14 et #15** loguées (commit `00dba49`, ex-`ea6ccaf` avant réécriture) après revert (`f42cb2f`, ex-`1ce1789`) d'un commit fautif (`231e781`, ex-`01fc76e`) qui avait embarqué des bypass DEV de CreerAnnoncePage.jsx — l'historique public garde la trace des 3 commits pour pédagogie.
- ✅ **Incident Resend** : GitGuardian a détecté la clé Resend `Onboarding` (préfixe `re_dYZ...`) dans `supabase/remote_schema.sql` (commit `6b0a8f8`, ex-`6460ab0` avant réécriture). La clé était en dur dans la fonction Postgres `handle_new_alerte` ligne 58. Révoquée immédiatement via dashboard Resend. Nouvelle clé `Onboarding` créée avec même scope (Sending access), stockée dans la note Apple Notes verrouillée. **La clé révoquée évacuée de l'historique Git via Action 1 (filter-repo + force-push).**
- ✅ **Règles Git anti-erreur + check-list secrets pré-commit** ajoutées dans CONTEXTE-PROJET.md section 6 et dans CLAUDE.md racine (commit `210cd48`, ex-`b16918a` avant réécriture). Couvre : interdiction `commit -a/-am`, obligation `git diff --staged --stat` pré-commit, rappel que `git revert` et `git checkout <commit>` touchent le working tree + index, check-list secrets élargie (Supabase/Anthropic/Resend/Stripe/Mapbox/Google), règle de manipulation de secrets dans les conversations.
- ✅ **Action 1 — Nettoyage de l'historique Git CLOSE** (23 avril fin de soirée). Outil utilisé : `git filter-repo` 2.47.0 installé via Homebrew. 1 seul commit à réécrire (ex-`6460ab0`), fichier de remplacement créé hors du repo (`~/.git-replacements-sterny.txt`), réécriture de 7 commits (de ex-`6460ab0` à ex-`7df44d9`), les commits antérieurs gardent leurs SHA d'origine. Force-push avec `--force-with-lease` après fetch de vérification. 0 match de la clé complète (30+ caractères) dans l'historique post-réécriture. Backup local du repo conservé dans `/Users/comefourel/Dev/sterny-backup-before-filter-repo-20260423-2326` (620Mo) — à supprimer dans 24-48h si tout tourne normalement.

**Ce qui n'a PAS été fait (reporté à la prochaine session)** :

- ❌ **Refactor du trigger `handle_new_alerte`** vers une Edge Function dédiée (option A validée en session). Actuellement le trigger ne fonctionne plus (clé révoquée), donc aucun email de confirmation d'alerte ne part. À prioriser en début de prochaine session. Impliqué : création d'une Edge Function `send-alerte-confirmation` qui lit `RESEND_API_KEY` depuis les secrets Supabase, configuration de la nouvelle clé dans les secrets, modification du trigger pour appeler l'Edge Function ou suppression complète du trigger au profit d'un appel direct depuis le frontend / Edge Function d'inscription.
- ❌ **Domaine expéditeur à harmoniser** : la fonction actuelle envoie depuis `onboarding@resend.dev` (domaine de test Resend) au lieu d'un domaine Sterny vérifié. À traiter au moment du refactor. À noter : vérifier si `sterny.co` est déjà configuré dans Resend Domains, sinon le faire.

**Plan de démarrage de la prochaine session** :

1. **Action 2** : refactor trigger `handle_new_alerte` → Edge Function `send-alerte-confirmation` (30-45 min)
2. **Action 3** : configuration du domaine expéditeur `sterny.co` dans Resend si pas déjà fait
3. **Action 4** : reprise de la feuille de route initiale (audit Zone 2 + Zone 3, puis bascule `rhythm_calendar`)

---

## 1. Dernière session close — 23 avril 2026

**Objectif tenu** : infrastructure de contexte (4 docs de référence + CLAUDE.md racine) en place pour que toute nouvelle session Claude démarre briefée automatiquement, sans perte d'information.

**Infrastructure docs — CLOSE** :

- ✅ `CONTEXTE-PROJET.md` — committed (`d17dcbf`)
- ✅ `VISION-ARCHITECTURE.md` — committed
- ✅ `ETAT-COURANT.md` — créé (`0ff9827`) + 3 MAJ au fil de la journée (`248fe8c`, `46486c1`, `cf75e27`)
- ✅ `CLAUDE.md` à la racine — committed (`2e78251`), remplace l'ancien `sterny-react/CLAUDE.md`
- ✅ `CLAUDE.md` section 10 — pointe vers les fichiers design existants dans `sterny-react/.claude/skills/design/` (commit `cffaf86`)
- ✅ Upload des 4 docs dans le Project Claude.ai — fait

**Imprévus de la journée** :

- Fausse alerte sur une hypothèse de "mauvais dossier de travail" : diagnostic complet a confirmé que tout est au bon endroit (`/Users/comefourel/Dev/sterny/sterny-react/`, servi par Vite, tracké par Git). Les 5 copies fantômes du repo identifiées (détail en section 6).

**Décision actée** :

- Audit esthétique reporté en dernière priorité (section 4 point 8). Les fichiers design existent déjà dans `sterny-react/.claude/skills/design/` et suffisent provisoirement.

---

## 2. Dernière avancée majeure — Phase 1 du plan matching (22 avril)

> **Note pour la prochaine session** : l'infrastructure de contexte est close (voir section 1). La priorité immédiate est la **Catégorie A de l'audit Zone 1** (section 4 point 2) : dump du schéma Supabase + vérification de `annonces.proprietaire_id` et `paiements_loyer.stripe_session_id`.

Entamé hier soir à partir du document `sterny-handoff-phase1-v2.docx`.

**Réalisé** :

- **Phase 1a — Fix B1+B2+M3** : colonnes `type_alternance` et `rythme_pattern` désormais écrites dans INSERT/UPDATE de `annonces`. Commit `b5970c4`.
- **Phase 1b — Fix M2** : dates passées exclues du `matchScore` dans `RecherchePage.jsx`. Commit `dae0f26`.
- **Phase 1c — Reset BDD** : 15 annonces fakes + candidatures/favoris liés supprimés via SQL direct (Supabase SQL Editor). Base propre avec uniquement la nouvelle annonce "Mon logement" de Rennes, créée via le flow corrigé. Pas de commit (SQL direct).
- **Bypass DEV pour tester** : commit `6106f8b` (Stripe Identity). Autres bypass non-commités (modale confirmation, `validateStep`, logs `[DEBUG]`). Tous trackés dans `DETTE-TECHNIQUE.md`.

**Mis en pause** :

- Phases 1d, 1e, 1f, 1g du plan original **non faites**. Suspendues après la découverte de l'audit Zone 1 qui révèle des enjeux stratégiques plus larges (voir section 3 et 4).

---

## 3. Audit Zone 1 — problèmes découverts (22 avril soir)

L'audit backend complet (`docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md`, 644 lignes) a révélé **10 problèmes critiques backend**. Classés par niveau d'urgence :

**Catégorie A — CLOSE (23 avril soir) via dump du schéma distant** :

- ✅ Dump reproductible du schéma : résolu, 3 fichiers versionnés dans `supabase/` (commit `6460ab0`).
- ❌ CONFIRMÉ : `annonces.proprietaire_id` absent en prod, référencé par le trigger `trg_notif_candidature` qui plante à chaque INSERT dans `candidatures`. Détails dans DETTE-TECHNIQUE #14. Fix reporté après audit Zone 2.
- ✅ FAUX POSITIF : `paiements_loyer.stripe_session_id` existe bien en prod (+ 3 autres colonnes Stripe). Simple dette de traçabilité tracée DETTE #15.

**Catégorie B — À traiter avant les démos** :

- RLS UPDATE sans `WITH CHECK` sur ~10 tables → faille sécurité (un utilisateur peut modifier ses lignes ET voler celles d'un autre)
- `delete-account` incomplet (oublie ~10 tables) → non-conformité RGPD Art. 17
- `export-data` incomplet (manque ~15 tables, lit une table fantôme) → non-conformité RGPD Art. 20
- Pièces d'identité en lecture publique dans Storage → sécurité par obscurité non conforme RGPD strict

**Catégorie C — Ménage à faire plus tard** :

- 2 tables fantômes (`documents`, `matchs`) référencées dans les Edge Functions mais jamais créées
- Doublons de policies RLS
- Code mort (`send-landing-email` probablement dormant, etc.)

---

## 4. Ce qui vient ensuite (ordre de priorité)

**Priorisation corrigée** : on écrit la vision du système cible **avant** de traiter les bugs backend. Raison : la vision clarifie ce qu'on garde, ce qu'on jette, ce qu'on modifie. Elle évite de réparer du code qu'on va supprimer. Les bugs "qui saignent silencieusement" sont indépendants de la bascule et peuvent attendre quelques jours de plus.

1. **Finir l'infrastructure de contexte** (aujourd'hui)
   - `ETAT-COURANT.md` (en cours)
   - `VISION-ARCHITECTURE.md` (le plus important des 4)
   - `CLAUDE.md` à la racine du repo
   - Upload dans Project Claude.ai + Custom Instructions

2. **Catégorie A — CLOSE** (voir section 0 et section 3)

3. **Audit Zone 2 et Zone 3** (en tâche de fond, Claude Code)
   - Zone 2 : audit frontend complet (flow utilisateur, code React)
   - Zone 3 : plan de transition détaillé vers `rhythm_calendar`

4. **Traitement Catégorie A confirmée**
   - Si les bugs sont réels, on les fixe avant de toucher à la bascule

5. **Bascule rhythm_calendar** (feuille de route issue de la Zone 3)
   - Reprise des Phases 1d à 1g du plan original avec la vision intégrée
   - Puis Phase 4 (upload-first à l'inscription)

6. **Catégorie B — conformité et sécurité** (avant démos BPI / Initiative Rennes)
   - RLS UPDATE + RGPD + Storage sécurité

7. **Catégorie C — ménage** (plus tard)
   - Tables fantômes, doublons RLS, code dormant

8. **Audit esthétique** (reporté — priorité technique d'abord)
   - Reporté après la Phase 1 matching, l'audit Zone 1 Catégorie A, et la Catégorie B conformité
   - Note importante : le dossier `sterny-react/.claude/skills/design/` contient déjà 4 fichiers design (SKILL.md, design-rules.md, component-patterns.md, generators.md) + un slash-command `commands/global.md`. Relire ces fichiers avant de lancer un audit from scratch — ils couvrent probablement déjà une bonne partie du design system
   - Objectif final : rédiger la section 10 de `CLAUDE.md` (actuellement en placeholder) en s'appuyant sur ces fichiers existants + vérification sur les pages retravaillées récemment

---

## 5. Décisions produit récentes et actées

- **Rythmes irréguliers** : les vrais plannings d'alternance sont irréguliers (exemple IUT Saint-Malo 2026/2027 : 4 groupes, 45 semaines chacun, pas de pattern régulier). `rythme_pattern '4-2'` est une fiction marketing, pas une base de matching fiable.
- **`rhythm_calendar` = source de vérité unique** : le calendrier semaine par semaine extrait du vrai document de l'alternant devient la seule base du matching. `type_alternance` et `rythme_pattern` deviennent descriptifs puis seront supprimés.
- **Upload-first à l'inscription** : le nouvel utilisateur uploade son planning scolaire en premier, pas de formulaire fastidieux. 5 minutes max pour entrer dans Sterny. Argument de vente principal.
- **Dépréciation progressive, pas suppression immédiate** : les colonnes obsolètes restent en place pendant la transition (gel fonctionnel), puis suppression propre via une migration dédiée en fin de parcours.
- **Migration de profil montante déjà en place** : `locataire` → `les_deux` et `hote` → `les_deux` via dashboard.
- **Migration de profil descendante à implémenter** : `les_deux` → `locataire` ou `hote`. Non faite. À ajouter au suivi.
- **Rapport d'audit Zone 1 non-committed pour l'instant** : décision à trancher. Probablement commit après relecture à tête reposée.

---

## 6. Rappels à ne pas oublier

**Règles de travail** :

- Workflow 2 Claudes : Claude.ai propose, Claude Code exécute. Pas mélanger les rôles.
- Avant tout commit important : vérification `cat` ou `sed` dans terminal normal, copier-coller à Claude.ai pour validation, puis commit.
- Tokens jamais en clair dans une conversation. `export VARIABLE="..."` dans terminal normal uniquement.
- Sujets réglementés (juridique, paiement, RGPD, logement, mineurs, assurance, entreprise) : consulter un professionnel qualifié avant de trancher.

**Bypass DEV actifs dans le code** (à retirer avant prod, trackés dans `DETTE-TECHNIQUE.md`) :

- `validateStep` désactivé (`return true`)
- `skipStripeIdentity = true`
- Modale de confirmation bypassée (clic → `publierAnnonce` direct)
- Logs `[DEBUG]` et `[DEBUG RENDER]` dans `CreerAnnoncePage.jsx`

**État Git** :

- Branche : `main`, à jour avec `origin/main`
- 9 commits diurnes (infrastructure docs) : `d17dcbf`, `f0d28dc`, `0ff9827`, `ede386d`, `2e78251`, `248fe8c`, `46486c1`, `cf75e27`, `cffaf86`
- 5 commits du soir (Catégorie A + incident Resend + règles anti-erreur) après réécriture d'historique : `6b0a8f8` (dumps, ex-`6460ab0`), `231e781` (commit fautif, ex-`01fc76e`), `f42cb2f` (revert, ex-`1ce1789`), `00dba49` (DETTE propre, ex-`ea6ccaf`), `210cd48` (règles anti-erreur, ex-`b16918a`)
- 1 commit de fin de soirée (après réécriture) : `d2b5d8a` (clôture session soirée — ex-`7df44d9` avant réécriture)
- Modifs non-commitées (décisions assumées) :
  - `sterny-react/src/pages/annonce/CreerAnnoncePage.jsx` — bypass DEV trackés dans `DETTE-TECHNIQUE.md`
  - `docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md` — volontairement non-committed en attente de relecture à tête reposée

**Tâches de ménage à faire un jour calme** (non prioritaires) :

- **Backup de filter-repo à supprimer** : `/Users/comefourel/Dev/sterny-backup-before-filter-repo-20260423-2326` (620Mo) créé le 23 avril avant le nettoyage d'historique Git. À supprimer dans 24-48h (soit à partir du 25 avril) si aucun problème n'est remonté après la réécriture.
- **Copies fantômes du repo** : 5 copies existent sur le disque en plus du vrai repo Git, identifiées le 23 avril via `find /Users/comefourel -type f -name "package.json" ... grep -l "sterny"`. À traiter un jour calme : vérifier que chaque copie ne contient rien d'unique que le Git actuel n'aurait pas, puis archiver ou supprimer. Les copies sont :
  - `/Users/comefourel/Dev/sterny-old/`
  - `/Users/comefourel/Dev/sterny-come-local-13avril-23h/`
  - `/Users/comefourel/Dev/sterny-backup-avant-git/`
  - `/Users/comefourel/Desktop-backup-sterny-20260413/version-bureau-icloud/`
  - `/Users/comefourel/Library/Mobile Documents/com~apple~CloudDocs/Desktop/STERNY/sterny-react/` (iCloud)
- **Désactiver iCloud Desktop sync** : macOS synchronise le Desktop sur iCloud par défaut. Cette synchro peut créer des copies silencieuses de projets si un dossier y transite. Désactiver via Préférences Système → Apple ID → iCloud → iCloud Drive → Options → décocher "Dossiers Bureau et Documents".
- **Vérifier le workspace VS Code** : si VS Code est rouvert un jour pour débugger ou présenter du code, vérifier que le workspace pointe bien vers `/Users/comefourel/Dev/sterny/sterny-react/` et non vers une des 5 copies fantômes. Visible dans la barre de titre de VS Code ou via `File → Open Recent`. Toutes les modifications de code passent par Claude Code dans le terminal, donc VS Code n'est utilisé que pour lecture/démo — mais autant s'assurer qu'on lit la bonne version.

---

## 7. Règle de mise à jour de ce document

Avant de fermer une conversation Claude.ai saturée :

1. Demander à Claude : *"propose-moi une mise à jour de `ETAT-COURANT.md` avec ce qu'on vient de faire dans cette session"*
2. Claude fournit le diff proposé
3. Je valide ou corrige
4. Claude Code met à jour le fichier
5. Commit + push avec message `docs: update ETAT-COURANT after session [sujet]`

Cette règle garantit qu'aucune session ne se ferme sans laisser de trace.

---

*Si une étape majeure est franchie ou si le plan change significativement, mettre à jour ce document et daterla modification en tête.*
