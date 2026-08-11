# État courant du projet Sterny

Document vivant. Mis à jour **à chaque changement de conversation Claude.ai saturée** (règle : avant de fermer une conversation, demander à Claude de proposer une mise à jour de ce fichier, puis commit). Permet à toute nouvelle session de savoir immédiatement où on en est sans perte de contexte.

**Dernière mise à jour** : 2026-08-09
[DEV] Patch 3c livré : catégorie « Ton alternance », `type_user` dérivé des fonctions de ville, blocage du changement tant qu'une annonce existe. Reste : patchs 3d à 7.
[DEV] Abandon de l'upload d'emploi du temps consigné dans les quatre docs du socle. Le principe fondateur est inchangé, seul le moyen de collecte a changé.
[VRAIE VIE] Profil LinkedIn : reste la photo de profil, puis checklist de sortie et publication. Doctrine public/privé actée en CONTEXTE-PROJET §1 ter.

---

## 2026-08-10 — Questionnaire terrain : trou de capture du profil hybride corrigé

**Trou identifié par Côme** en analysant les 15 premières réponses. Section 10 « Sans famille », option « Je loue un logement dans une ville et j'utilise des plateformes de location courte durée pour l'autre » redirigeait vers la section « Ton logement payé », qui ne demande que la dépense du logement principal. Le coût de la courte durée n'était jamais capturé pour ce profil, alors qu'il est le plus fréquent parmi les répondants à ce jour.

**Correction livrée dans le formulaire** : nouvelle section « Ton logement payé + courte durée », insérée après la section 14, atteinte uniquement depuis la section 10 option 3, sortie explicite vers « Difficultés logement ». Quatre questions obligatoires : dépense mensuelle du logement loué (avec description « Uniquement le logement que tu loues, sans compter la courte durée. »), coût d'une semaine en courte durée, nombre de nuits ou semaines en courte durée sur un mois type, semaines par mois où le logement reste vide (0 / 1 / 2 / 3 et plus). Les formulations sont reprises à l'identique des sections 11 et 14 pour que les variables restent comparables entre profils. La section 14 n'est pas modifiée, elle reste partagée avec la section 9 option 3 (profil purement locatif). Le formulaire passe de 24 à 25 sections, renumérotation vérifiée par dump.

**Piège rencontré, à retenir** : l'insertion d'une section a silencieusement réinitialisé la sortie de la section 14 sur « section suivante », ce qui envoyait le profil locatif dans la section vide nouvellement créée. Corrigé dans la foulée. Toute insertion de section dans ce formulaire exige de revérifier la sortie de la section qui précède.

**MÉTHODE ACTÉE — audit du formulaire par dump texte.** La vérification visuelle section par section est abandonnée. Le formulaire s'audite désormais par le script `docs/recherche/audit-formulaire.gs`, en lecture seule, qui imprime les 25 sections, leurs questions, leurs sorties par défaut et les redirections par option. Motif : la lecture d'écran est coûteuse et faillible sur 25 sections, le dump sort la structure complète en une exécution et se compare d'une session à l'autre.

**PIÈGE DE L'API FORMS, tracé pour ne pas le refaire** : le réglage de navigation porté par un `PageBreakItem` décrit la sortie de la section PRÉCÉDENTE, pas celle qu'il ouvre. Un premier dump attribuant le réglage à la section qu'il ouvre a produit quatre faux défauts de branchement, invalidés par une capture d'écran de Côme. Le script versionné recale d'un cran. Point de contrôle obligatoire à chaque exécution : « APRES LA SECTION 7 » doit afficher « SECTION 20 (Choix pro) ».

**Rupture de série assumée** : les 15 réponses antérieures n'ont pas la nouvelle section. Aucun recontact, les adresses ne sont disponibles que pour les répondants ayant coché l'opt-in. Ces 15 réponses constituent une vague distincte à l'analyse.

**Arbitrage écarté** : ne pas ajouter la question des semaines vides à la section « Deux logements ». Motif Côme, le rythme déjà collecté permet de la déduire, et le profil est probablement rare. Réserve tracée : cette déduction ne fonctionne pas pour les rythmes « en journées dans la semaine » ni « imprévisible », qui ne produisent aucun nombre de semaines. À rouvrir si ce profil devient significatif dans les réponses.

**RESTE OUVERT — profil mono-ville.** La section 7 « Mono-ville » sort directement vers « Choix pro ». Ce profil n'est interrogé ni sur sa dépense logement, ni sur ses difficultés. Décision de Côme : lui ajouter la question du loyer et le faire passer par « Difficultés logement ». Non implémenté à ce jour, à traiter en session dédiée car cela modifie le parcours d'un profil entier sur une branche saine.

**L'entrée du 25/07/2026 n'est pas corrigée** (règle du journal, on ne réécrit pas une entrée datée). Elle reste valide : l'audit par dump de ce jour n'a trouvé aucun défaut de branchement sur les 11 points de redirection d'origine.

## 2026-08-09 — [DEV] Patch 3c livré : Ton alternance, `type_user` dérivé, blocage sur annonce

**CHANGEMENT DE CAP EN COURS DE PATCH.** Les trois champs de rythme abstrait de l'ancienne page (`type_alternance`, `rythme_alternance`, et le champ de saisie associé) ne sont PAS reconstruits sur `/compte`. Ils sont remplacés par les villes et leur fonction. Motif : reconstruire à l'identique une saisie que la Charte interdit depuis l'origine aurait été porter une colonne dépréciée dans une surface neuve. Le planning éditable, lui, arrive au patch 3d.
Cela révise la décision du 24/07 loguée en DETTE #150, qui prévoyait une reconstruction à l'identique. Le report de la migration vers `rhythm_calendar` reste valide : ce sont les champs abstraits qui sautent, pas le calendrier.

**DÉCOUPAGE 3c / 3d, et son motif.** 3c porte les villes, leur fonction, la dérivation de `type_user` et le blocage sur annonce. 3d portera le planning éditable. Séparer parce que le planning n'est pas un champ de plus dans un formulaire : il impose une fusion avec le rythme existant (voir plus bas), donc une conception à part entière. Les mélanger aurait fait grossir 3c en cours de route, exactement le pattern évité sur le chantier multi-villes puis sur la restructuration du profil.

**DÉCISION STRUCTURANTE — `type_user` devient une donnée dérivée.** Il se déduit désormais des fonctions de ville et n'est plus saisi indépendamment. Jamais écrit pour un `proprietaire`. Décision et règle complète en VISION-ARCHITECTURE, bloc du 09/08/2026. Effet de bord acquis, pas subi : la redescente depuis `les_deux`, écrite « à implémenter » depuis l'origine et jamais construite, existe maintenant sans avoir demandé une seule ligne de feature dédiée. DETTE #131 point (2) mise à jour en conséquence.

**DÉCISION — blocage du changement tant qu'une annonce existe sur le pôle.** Refus sec, aucune dépublication automatique, aucun état intermédiaire. Le périmètre de la décision est écrit explicitement en VISION : elle ne tranche NI le retrait d'annonce, NI le cas d'un logement sous contrat signé, NI les droits du propriétaire. Volet contractuel, à examiner avec un professionnel du droit avant tout code.

**NOUVEAU MODE D'INTERRUPTION dans `enregistrerCategorie`.** La fonction commune introduite au patch 3b accepte désormais un retour `{ interrompu: true }` depuis le crochet `avantEcriture`, distinct du `throw`. Les deux ne disent pas la même chose : le `throw` signale un échec, donc un message d'erreur ; `{ interrompu: true }` signale un refus délibéré et prévu, donc aucun message d'erreur et aucune écriture. Le blocage sur annonce est un refus, pas une panne. Sans cette distinction, un utilisateur qui tente un changement légitimement refusé aurait vu s'afficher une erreur technique.

**CONTRAINTE MAJEURE ÉTABLIE POUR LE PATCH 3d.** Les trois RPC d'écriture du rythme REMPLACENT la colonne entière. Aucune fonction d'ajout n'existe. Conséquence directe : un utilisateur qui viendrait corriger une seule semaine perdrait tout son rythme passé. La fusion devra donc être faite côté page, avant l'appel.
Ce n'est pas une découverte : la réserve figure en VISION depuis le 05/06/2026 et en DETTE #82 aux statuts du 05/06 et du 07/06, où elle ne visait que `complete_inscription_alternant`. Ce que cette session établit, c'est que la contrainte vaut pour les TROIS RPC, et qu'elle cesse d'être théorique puisque l'écran qui va les appeler est le prochain patch.
`confirm_rhythm_calendar_manual` existe, valide les lundis ISO et les statuts, et n'est appelée nulle part. Elle est le candidat naturel du 3d. Elle ne fusionne pas pour autant.

**VALIDATION.** Testée par rechargement, protocole en 11 points, tous verts.

**DETTES.** #143 mise à jour, périmée depuis le 24/07 et résolue aussi sur `/compte`. #150 mise à jour, lecteurs vivants et séquence contrainte. #159 créée, ville muette des profils `les_deux`. #160 créée, `annonces.statut` lue mais inexistante. #82 et #131 mises à jour.

**RESTE** : patch 3d (planning éditable, avec fusion du rythme existant), puis 4, 5, 5 bis, 6, 7. La modale de blocage est à retravailler visuellement : elle ne dit pas quelle ville est concernée et n'offre aucun chemin vers le tableau de bord.

## 2026-08-08 — [VRAIE VIE] Description d'expérience SNSM en ligne

Texte publié, écrit par Côme, corrigé et taillé. Trois paragraphes : entrée en 2022 et
éventail des expériences, contenu de la formation, fonctions actuelles.

ÉCARTÉ DU TEXTE, motifs valant pour tout support futur : la phrase sur l'engagement, le
respect et le dévouement (règle §1 bis, écrire ce qu'on a fait et non ce qu'on est) ; le
décompte de diplômes assorti d'un « plus possible maintenant » (doublon avec la section
Certifications, et affirmation invérifiable sur ce que la SNSM autorise aujourd'hui) ; le
paragraphe sur les projets à venir (une description d'expérience raconte ce qui est fait, et
« être vraiment confronté au danger de la mer » dévalorisait l'activité actuelle).

ERREUR RATTRAPÉE PAR CÔME EN SÉANCE : une version intermédiaire plaçait le pilotage de moto
nautique dans l'année de formation initiale, alors que cette qualification est postérieure
(juin 2026). Elle figure en Certifications, pas dans le texte. Leçon : ne pas agréger une
liste de compétences sans vérifier qu'elles tiennent dans la fenêtre temporelle annoncée.

REPROCHE FONDÉ DE CÔME, à retenir : deux versions successives sortaient de ses mots et
ajoutaient des formules qu'il n'aurait pas écrites. La règle « Côme rédige, Claude corrige et
taille » se tient aussi quand le texte brut demande beaucoup de travail. Corriger n'est pas
réécrire.

DESCRIPTION CONCIERGE AIRBNB EN LIGNE. Trois paragraphes : gestion d'un studio en location
courte durée à Rennes, accueil et visite ; remise en état entre deux séjours ; communication
via la messagerie Airbnb. Écrite par Côme, corrigée et taillée.
Coupes appliquées, motifs réutilisables : la localisation précise du logement (« en bord de
Vilaine »), qui combinée à la description du bien restreint trop le nombre de logements
correspondants sur un support public, alors que le bien n'appartient pas à Côme ; le procédé
de remise des clés, information de sécurité sur un logement identifiable ; « clients » rendu
par « voyageurs », les clients au sens strict étant les propriétaires qui confient le bien.
Aucun chiffre de volume ni de durée : tout chiffre périme sans que Côme s'en aperçoive.
Rappel permanent : le nom du particulier employeur n'apparaît sur aucun support public.

COMPÉTENCES SAISIES, cinq entrées, chacune rattachée à une expérience :
Développement web (Sterny), Premiers secours (SNSM), Sauvetage aquatique (SNSM), Gestion
locative (Concierge Airbnb), Accueil (Concierge Airbnb).
DOCTRINE DE LA SECTION : la section Compétences n'est pas une section d'affichage mais
d'indexation, elle sert au moteur de recherche interne de LinkedIn et non au lecteur humain,
qui juge sur les expériences et les certifications. Conséquences tenues : uniquement des
savoir-faire vérifiables, jamais de qualités personnelles auto-attribuées (rigueur, esprit
d'équipe, leadership, gestion du stress, adaptabilité), qui tombent sous la même règle que le
reste du profil ; toujours choisir l'intitulé du référentiel LinkedIn plutôt qu'un texte libre,
mieux indexé (une saisie libre « accueil » a dû être refaite en « Accueil ») ; chaque
compétence rattachée à une expérience.
ÉCARTÉS, motifs : « Bénévole » et « Entrepreneur », qui sont des statuts ou des postures et non
des savoir-faire, le second faisant en outre doublon avec le titre du profil ; les logiciels de
conception de l'ENSAB, non pratiqués depuis plus d'un an, en application du critère « ne rien
inscrire qu'on ne pourrait pas défendre si on est interrogé dessus » ; les noms de technologies
côté développement, « Développement web » disant vrai sans exposer.

DÉCISION — PAS DE SECTION BÉNÉVOLAT. L'engagement SNSM occupe déjà une entrée Expérience
complète, avec description et six certifications rattachées. Une section Bénévolat n'aurait
qu'un seul élément à recevoir, le même, ce qui ferait apparaître deux fois la même chose sur
la même page. L'objection « un lecteur pourrait croire à un emploi salarié » ne tient pas : le
champ Type d'emploi est volontairement vide et le nom de l'organisation est explicite.
Réouverture possible seulement si un second engagement bénévole, distinct de la SNSM, existe
un jour.

DÉCISION — BANNIÈRE REPORTÉE. Publication prévue avec la bannière par défaut. Motifs : elle ne
bloque pas la publication ; une bannière portant logo, slogan ou capture du site devient un
support public de communication sur Sterny et rouvre la doctrine §1 ter ; aucune charte
visuelle Sterny n'existe pour ce format. À traiter avec la Page entreprise, même sujet, déjà
reportée après publication du profil.

RESTE SUR LE PROFIL, dans l'ordre : photo de profil (seul élément bloquant, non faite au
08/08), puis checklist de sortie et publication. La description CHAPIN TRAITEUR reste
volontairement vide.

## 2026-08-07 — [DEV] Patch 3b livré : Tes études + À propos de toi, fonction d'enregistrement commune, extinction temporisée des erreurs de champ

**DÉCISION D'ARCHITECTURE ACTÉE — fonction commune paramétrée par la liste de colonnes.**
`enregistrerCategorie({ cle, valider, colonnes, avantEcriture, champsInitiaux })` introduite au
patch 3b et utilisée par les deux nouvelles catégories. `enregistrerInfosPersonnelles` n'est PAS
migrée : elle venait d'être corrigée et vérifiée, la toucher aurait remis en jeu du code validé.
Sa migration est portée au patch 5, déjà prévu pour la revue finale de la sauvegarde. Deux
mécanismes coexistent temporairement, c'est assumé et daté.
Motif décisif : la liste des colonnes écrites devient un argument déclaré au lieu d'un objet
construit à la main sous un commentaire d'avertissement. Six objets écrits à la main, c'est six
occasions de laisser fuir une colonne et de détruire des données en base. Motif secondaire, en
réalité le plus lourd : chaque catégorie a besoin de cinq états propres (chargement, enregistré,
erreur globale, erreurs de champ, instance de secousse), soit trente déclarations sur six
catégories dans un fichier qui en compte déjà plus de 600 lignes.
Le crochet `avantEcriture` est implémenté mais non utilisé par 3b. Il existe pour que l'upload
photo (patch 5) et les documents (patch 4) puissent interrompre AVANT toute écriture en base,
conformément à la doctrine tout-ou-rien du 03/08.

**Prérequis découvert à l'arbitrage, non anticipé dans la séquence.** Le SELECT de chargement ne
demandait pas ecole, annee_etudes, filiere ni bio. Sans correction, les champs se seraient
affichés vides malgré des valeurs réelles en base, et le premier enregistrement les aurait
écrasées. C'est le piège critique par un autre chemin que celui surveillé : il ne suffit pas que
l'objet écrit soit restreint, il faut aussi que les valeurs affichées soient chargées. À vérifier
à chaque patch de catégorie restant.

**DÉCISION PRODUIT — extinction temporisée des erreurs de champ, unifiée sur les deux
catégories.** Une erreur de champ s'éteint désormais seule après 3 secondes, en plus de s'éteindre
pendant la frappe dès que le champ redevient valide. Argument retenu, formulé par Côme : un
message permanent capte le regard en continu alors que l'information est comprise en une seconde,
la correction se fait dans le champ et non dans le message, et un clic sur Enregistrer le
réaffiche si besoin. J'avais recommandé l'inverse.
DÉCOUVERTE QUI A TRANCHÉ LE DÉBAT : « Infos personnelles » possédait DÉJÀ cette extinction depuis
le patch 3a, par un useEffect dépendant de l'objet d'erreurs, jamais relevée. Ce n'était donc pas
un ajout mais une divergence de 3b à corriger. Toute la discussion préalable, des deux côtés,
reposait sur une prémisse fausse faute d'avoir lu le code.
IMPLÉMENTATION — une seule minuterie par catégorie, jamais une par champ : trois minuteries se
désynchroniseraient et éteindraient les messages un par un, exactement l'effet de dispersion
corrigé le 03/08. Minuterie armée là où les erreurs sont posées, donc au clic sur Enregistrer,
et jamais réarmée par la revalidation à la frappe. Le useEffect de « Infos personnelles » a été
remplacé par ce mécanisme : deux implémentations d'un même comportement finiraient par diverger.
Remplacement dans du code validé, assumé.

**TROIS FUITES DE MINUTERIE CORRIGÉES INCIDEMMENT.** `prefsSaveTimeout`, `etudesErreurTimeout` et
`aproposErreurTimeout` n'étaient annulées nulle part au démontage du composant : quitter /compte
juste après une action laissait une minuterie tenter de modifier un composant disparu. Deux
venaient du patch 3b, la troisième était antérieure. Le useEffect de nettoyage couvre désormais
les six références du fichier. Constat de méthode : toute nouvelle référence de minuterie doit
être ajoutée au nettoyage de démontage dans le même patch qui la crée.

**Composants partagés consommés, jamais modifiés.** AutocompleteInput pour école, année d'études
et filière (saisie libre à suggestions, comportement de l'ancienne page conservé), TextArea pour
la bio. AutocompleteInput n'expose aucune prop d'erreur, comme CustomSelect : surcouche locale
`.gc-champ-autocomplete-invalide`, variant `:hover:not(:disabled)` pour dépasser la spécificité de
la règle de survol du composant, sans `!important`. DETTE #155 élargie en conséquence.

**Suggestions recopiées, non importées.** Les trois constantes viennent de ModifierProfilPage,
page vouée à suppression au patch 7. Valeurs conservées SANS accent, identiques à la source :
les accentuer créerait deux variantes de la même école entre anciens et nouveaux utilisateurs.
Seuls les libellés de champ sont accentués. Le format « Nom — Ville » des suggestions d'école est
celui que l'ancienne page écrit réellement en base, vérifié sur pièces.

**Deux défauts corrigés avant validation.** (1) Le garde-fou propriétaire était un useEffect placé
APRÈS `if (!user) return null`, ce qui viole les règles des hooks React et aurait fait planter la
page au premier chargement réel. Le build ne le voyait pas. Déplacé avant le retour anticipé.
(2) Les valeurs partaient en base nettoyées de leurs espaces mais le champ affiché ne l'était pas,
laissant le bouton actif après un enregistrement réussi. Nettoyage unique en amont, propagé à
l'état affiché, aux colonnes et à la référence.

**DÉCISION PRODUIT — un propriétaire ne voit ni « Tes études » ni « Ton alternance ».** Il n'est
pas alternant, il n'a ni école, ni filière, ni rythme. Filtrage à la construction de la sidebar,
avec repli sur une catégorie visible si la catégorie active vient d'être masquée.
POINT OUVERT REPORTÉ AU PATCH 4 : un propriétaire voit toujours « Ton garant », qui est une pièce
de dossier locataire. À trancher quand le patch 4 traitera cette catégorie.

**Champs études obligatoires sur /compte**, comme sur l'ancienne page : un champ vide bloque
l'enregistrement, message rouge sous le champ, bouton qui tremble, rien n'est écrit. Validation au
clic sur Enregistrer uniquement. Bio optionnelle, 300 caractères, texte gris statique sans
compteur, reprise à l'identique de l'existant.

**LEÇON DE MÉTHODE, À RETENIR.** Trois affirmations non vérifiées ont été avancées par Claude.ai
dans cette session : un format de suggestion supposé au lieu d'être lu, un comportement de
« Infos personnelles » décrit de mémoire, et une correction demandée sur une prémisse fausse.
Claude Code les a refusées sur pièces à chaque fois, et c'est le comportement voulu. La règle
« find avant cat » vaut pour un raisonnement autant que pour un chemin de fichier : une
affirmation sur le code se vérifie avant d'être écrite dans un prompt.

**Validation par rechargement, protocole complet en 8 points, tous positifs.** Lecture,
indépendance des deux boutons, retour arrière, refus sur champ vide, écriture vérifiée par
rechargement, intégrité de /profil/modifier après enregistrement des études, intégrité symétrique
après enregistrement de la bio, et masquage propriétaire testé par bascule temporaire de type_user
en base locale puis remise en état. Extinction temporisée validée séparément sur les deux
catégories.

**RESTE** : patch 3c (Ton alternance, villes et statuts, DETTE #143), puis 4, 5, 5 bis, 6, 7.

## 2026-08-03 (suite 2) — [DEV] Corpus documentaire rangé : trois étagères, socle réduit de 60 %

**Constat de départ.** 15 documents étaient chargés dans le project knowledge à chaque session,
environ 15 600 lignes, dont 11 décrivaient des chantiers terminés depuis mai. ETAT-COURANT en
pesait 5 366 à lui seul. Cause identifiée : aucune règle ne disait quand un document meurt.
Chaque chantier créait le sien, aucun n'était refermé.

**Doctrine actée — trois étagères, une seule règle de chargement.** Ce qui est à la racine de
`docs/` est uploadé, le reste jamais. Racine = les 4 du socle. `docs/ponctuels/` = vivants mais
inutiles à la plupart des sessions, uploadés à la demande. `docs/archives/` = chantiers
terminés, jamais uploadés, conservés et lisibles sur demande. `docs/_audit/` reste gitignoré et
hors de tout. Écrite en CONTEXTE-PROJET §6 ter avec trois règles d'entretien.

**Inversion de méthode en cours de chantier, motif décisif.** Le plan initial créait un dossier
`docs/socle/` et y déplaçait les 4 documents vivants. Abandonné : déplacer les vivants cassait
toutes les références qui pointent vers eux, à commencer par la liste de démarrage de CLAUDE.md.
Déplacer les MORTS ne casse presque rien, puisque personne ne cite un chantier terminé. Même
résultat, une fraction du mouvement. À retenir pour tout rangement futur.

**Commit 1 (`9322ef4`) — 6 renommages à 100 %.** Vers `archives/` : INVENTAIRE-PLATEFORME,
UNIFICATION-INSCRIPTION, PARSER-AXE-1, AUDIT-FONCTIONNEL-2026-05-04, et par `mv` simple
AUDIT-2026-04-22 (non suivi, resté non suivi). Vers `ponctuels/` : idees-en-attente,
QUESTIONS-PROFESSIONNELS. CLAUDE.md : entrée INVENTAIRE retirée de la liste de démarrage,
« 5 documents » corrigé en 4 à deux endroits, mention de coût en tokens supprimée (un ordre de
grandeur dans un fichier de règles ne sera jamais tenu à jour). 11 chemins corrigés dans
VISION-ARCHITECTURE, DETTE-TECHNIQUE, OAuthHandler.jsx et RhythmManualBuilder.jsx.

**Choix assumé — références corrigées DANS le commit de déplacement**, et non dans un commit
séparé. Un commit qui déplace des fichiers en laissant onze chemins cassés derrière lui n'est
pas atomique, il est incomplet. Conséquence visible : deux fichiers `.jsx` apparaissent dans un
commit `docs:`, ce sont des commentaires, rien d'exécutable.

**Commit 2 (`8381728`) — coupe d'ETAT-COURANT.** Socle = août, juillet, juin (2 755 lignes).
`docs/archives/ETAT-COURANT-ARCHIVE.md` = mai et avant (2 617 lignes). Aucune entrée réécrite ni
résumée. Contrôle d'intégrité : 2 753 + 2 613 = 5 366 lignes d'origine, et 142 + 50 = 192 titres.
Chaque ligne est dans exactement un des deux fichiers.

**Exception unique à la coupe.** La section « ## 7. Règle de mise à jour de ce document » a été
remontée en pied de socle : c'est la procédure de clôture de session du fichier lui-même, pas un
log. Les sections ## 1 à ## 6 sont parties en archive, dont un bloc « État Git » d'avril figé en
dur qui affirmait une branche `main` et listait des commits obsolètes — exactement ce que la
règle « `git log` est la seule source de vérité » vise à éliminer.

**RÈGLE DE MÉTHODE ACTÉE — une entrée datée ne se corrige jamais.** Découverte en séance sur la
ligne 1529 d'ETAT-COURANT : elle cite un chemin déplacé, elle est dans le socle, et elle n'a PAS
été corrigée parce qu'elle appartient à une entrée datée du 07/07. Corriger un chemin dans un log
de session falsifie le log. Portée en CONTEXTE §6 ter Règle 3. Ma consigne initiale disait « au
delà de la ligne 2739 », critère faux : le vrai critère est l'appartenance à une entrée datée,
où qu'elle se trouve.

**Deux erreurs de ma part, rattrapées par Claude Code.** (1) Un `git add docs/archives` aurait
stagé un fichier non suivi que la même consigne interdisait de commiter. (2) Une formule de
contrôle « T+4 » sous-comptait l'en-tête d'archive à 1 ligne au lieu de 4. Dans les deux cas
Claude Code s'est arrêté et a signalé l'écart au lieu d'ajuster. C'est le comportement voulu.

**Découverte annexe, loguée en DETTE #157.** DETTE-TECHNIQUE tourne sur deux formats : les
entrées #42 à #156 sont des titres de niveau 2, les entrées #1 à #41 sont des puces numérotées
sans titre propre. Un `grep "^## DETTE #30"` ne renvoie rien alors que la dette existe et est
vivante. Conversion à faire en session dédiée.

**Ménage disque vérifié, pas traité.** Le backup filter-repo de 620 Mo est bien supprimé. Les
cinq copies du projet subsistent (environ 1,2 Go, toutes figées au 13 avril) et la synchro iCloud
du Bureau est toujours active. État reporté dans `docs/ponctuels/idees-en-attente.md`, session
dédiée. Signalé au passage : un dossier `~/Dev/sterny-secrets` non inventorié, non inspecté.

**Résultat.** Project knowledge : 15 fichiers et environ 15 600 lignes → 4 fichiers et environ
6 200 lignes. Aucune ligne perdue, aucune réécrite.

**RESTE** : reprendre le patch 3b de `/compte` (Tes études + À propos de toi). Question de
cadrage ouverte avant tout code : recopier `enregistrerInfosPersonnelles` par catégorie ou en
extraire une fonction commune paramétrée par la liste de colonnes — avec 3b, 3c et 4, six copies
de la même mécanique sinon.

## 2026-08-03 (suite) — [DEV] Upload photo silencieux corrigé + doctrine d'échec partiel actée

**DÉCISION PRODUIT STRUCTURANTE — tout ou rien sur un enregistrement multi-étapes.** Quand une
partie d'un enregistrement échoue (ici l'envoi du fichier vers le Storage) alors que le reste
pourrait s'écrire, RIEN ne s'écrit. L'opération est interrompue avant l'écriture en base, un
message d'erreur explicite s'affiche, et les valeurs saisies restent à l'écran — l'utilisateur
ne perd aucune saisie. Motif : « Enregistré ✓ » ne doit jamais signifier « enregistré en
partie », sous peine de rouvrir exactement DETTE #149. Vaut au-delà de la photo : la question
se reposera à l'identique au patch 4 (documents + garant), et la réponse est déjà tranchée.

**Option écartée, et pourquoi elle a été sérieusement examinée.** Côme a d'abord penché pour
l'enregistrement partiel (écrire les textes, signaler que la photo n'est pas passée), sur
l'argument réel qu'un utilisateur ayant modifié cinq champs préfère que son travail parte.
Écartée après constat que la variante coûtait trois arbitrages supplémentaires (message
persistant plutôt qu'auto-effacé, cohabitation d'un bouton vert et d'un texte rouge, sort de
la photo en mémoire) là où le tout-ou-rien n'en coûte aucun, et que l'objection de fond tombe
puisque les champs ne se vident pas. À ne pas rouvrir sans fait nouveau.

**Fait technique décisif établi par l'audit** : l'upload (l.345) se produit AVANT le .update()
(l.348). Au moment de l'échec, la base n'a pas encore été touchée — il n'y a donc aucun
rollback à écrire, seulement une interruption. C'est ce fait qui a rendu le tout-ou-rien
gratuit et qui a orienté la décision.

**Cause du silence** : l'erreur d'upload était captée dans `upErr` puis lue une seule fois,
dans un `if (!upErr)`. Aucune branche `sinon` : en cas d'échec la variable était abandonnée,
le flux continuait, le .update() des colonnes texte réussissait, et le chemin de succès
s'exécutait jusqu'à `setInfosSaved(true)`. Ni relance, ni affichage, ni console.error.

**Correctif livré (commit `1694626`, GestionComptePage.jsx + .css)** : branche `if (upErr)`
qui journalise l'objet d'erreur ENTIER en console puis relance une erreur métier, avant le
.update(). Le catch existant et `afficherErreurInfos` ne sont pas modifiés — le mécanisme
d'erreur du patch 3a absorbe le cas tel quel.

**Signalement visuel sur le cercle de la photo.** Le message seul, en bas à droite, est trop
discret quand l'élément fautif est en haut à gauche. État dédié `photoErreur`, volontairement
distinct de `infosErreur` : ce dernier porte aussi les erreurs d'écriture en base, et le
cercle rougirait à tort. Instance distincte de `useShakeButton` pour le cercle, le hook
partagé n'est pas modifié.

**Deux points CSS tranchés, à ne pas re-litiger.** (1) `.gc-photo-invalide` seule perdait
contre `.gc-photo-circle:hover`, plus spécifique : sélecteur renforcé en
`.gc-photo-circle.gc-photo-invalide`, à égalité de spécificité et déclaré après, donc
prioritaire — sans `!important`. (2) Une bordure se trace vers l'INTÉRIEUR et rognait la
photo : remplacée par `outline` + `outline-offset: 3px`, anneau entièrement extérieur.
Divergence assumée par rapport à la grammaire des champs (qui utilise une bordure), motivée
par le fait qu'un cercle contient une image jusqu'au bord, contrairement à un champ de texte.

**Extinction synchronisée** : le timeout unique de 3 s d'`afficherErreurInfos` éteint
désormais le message ET le cercle. Aucun second timeout créé — deux minuteurs distincts
finiraient par se désynchroniser.

**Validation par RECHARGEMENT, et faux négatif traversé.** Un premier test a montré le prénom
conservé après rechargement, ce qui semblait invalider le correctif. Il était faussé : un clic
Enregistrer antérieur, avant la sélection de la photo, avait déjà écrit la valeur. Rejeu propre
(rechargement, valeur témoin, une seule sauvegarde) : le prénom revient à sa valeur d'origine,
rien n'est parti en base. Leçon : sur une page où l'on enchaîne les essais, un test de
non-écriture n'est valable qu'à partir d'un rechargement préalable et d'un unique clic.

**Constats ouverts, non traités dans ce commit** :
- Aucun moyen visible de RETIRER une photo déjà recadrée sans recharger la page. Le bouton
  « Modifier » remplace, il ne retire pas ; `cancelCrop` n'agit qu'avant confirmation. En
  production, si le Storage tombe, l'utilisateur est bloqué : il ne peut plus enregistrer ses
  champs texte tant qu'il ne recharge pas.
- Le bouton Enregistrer apparaît ACTIF juste après un rechargement, alors qu'aucun champ n'a
  été modifié. La comparaison par valeur considère qu'au moins un champ diffère de son état
  chargé — format de date suspecté, non vérifié.
- Non testé : le bouton s'active-t-il quand SEULE la photo change ? La comparaison ne porte
  que sur les 5 champs texte.
- Messages d'erreur spécifiques (session expirée, connexion instable) non branchés : l'objet
  d'erreur réel n'a pas encore été lu en console.

**Bouton « Retirer » construit puis abandonné (décision).** Un bouton d'annulation de la photo
sélectionnée a été codé, testé visuellement, puis supprimé sans être commité. Deux motifs :
il décalait le bouton « Modifier » dans une ligne qui écarte ses éléments aux deux extrémités,
et surtout il occupait l'interface en permanence pour un cas qui ne survient qu'en cas de panne
du Storage, dont le contournement est un simple rechargement de page. Variante proposée en
séance (le bouton « Modifier » rouvre la modale de recadrage sur la photo existante) écartée
aussi : recadrer une photo déjà enregistrée impose de recharger l'image depuis le Storage
distant pour la redessiner dans le canvas, ce qui ouvre des questions d'accès aux fichiers
distants étrangères au sujet. « Modifier » ouvre donc directement le sélecteur de fichiers,
comme avant. À ne pas reconstruire sans avoir lu ce paragraphe.

**Conséquence assumée du tout-ou-rien, à connaître.** Tant que la photo part au clic sur
Enregistrer, un utilisateur qui a sélectionné une photo pendant une panne du Storage ne peut
plus enregistrer ses champs texte : chaque clic rejoue l'upload et rebute sur la même panne,
et rien ne permet d'annuler la sélection. Sortie de secours : recharger la page. C'est le prix
direct du choix tout-ou-rien, identifié et accepté, pas un oubli.

**PISTE DE RÉSOLUTION STRUCTURELLE — déplacer l'upload au recadrage (à traiter en session
dédiée).** La version propre consiste à uploader la photo à la confirmation du recadrage et non
au clic sur Enregistrer. Enregistrer n'écrirait alors plus que du texte : plus aucun blocage
possible, la question du tout-ou-rien disparaît d'elle-même, et l'erreur d'upload survient au
moment et à l'endroit qui l'ont causée. Cela rouvre la décision du 03/08 (upload à
l'enregistrement pour éviter les fichiers orphelins), dont le motif tombe si le nom du fichier
passe de `${user.id}-${Date.now()}.${ext}` à un nom fondé sur le seul identifiant utilisateur :
chaque envoi écrase le précédent, un utilisateur = un fichier, plus d'orphelins. Possible ici
car le recadrage produit toujours un JPEG, donc l'extension ne varie jamais. POINT À TRAITER
DANS CETTE SESSION, ne pas le découvrir en production : à nom de fichier constant, l'URL ne
change plus et le cache navigateur (cacheControl 3600) peut continuer à servir l'ancienne
image après un changement de photo. Chantier hors périmètre du patch 3b.

**Dette de couleur.** Le gris `#6B7280` retenu pour le bouton abandonné n'a pas été commité,
mais le constat reste : GestionComptePage.css n'a aucune variable de gris et en utilise trois
en dur (#9CA3AF, #6B7280, #94A3B8). Rattaché à DETTE #56 (tokenisation des couleurs), aucune
action isolée à prévoir.

## 2026-08-03 — [DEV] Champ Sexe de /compte porté sur le CustomSelect partagé ; upload photo cassé en local

**Patch livré (d1d80fb).** Le `<select>` natif du champ Sexe de `/compte` affichait le menu système de macOS : une balise `<select>` délègue le rendu de sa liste au système d'exploitation, aucun CSS ne peut l'atteindre. Remplacé par le composant partagé `components/auth-wizard/CustomSelect`, déjà consommé par le champ Sexe du tunnel d'inscription avec les mêmes options. Son `onChange` émet `{ target: { name, value } }`, donc le handler existant a été repris verbatim.

**Doctrine de surcouche (décision).** Le composant partagé n'est pas modifié : il est consommé par l'inscription, et changer sa hauteur y produirait une régression invisible depuis `/compte`. Alignement par un wrapper `.gc-champ-select` qui redéclare hauteur (36px au lieu de 44), rayon (10px au lieu de 12), police et ombre de focus, plus l'état d'erreur. La cohérence qui compte est celle des champs voisins de la même carte, pas celle d'une page que l'utilisateur ne regarde pas à ce moment-là.
Lecture actée de la règle « recopié, jamais importé » : elle vise les feuilles de style de PAGES (volumineuses, non scopées, partagées entre pages), pas les feuilles de COMPOSANT autonomes dont toutes les classes sont préfixées. Importer un composant partagé est ce que la règle 8 ter exige.
Le prompt d'audit initial supposait deux chemins de fichier au lieu de les localiser par `find` — corrigé avant exécution. La règle « `find` avant `cat` » vaut aussi pour les prompts destinés à Claude Code.

**Nettoyage.** Le champ Sexe étant le seul consommateur de `.gc-select` en JSX, les règles devenues mortes ont été retirées (`.gc-select`, `.gc-select-placeholder`, chevron en `background-image`).

**Upload photo cassé en local — deux défauts distincts (DETTE #153, #154).** Diagnostic par le panneau réseau : `POST /storage/v1/object/profils/...` renvoie `{"statusCode":"404","error":"Bucket not found"}`, tandis que l'`update` de la table `users` renvoie 204. L'écriture en base de `/compte` fonctionne donc ; seul le stockage échoue, faute de bucket versionné en local. Le second défaut est plus grave : l'erreur d'upload est avalée et le bouton affiche « Enregistré ✓ ». Portée production, quatre pages concernées.

**Leçon de méthode.** Le patch 3a a été logué « validé visuellement » et il l'était : la photo s'affichait après recadrage. Ce qui n'a pas été vérifié, c'est la persistance par rechargement — précisément la vérification imposée au patch 2 pour les préférences email, à cause de DETTE #149. La règle existait, elle n'a pas été portée jusqu'à la photo. « Validé visuellement » ne vaut pas « validé » : toute écriture se vérifie par rechargement.

**Faux positif écarté.** La validation de la date de naissance a été soupçonnée de laisser passer une année à 2 chiffres. Vérification faite : « Date de naissance incomplète » s'affiche correctement sur `09/05/05`. L'observation initiale portait sur l'état avant clic sur Enregistrer, ce qui est le comportement voulu. Aucune dette créée.

**Correction du titre du bloc 2026-07-29.** Ce bloc a reçu par insertions successives le contenu des patchs 2 et 3a, sa ligne RESTE étant remplacée à chaque fois. Son titre annonce toujours « patchs 0 et 1 livrés ». À corriger dans ce même commit.

**RESTE** : corriger l'échec d'upload silencieux sur `GestionComptePage` (DETTE #154), puis patch 3b (Tes études + À propos de toi). Chantier buckets en session dédiée.

## 2026-08-01 — [VRAIE VIE] Doctrine public/privé actée et loguée (CONTEXTE-PROJET §1 ter)

Un arbitrage rendu en conversation les jours précédents n'avait jamais été écrit. Il l'est désormais : nouvelle section **§1 ter — Doctrine public/privé** dans CONTEXTE-PROJET.md, insérée après §1 bis (commit `6e7172b`, +74/−1). Elle vaut pour TOUS les supports — LinkedIn, site, titre Google, mails de démarchage, dossiers d'accompagnement, échanges écoles et agences — et pas seulement pour LinkedIn, contrairement à ce que son origine laissait croire.

EMPLACEMENT, MOTIF DU CHOIX : CONTEXTE-PROJET est le document statique des règles de méthode. VISION-ARCHITECTURE porte la direction produit, ETAT-COURANT porte de l'état daté qui se périme. Une règle qui vaut pour tous les supports et ne change pas au fil des semaines appartient au statique, aux côtés des règles Git et des règles SQL. Le placement en prolongement direct de §1 bis évite de créer un nouveau réflexe de lecture : §1 bis était déjà la section à lire avant toute rédaction publique.

LIGNE DE SÉPARATION ACTÉE : **§1 bis = ce qui concerne Côme la personne. §1 ter = ce qui concerne Sterny le projet.** §1 ter renvoie à §1 bis dès qu'un élément touche au personnel. Conséquence appliquée : les items « chiffre d'inscrits » et « date de lancement » ont été RETIRÉS de la liste d'exclusions de §1 bis et descendus en §1 ter — ils décrivent le projet, pas la personne. Un renvoi les remplace en §1 bis.

CONTENU, EN BREF : un test de tri en une question (constat ou réalisation → public ; paramètre d'exécution → privé), une colonne publique, une colonne privée, et une distinction entre « privé structurellement » (mécaniques, modèle de données, commission, prix) et « privé pour l'instant » (partenariats en négociation, résultats de l'étude, calendrier) — cette seconde catégorie ne bascule que par décision explicite, jamais par usure de conversation.

EXCEPTION ASSUMÉE À LA RÈGLE DE RÉDACTION : §1 ter a été rédigée par Claude, pas par Côme. La règle « Côme rédige, Claude corrige » (CONTEXTE §1 bis) vise les textes PUBLICS, où la voix doit être celle de Côme. §1 ter est un document interne de méthode, au même titre que les règles Git. Exception levée explicitement par Côme, à ne pas généraliser aux textes publics.

RAISONNEMENT CONSIGNÉ DANS LA SECTION, ET POURQUOI : la conclusion « publier plutôt que se taire » a été contre-intuitive pour Côme, dont la crainte initiale était le vol d'idée. Les trois arguments qui l'ont retournée sont écrits DANS §1 ter, volontairement, pour qu'aucune session future ne les reconstruise de travers et pour qu'un futur retour d'inquiétude reparte de là plutôt que de zéro. Ne pas les résumer ni les élaguer.

DOUBLON VOLONTAIRE, DOCUMENTÉ : « Pépite / SNEE / Le Poool tant que ce n'est pas accordé » figure à la fois en §1 bis et en §1 ter. Ce n'est pas un oubli et ce n'est PAS à corriger au nom de la discipline anti-redondance de CONTEXTE §8 bis. La règle a deux fondements distincts (respect d'un tiers en §1 ter, situation personnelle d'accompagnement en §1 bis) et son coût d'infraction est trop élevé pour risquer qu'elle disparaisse d'un côté. Le motif est écrit dans §1 ter même.

NOUVEAU GEL DE LANGAGE ACTÉ — pendant Q-CPI du gel Q-AVO : tant que les questions Q-CPI ne sont pas tranchées, aucun support public n'affirme ni ne suggère que « Sterny » est une marque déposée. Pas de symbole ®, pas de mention « marque déposée », aucune formule équivalente en pied de page, bannière, signature ou mentions légales. Sterny est un nom commercial. Même logique que le secteur d'activité déclaré (« Technologie, information et Internet », jamais « Immobilier ») : ne rien affirmer publiquement sur un statut qu'aucun professionnel n'a confirmé. Rattachement fermé dans les deux sens — §1 ter renvoie au Sujet 3 (marque), le Sujet 3 renvoyait déjà à la doctrine.

DÉCOMPTE GIT RECTIFIÉ, point de reprise du 31/07 refermé : le chiffre « 12 commits en attente » annoncé le 31/07 était FAUX. `git log origin/feat/unification-inscription..HEAD --oneline` remonte **2 commits** en avance (`2731ec3` marque, `6e7172b` doctrine). L'écart venait d'un décompte qui ignorait un push antérieur (`2d34fbb..3299c18`) : `e0a9f86` (section Infos LinkedIn) est déjà sur origin. Aucun commit perdu. Leçon de méthode : un décompte annoncé par une session n'est pas un décompte vérifié — exiger la sortie de la commande.

SUITE IMMÉDIATE : le sujet 2 (descriptions d'expérience LinkedIn, priorité Sterny) devient déblocable. C'est le premier test réel de §1 ter — la description d'expérience Sterny est le seul endroit du profil où le mécanisme peut apparaître, depuis qu'il a été sorti de la section Infos. Reste également ouvert : mail à Le Poool sur la marque, et la vérification du présent « je cumule plusieurs emplois » en section Infos au regard des dates des entrées Expérience.

POINT ANNEXE À TRAITER PLUS TARD : 3 fichiers non suivis (`??`) traînent dans `docs/`. Hors périmètre, sans effet sur les commits du jour, mais à identifier et trancher — un fichier non suivi finit perdu ou commité par accident.

## 2026-08-01 — [VRAIE VIE] Description d'expérience Sterny publiée sur LinkedIn (sujet 2 clos)

Premier test réel de §1 ter, le jour même de sa création. La description d'expérience sous l'entrée « Fondateur — Sterny » est rédigée et EN LIGNE. Enjeu rappelé : depuis que le mécanisme a été sorti de la section Infos (arbitrage du 31/07, point 4), c'est le SEUL endroit du profil où Sterny peut exister en détail.

TEXTE PUBLIÉ (à ne pas reformuler sans décision explicite) :

Comment se loger quand on est alternant et qu'on partage son année entre deux villes ?
Cette question m'est venue à la rentrée 2025, quand j'ai écouté mes amis se plaindre de ce problème. J'étais persuadé qu'il existait une plateforme pour ça et en cherchant je n'ai finalement rien trouvé.

Entre la tension du marché locatif et l'éloignement entre l'école et l'entreprise, se loger est compliqué et coûteux. Certains renoncent à des opportunités qui leur correspondent vraiment et restent près de chez eux afin d'éviter les difficultés de logement.

Sterny est une plateforme de mise en relation pour le logement des alternants. Un alternant peut y proposer son logement pendant ses semaines d'absence, en chercher un dans l'une de ses deux villes, ou les deux. Il ne paie que les semaines qu'il occupe.

Tout fonctionne à la semaine, avec une seule personne dans le logement à la fois. La plateforme s'adapte au rythme de chaque alternant. Comme les calendriers ne s'emboîtent jamais parfaitement, chacun peut combiner plusieurs logements pour couvrir toutes ses semaines.

Un alternant ne peut pas proposer son logement sans l'accord de son propriétaire, qui a donc lui aussi un rôle sur la plateforme.

La plateforme est encore en cours de développement, et accompagnée d'une étude de terrain menée auprès d'alternants.

MISE EN FORME : retour SIMPLE après le point d'interrogation (pas de ligne vide), lignes vides entre tous les autres paragraphes. Motif : l'aperçu de profil ne montre que 2 lignes avant « …voir plus » — une ligne vide aurait affiché la question suivie de blanc, sans amorce de récit. 1 324 caractères sur 2 000.

NOUVELLE RÈGLE DE RÉDACTION — RETENUE EN « JE », formulée par Côme et réutilisable sur TOUTES les descriptions à venir : le texte ouvre à la première personne puis laisse le projet occuper l'espace, sans y revenir. Motif de Côme : à 21 ans, un texte qui parle beaucoup de soi se lit comme de l'auto-promotion ; un texte qui ouvre en « je » puis s'efface se lit comme quelqu'un qui a fait des choses. Ce n'est PAS un oubli de rédaction et ce n'est pas à « corriger » par une session future. Conséquence appliquée : une fin en « je » avait été proposée pour boucler le texte, elle a été écartée au nom de cette règle.

BASE DE DÉPART : le formulaire d'inscription Le Poool (5 blocs rédigés par Côme). Blocs 1 (Description), 2 (Problématiques) et 3 (Cible) réutilisés. Blocs 4 et 5 ÉCARTÉS EN ENTIER :
- Bloc 4 Concurrence — « Sterny n'a pas de concurrent direct » est invérifiable et affiche publiquement qu'un terrain est libre. Nommer Studapart et Airbnb expose sans bénéfice.
- Bloc 5 Innovation — « l'innovation n'est pas technologique, elle est dans l'usage » contredit le secteur déclaré, invite à conclure que rien n'est difficile à construire, et est faux au regard du travail réel.
Également coupés : l'ambition « faire de Sterny la référence en France » (auto-proclamée, invérifiable, affaiblit un texte qui ne tient que par des faits) et les plans écoles/agences (intentions, pas réalisations ; l'orientation mutuelle décrit un arrangement commercial).

COUPES DE PRUDENCE, MÊME MOTIF — la seule chose que Côme ne peut pas soutenir lui-même :
- « la hausse des loyers » RETIRÉE. Vérification faite le 03/08 : la zone tendue couvre ~1 150 communes, mais l'encadrement strict des loyers ne s'applique qu'à 9 territoires (Paris, Lyon-Villeurbanne, Lille, Bordeaux, Montpellier, Grenoble, Pays Basque, Plaine Commune, Est Ensemble) — ni Rennes ni Nantes. Le dispositif expérimental n'est prolongé que jusqu'au 25/11/2026 et un décret de juillet 2026 reconduit le plafonnement des hausses d'un an. Motif de la coupe : PAS la fausseté, mais l'impossibilité de la défendre en rendez-vous, et le fait que le cadre bouge tous les ans. « Tension du marché locatif » conservée (notion officielle) et « coûteux » aussi (un niveau, pas une évolution).
- « dans toute la France » RETIRÉ de la mention d'étude de terrain. C'est l'objectif, pas encore le fait. Second motif : caractériser l'échantillon ouvre la porte à « combien ? quelles villes ? », dont la réponse est en colonne privée (§1 ter).

ANCRAGE TEMPOREL — piège évité de justesse. La formule « à la rentrée dernière » avait été retenue, puis rattrapée par Côme : on est en août 2026, elle désigne septembre 2025 AUJOURD'HUI mais basculerait sur septembre 2026 dans cinq semaines. Ce n'était pas une maintenance à échéance lointaine, c'était une bombe à retardement. Remplacée par la date absolue « à la rentrée 2025 ». RÈGLE GÉNÉRALISABLE : tout repère calendaire relatif à un cycle scolaire (« la rentrée dernière », « en septembre dernier ») bascule à la date du cycle suivant, pas au 31 décembre. Aucune maintenance ne subsiste sur ce texte.

MOT ÉCARTÉ — « écosystème ». Le terme figurait dans la phrase sur le propriétaire (repris du formulaire Le Poool). Abandonné après vérification : un écosystème suppose des acteurs qui interagissent, or le propriétaire AUTORISE — c'est une condition, pas une interaction. Remplacé par « qui a donc lui aussi un rôle sur la plateforme ». Leçon : ne pas garder un mot conceptuel qui ne décrit pas le fait.

DÉTAIL RÉCLAMÉ PUIS ÉCARTÉ PAR CÔME LUI-MÊME : ajouter que l'alternant renseigne son emploi du temps à l'inscription et que toute la plateforme raisonne ensuite dessus. C'est la dérivation, donc colonne privée de §1 ter, et c'est l'argument n°2 du raisonnement consigné (ce qui coûte à reproduire, c'est le modèle de données). Le mot « emploi du temps » pointe directement vers le parser, l'actif le plus copiable. Remplacé par « La plateforme s'adapte au rythme de chaque alternant » — le bénéfice sans la source. Côme a lui-même écarté « à l'inscription » et « n'a plus à s'en occuper », encore trop proches d'un détail d'exécution. §1 ter a donc fonctionné exactement comme prévu.

DATE DE L'EXPÉRIENCE STERNY MODIFIÉE : de **avr. 2026 → déc. 2025**. Corrige la décision du 29/07 qui alignait la date d'expérience sur l'immatriculation de la micro-entreprise. Motif : le champ Expérience LinkedIn décrit une ACTIVITÉ, pas une personne morale — décembre 2025 est le début réel du travail sur Sterny. Bénéfices : le profil devient cohérent avec la description (question en septembre 2025, travail à partir de décembre, immatriculation en avril 2026) et quatre mois de travail réel deviennent visibles. **AVRIL 2026 RESTE LA DATE À DONNER SUR TOUT DOSSIER ADMINISTRATIF** (incubateur, financement, formulaire officiel) : c'est la date d'immatriculation, elle seule fait foi. Ne pas « corriger » LinkedIn vers avril 2026 dans une session future.

EXCEPTION DE MÉTHODE ACTÉE PAR CÔME (03/08) : la règle « Côme rédige, Claude corrige » (CONTEXTE §1 bis) reste la règle par défaut sur les textes publics. Mais quand Côme demande explicitement à Claude de rédiger, il assume le contournement. Consigne de Côme, mot pour mot : « pars du principe que si je te demande c'est que je suis ok pour contourner une règle, c'est moi qui rédige ces docs, je reste le seul maître de la conv, mais merci de prévenir quand je contredis les docs ». CONDUITE ATTENDUE DE CLAUDE : signaler l'écart UNE FOIS, brièvement, puis exécuter sans y revenir. Ne pas répéter l'objection, ne pas la reformuler au tour suivant.

RESTE À FAIRE SUR LE PROFIL LINKEDIN : photo de profil, bannière, descriptions des expériences SNSM / Concierge Airbnb / CHAPIN TRAITEUR, Bénévolat, Compétences. Puis checklist de sortie (cf. bloc du 29/07), publication, et enfin Page entreprise.

RESTE OUVERT SUR LA FILE DU 31/07 : mail à Le Poool (Sophie Chatelin / Alexis Roussel) sur la marque ; et la question NON TRANCHÉE du présent « je cumule plusieurs emplois » en section Infos, alors que les entrées Concierge Airbnb et CHAPIN TRAITEUR portent des dates de fin (juin 2026). À DEMANDER à Côme, ne rien déduire.

POINT ANNEXE TOUJOURS OUVERT : 3 fichiers non suivis (`??`) dans `docs/`, à identifier et trancher.

## 2026-07-29 → 07-31 — Surface unifiée de gestion de compte : patchs 0 à 3a livrés

**Décision structurante actée — fichier neuf, pas de transformation en place.** La surface est
construite dans `src/pages/compte/GestionComptePage.jsx/.css` (route `/compte`) plutôt qu'en
transformant ModifierProfilPage sur place. Motif décisif : ModifierProfilPage.css est consommé
par ModifierProfilProprietairePage.jsx et CompleterProfilPage.jsx — en n'y touchant jamais, le
risque de casser ces 2 pages ne diminue pas, il disparaît. Bénéfices annexes : les 2 pages
actuelles restent fonctionnelles pendant tout le chantier, le rollback se réduit à supprimer un
fichier, et les constats 2 et 3 de DETTE #152 deviennent sans objet. Coût assumé : duplication
temporaire + un patch de ménage final (patch 7), à enchaîner immédiatement après le recâblage
et non "un jour calme".

**Patch 0 — prérequis vérifiés (lecture seule).** Préfixe CSS `.gc-` LIBRE (0 occurrence en CSS
comme en JSX ; alternatives `.cpt-` et `.acc-` également libres). Route `/compte` LIBRE (les
occurrences de "compte" dans src/ sont du texte d'UI vers /inscription et /connexion).
`getInitials` : export nommé dans `src/utils/formatters.js` l.12, déjà importée par 4 fichiers.
Convention d'icônes du projet = SVG inline écrits à la main (viewBox 24×24,
stroke="currentColor", strokeWidth 1.5) ; `lucide-react` est bien installée mais n'est utilisée
que dans components/rhythm/RhythmFileUpload.jsx — ce n'est PAS la convention. Précédent de
sidebar : DashboardAdminPage.jsx (sidebarItems groupés + showSection), à copier dans l'esprit,
aucun composant partagé n'existe. **Constat critique** : DashboardAdminPage.css définit
`.sidebar-item`, `.sidebar-section` et `.sidebar-label` SANS préfixe, donc globales — c'est ce
qui rend le préfixe `.gc-` obligatoire et non cosmétique.

**Patch 1 — coquille livrée et validée visuellement.** Sidebar de 8 catégories en 3 groupes,
carte d'identité en haut (avatar via photo_profil_url ou initiales), panneau de contenu avec un
placeholder par catégorie, navigation fonctionnelle. Prefill copié de ParametresPage (SELECT
prenom, nom, email, telephone, type_user, photo_profil_url). Garde `if (!user) return null`
reprise de ParametresPage.jsx l.43 — protège de la page blanche en local, où le bypass DEV de
DashboardLayout laisse rendre la page sans utilisateur. Aucune sauvegarde, aucun bouton
Enregistrer à ce stade.

**Correction d'alignement post-validation.** Premier rendu déséquilibré : les 2 colonnes
prenaient leur hauteur naturelle (sidebar ~500 px, panneau 420 px) et le bloc se tassait en haut
de l'écran. Corrigé par `align-items: stretch` + `min-height: calc(100vh - 160px)` sur
`.gc-layout`, retrait de `position: sticky` sur `.gc-sidebar` (incompatible avec une colonne
étirée — une colonne pleine hauteur n'a plus rien contre quoi coller), `min-height: 0` sur
`.gc-panel`, et `min-height: auto` sous 900 px. Validé visuellement.

**Séquence de patches arrêtée (8 étapes)** : 0 prérequis ✅ · 1 coquille ✅ · 2 groupe Compte +
Notifications avec CSS de modale scopé `.gc-modal-*` · 3 groupe Profil (4 catégories, photo +
crop, fix DETTE #143 porté) · 4 groupe Dossier (documents + garant) · 5 enregistrerProfil porté
+ bouton unique sur les 6 catégories de formulaire · 6 recâblage des liens (burger,
UserDropdown, ProfileMiniBar, ProfilPage, CompleterProfilPage) + redirections des anciennes
routes · 7 suppression de ModifierProfilPage.jsx et ParametresPage.*, ModifierProfilPage.css
NON supprimé mais renommé en feuille partagée pour ses 2 consommateurs. L'ordre n'est pas
cosmétique : le patch 2 traite le plus risqué (les modales) sur la plus petite surface et sans
aucune logique de sauvegarde.

**Point ouvert reporté** : sous 900 px, `.gc-groupe-label` s'aligne en ligne avec ses items au
lieu de rester au-dessus (label et items sont frères dans le JSX ; il faudrait un wrapper
d'items). Fonctionnel mais imparfait — délibérément groupé avec les futurs ajustements de
largeur/densité plutôt que traité en aller-retour isolé.

**Patch 2 — catégories Compte et Notifications livrées et validées visuellement.**
`useAccountActions` réutilisé plutôt qu'une troisième implémentation inline : la divergence de
validation du mot de passe (minimum 6 caractères dans ModifierProfilPage, 8 dans le hook)
disparaît de fait sur la nouvelle surface. Structure de `preferences_email` confirmée à
l'audit : objet à 6 clés booléennes (alertes, messages, candidatures, paiements, baux,
marketing), lues avec `!== false` (défaut true) ; autosave debounce 500 ms porté sans
changement de comportement. **Écriture en base vérifiée par bascule d'un toggle puis
rechargement de page** — le retour visuel seul ne prouve rien, c'est précisément le symptôme
de DETTE #149. Déconnexion testée réellement (signOut puis tentative de retour sur /compte) :
fonctionne.

**Pièges DETTE #152 traités par construction.** `.gc-modal-overlay` redéfinit TOUTES les
propriétés (position, fond, backdrop, z-index, centrage, padding), sans dépendre d'aucune règle
globale — le `display:none` fuyant de ContratLocationPage.css ne peut plus l'atteindre, et
aucun override de rattrapage n'est nécessaire. `.gc-modal-pwd-group input.pw-has-reveal
{ padding-right:44px }` présent, contre l'écrasement de spécificité (0-1-1 vs 0-1-0) qui
superposerait l'œil au texte. `.gc-modal-pwd-msg` : version toujours visible retenue
(DashboardProprietairePage) plutôt que la version `display:none` (DashboardLocatairePage) —
choix explicite du comportement déterministe.

**Hiérarchie typographique du panneau.** Le titre de catégorie était visuellement confondu avec
les sous-titres de section (tous deux 11 px, majuscules, espacés — seule la couleur les
distinguait). `.gc-panel-titre` reprend désormais les valeurs de `.aw-screen-title` des pages
d'auth : DM Sans, 18 px, weight 300, letter-spacing 3px, uppercase, #E8622A. Valeurs
**recopiées, pas importées** — la nouvelle surface ne crée aucune dépendance vers le CSS des
pages d'auth. `text-align: center` volontairement non repris (panneau aligné à gauche).

**Décision d'écriture — accents.** La nouvelle surface est intégralement accentuée. Le reste de
l'application conserve ses textes sans accents ; c'est une habitude héritée, pas une décision
produit, et elle n'est pas propagée ici. Portée strictement limitée à
GestionComptePage.jsx — aucune campagne globale. La ligne "Dernière modification inconnue" sous
le mot de passe a été supprimée : elle exposait une limite technique sans rien apporter à
l'utilisateur.

**Séquence révisée — le bouton Enregistrer arrive avec les premiers champs.** L'ordre logué le
29/07 plaçait toute la sauvegarde au patch 5 : les patchs 3 et 4 auraient affiché des champs
invérifiables en base, et le patch 5 aurait concentré le câblage de 6 catégories d'un coup.
Nouvelle séquence : 3a Infos personnelles + bouton · 3b Tes études + À propos de toi · 3c Ton
alternance (villes, statuts, DETTE #143) · 4 Dossier · 5 revue finale de la sauvegarde ·
5 bis garde de sortie · 6 recâblage des liens · 7 ménage. Chaque patch étend la sauvegarde au
lieu de la reporter.

**Patch 3a — Infos personnelles livrée et validée visuellement.** Photo avec recadrage (code
maison porté verbatim : géométrie zone 260 px / canvas 400 px, ref de manipulation et
listeners window copiés ensemble — les séparer casse le glisser), 5 champs, premier bouton
Enregistrer. Upload dans le bucket `profils` déclenché à l'enregistrement et jamais au
recadrage : sinon des fichiers orphelins s'accumulent quand l'utilisateur abandonne.

**Piège d'écriture neutralisé.** L'`update` ne porte QUE les 6 colonnes de la catégorie
(prenom, nom, telephone, sexe, date_naissance, photo_profil_url). Reprendre la structure de
`enregistrerProfil` telle quelle aurait envoyé école, filière, bio et garant avec des valeurs
vides — donc détruit des données réelles en base. Vérifié par rechargement de `/profil/modifier`
après enregistrement.

**Comportement du bouton Enregistrer (décision).** Un par bloc, en bas à droite du panneau,
grisé tant que le formulaire est identique à son état chargé, actif dès qu'une valeur diffère,
non cliquable pendant la confirmation. La comparaison se fait par valeur et non par drapeau :
remettre la valeur d'origine regrise le bouton. Chaque clic écrit l'intégralité du formulaire,
pas seulement le panneau affiché — c'est ce qui protège une modification faite sur une
catégorie puis abandonnée en changeant de catégorie.

**Abandon de la redirection après enregistrement (décision).** `enregistrerProfil` affichait un
écran de confirmation puis redirigeait vers le dashboard après 2 secondes : cohérent pour un
wizard qu'on termine, absurde sur une surface où l'on enchaîne les catégories. Remplacé par un
retour visuel de 2 secondes sur le bouton, sans quitter la page. Diverge de la décision du
24/07.

**Modèle de validation (décision, et leçon).** Validation au clic sur Enregistrer UNIQUEMENT.
Une validation à la sortie du champ (`onBlur`) a été implémentée puis retirée : elle reproche à
l'utilisateur un champ qu'il n'a pas encore atteint, et rallume une erreur à chaque changement
de focus — ce qui donnait l'impression que les messages partaient dans tous les sens. Une fois
une erreur affichée, chaque champ se revalide pendant la frappe et s'éteint dès qu'il redevient
valide. **Leçon de méthode** : huit patchs successifs ont porté sur l'affichage des erreurs de
ce seul formulaire (style, position, durée, secousse, bordure, groupement, emplacement réservé,
retrait du onBlur). Chacun était justifié isolément, mais le défaut était de conception, pas de
style. Trancher le modèle d'interaction AVANT de régler le rendu.

**Erreurs à deux niveaux.** Erreur de champ : message sous le champ + bordure rouge, les deux
pilotés par le même état donc effacés ensemble. Erreur globale (échec d'écriture, photo
invalide) : ligne du bouton. Les deux disparaissent après 3 secondes, durée alignée sur le
comportement dominant des pages d'auth (vérifié : 3000 ms partout sauf InscriptionPartagerPage
à 5000). Emplacement du message réservé en permanence (`.gc-champ-erreur-slot`, hauteur fixe)
pour qu'aucune apparition ne déplace le formulaire ; l'espacement vertical vient d'une source
unique (`.gc-champ`), sinon les écarts s'additionnent différemment selon qu'un message est
affiché ou non. Secousse du bouton : hook `useShakeButton` existant réutilisé — il était défini
dans le projet mais importé nulle part.

**Traitements repris de l'auth, recopiés et non importés** : `.aw-textinput.has-error`
(bordure rouge + halo au focus), `.aw-textinput-error` (message sous le champ),
`emFadeIn` (apparition en fondu, renommée `gcErreurFadeIn` pour éviter toute collision
globale). Aucune dépendance CSS créée vers les pages d'auth.

**Garde de sortie — périmètre réduit.** Changer de catégorie n'est PAS une navigation (simple
changement d'état interne) : rien n'est perdu, rien à protéger. La garde ne concerne que la
sortie de `/compte`. Obstacle identifié : le projet utilise `<BrowserRouter>` classique et non
un data router (`createBrowserRouter` + `RouterProvider`), donc `useBlocker` n'est pas garanti
en React Router 7.13 — à valider empiriquement au patch dédié, sans migrer le routeur (ça
toucherait toute l'application pour un besoin local). Repli : avertissement natif du navigateur
via `beforeunload`, non stylable. Aucune garde n'existe aujourd'hui dans le projet.

**RESTE** : style du menu déroulant (le `<select>` natif affiche le menu système de macOS —
aligner sur les pages d'inscription), puis patch 3b (Tes études + À propos de toi).

## 2026-07-28 (suite) — Surface unique de gestion de compte : cadrage validé (sidebar, 3 groupes / 8 catégories)

Session de cadrage, aucun code produit. Fait suite au pivot du 28/07 (onglets abandonnés,
stash@{0} non appliqué).

**Audit lecture seule des 2 fichiers (Claude Code, 28/07)** — faits établis :
- ModifierProfilPage.jsx 794 l. / .css 202 l. ; ParametresPage.jsx 183 l. / .css 227 l. ;
  hook useAccountActions.js 109 l. Les 2 pages sont propres (état HEAD).
- ParametresPage n'écrit rien directement : 1 SELECT de prefill (l.36), toutes les
  écritures passent par useAccountActions.
- Trois découvertes non anticipées : (1) le champ email existe DÉJÀ en lecture seule
  (carte "Mon profil", ParametresPage l.54) — la fusion le préserve, elle ne le crée pas ;
  (2) ParametresPage contient 2 fonctions jamais listées au scope : export de données
  (Edge Function export-data) et déconnexion ; (3) ModifierProfilPage.css est consommé par
  2 AUTRES pages (.photo-* dans ModifierProfilProprietairePage.jsx et CompleterProfilPage.jsx)
  → ce fichier CSS n'est pas librement réécrivable (voir DETTE #152).
- Constat annexe : l'email n'est modifiable NULLE PART sur Sterny (aucun
  auth.updateUser({ email }) dans les 2 fichiers). Manque réel, non traité dans ce chantier.

**Structure validée par Côme — 3 groupes, 8 catégories** :
- Profil : Infos personnelles / Tes études / Ton alternance / À propos de toi
- Dossier : Tes documents / Ton garant
- Compte : Compte (email en lecture, mot de passe, export de données, déconnexion, zone
  danger) / Notifications (préférences email)

Le garant est classé en Dossier et non en Profil : c'est une pièce administrative privée,
pas une donnée publique. Les 12 éléments de l'inventaire des 2 pages sont placés, aucune
perte de fonctionnalité.

**Modèle de sauvegarde validé** : un bouton "Enregistrer" présent sur chacune des 6
catégories de formulaire (groupes Profil + Dossier), et chaque clic écrit L'INTÉGRALITÉ du
formulaire, pas seulement le panneau affiché. Motif : l'état vit dans le composant parent,
donc une modification faite sur un panneau puis abandonnée en changeant de catégorie n'est
pas silencieusement perdue — c'est le piège classique de la navigation libre.
PAS d'autosave : divergence assumée par rapport à la référence claude.ai/settings, motivée
par DETTE #149 (succès affiché sans écriture en base) — la confirmation explicite est le
seul signal qui avait permis de détecter ce bug.
Catégorie Compte : aucun bouton (actions immédiates via useAccountActions + modales).
Catégorie Notifications : aucun bouton (autosave debounce 500 ms déjà en place).

**Conséquence — enregistrerProfil reste monolithique.** Le découpage en sauvegardes par
section décidé le 24/07 était une conséquence mécanique de l'accordéon puis des onglets.
Le pattern sidebar + sauvegarde globale l'annule. Un refactor risqué évité, et la logique
DETTE #143 (préservation des statuts de ville, l.202-203 et 422-423) reste intacte à sa
place actuelle.

**Traitement du vide sur grand écran** (remarque de Côme sur le mockup) : bloc centré à
largeur plafonnée (~1040 px : sidebar ~240 + panneau ~780), champs sur 2 colonnes plafonnés
~520 px, hauteur minimale de panneau ~420 px, et carte d'identité (avatar + nom + type de
compte) en haut de la sidebar — reprise de la carte "Mon profil" déjà existante dans
ParametresPage, pas un élément inventé. Valeurs indicatives, à caler visuellement dans
npm run dev.

**Deux grammaires de ligne assumées** : catégories de formulaire = label au-dessus du champ
(style Sterny actuel CONSERVÉ) ; catégories d'action = libellé à gauche / contrôle à droite
(pattern claude.ai/settings). Passer tous les champs au format ligne est une passe de design
séparée, explicitement hors périmètre.

**Hors périmètre explicite** : catégories Paiements et Contrats (features inexistantes,
parquées en idees-en-attente.md) ; ModifierProfilProprietairePage (3e page profil, contenu
structurellement différent — un propriétaire n'a ni rythme, ni école, ni garant) ; refonte
du style des champs.

**Points ouverts non tranchés, à juger en validation visuelle** : (1) "À propos de toi"
(1 seul champ) restera la catégorie la plus maigre — fusion éventuelle dans "Infos
personnelles" à décider dans npm run dev, pas sur mockup ; (2) recâblage du menu burger —
"Mon profil" et "Paramètres du compte" pointeront vers la même surface, et le sort de
ProfilPage (vue lecture seule du profil) reste à trancher à l'étape "recâblage des liens".

**Éléments de ParametresPage à traiter explicitement dans la fusion** (vérifiés contre le
rapport d'audit du 28/07, oubliés au premier cadrage) :
- Le bouton "Modifier" de la carte Mon profil (→ editPath) DISPARAÎT : dans une surface
  unifiée, l'utilisateur est déjà dans la page d'édition. Suppression, pas migration.
- L'email n'est PAS dans le prefill de ModifierProfilPage : c'est le SELECT de
  ParametresPage (l.36) qui le charge. La surface fusionnée doit ajouter `email` à son
  chargement de données, sans quoi la catégorie Compte s'affiche vide.
- PasswordRevealButton N'EST PLUS un import mort. La décision du chantier onglets (nettoyage
  au Patch 3, orphelin après retrait de la section Mot de passe) est CADUQUE : ParametresPage
  l'utilise dans sa modale mot de passe, qui survit à la fusion. Ne pas le supprimer.
- La garde propriétaire existe EN DOUBLE : redirection client de ModifierProfilPage (l.175)
  et calcul de editPath dans ParametresPage selon type_user. Après fusion, une seule garde
  doit subsister — deux gardes concurrentes sur la même surface exposent à une boucle de
  redirection.
- getInitials (utilitaire importé par ParametresPage) devient nécessaire pour la carte
  d'identité en haut de la sidebar. À conserver, pas à réécrire.

**RESTE avant tout code** : rédaction de la séquence de patches, puis validation visuelle
dans npm run dev avant tout commit feat.

## 2026-07-28 — Pivot architecture ModifierProfilPage : onglets abandonnés au profit sidebar

L'approche "wizard → onglets" sur
ModifierProfilPage.jsx (patch structure, non commité) est abandonnée et mise de côté
via `git stash` (stash@{0} sur feat/unification-inscription : "exploration onglets
ModifierProfilPage - abandonnee au profit sidebar 28-07-2026").

Recherche menée sur les patterns de settings UI (sidebar catégories vs onglets
horizontaux ; seuil observé ~5 catégories au-delà duquel la sidebar prend le relais).
Sterny a 6 sections, au-delà du seuil onglets.

Décision : adopter un pattern sidebar verticale + zone de contenu (référence directe :
Claude.ai lui-même, claude.ai/settings), et fusionner ModifierProfilPage + ParametresPage
en une seule surface (au lieu de 2 pages distinctes). Ajout candidat : champ email
visible en lecture dans une catégorie "Compte".

À cadrer en session dédiée (nouvelle conversation, rituel de démarrage standard).

## 2026-07-25 — Checklist session [VRAIE VIE — hors code] : tâches business

7 sujets à traiter dans l'ordre, validé par Côme. Chaque sujet peut être repris dans une conversation Claude.ai dédiée et fraîche pour garder une conversation performante — cocher au fur et à mesure.

1. [x] Questionnaire — nouvelles questions ("difficultés logement" + "Pourquoi ?") — implémenté, bug d'orphelinage corrigé (11 points de redirection audités), tests de parcours complets VALIDÉS (9 profils couvrant toutes les branches : rythme régulier/irrégulier, mono/bi-ville, avec/sans famille, tous modes de logement, renoncement à une opportunité) — CLÔTURÉ 25/07/2026
2. [ ] LinkedIn pro — création/nettoyage
3. [ ] Titre d'apparition Google
4. [ ] Inscription Pépite France
5. [ ] Contacter groupes d'alternants (partage étude terrain)
6. [ ] Contacter écoles d'alternance (démarchage + partage étude terrain rentrée)
7. [ ] Analyser réponses Alice Dutheil (agente immobilière)
8. [ ] Marque Sterny — contacter Le Poool / Pépite / INPI (antériorité identifiée, cf. Sujet 3)

#### Sujet 2 [VRAIE VIE] — Formulation publique canonique (25/07/2026)

Arrêtée après 8 itérations. À réutiliser À L'IDENTIQUE sur tous les supports publics (LinkedIn, titre Google, mails de démarchage, dossiers). Ne pas reformuler au cas par cas.

CATÉGORIE CANONIQUE : « plateforme de mise en relation pour le logement des alternants »

TITRE LINKEDIN VALIDÉ (à coller tel quel) :
Fondateur de Sterny | plateforme de mise en relation pour le logement des alternants

CORRECTION 29/07/2026 : le séparateur passe du tiret cadratin (—) à la barre verticale (|). Libellé strictement inchangé, seul le séparateur change. Motif : le tiret cadratin est perçu par Côme comme une signature d'IA sur un support public ; le tiret court entouré d'espaces se lit comme une faute de frappe. La barre verticale est le séparateur le plus courant des titres LinkedIn, sans connotation ni débat typographique. Cette version est désormais la seule canonique — tout support antérieur portant le tiret cadratin est à corriger.

RAISONNEMENT ACTÉ : la catégorie doit précéder le mécanisme — un lecteur classe avant de comprendre. « Fondateur de Sterny » seul ne crée pas de curiosité mais de l'indifférence : c'est le format le plus banal de LinkedIn. Le titre est tronqué à ~60 caractères partout sauf sur la page de profil ; tout second segment n'y travaille qu'en doublon avec la section Infos, qui le porte mieux. « Étudiant en architecture » est volontairement ABSENT du titre : la juxtaposition ferait lire « projet étudiant » par un responsable de formation. Le statut étudiant apparaît dans Infos, dans Formation, et dans la carte d'en-tête.

ERREURS ÉCARTÉES, À NE PAS RÉINTRODUIRE :
- « deux alternants, un logement » : FAUX. Une personne à la fois ; un alternant peut combiner plusieurs logements.
- « proposer son logement ET en chercher un dans l'autre ville » : FAUX, les deux actions sont indépendantes. Proposer seulement / chercher seulement / les deux, dans une ville ou dans les deux : tous les profils sont valides.
- « chercher un logement AVEC d'autres alternants » : contresens, « avec » signifie cohabiter.
- « étudiants » au lieu d'« alternants » : ouvre sur la colocation classique.
- Tutoiement dans le titre : écarté, lectorat prioritaire = écoles et institutions. Réversible sans coût.

« Mise en relation » est une description COMMERCIALE, sans aucune valeur juridique. Ne protège en rien la qualification réelle de Sterny dans la chaîne locative. Questions Q-AVO sur la sous-location multi-occupants toujours gelées en attente de l'avocate.

RESTE À FAIRE sur le sujet 2 : section Infos (Côme rédige lui-même, Claude corrige et taille — pas de texte pré-fait), photo, bannière, Expérience (Sterny + sauvetage en mer + conciergerie), Licences & certifications (7 diplômes SNSM), Bénévolat, URL personnalisée, réglages de visibilité (voir checklist de sortie).

##### Checklist de sortie LinkedIn (écrite le 29/07/2026)

Cette checklist était renvoyée mais n'avait jamais été rédigée. Réglages à REMETTRE le jour de la publication du profil, le compte étant volontairement en mode invisible pendant toute la phase de conception :
1. Visibilité lors de la consultation d'autres profils → repasser de "Mode privé" à "Votre nom et titre de profil".
2. Préférences du profil public → réactiver la visibilité publique (actuellement Désactivé).
3. Visibilité de l'adresse e-mail → Tout le monde sur LinkedIn.
4. come@sterny.co en adresse principale, comefourel@gmail.com conservée en secondaire.
"Partager les mises à jour du profil" reste DÉSACTIVÉ, y compris après publication.

##### Section Infos — VERSION DÉFINITIVE, en ligne (31/07/2026)

Texte publié :

"En parallèle de mes études d'architecture à l'ENSAB, je consacre mon temps au développement de Sterny, une plateforme de mise en relation pour le logement des alternants.

Parti de zéro, j'apprends à coder pour concevoir l'outil moi-même, tout en allant sur le terrain échanger avec des alternants et des professionnels du logement pour donner vie au projet. À côté, je cumule plusieurs emplois pour le financer.

Je suis aussi secouriste et sauveteur en mer à la SNSM depuis 2022, en saison à Saint-Malo comme sur des postes de secours événementiels."

Les 7 points ouverts sont CLOS. Arbitrages retenus :

- Point 1 — La direction "ouvrir sur le problème, pas sur soi" est ÉCARTÉE. Motif : la section Infos est un descriptif de PERSONNE, pas une accroche produit. Ouvrir sur le problème la faisait lire comme un pitch d'entreprise. Ouverture à la première personne conservée telle que Côme l'avait écrite.
- Point 2 — Sans objet, se réglait mécaniquement avec le point 1.
- Point 3 — Redondance supprimée : la comptabilité du temps n'est plus faite deux fois. L'ENSAB est dite une seule fois, en phrase 1.
- Point 4 — Le mécanisme de Sterny N'EST PAS dans la section Infos, décision assumée. Motif : c'est du détail, et le détail appartient aux descriptions d'expérience. CONSÉQUENCE À TRAITER : le mécanisme n'apparaît donc nulle part sur le profil tant que la description d'expérience Sterny est vide.
- Point 5 — Ligne de contact come@sterny.co : ÉCARTÉE du texte. L'adresse sera visible via le panneau Coordonnées après application de la checklist de sortie.
- Point 6 — "Je ne suis pas alternant" : ÉCARTÉ du texte. Le fait est déjà lisible en Formation (ENSAB, cursus classique) ; écrit noir sur blanc, il ouvrirait une question dont la seule réponse disponible est un récit explicitement écarté (CONTEXTE-PROJET §1 bis). La légitimité est portée par un fait : Côme est allé interroger des alternants.
- Point 7 — Réglé : aucun décompte de saisons SNSM dans le texte, donc aucun risque d'erreur ni de péremption.

RÈGLES DE RÉDACTION DÉGAGÉES, réutilisables :
- Test de tri appliqué à chaque item : "est-ce que ça décrit Sterny ou est-ce que ça décrit Côme ?" Ce qui décrit Sterny descend en description d'expérience. Trois items ont été coupés à ce titre (création de la micro-entreprise — déjà lisible dans le bloc Expérience ; étude de terrain ; échanges avec les professionnels).
- Aucune durée relative dans un texte de profil ("depuis six mois" périme et impose une maintenance mensuelle). Présent simple ou date absolue.
- Champ Infos = texte brut. Trois blocs séparés par une ligne vide, aucun retour à la ligne en milieu de phrase, aucun émoji ni puce (lectorat prioritaire = écoles et institutions).

RÉSERVE ASSUMÉE, non corrigée : le paragraphe 2 compte trois compléments de but ("pour concevoir", "pour donner vie", "pour le financer") et le texte porte trois marqueurs d'addition ("en parallèle de", "à côté", "aussi"). Signalé à Côme, maintenu par choix. Si resserrage un jour : "pour donner vie au projet" est le premier à sauter, il n'énonce aucun fait.

##### Décision — Secteur d'activité déclaré (29/07/2026)

Secteur LinkedIn retenu : "Technologie, information et Internet". PAS "Immobilier" ni "Services immobiliers".
Motif, réutilisable sur TOUT support demandant un secteur d'activité (dossiers, formulaires, annuaires) : les questions Q-AVO sur la qualification réelle de Sterny dans la chaîne locative sont gelées en attente de l'avocate. Aucune auto-classification publique en secteur immobilier tant qu'elles ne sont pas tranchées. Se ranger en immobilier ferait aussi lire Sterny comme une agence.
Note : le secteur est un choix UNIQUE. "Architecture" a été écarté — le secteur décrit l'activité, pas les études, lesquelles figurent déjà en Formation. Même raisonnement que pour le titre (l'architecture juxtaposée fait lire "projet étudiant").

##### État du profil LinkedIn au 29/07/2026 (remplissage structurel terminé)

Renseigné et enregistré :
- Titre : version barre verticale ci-dessus.
- Secteur : Technologie, information et Internet.
- Lieu : Rennes, Bretagne, France.
- Pronom personnel : volontairement vide (aucun signal utile en France).
- URL personnalisée : linkedin.com/in/come-fourel (l'ancienne contenait un accent, qui casse les liens collés en mail, plus un suffixe aléatoire).
- Formation : ENSAB, Diplôme d'études en architecture (DEEA), Architecture, sept. 2023 – juin 2027, niveau Grade licence. "Afficher l'école dans mon résumé" COCHÉ (décision maintenue : le statut étudiant est absent du titre mais présent en Infos, en Formation et dans la carte d'en-tête).
- Expérience 1 : Fondateur — Sterny — Indépendant — Rennes — depuis avr. 2026 (date d'immatriculation de la micro-entreprise, source : annuaire-entreprises.data.gouv.fr). Sterny en texte libre, sans logo : aucune Page entreprise n'existe. Les "Sterny" proposés par LinkedIn (STERNYTENT, STERNY LIMITED, The Sterny Way Foundation) sont des tiers, à ne jamais sélectionner.
- Expérience 2 : Sauveteur en mer — Les Sauveteurs en Mer - SNSM (page officielle, avec logo) — Saint-Malo — depuis sept. 2022. Type d'emploi VOLONTAIREMENT VIDE : aucune option de la liste LinkedIn ne décrit un engagement saisonnier bénévole ; "Intermittent du spectacle" avait été enregistré par défaut et a été retiré. Vide vaut mieux que faux.
- Expérience 3 : Concierge Airbnb — Particulier employeur (texte libre) — CDI à temps partiel — Rennes — depuis janv. 2026. Rémunération en CESU : l'employeur est un particulier, son nom ne doit JAMAIS apparaître sur un support public.
- Expérience 4 : traiteur.
- 6 certifications (voir doctrine ci-dessous).
- Descriptions d'expérience : toutes VIDES, à rédiger après la section Infos.
Profil TOUJOURS EN MODE INVISIBLE. "Informer le réseau" désactivé sur chaque ajout.

##### Doctrine certifications (29/07/2026)

Règle : on saisit la date d'obtention LA PLUS RÉCENTE (dernier recyclage) et la date de fin de validité, pas la première obtention. Mise à jour annuelle au rythme des recyclages. Motif : l'ancienneté est déjà portée par l'entrée Expérience SNSM (sept. 2022 – aujourd'hui) ; la section Certifications sert à prouver que la compétence est VALIDE aujourd'hui. Une date de 2022 sans fin de validité ferait lire un diplôme dormant.
Règle d'écriture : intitulés en toutes lettres, sigle entre parenthèses. Aucun sigle nu — non décodable hors du milieu.

Les 6 publiées :
1. Premiers secours en équipe de niveau 2 (PSE2) — SNSM — mars 2026 → déc. 2027
2. Surveillant sauveteur aquatique littoral (SSA littoral) — SNSM — mai 2026 → déc. 2027
3. Brevet national de sécurité et de sauvetage aquatique (BNSSA) — SNSM — févr. 2023 → déc. 2028
4. Permis plaisance option côtière — Préfecture d'Ille-et-Vilaine — avr. 2023 — sans expiration
5. Marine jet niveau 1 — SNSM — juin 2026 — sans expiration
6. Certificat restreint de radiotéléphoniste (CRR) — nov. 2022 — sans expiration

ÉCARTÉES, avec motif :
- BNSSA F : préparation à l'examen, pas un diplôme.
- PSE1 : expiré (31/12/2023) et couvert par le PSE2.
- FC SSA L MP (mention MP) : expirée au 31/12/2025. À vérifier par Côme avant toute publication.
- Permis B : écarté délibérément. Ne pèse rien auprès du lectorat prioritaire (écoles, institutions), banal à cet âge, et affaiblit par contraste les 6 certifications de sauvetage en mer.

RÈGLE DE DONNÉES PERSONNELLES : ne jamais saisir de numéro de diplôme ou de titre officiel dans le champ Identifiant. Ces documents (BNSSA, permis plaisance) portent photo, date et lieu de naissance. Aucune valeur pour un lecteur, exposition inutile.

##### Page entreprise LinkedIn Sterny — à créer, sujet distinct

Aucune Page n'existe, donc aucun logo n'apparaît sur l'entrée Expérience Sterny. Création volontairement REPORTÉE APRÈS la publication du profil. Deux motifs : (1) une Page est publique immédiatement, elle ouvrirait une vitrine alors que le profil est délibérément invisible pendant la conception ; (2) une Page vide (sans logo, sans bannière, 0 abonné, aucun post) fait plus de mal que pas de Page. Le rattachement du logo se fera après coup en rééditant le champ Entreprise.

##### RESTE À FAIRE sur le sujet 2 (au 31/07/2026)

- Section Infos : FAIT — version définitive en ligne le 31/07/2026 (cf. bloc ci-dessus), les 7 points ouverts sont clos.
- Descriptions des expériences (Sterny, SNSM, conciergerie, traiteur). PRIORITÉ Sterny : depuis que le mécanisme est sorti de la section Infos (point 4), la description d'expérience Sterny est le SEUL endroit du profil où il peut apparaître — tant qu'elle est vide, le mécanisme n'est nulle part.
- Photo de profil, bannière.
- Bénévolat, Compétences.
- Puis : checklist de sortie, publication, et enfin Page entreprise.

#### Sujet 3 [VRAIE VIE] — Marque « Sterny » : antériorité identique identifiée, dépôt NON engagé (31/07/2026)

CONTEXTE : question ouverte par Côme — faut-il déposer la marque maintenant ou attendre ? Crainte exprimée : qu'un tiers dépose avant lui.

CORRECTION DE VOCABULAIRE ACTÉE : on ne « rachète » pas une marque, on la DÉPOSE auprès de l'INPI (Institut national de la propriété industrielle). C'est un enregistrement, pas un achat à un vendeur.

ORDRES DE GRANDEUR (tarifs INPI 2026, vérifiés le 31/07/2026) : dépôt électronique 190 € pour une classe, +40 € par classe supplémentaire. Protection 10 ans, renouvellement 290 €. Aucune redevance remboursée en cas de refus. Le coût réel n'est PAS le dépôt : recherche d'antériorité approfondie et honoraires d'un conseil en propriété industrielle pèsent bien davantage. CONSÉQUENCE : l'argument « attendre d'être sûr du projet avant d'engager la dépense » ne tient pas à ce niveau de prix. Le seul vrai gaspillage serait de déposer sans préparation.

DISTINCTIONS À NE JAMAIS CONFONDRE :
- Nom commercial (déclaré à l'immatriculation) ≠ marque déposée.
- Nom de domaine (sterny.co) ≠ marque déposée. Détenir le domaine ne donne AUCUN droit de marque.
- Une marque ne protège que pour les CLASSES visées au dépôt (45 classes au total, classification de Nice), pas « en général ».

RECHERCHE EFFECTUÉE le 31/07/2026 sur data.inpi.fr, onglet Marques.
PIÈGE RENCONTRÉ, à ne pas refaire : le moteur de recherche de inpi.fr cherche dans les PAGES DU SITE, pas dans le registre. Il avait renvoyé « aucun résultat », ce qui ne voulait rien dire. Le registre des marques est sur data.inpi.fr.

RÉSULTAT — une marque antérieure IDENTIQUE existe :
Marque : STERNY
N° : 1493243 (dépôt international, origine WO)
Enregistrement : 20/08/2019
Origine : enregistrement suisse n° 734963 du 28/02/2019, priorité CH
Titulaire : MARC STERN Perfumes AG, Rue du Château 23, CH-2034 Peseux, Suisse
Mandataire : P&TS Marques SA, Neuchâtel, Suisse (cabinet spécialisé en propriété industrielle)
Territoires désignés : Union européenne, Japon, États-Unis, Chine, Russie
Classes : 06 et 21 — PRODUITS uniquement, aucun service
  - 06 : métaux communs, matériaux de construction métalliques, serrurerie et quincaillerie, tuyaux, coffres-forts, bouteilles métalliques, contenants métalliques pour parfums et eaux de toilette, bouchons et fermetures métalliques
  - 21 : ustensiles et récipients pour le ménage ou la cuisine, brosses, verrerie, porcelaine, faïence, flacons, bouteilles, vaporisateurs et pulvérisateurs à parfum, flasques, bougeoirs
Statut : NON DÉTERMINÉ depuis la fiche publique. L'historique alterne refus provisoires (total et partiel) et déclarations d'octroi de protection, dossier par dossier, sans correspondance territoire/dossier lisible. On ne sait donc PAS si la protection est effectivement accordée dans l'Union européenne, ni pour quel périmètre exact.

DEUX POINTS STRUCTURANTS :
1. L'Union européenne figure parmi les territoires désignés — donc la France est concernée. Ce n'est pas une marque suisse sans effet en France.
2. Recherche d'IDENTIQUES uniquement. AUCUNE recherche de similitudes n'a été faite. Les noms proches (Sterni, Sternly, etc.) comptent tout autant et restent inconnus à ce stade. L'INPI affiche lui-même sur la page de résultats qu'il ne faut pas déposer sur la base de ce seul résultat.

RAISONNEMENT EXPLICITEMENT INTERDIT, à ne réintroduire dans AUCUNE session future :
« Classes 06 et 21, c'est un parfumeur avec de la quincaillerie et des ustensiles de cuisine, aucun rapport avec une plateforme de logement, donc la voie est libre. »
Ce raisonnement part d'un principe juste (une marque ne protège que pour certaines activités) mais son application à un cas concret relève de l'analyse juridique, pas du bon sens. Trois motifs de refus : (a) l'appréciation de la proximité entre activités obéit à des règles propres ; (b) les classes que Sterny doit viser ne sont pas encore déterminées, donc il n'y a rien à comparer ; (c) le titulaire est représenté par un cabinet spécialisé, ce qui implique une probable surveillance des dépôts proches. Claude n'a aucune compétence pour trancher ce point et ne doit pas le faire.

DÉCISION ACTÉE : ne PAS déposer, ne PAS conclure seul. Passer par un professionnel. Questions consignées en série Q-CPI dans QUESTIONS-PROFESSIONNELS.md.

ÉCHÉANCE, pas urgence : l'exposition publique de Sterny augmente (sterny.co indexé, profil LinkedIn à publier, démarchage écoles à la rentrée). La fenêtre où « attendre » est sans conséquence se referme d'elle-même.

À SAVOIR : un dépôt est lui-même une publication (nom du déposant et classes visées deviennent consultables). À mettre en regard de la doctrine public/privé.

PROCHAINES ACTIONS [VRAIE VIE] :
- Contacter Le Poool (Sophie Chatelin / Alexis Roussel) en premier — relation déjà établie, mail court.
- Contacter Pépite Bretagne (Valentine Lamiral / Sandie Lanoë) — dossier déjà en cours.
- Demander un rendez-vous d'information INPI.
- Benoît Guillemin : premier cadrage SEULEMENT. La propriété industrielle est une spécialité distincte, ne pas lui faire porter la décision.
- Conseil en propriété industrielle (professionnel spécialisé) si les étapes précédentes ne suffisent pas.

#### Sujet 4 [VRAIE VIE] — SNEE / Pépite : voie ouverte, dépôt non engagé (25/07/2026)

Blocage potentiel levé : l'ENSAB est connue du dispositif SNEE, confirmé par Valentine Lamiral (Pépite Bretagne) par mail du 02/07/2026. Aucune incompatibilité liée à la tutelle ministère de la Culture.

HISTORIQUE : premier contact le 30/06/2026 sur recommandation de Sophie Chatelin et Alexis Roussel (Le Poool). Un envoi vers contact@pepitebretagne.fr a rebondi le 01/07 (incident temporaire, sans conséquence).

CONTACTS :
- Valentine Lamiral — Pépite Bretagne, chargée de projets entrepreneuriat (valentine.lamiral@univ-rennes.fr)
- Sandie Lanoë — Pépite Bretagne, assistante projet entrepreneuriat étudiant (sandie.lanoe@pepitebretagne.fr). Mail process du 17/07/2026.
- Anne-Marie Havard — enseignante ENSAB (anne-marie.havard@rennes.archi.fr). À indiquer comme enseignante référente sur le dossier, sur recommandation de Pépite. PAS ENCORE CONTACTÉE.

PROCESS : infos sur pepitebretagne.fr/le-snee ; dossier à compléter sur snee.enseignementsup-recherche.gouv.fr/pepite/candidatures ; une fois complété, convocation à un comité d'engagement qui valide ou non. AUCUNE DATE LIMITE communiquée — processus au fil de l'eau.

PROCHAIN JALON : permanence Pépite en visio le 03/09/2026, 12h-13h (inscription sur pepite-bretagne.pepitizy.fr). Permet de poser ses questions sans déposer de dossier.

DÉCISION DE CÔME (25/07) : dépôt volontairement non précipité. Le SNEE engage l'organisation de l'année universitaire ; la décision se prend après information complète, pas dans l'élan.

RÈGLE MAINTENUE : aucune mention du SNEE, de Pépite ou d'un aménagement d'année sur les supports publics tant que le statut n'est pas accordé.

#### Sujet 8 [VRAIE VIE] — Sécurisation de come@sterny.co (SPOF) — NON TRAITÉ

Identifié le 25/07/2026 en marge du sujet 2. Non urgent, à traiter à froid. L'adresse pro conditionne l'accès ET la récupération de tous les comptes de service de Sterny. Sa perte serait difficilement réversible.

À vérifier, un point à la fois :
1. Renouvellement automatique du domaine sterny.co activé, moyen de paiement valide.
2. Adresse de récupération distincte sur chaque compte critique (comefourel@gmail.com convient — jamais come@sterny.co en récupération d'elle-même).
3. Double authentification activée sur les comptes critiques.
4. Codes de secours téléchargés, conservés hors ligne et hors boîte mail.

Point d'attention : si une boîte Google Workspace est rattachée au domaine, la suspension du domaine coupe aussi l'accès à la boîte, donc à la récupération. D'où le point 2.

## 2026-07-25 — Waitlist : 1re inscription depuis juin qualifiée + compteur nettoyé (6 → 3 réels)

Session courte, hors chantier ModifierProfilPage. Aucun code touché, opération de
données en prod uniquement.

**INSCRIPTION DU 25/07 06:21 (Paris) QUALIFIÉE — vrai humain.** Ping Discord reçu, mais
par conception il ne transporte AUCUNE donnée perso (texte fixe, décision du 20/06) :
identifier un inscrit passe donc obligatoirement par la table `waitlist` (SQL editor
prod, RLS admin-only). Le compteur admin (b104416, toujours non déployé) n'affiche
qu'un NOMBRE (`head:true`), jamais un email. L'adresse au format alphanumérique
inhabituel a fait suspecter un robot : écarté. Preuve = mail de bienvenue **Delivered**
dans Resend, donc Gmail a accepté la boîte.

**MÉTHODE DE QUALIFICATION ACTÉE (réutilisable)** : le statut d'envoi Resend
(Delivered / Bounced) est le SEUL test admis pour trancher « adresse réelle ou non ».
Non-intrusif — c'est la lecture de sa propre journalisation d'envoi. INTERDIT : toute
recherche d'identité à partir d'une adresse collectée (moteur de recherche, réseau
social, service de lookup) = profilage hors finalité.

**COMPTEUR FAUSSÉ (trouvaille)** : sur 6 lignes, 3 étaient internes — 2 adresses
appartenant à Côme + 1 placeholder de test (session du 19/02, époque `alertes`).
Origine : la migration alertes→waitlist du 19/06 a ramené ces lignes ; le nettoyage du
20/06 ne portait que sur les tests de ce jour-là. Le compteur affichait donc 6 pour
3 inscrits réels.

**DÉCISION : suppression des 3 lignes internes, pas de colonne de qualification.**
Motif : aucune donnée de TIERS concernée → Q-DPO-010 et Q-DPO-014 (qui portent sur la
conservation de données de tiers) NON engagées ; la minimisation RGPD va dans ce sens.
Une colonne de qualification n'aurait tracé que des tests internes = complexité sans
valeur. Suppression par EMAIL EXACT, jamais par date, avec RETURNING vérifié (3 lignes).
Appliquée via SQL editor prod (ledger de migration prod non marqué, assumé pour une
opération de données). Ledger waitlist : 6 → 3.

**CHIFFRE DE PITCH : 3 inscrits réels (et non 6).** Assumé — un compteur gonflé de
100 % par des adresses internes est un risque de crédibilité bien supérieur au gain
d'affichage, en particulier face au Poool et à Emergys.

**INCIDENT `begin;` SANS `commit;`** : la première tentative de suppression affichait
bien `3`, mais rien n'était persisté (un `count` relancé ensuite renvoyait `6`). Règle
permanente qui en découle → écrite dans CONTEXTE-PROJET.md §6, section « Règles
d'opération SQL en production ».

**GARDE POUR LA SUITE** : ne plus jamais tester la landing PROD avec une adresse réelle
personnelle. Marqueur `test-waitlist@sterny.test` (le domaine de premier niveau `.test`
n'est pas livrable, donc aucun mail ne part) + suppression ciblée immédiate.

## 2026-07-24 (suite 5) — Layout onglets finalisé (une ligne, sans arrondi) + retrait immédiat de Préférences email

Mockup itéré avec Côme (Visualizer) sur la base de la décision "suite 4". Deux
corrections actées, "suite 4" caduque sur ces 2 points précis (le reste — 6 sections,
scope, retrait Mot de passe/Zone danger — reste valable) :

**Correction layout** : "défilement horizontal" (suite 4) remplacé par 6 onglets tenant
sur une seule ligne sans défilement, répartition à largeur égale (flex:1). Soulignement
actif orange #E8622A sans arrondi (trait droit, pas de border-radius). Base visuelle
validée par Côme ("la base est bonne"), des ajustements sont encore attendus par la
suite (pas un design figé).

**Décision produit — Préférences email retirée immédiatement, pas d'attente de DETTE
#151** : contrairement à Mot de passe/Zone danger (retirées sans perte, déjà couvertes
par ParametresPage), Préférences email n'existe nulle part ailleurs pour l'instant.
Côme a tranché : la retirer de ModifierProfilPage dès cette restructuration plutôt que
de la garder temporairement le temps de la migration — acceptant une perte de
fonctionnalité (impossible de gérer ses préférences email) jusqu'à ce que DETTE #151
soit traitée. DETTE #151 mise à jour en conséquence (passe de "migration à faire" à
"fonctionnalité en pause, capacité utilisateur réellement perdue").

**Scope final confirmé : 6 sections, 0 section restante hors profil.** Infos
personnelles, Tes études, Ton alternance, À propos de toi, Tes documents, Ton garant.

## 2026-07-24 (suite 4) — Correction de cap : onglets (pas accordéon), scope réduit à 6 sections profil

Les 3 entrées précédentes de cette session ("suite", "suite 2", "suite 3" — accordéon 9
sections, divergence 8 ter, style .mp-card) sont CADUQUES, remplacées par ce qui suit.
Non supprimées de l'historique (doctrine archiver jamais effacer), mais périmées : ne pas
s'y fier pour la suite du chantier.

**Correction 1 — pattern onglets, pas accordéon.** Côme a corrigé l'interprétation
initiale ("carte, titres empilés, clic pour déplier") après avoir vu le résultat en
mockup : ce n'est pas un accordéon, c'est un système d'onglets/segmented control, sur
le modèle du modal Disponibilités de LogementPage.jsx (state vueActive, soulignement
orange #E8622A actif / gris #94A3B8 inactif, un seul actif à la fois, jamais vide).
Audité en lecture seule : ce control est 100% inline, local à LogementPage.jsx (l.1605-
1630), pas un composant partagé. Différence de fond avec ModifierProfilPage : dans
LogementPage les onglets recolorent une même grille (pas de swap de panneau) ; dans
ModifierProfilPage il faut un vrai remplacement de contenu (champs différents par
section). Décision : le style visuel (soulignement orange, transition) est redéfini
localement dans ModifierProfilPage, sans dépendance vers LogementPage.jsx — même
logique que la décision .mp-card (suite 3, caduque sur le fond mais le principe de
redéfinition locale reste valable). 6 onglets sur une ligne avec défilement horizontal
(décidé par Côme).

**Correction 2 — chevauchement avec ParametresPage découvert et scope réduit.** Audit de
ParametresPage.jsx (canonique, hook useAccountActions, route /parametres accessible
depuis le menu utilisateur) : Mot de passe et Zone danger y sont déjà gérées. Les
sections correspondantes de ModifierProfilPage sont des DOUBLONS PARTIELS — même
fonctions (auth.updateUser, Edge Function delete-account) mais réimplémentées inline
au lieu d'utiliser le hook canonique, avec une divergence de validation mot de passe
(6 caractères dans ModifierProfilPage vs 8 dans ParametresPage/hook). Décision actée :
ces 2 sections sont retirées du périmètre de ModifierProfilPage — aucune perte de
fonctionnalité (déjà couvertes, déjà accessibles), la divergence de validation disparaît
avec le code supprimé (pas de correction séparée nécessaire).

Préférences email (pas un doublon — absente de ParametresPage aujourd'hui) : décision
actée de la déplacer vers ParametresPage, nature "compte" plutôt que "profil". Migration
de code (extraction de sauvegarderPrefsEmail vers ParametresPage) traitée comme une
tâche séparée, non mêlée à la restructuration onglets — voir DETTE #151.

**Scope final de la restructuration ModifierProfilPage : 6 sections.** Infos
personnelles, Tes études, Ton alternance, À propos de toi, Tes documents, Ton garant.
Ordre et contenu de chaque section inchangés par ailleurs (voir entrée "suite" du
24/07, toujours valable sur ce point).

**RESTE avant tout code** : (1) mockup des onglets à valider en détail (Visualizer,
itérations en cours avec Côme) ; (2) DETTE #151 (migration Préférences email) ; (3)
suppression propre du code Mot de passe/Zone danger de ModifierProfilPage.jsx (retrait
simple, aucune fonctionnalité à préserver ailleurs dans ce fichier).

## 2026-07-24 (suite 3) — Style de carte de l'accordéon ModifierProfilPage tranché : redéfinition locale

Audit (lecture seule) des pages connectées existantes : un pattern carte + comportement
cliquable/dépliable existe déjà (.dp-card + .dp-card-toggle + .dp-card-chevron, défini
dans DashboardProprietairePage.css, consommé aussi par DashboardLocatairePage — usage
réel : sections Calendrier/Documents du dashboard propriétaire). Chevron rotatif à
l'ouverture, carte blanche 16px radius / 24px padding / ombre douce, on-brand.

Problème identifié : .dp-card n'est pas un composant partagé propre — c'est une classe
physiquement définie dans un fichier CSS qui fuit déjà vers une autre page (couplage de
fait, dette connue). La réutiliser telle quelle dans ModifierProfilPage aurait ajouté une
3e page dépendante d'un fichier CSS qui ne lui appartient pas.

Décision actée, validée par Côme (24/07/2026) : redéfinition locale dans
ModifierProfilPage.css, sous une nomenclature scopée à la page (ex. .mp-card,
.mp-card-toggle, .mp-card-chevron), reprenant les mêmes valeurs visuelles (rayon,
padding, ombre, chevron rotatif) pour rester on-brand, sans créer de dépendance vers
DashboardProprietairePage.css. Aucune page dashboard n'est modifiée par ce chantier.
La factorisation propre de .dp-card en composant partagé reste une piste valable, mais
constitue un chantier séparé, non traité ici.

Restent à construire (pas encore présents nulle part dans le code, à concevoir avant le
premier patch) : (1) la logique "une seule section ouverte à la fois" — le pattern
.dp-card-toggle existant gère un booléen indépendant par carte, jamais une coordination
partagée entre plusieurs cartes ; (2) le câblage des 9 sections dans ce nouveau
conteneur. La Zone danger réutilisera la modale de confirmation déjà présente dans
ModifierProfilPage (pas une nouvelle .modal-overlay).

## 2026-07-24 (suite 2) — Divergence 8 ter validée : accordéon ModifierProfilPage hors grammaire auth-wizard

Audit de la règle 8 ter mené sur InscriptionAlternantPage.jsx avant toute proposition
de design pour l'accordéon de ModifierProfilPage. Divergence structurelle confirmée et
validée par Côme : la grammaire auth-wizard (AuthScreenContainer carte 460px centrée,
un seul écran à la fois, WizardProgressBar, BottomAuthLinks) est incompatible avec un
accordéon (plusieurs en-têtes de section visibles simultanément, une dépliée, page
connectée large, pas un parcours d'auth linéaire). Précision : "accordéon" désigne ici
uniquement le nouveau composant de ModifierProfilPage — cette restructuration ne touche
à aucune page dashboard existante.

Décision actée : l'accordéon de ModifierProfilPage n'utilise PAS AuthScreenContainer/
WizardProgressBar/BottomAuthLinks. Les briques de champ layout-agnostiques restent
réutilisables (TextInput, TextArea, CustomSelect, AutocompleteInput, PrimaryButton,
PhotoCropperModal). Un nouveau conteneur "carte de section accordéon dashboard" reste
à définir — avant de le créer, audit (lecture seule) des cartes/blocs déjà utilisés
ailleurs dans l'app pour s'en inspirer sans dupliquer un pattern existant, sans modifier
ces pages (voir entrée suivante).

## 2026-07-24 (suite) — Cadrage restructuration ModifierProfilPage validé (wizard → accordéon)

Session dédiée au cadrage de l'abandon du wizard 6 étapes de ModifierProfilPage
au profit d'une page à sections cliquables (décision actée le 23/07/2026).
Pas de code dans cette session, cadrage uniquement.

**Audit lecture seule préalable** : structure actuelle confirmée (794 lignes,
6 étapes + 3 sections déjà autonomes hors wizard : préférences email, mot de
passe, zone danger). enregistrerProfil = un seul update monolithique de tous
les champs. Aucun composant partagé auth-wizard/ utilisé (page entièrement
locale). Détail complet du rapport A-E disponible dans l'historique de
conversation Claude.ai du 24/07/2026.

**Pattern "sections cliquables" vérifié avant réutilisation** : ModifierAnnoncePage
(pressenti comme référence) s'est avéré être un wizard séquentiel classique
(currentStep, display:none/block), PAS un accordéon. Écart constaté et
rapporté au lieu d'être forcé. Le pattern accordéon n'existe nulle part sur
Sterny — à construire de zéro.

**Accès propriétaire vérifié** : /profil/modifier n'a pas de garde de route
par type_user, mais ModifierProfilPage redirige côté client (loadData) tout
type_user === 'proprietaire' vers /profil/modifier-proprietaire (page séparée
existante). Conséquence : l'accordéon est identique pour tous les utilisateurs
qui atteignent réellement cette page (locataire/hote/les_deux) — pas de
version réduite à concevoir. Le garde `userType !== 'proprietaire'` dans
enregistrerProfil est mort en pratique dans ce fichier (à nettoyer
naturellement lors du découpage de la sauvegarde par section, pas un chantier
à part).

**Décisions actées, validées par Côme (24/07/2026)** :
- Accordéon classique : une seule section ouverte à la fois, la première
  ouverte par défaut ("Infos personnelles").
- 9 sections, dans cet ordre : (1) Infos personnelles [ouverte par défaut],
  (2) Tes études, (3) Ton alternance, (4) À propos de toi, (5) Tes documents,
  (6) Ton garant, (7) Préférences email, (8) Mot de passe, (9) Zone danger
  [isolée visuellement en bas, reste un clic → modale de confirmation, pas
  un accordéon à champs].
- Ancrages d'URL par section (/profil#documents, etc.) pour permettre un lien
  direct vers une section précise depuis un futur email/notification.
- Dépendance actée : enregistrerProfil (aujourd'hui un update monolithique)
  devra être découpé en sauvegarde par section — conséquence mécanique de
  l'accordéon, pas un choix à trancher séparément.
- Dette Charte (type_alternance/rythme_alternance) explicitement reportée,
  voir DETTE #150 (DETTE-TECHNIQUE.md).

**RESTE avant tout code** : appliquer la règle 8 ter (CONTEXTE-PROJET.md) —
inventaire des composants auth-wizard/, lecture d'une page de référence
(InscriptionAlternantPage.jsx ou ConnexionPage.jsx), comparaison de grammaire
visuelle — avant toute proposition de design pour l'accordéon. Puis maquette
validée par Côme dans npm run dev avant tout code.

---

## 2026-07-24 — DETTE #149 investiguée : non reproductible, fix DETTE #143 validé

Session dédiée au diagnostic de DETTE #149 (succès affiché sans écriture
en base, constaté le 23/07 sur hote@sterny.test, Nantes→Troyes). Audit
lecture seule puis instrumentation runtime (logs temporaires sur
auth.uid() et comptage de lignes retournées par l'update), aucun code
métier modifié avant diagnostic confirmé.

**Pistes écartées avec certitude par audit de code** :
- Closure figée sur ancien state (enregistrerProfil n'est pas un
  useCallback, pas de tableau de dépendances)
- Mauvais déclencheur (le bouton final appelle bien enregistrerProfil)
- Filtrage silencieux d'une ville hors liste VILLES_DISPONIBLES (champs
  ville = texte libre, updateData sans filtre de liste)
- Mauvaise base de données (.env.local pointe bien sur le Supabase
  local, cohérent avec la vérification psql du 23/07)

**Piste testée en runtime, non reproduite** : 4 tests consécutifs
(Quimper, Paris, Troyes après fermeture complète de l'onglet +
rechargement forcé) ont tous réussi — auth.uid() valide, update
retournant 1 ligne, error: null, changement visible au dashboard. Le cas
exact du 23/07 (Troyes) a été rejoué à l'identique en environnement frais
sans reproduire le bug.

**Conclusion honnête** : pas de cause confirmée. Fermé en
DETTE-TECHNIQUE.md avec le statut "non reproductible", pas "résolu".
Hypothèse résiduelle non vérifiable a posteriori : état HMR (rechargement
à chaud Vite) corrompu pendant la session dev longue du 23/07. À rouvrir
si le symptôme revient — méthode de diagnostic (logs auth.uid() +
comptage de lignes) réutilisable telle quelle.

**Fix DETTE #143 committé**, validé par ces 4 écritures réelles réussies.

---

## 2026-07-23 (suite) — Session "modification/suppression de ville" : bloquée par DETTE #149

Objectif de session : traiter la modification d'une ville existante
(DETTE #143) puis la suppression d'une ville (jamais construite). Volet 1
(modification) codé, volet 2 (suppression) jamais commencé — la session a
changé de direction en cours de route.

**Fix DETTE #143 codé, NON commité** : dans ModifierProfilPage.jsx —
préserve le statut existant d'une ville (jamais modifié par cette page),
dérive un statut null depuis le vrai type_user (locataire→'recherche',
hote→'hote'), ne devine jamais rien pour les_deux. Build passe. Reste dans
le working tree, non commité : voir raison ci-dessous.

**DETTE #149 découverte en testant** : ModifierProfilPage affiche un succès
("profil modifié") sans écrire en base — vérifié par requête directe
(hote@sterny.test, Nantes→Troyes resté à Nantes en base après un submit
"réussi"). Bloque la validation runtime du fix DETTE #143 ET de tout futur
patch sur cette page. Détail complet dans DETTE-TECHNIQUE.md #149.

**Décision produit actée** : abandon du wizard 6 étapes de ModifierProfilPage
au profit d'une page à sections cliquables (déjà loguée le 23/07/2026,
entrée précédente). Le futur chantier de restructuration devra résoudre
DETTE #149 en même temps que le changement visuel — pas juste déplacer le
bug. Le lien de suppression d'une ville (volet 2, jamais commencé) attend
aussi cette refonte.

**Note produit annexe** : ModifierProfilPage utilise encore l'ancien
système de rythme (dropdown "Type d'alternance"/rythme_pattern), contraire
à la Charte Fondatrice (rhythm_calendar = source unique). Constaté au
passage, à traiter dans le même chantier de restructuration ou séparément.

**Rien poussé aujourd'hui** sur ce sujet. Prochaine session dédiée : auditer
précisément la cause de DETTE #149 avant tout code, puis cadrer la
restructuration (sections à lister, ordre, ancrages).

---

## 2026-07-23 (suite) — Section "Ton annonce" filtrée par ville active

Bug signalé par Côme : sur le dashboard hôte, cliquer Nantes/Rennes animait
le sélecteur mais "Ton annonce" continuait d'afficher toutes les annonces
de l'hôte sans filtre — contrairement à favoris/candidatures (côté
recherche), déjà branchés sur villeActive depuis le chantier "pages par
ville" du 19-22/07.

**Fix** : nouvelle dérivée `annoncesFiltrees` (DashboardLocatairePage.jsx),
sur le modèle de favorisFiltres/candidaturesFiltrees — comparaison directe
`ann.ville` / `villeActive.ville` (normalizeVilleLabel), SANS condition sur
le statut recherche/hôte (contrairement à favoris/candidatures qui ne
filtrent que si action==='recherche'). Décision : une ville affichée dans
le sélecteur reste une ville affichée, peu importe son action.

Commits : ea7987c (feat), f7cab9c (docs VISION-ARCHITECTURE, section
"pages par ville").

**Point connu, non traité ici** : pour un hôte pur, la ville active par
défaut au premier chargement peut ne pas correspondre à la ville de
l'annonce (dépend de l'ordre des villes du profil) — non observé lors du
test de Côme, mais reste un trou du volet hôte, pas construit comme
ensemble cohérent (candidatures reçues côté hôte toujours non filtrées).

**Testé et validé par Côme en runtime** : compte hôte pur (Hugo,
Nantes=recherche/Rennes=hôte) — clic Rennes → Studio test Rennes affiché,
clic Nantes → état vide "Créer mon annonce" (pas l'annonce Rennes).

**Rien d'ouvert dans l'immédiat** sur ce sujet précis. Le volet hôte
complet (candidatures reçues, ville par défaut) reste à cadrer en session
dédiée.

---

## 2026-07-23 — Garde "déjà connecté" sur /connexion et /inscription/*

Bug signalé par Côme : un utilisateur connecté pouvait toujours atteindre
/connexion et les 5 routes /inscription/* (via URL directe, ancien lien
partagé, favori). Le logo lui-même pointait déjà correctement vers "/",
sans lien avec ce bug.

**Fix** : nouveau composant `RedirectIfAuth` (src/components/layout/),
enveloppant les 6 routes auth dans App.jsx. Sur le modèle inversé de
`DashboardLayout` (useAuth → attendre `loading` → `<Navigate replace>`),
mais SANS bypass DEV (la redirection s'applique aussi en environnement de
dev, contrairement à DashboardLayout). Redirection selon profil : is_admin
→ /dashboard/admin, proprietaire → /dashboard/proprietaire, sinon
/dashboard. Pendant la résolution de session, le garde rend `null` (pas de
flash de la page auth).

Commits : 7992c5a (feat), cbaf6b9 (docs DETTE #148).

**DETTE #148 créée** : le branchement is_admin/type_user → route dashboard
est désormais dupliqué à 3 endroits (ConnexionPage, CompleterProfilPage,
RedirectIfAuth). Piste : helper `getDashboardRoute(userData)` — chantier à
part, non traité.

**Testé et validé par Côme en runtime** : connecté + URL directe
/inscription/alternant et /connexion → redirection dashboard. Non connecté
→ accès normal préservé.

**Rien d'ouvert** sur ce sujet.

---

## 2026-07-22 (soir) — Homogénéisation visuelle sélecteur ville/mode + filtre PMR

Suite de la clôture du chantier ville active (entrée du jour ci-dessous).
Deux sujets visuels traités en prolongement, hors périmètre initial.

**Sélecteur ville/mode unifié sur les 3 profils** (hôte, locataire, les_deux) :
retrait des icônes (loupe/maison, jugées too enfantines), état actif aligné
partout sur fond blanc + ombre portée (au lieu de la teinte orange légère
initiale de VilleSelecteur). VilleSelecteur.jsx/.css et
DashboardLocatairePage.jsx/.css. Commit fa8da01.

**DETTE #143 corrigée pour hote@sterny.test** : ajout de
statut_ville_ecole='recherche' (était NULL, "ville muette"), pour que ce
compte de test ait ses 2 villes valides et permette de re-tester le
sélecteur 2-villes. type_user reste 'hote' (décision explicite : le
contenu du dashboard reste figé en mode hôte, seule la ville active pour
les autres pages change). Commit b82ae3f.

**Décision produit — pas de prefill homepage par ville active** : la
homepage reste 100% mock (aucune vraie annonce, données figées dans
HomePage.jsx), personnaliser un affichage sans vraies données jugé sans
valeur. Loguée dans idees-en-attente.md, à reconsidérer si/quand la
homepage est branchée sur de vraies annonces. Commit bbabdaf.

**Filtre "Accessible PMR" uniformisé** : retrait de l'emoji ♿ et du
traitement visuel à part (fond pêche, texte orange gras) dans le panneau
Filtres de /recherche — rendu désormais identique aux autres équipements
(WiFi, Meublé...). RecherchePage.jsx/.css. Commit 7837e1e.

**Rien d'ouvert pour la prochaine session** sur ces 2 sujets — tous
poussés et validés visuellement par Côme.

---

## 2026-07-22 — Chantier système de pages par ville : clôture

Les 4 surfaces du contexte partagé (VilleActiveContext) sont branchées et
testées : dashboard/VilleSelecteur (pilote), /mon-calendrier, favoris/
candidatures, /recherche. Chantier considéré terminé.

**/recherche — pré-remplissage one-shot** : la ville active du profil
pré-remplit `?ville=` au chargement, uniquement si son statut est
`'recherche'` (sinon la page reste vide — décision VISION 21/07). N'écrase
jamais un `?ville=` déjà présent dans l'URL (lien partagé, retour arrière).
Ne touche pas `?ville2=`, `deduireRecherche`, ni DETTE #142 (indépendants).
Commits : 5661e6f (docs), 8799ede (code).

**DETTE #147 découverte et corrigée en cours de test** : le dashboard
`les_deux` avait son propre système de bascule (mode-switch local
`currentMode`/`switchMode`), jamais synchronisé avec `VilleActiveContext` —
le badge changeait visuellement sans que `/recherche` (ni aucune autre
surface) ne le sache. Diagnostiqué via 3 sondes console successives (Provider
et persistance confirmés sains, la fuite était dans `switchMode` lui-même).
Fix : synchronisation bidirectionnelle (le clic écrit dans le contexte ; le
contexte pré-remplit `currentMode` au montage), sans remplacer le
mode-switch — `VilleSelecteur` ne pouvait pas le remplacer (il porte une
vraie sémantique de rôle + lazy-load des données hôte que `VilleSelecteur`
ignore). Commits : adc8fe1 (docs DETTE #147), 3916f62 (code).

**Compte de test créé** : `lesdeux@sterny.test` / `sterny-dev` (Rennes=hôte,
Nantes=recherche, 52 semaines) — ajouté au seed car `hote@sterny.test` avait
une ville muette (DETTE #143, non représentatif pour tester un profil
`les_deux`). Nécessite `supabase db reset` pour être présent en local si pas
déjà fait.

**Tests manuels validés** (7/7) : prefill connecté, bascule + nouveau
prefill, lien partagé non écrasé, filtres fonctionnels, ville active hôte →
page vide, `les_deux` clic → prefill, `les_deux` montage direct → alignement
automatique sans clic.

**Hors périmètre de ce chantier, noté pour plus tard** :
- Homepage ("Logements à Rennes") : pas encore pilotée par la ville active
  du profil — demande de Côme en cours de discussion, périmètre à cadrer
  séparément (comportement visiteur/hôte à trancher).
- Filtre "Accessible PMR" : rendu jugé peu soigné (emoji), dette basse
  priorité, à traiter dans un futur chantier "revue des filtres".

---

## 2026-07-21 — Système de pages par ville : 3 surfaces sur 4 branchées et testées

Suite directe de la session du 20/07. 8 commits supplémentaires poussés sur
origin/feat/unification-inscription.

**Détour corrigé en cours de route** : tentative de filtrer RythmeCarousel
par ville active (commit ecd9b64, jamais poussé) — erreur de direction
produit. "Ton rythme" doit rester une vue globale (école + entreprise),
pas une vue par ville. Annulé proprement (git reset --mixed, never-stage
préservés). Décision loguée dans VISION-ARCHITECTURE.md.

**Surfaces branchées et validées visuellement par Côme** :
- fcb746b (docs) — précision RythmeCarousel hors périmètre.
- 5a4b232 — /mon-calendrier (PlancheCouverturePage) suit la ville active.
  Cas "ville active = hôte" géré par un message simple (idée "planche
  hôte" précisée dans idees-en-attente.md pour le futur volet hôte).
  Testé : bascule Rennes↔Nantes, grilles différentes, badges candidature
  cohérents.
- ea9ca7f + 1a905c0 — favoris/candidatures (dashboard) filtrés par ville
  active, comparaison normalisée (normalizeVilleLabel extraite de
  LogementPage.jsx vers utils/villes.js, commit 5235166 — anti-duplication).
  Compteurs + états vides alignés sur les listes filtrées. Testé : favori
  Rennes visible côté Rennes, section vide + message côté Nantes.
- Non touché aujourd'hui : candidaturesRecues (côté hôte) — pas de donnée
  ville dans sa requête actuelle, hors périmètre (volet hôte).

**Dettes découvertes et loguées** :
- DETTE #144 enrichie — piste de résolution structurelle proposée par
  Côme (rapprochement flou + stockage canonique à l'écriture, plutôt que
  normalisation dispersée à la lecture). Chantier à part, non traité.
- DETTE #146 — forme du dropdown de suggestions de ville dégradée (arrondi
  perdu, effet "boîte étirée"). Probablement lié à #95/#96. Basse priorité.

**État des 4 surfaces** :
| Surface | État |
|---|---|
| Dashboard (VilleSelecteur) | ✅ pilote |
| /mon-calendrier | ✅ suit |
| Candidatures/favoris | ✅ filtré |
| /recherche (?ville= one-shot) | ⬜ à brancher |

**RESTE (prochaine session, à froid)** :
1. /recherche — dernière surface. Décision déjà actée (VISION 20/07) :
   villeActive pré-remplit ?ville= au chargement, one-shot, pas de sync
   permanente ensuite. Reste à concevoir l'implémentation exacte (où
   intercepter le chargement initial, cohabitation avec deduireRecherche
   qui pilote déjà le matching indépendamment du filtre d'affichage).
2. Volet hôte (planche "semaines à compléter", candidaturesRecues sans
   donnée ville) — pas commencé.
3. Volet les_deux — couvert par construction, jamais testé concrètement
   (pas de profil de test disponible avec ville hôte active).
4. DETTE #146 (dropdown) — basse priorité, à traiter quand l'occasion se
   présente.

---

## 2026-07-20 — Système de pages par ville : contexte partagé créé, branché, testé sur la 1ère surface (dashboard)

Chantier cadré le 19/07 (VISION-ARCHITECTURE.md), démarré aujourd'hui.
2 commits de code + 2 commits docs, tous poussés sur
origin/feat/unification-inscription.

**Audits lecture seule menés avant tout code** :
- RythmeCarousel + candidatures/favoris (aucune notion de ville aujourd'hui ;
  ville déjà disponible per-item sur les candidatures, exploitable sans
  nouvelle requête).
- Fournisseur d'auth (useAuth) : ne contient PAS le profil applicatif
  (ville_ecole, etc.) — juste l'identité Supabase. Le contexte doit charger
  le profil séparément.

**Décisions d'architecture actées (VISION-ARCHITECTURE.md, section 20/07)** :
- Provider à la racine de l'app (au-dessus de <Routes>, sous AuthProvider) —
  seul emplacement couvrant les 4 surfaces cibles, réparties sur 2 branches
  de layout distinctes (/recherche sous <Layout/>, les 3 autres sous
  <DashboardLayout/>).
- /recherche : la ville active pré-remplit ?ville= au chargement, one-shot —
  pas de synchronisation permanente avec le filtre de recherche ensuite.
- getVillesUtilisateur(user) confirmée comme source de données (fonction
  pure, sans réseau).

**Code livré** :
- 504a093 — VilleActiveContext créé (src/contexts/VilleActiveContext.jsx)
  et branché à la racine de App.jsx. Expose { villeActive, villesDisponibles,
  setVilleActive, loading } via useVilleActive(). Persistance localStorage,
  clé scopée par userId (sterny_ville_active_${userId}).
- ffbc63e — VilleSelecteur (dashboard) branché sur le contexte partagé.
  Remplace l'ancien state local afficheVilleSecondaire (booléen visuel-only,
  ne survivait pas à un refresh). Testé en local : clic sur 2ème ville +
  refresh → sélection persistée. ✅

**Dette découverte et loguée** : DETTE #145 — le nouveau contexte fait son
propre fetch du profil (ville_ecole/statut_*), distinct des fetchs déjà
faits par DashboardLocatairePage, PlancheCouverturePage et RecherchePage
(select('*') chacune). Non bloquant, piste de factorisation future
documentée.

**RESTE (prochaine session)** :
1. RythmeCarousel ne consomme pas encore la ville active (affiche tout le
   rhythm_calendar, non filtré) — prochaine surface à brancher.
2. /mon-calendrier, candidatures/favoris, /recherche (?ville= one-shot) —
   pas encore branchés.
3. Volet hôte du chantier (aucune des 4 surfaces n'a d'équivalent hôte) —
   pas commencé.
4. Volet les_deux — déjà couvert par construction (action fait partie de
   villeActive), à vérifier concrètement une fois un profil les_deux
   disponible en test.
5. Point de vigilance mineur signalé par Claude Code : bref instant sans
   segment actif au tout premier chargement de page (avant résolution du
   profil) — pas gênant à l'usage, à garder en tête si ça devient visible.

---

## 2026-07-19 (conv 113) — DETTE #142 corrigée sur /mon-calendrier ; VilleSelecteur extrait en composant partagé

**DETTE #142 (lecteurs mono de deduireRecherche) close pour PlancheCouverturePage.jsx**, après un aller-retour de conception important — à connaître pour la suite.

**Trois commits locaux, poussés à confirmer** :
- `5aea0f4` — fix initial : fusion des 2 villes de recherche (union des semaines). **Corrigé par les 2 commits suivants** — la fusion faisait perdre la distinction école/entreprise (chaque semaine étant forcément l'une ou l'autre, le total fusionné tend vers "toute l'année", peu actionnable — retour visuel Côme sur "52 semaines à couvrir").
- `77ab1c4` — extraction du sélecteur segmenté 2 villes du dashboard (`DashboardLocatairePage.jsx`, commit `dfe7c6f` du 18/07) vers un composant partagé **contrôlé** `src/components/ville/VilleSelecteur.jsx` (+`.css`). Props `villes`/`value`/`onChange`, sans state interne — condition nécessaire pour qu'un parent pilote la sélection. Zéro changement visuel côté dashboard, validé runtime.
- `46fd4c5` — retour à un affichage **par ville active** sur `/mon-calendrier` (pas de fusion), MAIS **sans afficher `VilleSelecteur` sur cette page** : `villeActiveIndex` y est fixé en dur à `0` (1ʳᵉ ville), le sélecteur a été retiré après un aller-retour (posé puis retiré dans la même session — voir décision ci-dessous).

**DÉCISION ACTÉE (à respecter pour la suite du point 4)** : la bascule de ville ne doit vivre qu'à **un seul endroit** dans l'app, pas se dupliquer avec un état indépendant sur chaque page qui en a besoin. Le dashboard est désigné comme le point de bascule central (précision du point 4, voir plus bas) ; `/mon-calendrier` devra un jour lire cette sélection plutôt que d'avoir la sienne. Tant que ce partage n'est pas câblé, `/mon-calendrier` retombe simplement sur la 1ʳᵉ ville.

**Question d'architecture identifiée, non tranchée** : comment "la ville active" doit-elle être partagée entre le dashboard et `/mon-calendrier` (2 routes séparées, 2 states React isolés aujourd'hui) ? Options identifiées sans arbitrage : paramètre d'URL, colonne en base sur le profil, contexte React partagé au niveau de l'app. À trancher en session dédiée avant de câbler le point 4.

**Précision sur le point 4** (dette du 15/07, "sélecteur visuel-only") : confirmé aujourd'hui que le sélecteur doit devenir fonctionnel — piloter au minimum "Ton rythme" (RythmeCarousel) et potentiellement les candidatures, pas seulement l'esthétique. Direction UX confirmée après recherche sur le pattern Airbnb (bascule hôte/voyageur) : **les 2 villes restent visibles en permanence dans un même sélecteur** (pas de bascule masquée façon menu profil comme le fait Airbnb) — l'inspiration Airbnb porte sur l'idée de bascule de contexte pilotant plusieurs sections, pas sur le masquage de l'option inactive.

**Distinction actée avec l'idée parquée** : ce travail reste dans le périmètre du chantier recherche multi-villes du 15/07 (point 4), **pas** l'idée parquée "bascule de mode façon Airbnb hôte/voyageur" (idees-en-attente.md, 16/07) qui concerne un changement d'identité (locataire ↔ hôte) plutôt qu'un changement de ville de recherche — ces deux sujets restent distincts, à ne pas mélanger.

RESTE (5 points sur les 6 initiaux, le point 2 DETTE #142 est traité pour PlancheCouverturePage — RecherchePage.jsx reste ouvert, scope plus large que prévu, voir ci-dessous) :
1. deriveVilleColonnes.js pas encore ouvert aux 2 statuts 'recherche' (wizard mono-ville).
2b. **RecherchePage.jsx (DETTE #142, volet non traité)** : le scoring de couverture compare tous les logements affichés contre les semaines d'une seule ville (variable globale `semainesUtilisateur`), au lieu de comparer chaque logement à sa propre ville. Fix identifié en audit (19/07) : scoring par logement via `deductionRecherche.find(d => d.ville === logement.ville)`. Touche la boucle de scoring (l.423-440), plus gros que 2 lignes — à traiter en session dédiée.
3. ModifierProfilPage.jsx sans statut_ville_* (DETTE #143).
4. Sélecteur segmenté fonctionnel (précisé ci-dessus) — architecture "ville active partagée" à trancher avant de coder.
5. ville_recherche_secondaire / supprimerVilleSecondaire à supprimer ; flux de retrait d'une ville à concevoir.
6. Branche "Proposer" du bouton "+" à corriger (décision du 16/07).

---

## 2026-07-18 — Recherche multi-villes : composant partagé, écriture canonique et affichage livrés

Session longue, chantier recherche multi-villes. 3 commits de code, tous
poussés sur origin/feat/unification-inscription :

**9b470d4 — Composant partagé VilleNatureField (wizard E-4)**
Composant contrôlé qui capture ville + nature (école/entreprise), jamais
l'action — décision du 16/07 pour éviter la duplication entre wizard et
dashboard. Branché dans InscriptionAlternantPage.jsx (bloc locataire/hote),
zéro changement visuel ni de comportement (validé par Côme en local).

**d78286c — Modale dashboard : écriture canonique (DETTE #140 résolue côté écriture)**
La modale "Ajouter une ville de recherche" (bouton "+" dashboard) écrit
désormais dans la colonne canonique libre (ville_ecole/ville_entreprise) +
son statut_*='recherche', au lieu de la colonne orpheline
ville_recherche_secondaire. Nature déduite (pas demandée) pour ce flux
précis : exception documentée le 18/07 à la règle générale du 16/07, valide
uniquement si exactement 1 colonne est déjà remplie (garde-fou pour le cas
cassé de DETTE #143). Testé en base sur locataire@sterny.test : Nantes bien
écrite dans ville_entreprise, statut 'recherche'.

**dfe7c6f — Sélecteur segmenté 2 villes (affichage dashboard)**
Quand l'utilisateur a 2 villes (villesUser.length === 2), le badge simple +
bouton "+" sont remplacés par un sélecteur segmenté (conteneur blanc + ombre,
ville active en pastille orange pâle). État purement visuel pour l'instant —
ne fait varier aucun autre contenu du dashboard. Itéré en plusieurs passes
avec Côme (Visualizer + schéma manuscrit) : forme du sélecteur, couleur de
fond (le premier essai, gris clair, était invisible sur le fond de page
réel #F4F5F7 — corrigé en blanc+ombre), retrait du focus ring bleu natif
(remplacé par :focus-visible orange, accessible au clavier).

**Découvertes documentées en cours de route (aucune non résolue oubliée) :**
- DETTE #144 (nouvelle) : les listes de villes "de lancement" sont dupliquées
  et divergentes sur 6 pages, avec une incohérence produit plus large
  (restriction dure sur ces 6 pages vs texte libre dans le wizard) — non
  bloquant pour ce chantier, la modale garde volontairement sa liste actuelle.
- VISION-ARCHITECTURE.md précisée à 2 reprises : comportement du bouton "+"
  (ne doit plus jamais naviguer vers /annonce/creer, corrige la branche
  "Proposer" — pas encore implémenté, décision actée seulement) ; exception
  de nature déduite pour le flux "ajouter une 2e ville".
- idees-en-attente.md : 2 idées parquées (hôte multi-logements ; bascule de
  mode façon Airbnb hôte/voyageur, plutôt pour l'app mobile).

**Reste au plan (5 points du 15/07), chacun en session dédiée gatée :**
1. deriveVilleColonnes.js pas encore ouvert aux 2 statuts 'recherche' — le
   wizard d'inscription ne permet toujours de saisir qu'1 seule ville de
   recherche à l'inscription (seul le dashboard post-inscription le permet
   désormais, via la modale corrigée ci-dessus).
2. Lecteurs mono non corrigés : PlancheCouverturePage.jsx ([0] en dur),
   filtres de RecherchePage.jsx (DETTE #142).
3. ModifierProfilPage.jsx toujours sans statut_ville_* (DETTE #143, "ville
   muette") — bloque aussi la fiabilité de l'inférence de nature ailleurs.
4. Le sélecteur segmenté est visuel-only : aucune section du dashboard (le
   calendrier "Ton rythme", les candidatures) ne varie encore selon la ville
   affichée. Prochaine étape logique si on continue ce fil.
5. ville_recherche_secondaire et supprimerVilleSecondaire n'ont plus aucun
   lecteur actif — prêts pour suppression, mais pas encore faits. Le flux de
   retrait d'une ville (décidé : lien discret dans un menu/paramètres, pas
   de croix sur le sélecteur) reste à concevoir.
6. Branche "Proposer" du menu "+" (conversion type_user + navigation directe
   vers /annonce/creer) : comportement à corriger pour respecter la décision
   du 16/07 (créer l'écosystème sans naviguer) — non touché cette session.

**Prochaine session possible** : au choix de Côme parmi les 6 points
ci-dessus — aucun n'est urgent, tous sont des dettes connues et documentées,
pas des régressions.

---

## 2026-07-15 — Chantier recherche multi-villes : plan d'implémentation cadré (audits terminés)

Série d'audits lecture seule menée (wizard E-4 InscriptionAlternantPage, hooks/
useInscriptionWizard, ModifierProfilPage, RecherchePage + modale profils compatibles,
bouton dashboard DashboardLocatairePage, deriveVilleColonnes, consommateurs de
deduireRecherche). Constat central : trois surfaces éditent les villes de façon
incohérente (wizard via deriveVilleColonnes ; ModifierProfilPage qui édite
ville_ecole/ville_entreprise SANS toucher les statut_* → bug latent "ville muette",
DETTE #143 ; bouton dashboard qui écrit la colonne orpheline ville_recherche_secondaire,
DETTE #140).

Décision de cap : ne pas ajouter de 4e surface, converger vers une logique partagée.
Plan retenu (détaillé en VISION-ARCHITECTURE.md, décision du 15/07/2026), 5 points :
1. Extraire un composant partagé "saisie ville + action (recherche/hôte)", réutilisé
   wizard E-4 locataire + modale dashboard.
2. Bouton "+" dashboard CONSERVÉ (besoin réel : ajouter une 2e ville après inscription,
   chercher OU proposer), re-câblé sur la colonne canonique libre + statut_* ;
   ville_recherche_secondaire supprimée (DETTE #140).
3. ModifierProfilPage mise à niveau pour toucher aussi statut_ville_* (corrige DETTE #143).
4. deriveVilleColonnes : autoriser 2 'recherche' (ou 1 recherche + 1 hôte) pour
   type_user='locataire'.
5. Corriger les lecteurs mono de deduireRecherche : PlancheCouverturePage.jsx ([0] en
   dur) et filtres RecherchePage.jsx (DETTE #142).

Portée : les_deux HORS périmètre (ses 2 colonnes sont déjà occupées, 1 recherche +
1 hôte). Hors périmètre aussi : modale "profils compatibles" (maquette hardcodée,
DETTE #141) et idée hôte multi-logements (parquée idees-en-attente.md).

**Prochaine étape : audit lecture seule du composant partagé à extraire (API exacte
souhaitée) avant tout code, en session dédiée.** Points ouverts pour cet audit :
(a) le composant infère-t-il la nature/colonne cible, ou la capture-t-il ? (b) forme
exacte réutilisable entre wizard (inline, event {target:{name,value}}) et modale dashboard.

---

## 2026-07-15 — Refonte visuelle /logement : carte Compatibilité + tooltip custom + bouton Agrandir + légende

Session de refonte visuelle sur la fiche annonce, itérée via le Visualizer
(mockups validés par Côme avant chaque patch) :

- Carte "Couverture de tes semaines" renommée "Compatibilité" et compactée :
  liste de dates remplacée par une barre de progression (compteur + barre +
  pourcentage), padding et marges resserrés. Décision actée : pas de bouton
  "voir +" sur cette carte, le détail des semaines reste dans le calendrier
  Disponibilités juste en dessous (un rôle par carte).
- Tooltip des cases du calendrier (mini-planche + modal grand format) :
  remplacement du title natif du navigateur (lent, non stylé) par un tooltip
  CSS custom (classe .lp-cell, LogementPage.css). Dans le modal, les cases
  floutées ("hors de ton rythme") ont nécessité une restructuration à deux
  niveaux (conteneur .lp-cell non flouté + enfant absolute flouté) pour que
  le tooltip ne soit pas flouté par héritage du filter du parent.
- Bouton "Agrandir" : passé de majuscules/orange à texte simple gris #94A3B8,
  sans icône, aligné sur le style du lien "Retour" des pages de connexion
  (décision explicite : discrétion plutôt que visibilité pour cette action
  secondaire).
- Légende de la mini-planche : alignée sur celle du modal (retrait de "Hors
  de ton rythme", 3 états au lieu de 4), répartie sur toute la largeur
  (space-between).

Validé visuellement par Côme à chaque étape (captures d'écran). Build vert
à chaque patch. Aucun changement de logique de calcul — uniquement
présentation. Commit feat : 53b8d03.

---

## 2026-07-14 — DETTE #135 résolue : carte Couverture filtrée par ville (+ découverte structurelle multi-villes)

Corrigé et testé : semainesCherchees (LogementPage.jsx, useEffect "1a")
réutilise entreesAnnonce (déjà filtré par ville, existant pour la carte
Disponibilités) au lieu d'additionner toutes les villes de recherche du
visiteur. Audit lecture seule préalable (useEffect complet, tous les usages
de couvertureVisiteur et semainesCherchees) confirmant qu'aucun autre code
ne dépend du comportement union-toutes-villes. Build vert, testé sans
régression sur locataire@sterny.test (profil à 1 ville, chiffre inchangé).

Découverte pendant la clôture : le scénario visé par #135 (visiteur
cherchant dans 2 villes) n'est pas atteignable aujourd'hui —
deriveVilleColonnes.js limite structurellement un profil à 1 ville de
recherche. Décision de cap actée en VISION-ARCHITECTURE.md : ouvrir ce
combo est désormais un objectif produit, à cadrer en session dédiée.
DETTE #140 (bouton ajout 2e ville dashboard non fonctionnel) et #141
(modal/filtres /recherche à auditer) loguées en lien.

Prochaine session possible : cadrage du chantier recherche multi-villes
(lecture seule d'abord : deriveVilleColonnes.js, wizard d'inscription,
tous les consommateurs de deduireRecherche).

---

## Modal grand format Disponibilités /logement — implémenté, testé, commité (14/07/2026)

Bouton "Agrandir" sur la carte Disponibilités ouvre un modal avec le planning en grand format, dimensionnement calé sur PlancheCouverture.css (cellules 40px, radius 10px, gaps 3px). 3 vues via segmented control (état unique vueActive, jamais de vue vide) :
- Compatibilité (libellé final, après "Les deux" jugé pas assez clair) : identique à la mini-planche (couleurCase partagé), gris floutés dans le modal pour faire ressortir vert/rouge. Gris hôte remappé vers une nuance plus foncée réservée au modal (GRIS_HOTE_MODAL) — mini-planche sidebar inchangée.
- Mes semaines à combler : style loupe repris de PlancheCouverture (fond blanc, bordure, icône), valide sur toutes les années (rythme non borné).
- Rythme de l'hôte : style buste (icône créée pour ce chantier, variante stroke foncé pour le contraste).

Navigation d'année (‹ année ›) calée sur PlancheCouverturePage.jsx. Distinction "hors des données de l'annonce" (flou) vs "occupé" — anneeAnnonce (ancrée sur dispo[0]) évite de confondre absence de donnée et occupation réelle en naviguant vers une année sans disponibilites_pattern. Point de vigilance : ce modèle suppose une seule année académique par annonce — à revoir si le modèle de données évolue vers du multi-années (actuellement correct, correspond aux données réelles).

Tooltip (title natif, formatWeekRangeFR) sur chaque semaine des deux planches (sidebar et modal) pour se repérer dans le temps au survol.

Itérations de design écartées en session (traçabilité) : contour navy seul, croix, bleu flouté, checkboxes indépendantes (remplacées par un état unique anti-vide), légende en grille 2×2 avec cases invisibles (simplifiée en une seule ligne après suppression de "Hors de ton rythme", jugée redondante avec les 2 vues dédiées).

DETTE #139 loguée pendant ce chantier (fuite CSS .modal-content, même famille que #137).

Commits : f7740d1 (feat), f0e76ec (dette #138, tour précédent).

**Reste en suspens :** rythme du visiteur à cheval sur 2 années académiques — vérifié correct par construction (semainesDePresence non filtré par année), mais jamais testé visuellement faute de jeu de données adapté. À tester avec un vrai cas quand l'occasion se présente.

---

## Disponibilités /logement — 4 états, implémenté et validé visuellement (13/07/2026)

Vert (dispo + correspond au rythme), rouge (occupé + correspond), gris clair (hors rythme), gris foncé (hors rythme + occupé par l'hôte). Matching visiteur↔annonce par ville uniquement (pas par pôle). Titres de carte sidebar en style eyebrow (orange/majuscules/15px, aligné sur "Description"). Légende en grille 2×2, libellés courts choisis par Côme. Plusieurs itérations de couleur testées et écartées en session (contour navy seul, croix, bleu flouté) — retour au fond plein 4 couleurs jugé le plus lisible. Couleurs actuelles provisoires, palette à retravailler.

Fixtures locales (hote@sterny.test, locataire@sterny.test) étendues à un rythme complet 52 semaines pour permettre un test représentatif (les fixtures précédentes, tronquées à 4 entrées, rendaient tout test non représentatif).

DETTE #135, #136, #137 loguées pendant cette session (voir DETTE-TECHNIQUE.md).

Commits : 72c7eb0 (feat), 0c3591e (seed), 877b9ed (dette).

**Prochaine étape (session en cours) :** bouton "agrandir" ouvrant un modal avec le planning en grand format ; refonte du bloc "Couverture de tes semaines" (jugé non adapté, lié à DETTE #135).

---

## 2026-07-12 — Disponibilités /logement : système de couleur à 4 états DÉCIDÉ, pas encore implémenté

Suite à la livraison de la mini-planche (commits 9020b44, 7877b1f), 3 itérations de mockups (Visualizer) ont permis de trancher le code couleur définitif pour la vue connectée. Matrice 2×2 (disponible dans `disponibilites_pattern` × dans le rythme du visiteur) :

- **Vert `#22C55E`** — disponible ET correspond au rythme du visiteur ("ça passe")
- **Rouge `#EF4444` (provisoire, à affiner)** — occupé par l'hôte MAIS le visiteur en aurait besoin ("ça bloque")
- **Neutre `#F5F6F8` + contour `#E8EAF0`** — disponible mais hors du rythme du visiteur (pas de signal fort)
- **Orange Sterny `#E8622A` + flou (blur 0.6px, opacity 0.5)** — occupé par l'hôte, hors du rythme du visiteur (le moins important)

DÉCISION DE PRINCIPE (rattachée à la règle conv 63 "couleur = nature/état, jamais la couverture par variation d'opacité d'une même teinte") : chaque état a sa PROPRE couleur, aucun n'est une variante d'opacité d'un autre (sauf le flou, qui est un traitement à part, pas une teinte).

SIMPLIFICATION ACTÉE : pas de garde-fou pour "visiteur sans rythme" — le rythme est obligatoire dès l'inscription (E-5 du parcours), donc un visiteur connecté a toujours un rythme exploitable. Cas où ça ne tiendrait pas (rythme incomplet, profil édge) explicitement PARQUÉ, à traiter seulement s'il se manifeste.

RESTE (chantier à part) : calcul par semaine (pas juste le total `couvertureSemaines()`) croisant `disponibilites_pattern` de l'annonce avec le `rhythm_calendar` du visiteur — nouvelle logique à construire, pas une réutilisation directe de l'existant. + Polish visuel du bloc "non connecté" resté en attente depuis plus tôt dans cette session, précisions non encore données par Côme.

---

## 2026-07-12 — LogementPage : calendrier vestige remplacé par mini-planche 12 mois, gatée connexion (clôt conv 67 du 18 juin)

LIVRÉ (commits 9020b44, 7877b1f) : le calendrier "Disponibilités" jour-par-jour de /logement (vestige location continue, repéré conv 67) est retiré. Remplacé par une mini-planche compacte : 12 colonnes-mois, cases carrées (radius 4px), une case par lundi ISO réel du mois, orange si disponible dans `disponibilites_pattern`, gris sinon. Année scolaire ancrée sur le premier lundi disponible de l'annonce, sans navigation (annonce ponctuelle, pas un calendrier personnel).

DÉCISION — gate connexion : mini-planche visible seulement pour visiteur connecté (`useAuth().user`). Non connecté → CTA "Connecte-toi pour voir si ce logement correspond à ton rythme" + lien /connexion.

Aussi retiré dans le commit 7877b1f : bloc "Disponible du... jusqu'au..." + "Durée minimum X mois" (logique de bail continu, purement supprimée), 3 helpers date orphelins, 198 lignes CSS orphelines.

Refactor connexe (commit 9020b44) : `weeksForAcademicYear`/`groupByMonth`/`formatISO` étaient dupliquées dans `PlancheCouverture.jsx` (elle-même copiée du `RhythmManualBuilder` — donc déjà 2 copies). Extraites vers `utils/academicYear.js` comme source unique, migration à l'identique (byte-identique). `PlancheCouverture.jsx` importe désormais depuis ce util. Duplication historique résorbée, pas seulement déplacée.

Process notable : 3 itérations de mockups visuels (Visualizer, Claude.ai) avant tout code, pour trancher entre liste textuelle / grille compacte restructurée / grille 12-colonnes fidèle à PlancheCouverture — Côme a tranché pour la fidélité au design existant plutôt qu'une redisposition, avec labels 3 lettres.

Vérifié manuellement : /mon-calendrier (aucune régression fonctionnelle) et /logement (3 états : non connecté, connecté avec pattern, connecté sans pattern). Bug pré-existant repéré au passage sur /mon-calendrier (label "Jui" dupliqué Juin/Juillet) → tracé en DETTE #134 (commit 0504e38), non introduit par cette session.

Non touché : carte couverture personnalisée (conv 85), flux candidature, prix.

RESTE de conv 67 : rien — les 3 points constatés (calendrier jour/jour, fenêtre continue, durée minimum) sont désormais traités.

RESTE de cette session : polish visuel du bloc "non connecté" sur la carte Disponibilités (design à affiner, en attente de précisions de Côme).

---

## 2026-07-11 — Suggestions ville au focus + footer collé en bas + bloc "Aucun logement" agrandi

**SUJET 1 — Suggestions ville au focus** (commit `68dcd38`)

Sur `/recherche?ville=rennes`, cliquer dans le champ ville déjà pré-rempli ("Rennes") n'affichait aucune suggestion tant qu'on n'avait pas retapé un caractère (les suggestions ne se calculaient qu'au `onChange`). Ajout d'un handler `onFocus` (`handleVilleFocus`) qui recalcule et ré-affiche les suggestions si le champ n'est pas vide. Filtre factorisé dans `computeVilleMatches`, réutilisé par `onChange` et `onFocus`.

**SUJET 2 — Footer + bloc état vide** (commit `6f908b4`, historique d'itérations condensé)

Point de départ : sur l'état vide de `/recherche` (aucun logement), le footer était visible immédiatement sans scroll, collé directement sous un bloc "Aucun logement disponible" trop compact et écrasé.

Plusieurs approches testées avant la version retenue :
- `min-height: calc(100vh - navbar - footer + marge)` — abandonné, fragile (dépend de mesures en pixels runtime du footer, variables selon le contenu et la taille d'écran ; s'est révélé sans effet réel car le plancher calculé restait plus petit que le contenu naturel).
- `.app-content { min-height: 100vh }` — techniquement robuste pour repousser le footer hors écran, mais **rejeté** : sur grand écran (ex. Mac plein écran), ça poussait aussi les 2 blocs de conversion en dessous (compteur d'étudiants compatibles + notification) hors du premier écran, ce qui est plus dommageable business que le footer visible.

**Décision finale retenue** : priorité à la visibilité des blocs de conversion plutôt qu'à masquer systématiquement le footer.
- `.app-content { min-height: auto }` — pas de hauteur forcée, le contenu garde sa taille naturelle.
- `#root { display:flex; flex-direction:column; min-height:100vh }` — nécessaire pour que le footer (qui a `margin-top: auto` dans son CSS existant) se cale proprement en bas de l'écran sur les pages courtes, plutôt que de rester collé juste après le contenu.
- **Compromis assumé** : sur les états courts, le footer peut être visible sans scroll (calé en bas de l'écran, pas flottant au milieu). Les blocs de conversion, eux, restent toujours visibles.

**Bloc "Aucun logement disponible" agrandi** (`.nr-enriched` et enfants, `RecherchePage.css`) : padding 48/24/40 → 64/32/56, icône 56px → 64px, titre 20px → 22px, marges ajustées. Valeurs intermédiaires après un premier essai trop généreux (96/32/88, qui masquait les blocs du dessous).

**Fichiers** : `Layout.jsx` (wrapper `.app-content` autour de `<Outlet/>`), `index.css` (`#root`, `.app-content`), `RecherchePage.css` (`.nr-enriched` et enfants), `RecherchePage.jsx` (`computeVilleMatches`, `handleVilleFocus`).

**Non traité, hors scope** : `DashboardLayout.jsx` a le même schéma de sticky-footer latent (pas de wrapper flex) mais n'a pas été touché — pages dashboard, pas publiques. Tracé en DETTE #132.

Commits : `68dcd38`, `6f908b4` (poussés sur `origin/feat/unification-inscription`)

---

## 2026-07-10 (conv 111) — Gate RGPD levé, formulaire étude de terrain prêt et plan de lancement acté

**Résolution du gate** : réponse écrite de Benoît Guillemin (mail 07/07/2026 + Snapchat 10/07/2026) sur les 6 questions Q-DPO-016→021. Détail des réponses et statuts mis à jour dans QUESTIONS-PROFESSIONNELS.md §2.5.

**Implémentation dans le formulaire** : mention légale complète en intro (section 1 — finalité, contact, durée 24 mois, lien politique de confidentialité), rappel court en section 15 "Avant de terminer". Document de politique de confidentialité détaillé créé (Google Doc, partage "Lecteur" via lien uniquement). Typo contact@sterny.com corrigée en contact@sterny.co.

**Plan de lancement acté** : test restreint à 4 proches de Côme. Si validé : diffusion large immédiate — les 4 proches relaient à leur classe/contacts, Côme sollicite des groupes LinkedIn alternance. Second passage prévu vers octobre 2026 pour capter le point de vue des nouveaux arrivants en alternance.

**Reste hors gate** : volet propriétaires/agences (mentionné par Le Poool, non démarré, gated Q-AVO-006→009).

**Point de vigilance posé** : purge/anonymisation des données à échéance 24 mois (~juillet 2028) — à ajouter dans idees-en-attente.md avec date de rappel (tâche séparée, pas faite ici).

---

## 2026-07-09 — Fix recherche ville : soumission sans clic sur suggestion

**Bug** : sur HomePage et RecherchePage, taper le nom exact d'une ville sans cliquer la suggestion affichée empêchait la recherche (loupe et, sur RecherchePage, la touche Entrée aussi — Entrée n'y déclenchait rien du tout, elle fermait juste la liste). Cause : la recherche dépendait d'un state `villeSelectionnee` rempli uniquement au clic sur une suggestion, distinct du texte tapé (`villeInput`).

**Fix** : résolution de secours ajoutée au moment de la soumission (loupe + Entrée) — si `villeSelectionnee` est vide, comparaison du texte tapé aux villes valides (`VILLES_DISPONIBLES` / `VILLES_DISPONIBLES_RECHERCHE`), en ignorant la casse. Match exact trouvé → recherche lancée avec le slug résolu, sans attendre la mise à jour asynchrone du state.

**Fichiers** : `HomePage.jsx` (fonction `rechercher`), `RecherchePage.jsx` (nouveau paramètre `villeOverride` sur `filtrerLogements`, nouvelle fonction `lancerRechercheVille` centralisant loupe + Entrée).

**Non touché** : pas de composant `<SearchBar>` partagé (toujours différé, cf. conv 56) — la logique reste dupliquée entre les 2 pages, corrigée dans les 2 indépendamment.

Commit : c43b4f4 (poussé sur origin/feat/unification-inscription)

---

## 2026-07-07 (conv 110) — Feuille de route de cadrage : modèle multi-logements (agences → étude fraîche → audit code → compilation pro)

DÉCISION DE MÉTHODE ACTÉE : sur un sujet cœur (ici l'état des lieux entre locataires qui se relaient), NE JAMAIS partir de l'existant pour cadrer. Construire le modèle IDÉAL d'abord (ce qu'on doit faire/avoir), comparer avec le code réel ENSUITE. Ne jamais se fier à un audit ancien (AUDIT-2026-04-22, AUDIT-FONCTIONNEL-2026-05-04) pour conclure sur l'état actuel d'un composant — toujours relire le composant réel au moment du besoin (les audits vieillissent, principe déjà en place mais qui doit s'appliquer aussi au produit/juridique, pas seulement au code).

CONTEXTE : reprise du sujet "un locataire comble son planning avec plusieurs logements" (DETTE #48, matching partiel) + état des lieux multi-occupants (Q-AVO-006 à 009 gelés côté avocat) + frein agences immobilières identifié comme prioritaire par Côme.

CHECKLIST PROGRESSIVE (à cocher au fil des sessions, ordre non interchangeable) :
- [ ] 1. Agences immobilières — lister et poser les questions réelles (quel est le frein exact, conditions pour qu'elles autorisent le modèle Sterny). Rien de codé à ce jour sur ce sujet.
- [ ] 2. Étude fraîche du modèle idéal d'état des lieux — SANS regarder le code existant. S'appuyer sur : analyse Airbnb (UX/opérationnel — réservation, litiges, vol ; jamais le cadre juridique, cf. limite déjà actée en VISION : Airbnb = meublé de tourisme ≠ Sterny = sous-location résidence principale) + Studapart/plateformes équivalentes (EDL en ligne). Produit attendu : document du modèle idéal.
- [ ] 3. Audit du code réel — SEULEMENT après l'étape 2. Relire EtatDesLieuxPage.jsx + table etats_des_lieux (composant réel, pas la doc d'audit), comparer à l'idéal défini en étape 2, lister les écarts.
- [ ] 4. Compilation avocat/assureur — compléter QUESTIONS-PROFESSIONNELS.md avec les questions informées par 1 à 3, en complément de Q-AVO-006 à 010 déjà présentes.

LIENS : DETTE #48 (matching partiel), Q-AVO-006→010 (QUESTIONS-PROFESSIONNELS.md), gel de l'aval du tunnel (conv 103, ETAT-COURANT).

---

## Conv 109 — 07/07/2026 — Audit lecture seule : modifs non commitées DashboardProprietairePage.jsx/.css
Audit lecture seule (git diff 0c2e195) sur les fichiers never-stage DashboardProprietairePage.jsx + .css.
CONSTAT : le diff contient une feature complète et fonctionnelle — bouton "œil" (PasswordRevealButton,
composant déjà commité ailleurs dans le repo) pour révéler/masquer la saisie dans la modale de
changement de mot de passe (2 champs : nouveau mdp + confirmation). Dépendances vérifiées OK (composant
existe, CSS .pw-field bien défini dans PasswordRevealButton.css). Aucun bug détecté, aucun import cassé.
NON COMMITÉ : DashboardProprietairePage.jsx/.css sont sur la liste never-stage permanente. Origine de
cette feature (qui l'a codée, quand, pourquoi) NON CONFIRMÉE par Côme — à clarifier avant tout commit,
au cas où elle serait imbriquée dans une refonte non commitée plus large (comme CreerAnnoncePage).
RESTE À TRANCHER (prochaine session) :
1. Pourquoi DashboardProprietairePage.jsx/.css est en never-stage permanent ? (raison non retrouvée
   dans cette conv — à clarifier avec Côme en tout premier, avant de committer quoi que ce soit dessus)
2. Une fois la raison connue : committer le bouton œil isolément (si le fichier n'a pas d'autre
   refonte en cours), ou l'intégrer à un commit groupé plus tard (si never-stage = refonte imbriquée).
Étape 5/5 de DETTE #130 (pluriel "Tes annonces (N)", DashboardLocatairePage.jsx) TOUJOURS PAS COMMENCÉE.
Fichiers untracked toujours en attente : docs/AUDIT-2026-04-22-ZONE-1-DATA-BACKEND.md +
docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/ (2 fichiers).

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

## Conv 107 — 02/07/2026 — DETTE #130, étape 1/5 : colonne pole créée et contrainte d'unicité posée
**Fait & validé en local (db reset vert)** : audit lecture seule préalable (routes vers /annonce/creer,
comportement CreerAnnoncePage au chargement, ville annonce vs ville profil, contrainte DB existante) —
confirmé porte ouverte à 3 niveaux (UI, page, base). Décision : rattacher chaque annonce à un POLE
(école/entreprise de l'hôte) au lieu de comparer des textes de ville (évite le piège Rennes/Bruz et
la fragilité DETTE #78). Vérifié en prod avant migration : 1 annonce, 0 doublon, 0 user_id NULL — terrain
propre pour un futur db push.
Livré (commit **fe013b6**) : migration add_pole_annonces (colonne pole + backfill par id + contraintes
NOT NULL/CHECK/UNIQUE(user_id,pole)) + seed.sql patché (annonce fixture pole='entreprise'). db reset
local validé, contraintes confirmées via \d annonces. Annonce test Unsplash (aaaaaaaa…) effacée par le
reset — attendu, sans conséquence (déjà notée à réinitialiser).
RESTE (4 étapes suivantes du chantier #130) : (2) formulaire CreerAnnoncePage — remplacer la déduction
ville→pôle par question explicite école/entreprise ; (3) garde au chargement de la page (modal +
redirect dashboard si pôle déjà occupé) ; (4) masquer/désactiver les 6 points d'entrée UI vers
/annonce/creer au plafond ; (5) corriger pluriel "Tes annonces (N)" (DashboardLocatairePage l.904).
Push prod (db push) : étape séparée, non faite, à valider explicitement — vérifier avant push qu'aucune
autre ligne prod que 7d60be51… n'existe sans backfill (le garde-fou RAISE EXCEPTION bloquera sinon).

## Conv 107 (suite) — 02/07/2026 — DETTE #130, étape 2/5 : pôle dérivé du profil hôte au payload
Fait & validé build local (commit **faf0284**) : garde bloquante ajoutée avant construction du payload
(si natureLogement n'est ni 'ecole' ni 'entreprise', publication refusée avec message clair — cas
défensif où deduireOffre ne renvoie pas exactement 1 ville hôte). Payload annonce enrichi de
pole: natureLogement (à côté de ville: villeDetectee, non touché). Aucune nouvelle question posée à
l'utilisateur : le pôle était déjà dérivable du profil chargé au montage (hostProfile), confirmé par
audit lecture seule préalable (/tmp/audit-creerannonce-etape2.md). npm run build vert. Staging isolé
via patch construit contre HEAD (fichier never-stage, bypass DEV #117 + refonte bailInfo intacts,
non commités) — seules ces 8 lignes committées.
RESTE (3 étapes suivantes du chantier #130) : (3) garde au chargement de la page (modal + redirect si
pôle déjà occupé) ; (4) masquer/désactiver les 6 points d'entrée UI vers /annonce/creer au plafond ;
(5) corriger pluriel "Tes annonces (N)" (DashboardLocatairePage l.904).

## Conv 107 (suite) — 03/07/2026 — DETTE #130, étape 3/5 : garde au chargement + modale de blocage (FAITE en working tree, NON commitée)
Fait & validé runtime (desktop, hote@sterny.test : modale affichée ; contre-test compte sans annonce : formulaire normal).
Garde dans checkUserType : si le pôle dérivé du profil est déjà occupé par une annonce existante (requête dédiée
annonces WHERE user_id AND pole, au plus 1 ligne via UNIQUE(user_id,pole)), on affiche une modale de blocage PAR-DESSUS
le formulaire (qui se monte normalement), sans redirection auto. States poleOccupeBloque + villeBloquee. Modale scopée
ca-modal-* (anti-collision .modal-overlay / .back-link, familles #86/#123) : titre dynamique avec nom de ville souligné
orange #F0783E (repris du prénom dashboard .dp-prenom), texte allégé, bouton orange "Retourner à mon espace" (vocabulaire
aligné sur la nav dominante "Mon espace"). npm run build vert.
⚠️ NON COMMITÉ (décision Option A) : le code étape 3/5 vit dans CreerAnnoncePage.jsx + .css, qui sont never-stage. Contrairement
à l'étape 2/5 (payload isolable car présent dans HEAD), l'étape 3/5 touche l'état + checkUserType + la modale, imbriqués
dans la REFONTE NON COMMITÉE de CreerAnnoncePage (dérivation deduireOffre/natureLogement/hostProfile, réécriture de
checkUserType) absente de HEAD. Impossible de committer un hunk isolé cohérent (la modale référence des states qui vivent
dans la refonte). Le code reste en working tree avec le bypass DEV #117 et la refonte, à committer ensemble en Phase 0bis.
RESTE (2 étapes du chantier #130) : (4) masquer/désactiver les 6 points d'entrée UI vers /annonce/creer au plafond ;
(5) corriger pluriel "Tes annonces (N)" (DashboardLocatairePage l.904).
NOTE STRUCTURELLE : les étapes 2→5 de #130 sur CreerAnnoncePage dépendent de la refonte never-stage. La question du
commit final (lever le never-stage en isolant le bypass DEV, vs Phase 0bis) est à trancher à froid, hors fin de session.

## Conv 108 — 04/07/2026 — DETTE #130, étape 4/5 : masquage CTA "proposer un logement" si pôle occupé
Fait & commité (0c2e195). Masquage des points d'entrée UI vers /annonce/creer quand le pôle ciblé est
déjà occupé par une annonce de l'hôte — logique PAR PÔLE (pas un compteur global) : un hôte avec 1 annonce
école peut encore créer son annonce entreprise, et inversement ; seul le plafond les_deux (2 pôles occupés)
masque tout. Cohérent avec la garde étape 3/5 (blocage par pôle). Build vert.
RESTE (dernière étape #130) : (5) corriger pluriel "Tes annonces (N)" (DashboardLocatairePage l.904).
À CLARIFIER À LA REPRISE : DashboardProprietairePage.jsx + .css portent des modifs non commitées au-delà
du commit 0c2e195 (à examiner : travail légitime à committer, ou résidus). + fichiers untracked (docs
d'audit + spikes PDF) à ranger. + rappel : code étape 3/5 toujours en working tree (never-stage, Option A,
Phase 0bis) ; db push prod migration pole non fait.

## Conv 105 — 02/07/2026 — Cap design : retrait bouton doublon "Ajouter une annonce" (dashboard locataire)
**Fait & validé runtime (desktop)** : retrait du `<button>` "Ajouter une annonce" (ex-l.939-947) situé sous la liste dans la branche `annonces.length > 0` de la carte MES ANNONCES (DashboardLocatairePage.jsx). Double audit lecture seule préalable. Motif : ce bouton ouvrait la création d'une 2e annonce, ce que le modèle Sterny interdit (1 logement par ville, plafond structurel 2 villes école/entreprise ; une fois `les_deux`, plafond atteint, plus rien à ajouter = voulu). Le cas "0 annonce" garde son propre CTA (Link "Creer mon annonce", l.912). Retrait pur, aucun handler/state orphelin. Commit **54f2324** (fix, fichier seul).
**Confirmé au passage** : le "+" du header caché pour les `les_deux` (`!isLesDeux` l.661) n'est PAS un bug — c'est le plafond structurel qui s'applique correctement.
**À reprendre en priorité** : chantier "fermer la porte en dur" (cf. DETTE #130) — empêcher techniquement la création d'une 2e annonce, pas seulement masquer le bouton.

## Conv 104 — 01/07/2026 — Cap design : première cible (vignette annonce dashboard)

**Contexte** : lancement du cap design (décidé conv 103). Première cible choisie par Côme : le rendu de l'annonce dans le dashboard locataire (vignette photo qui s'affichait cassée).

**Fait & validé (runtime, desktop + placeholder + photo réelle)** :
- Vignette « Ton annonce » (DashboardLocatairePage) refaite : photo pleine hauteur de la carte via align-self:stretch + height:auto, largeur 140px, coins gauches arrondis / coins droits francs (arête de séparation nette avec le texte). Conforme à un croquis fourni par Côme.
- Placeholder (annonce sans photo) : .annonce-thumb-icon scopé .dashboard-container, icône 56px sur fond clair.
- Cause racine du bug identifiée : collision CSS globale non scopée depuis MatchConfirmationPage.css (.annonce-thumb{height:72px; background:#475569}) qui imposait fond sombre ET hauteur 72px. Neutralisée localement par scoping .dashboard-container (spécificité 2 classes). → logguée en DETTE (voir DETTE-TECHNIQUE).
- Commit : 5947875 (fix, DashboardLocatairePage.css seul).

**Décision produit actée (vitrine)** : garder des annonces de démonstration/fausses sur la homepage en pré-lancement, pour éviter une page vide à l'arrivée des visiteurs. La grammaire visuelle des cartes est indépendante du caractère réel ou factice de la donnée.

**Test local en cours** : l'annonce test (id aaaaaaaa-…-aaaaaaaaaaaa) a une URL photo Unsplash injectée en base LOCALE (réversible) pour tester le rendu avec image. À rétablir à photos=[] à la fin du cap design. Commande : UPDATE public.annonces SET photos='[]'::jsonb WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

**À reprendre en priorité (prochaine conversation)** :
1. Retirer le bouton « Ajouter une annonce » situé SOUS la carte annonce du dashboard : il fait doublon avec le « + » déjà présent à droite du bouton ville (« Rennes ») en haut de page. → chantier JSX, audit lecture-seule d'abord (repérer le bouton dans DashboardLocatairePage.jsx, confirmer le lien du «+», vérifier aucune autre dépendance).
2. Suite du cap design (cf. carte A/B/C conv 103).

## 2026-06-30 (conv 103) — Audit lecture seule du tunnel inscription → remise des clés (rafraîchissement AUDIT-FONCTIONNEL périmé)
AUDIT SEUL, ZÉRO code (rapport /tmp/audit-tunnel-2026-06-30.md). Constat : tunnel câblé jusqu'à l'EDL signé, mais s'arrête avant la restitution de caution, et le modèle 2-locataires n'est pas exploité à la signature.
- Candidature : OK. Trigger #14 RÉSOLU (fix14, a.user_id) → INSERT non bloqué ; hôte approuve/rejette (#90 résolu, handleApprouver/handleRejeter).
- Signature contrat & EDL : OK fonctionnel mais « maison » (SHA-256 + signatures_audit, mention eIDAS art.1367), SANS prestataire qualifié ni PDF archivé → robustesse probatoire à faire valider (domaine régulé §7).
- Paiement : OK. Stripe Checkout + stripe-webhook = source de vérité (update contrats/paiements + send-recu-paiement). PaiementSuccessPage lit par session_id sans retrieve serveur (acceptable). Bypass ?demo=true.
- Restitution caution / remise des clés : NON CÂBLÉE. restitution-caution existe mais 0 appelant (front + backend) → orpheline. Dernière étape manquante.
- #93 (2 locataires) : socle data présent (semaines_reservees/demandees) mais à la signature ContratLocationPage verrouille TOUTE l'annonce (disponible=false) + auto-refuse les autres candidatures → promesse non tenue au stade clé.
- Dettes toujours présentes (re-vérifiées) : #22 (doublon /annonce/creer non gardé, App.jsx l.115+164), routes /dev/* en prod (#25), #28 (table fantôme matchs, export-data l.94), #29 (token Mapbox public en dur, RecherchePage l.14). Ouvertes selon doc non re-vérifiées : #17, #23, #24.
- RÉSERVE : audit repo local seul ; déploiement prod des Edge Functions (#17) et déclenchements cron/Dashboard (restitution-caution, check-*) non vérifiables depuis le repo.
DÉCISION CÔME : GEL VOLONTAIRE de tout l'aval du tunnel (signature, valeur probatoire du paiement, EDL stocké, caution, remise des clés) ET du modèle 2 locataires (#93) jusqu'aux RDV professionnels (agences, Pépite, avocate) — ces étapes touchent au contractuel/régulé et à des connaissances externes non encore acquises ; les câbler maintenant = construire sur du sable. CHANGEMENT DE CAP en attendant : passer au DESIGN — habillage des pages existantes, traitement des pages notées « non faites », alignement design des pages déjà refondues.
PROCHAINES ACTIONS POSSIBLES (non tranchées) : ouvrir/MAJ DETTE pour caution orpheline + verrou #93 ; rafraîchir AUDIT-FONCTIONNEL-2026-05-04.

## 2026-06-30 (conv 102) — Questionnaire étude (demande) : finalisé, habillé, PUBLIÉ — lancement gaté juriste
**Instrument** : Google Forms canonique (form 1dYJGW1h83h5fHEhwRFmjs68j4r03gepOVzQF5PjHPvg). Tally définitivement abandonné (archive Gx5lbo). Formulaire PUBLIÉ (accepte les réponses, accès « tous les utilisateurs disposant du lien »).
**Contenu** : tous les conditionnels montés et testés OK en aperçu (rythme régulier/irrégulier, fréquence, durée des grandes périodes, mono-ville/bi-ville, logement payé, critères choix entreprise, renoncement à une opportunité, contrefactuel de fin). AJOUT : question « Dans quel domaine étudies-tu ? » en section 2 Profil (choix unique + option Autre, obligatoire) — variable de segmentation par secteur.
**Design** : bannière d'en-tête neutre (navy #1E293B / orange #E8622A, SANS logo ni mention de marque — choix assumé pour préserver la neutralité de l'étude et éviter le biais de désirabilité ; l'en-tête Forms n'est de toute façon pas cliquable). Accroche « Comment fais-tu pour te loger ? », eyebrow « ALTERNANCE & LOGEMENT ». Thème orange #E8622A, fond clair, mots-clés des questions en gras.
**Neutralité — état réel (corrige l'intention initiale)** : le corps des questions est neutre, mais la neutralité n'est PAS absolue → (a) la section finale « Reste en contact » contient un teaser + contact@sterny.co (nécessaire au droit de suppression), (b) Forms ajoute automatiquement en pied « Ce formulaire a été créé dans Sterny ». Non bloquant (pied + opt-in post-réponse, sans biais sur les réponses), acté pour cohérence.
**Gate RGPD : LEVÉ (10/07/2026)**. Réponse écrite de Benoît Guillemin (mail 07/07/2026 + Snapchat 10/07/2026) sur Q-DPO-016→021 (QUESTIONS-PROFESSIONNELS §2.5) : mécanique de consentement Oui/Non validée, durée de conservation portée à 24 mois (justifiée), mention DPF pour l'hébergement Google, réutilisation anonymisée autorisée si annoncée, mention d'information en double format (courte in-situ + document détaillé). Voir entrée conv 111 ci-dessous pour le détail d'implémentation.
**Prochaine étape (hors gate)** : questions AGENCES (instrument offre, concept-aware, gated avocat Q-AVO-006→009) + versionner en doc repo la recherche EDL plateformes déjà faite.

## 2026-06-30 (conv 101) — Refonte ModifierAnnoncePage (6c) MISE EN PAUSE volontaire ; #125 tranché à froid (décision produit, pas de code)
DÉCISION DE SÉQUENCEMENT : la refonte 6c est mise en PAUSE assumée (pas un abandon). Motif : en creusant le step 0 « Bail » (sous-pas 3), le sujet a dérivé du calendrier/écosystème (déjà à jour) vers le BAIL (conservation, preuve d'authenticité, attentes des agences) — qui dépend de connaissances externes que Côme n'a pas encore : rendez-vous à prendre avec un agent immobilier + une avocate, et guidance attendue d'une éventuelle incubation Pépite. Finir le step 0 sans ces réponses = construire sur du sable et tout refaire. Pause = décision de QUALITÉ.
ÉTAT DU CODE À LA PAUSE (propre, sans dette ouverte dangereuse) : 6c-① TERMINÉ (moteur de cycle mort retiré). 6c-② arrêté au sous-pas 2a INCLUS (mécanique stepper [0..5], step 0 « Bail » placeholder, 13 classes .ma-bail-* orphelines volontaires). Tout commité+poussé (feat 8220bb5 + docs 9ae1092). Working tree = 5 never-stage seuls. Bypass DEV #117 toujours actif (sûr en prod).
#125 TRANCHÉ À FROID (décision produit, AUCUN code écrit) — voir DETTE #125 requalifiée :
- Verdict factuel (audit lecture seule) : bail_info.date_debut/date_fin/duree_mois = les dates du BAIL PRINCIPAL de l'hôte (son bail avec SON propriétaire), PAS le contrat de sous-location. Le contrat de sous-location vit dans la table `contrats` (date_debut/date_fin + date_signature_*, contrainte ≤ 9 mois), figé à la SIGNATURE. Donc AUCUNE tension §145, AUCUN engagement eIDAS adossé à bail_info. La peur contractuelle initiale est LEVÉE.
- Direction produit retenue (mise en œuvre SUSPENDUE à la reprise de 6c) : (1) GARDER les dates dans bail_info ; (2) le document de bail doit être CONSERVÉ (pièce de preuve anti-falsification — à l'ère de l'IA, un doc se trafique trivialement ; sans original archivé, la plateforme s'expose) ; (3) CreerAnnoncePage doit s'ALIGNER sur Modifier (aujourd'hui Creer force les dates à null) — l'alignement se fait dans CE sens.
NOUVEAU CHANTIER ACTÉ (repoussé, hors 6c) : STOCKAGE + PREUVE D'INTÉGRITÉ du bail. Aujourd'hui le PDF n'est PAS stocké (extraction client puis fichier jeté). Sujet à cadrer AVEC des professionnels (agent immobilier, avocate, Pépite) AVANT toute implémentation. Deux volets distincts : (a) PREUVE D'INTÉGRITÉ (prouver qu'un bail n'a pas été modifié) = décision d'ARCHITECTURE, cœur du besoin, à penser tôt ; (b) RGPD (conservation, accès, effacement) = sujet de PRÉ-LANCEMENT, repoussable — Sterny est à ~1 an d'un accès public, le RGPD ne doit pas bloquer le dev, il sera revu avec les pros à l'approche de l'ouverture. Voir DETTE #125 + VISION (Cap B).
POINT DE REPRISE 6c : reprendre par le sous-pas 2b (renumérotation cosmétique des pastilles section-number 1..6, sans risque, sans dépendance externe) si on veut une mini-avancée ; le sous-pas 3 (déplacer le bloc bail vers step 0) reste GELÉ jusqu'aux réponses externes sur le bail. Le grep migrations (vérifier qu'aucune vue SQL ne lit bail_info) reste à faire pour confirmer « bail_info lu nulle part » à 100% (audit conv 101 ne l'a pas couvert).
PROCHAINE ORIENTATION (à décider en conv fraîche, NON tranché ici) : Côme évoque « revoir le fonctionnement de la page annonce » au-delà du calendrier/profil déjà à jour — sujet de fond distinct, à cadrer à part. En parallèle, l'étude de terrain (préalable Poool/Pépite) est lançable sans dépendance.

## 2026-06-30 (conv 100) — 6c-② avancé jusqu'à 2a (mécanique step 0 « Bail »), sous-pas 3 GELÉ sur arbitrage contractuel §145 (#125)
FAIT & VALIDÉ RUNTIME, COMMITÉ (feat) : demi-pas 1 (CSS) + sous-pas 2a (mécanique stepper).
- Demi-pas 1 : 13 classes .ma-bail-* ajoutées à ModifierAnnoncePage.css (reprises de CreerAnnoncePage.css, préfixe scopé ca-→ma- anti-collision #86/#123). ORPHELINES à ce stade (aucun JSX ne les utilise) — volontaire.
- Sous-pas 2a : stepper [1..5]→[0..5], step 0 « Bail » placeholder (en-tête + nav), totalSteps 5→6 (x2), progressGridCols repeat(6,1fr), getProgressWidth recalculé pour [0..5] (stepPosition=currentStep), prevStep borne quitter currentStep===0, num affiché index+1 (1..6). Validé écran : barre 6 cases (Bail·1 … Prix·6), démarrage sur Informations (useState(1) conservé = voulu, page d'ÉDITION), navigation 0↔5 fluide, une seule section affichée, barre orange correcte, console calme.
NON TOUCHÉ : bloc bail (reste step 4), validateStep, seuil planche #119, bypass DEV #117, useState(currentStep), pastilles section-number (sous-pas 2b non fait).
ARBITRAGES ACTÉS : (1) step 0 = option (a) upload + dates manuelles (PAS option b) — 6c = Cap A, on range sans changer le modèle ; (2) démarrage sur Informations, pas Bail (édition ≠ création) ; (3) numéro affiché 1..6 via index+1 ; (4) déplacement à l'identique sans conversion .ma-bail-* (style = passe ultérieur, après lecture validée du rendu Creer).
BLOCAGE → 6c-② SUSPENDU au sous-pas 3 : l'audit de parité bail Creer↔Modifier a trouvé un ÉCART CRITIQUE de comportement en base (DETTE #125) : Creer force les dates bail à null (§145, marqueur), Modifier écrit les vraies dates. Déplacer/pérenniser les inputs dates au step 0 graverait un comportement contredisant peut-être §145. Sujet CONTRACTUEL (date d'effet, durée d'engagement) → ne pas trancher seul, avis professionnel logement recommandé.
RESTE de 6c-② (après arbitrage #125) : sous-pas 2b (renuméroter pastilles section-number 1..6) ; 3a/3b (déplacer bail vers step 0 + retitrer step 4 « Disponibilités ») ; sous-pas 4 (validateStep : déplacer checks dates step 4→step 0 + fix #119 <7→<1, vérifiable seulement après retrait bypass #117 en 6c-③).
DETTES OUVERTES cette session : #125 (bail_info, contractuel, BLOQUANT) ; #126 (extraction PDF Modifier en retard) ; #127 (helpers dupliqués).
CORRECTION note mémoire : « annonce d'alternant via présence de bail_info à la l.~424 » est PÉRIMÉE — depuis l'alignement charte conv 86, detectedType est forcé à 'locataire' (l.448), indépendamment de bail_info. bail_info ne sert qu'à réhydrater (l.549) et sauver (l.1316) les dates.
PROCHAINE SESSION : trancher §145/#125 à froid (décision produit, éventuel avis pro) AVANT le sous-pas 3. En attente, le sous-pas 2b (cosmétique, sans risque contractuel) est faisable.
COMMITS conv 100 (branche feat/unification-inscription) : 1 feat (demi-pas 1 + 2a) + 1 docs. Vérifier git log en début de session suivante.

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
