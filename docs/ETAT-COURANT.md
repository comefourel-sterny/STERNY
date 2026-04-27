# État courant du projet Sterny

Document vivant. Mis à jour **à chaque changement de conversation Claude.ai saturée** (règle : avant de fermer une conversation, demander à Claude de proposer une mise à jour de ce fichier, puis commit). Permet à toute nouvelle session de savoir immédiatement où on en est sans perte de contexte.

**Dernière mise à jour** : 28 avril 2026 — recherche profonde Axe 1 poursuivie, Famille 3 cartographiée et committée. Trois familles sur cinq couvertes au total dans la session globale du 28 avril (`f1de8fe` squelette, `21bc308` Famille 1, `7af2979` Famille 2, commit Famille 3 ajouté en clôture).

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
