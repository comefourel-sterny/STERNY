# Vision architecture Sterny

Document de référence stratégique. Décrit **où on va** et **pourquoi**, pas comment on y va au quotidien (c'est le rôle d'`ETAT-COURANT.md`) ni les règles projet (c'est `CONTEXTE-PROJET.md`).

Ce document est la boussole de Sterny. Il doit être lu par toute nouvelle session Claude avant de proposer une évolution technique ou produit. Toute décision qui contredit ce document est un signal d'alarme : soit la décision est mauvaise, soit ce document doit être mis à jour.

**Dernière mise à jour** : 3 mai 2026 — Précision sur le parcours propriétaire ajoutée en §6 (UX proprio invité revenant sans le lien + réversibilité stratégique de la garde token). Issue de la conv Claude.ai 2 sur le chantier UNIFICATION-INSCRIPTION (clôture).

---

## 1. Principe fondateur

**Le rythme réel de l'alternant, extrait de son emploi du temps scolaire, est la seule source de vérité du matching Sterny.**

Tout le reste découle de ce principe. La plateforme ne demande pas à l'utilisateur de décrire son rythme avec des abstractions (rythme symétrique, rythme asymétrique, pattern "4-2", "2-2", etc.). Elle lit directement son planning de cours et en extrait le calendrier semaine par semaine, au jour près.

L'utilisateur ne fait qu'une seule action pour transmettre son rythme à Sterny : uploader son emploi du temps scolaire. Ce qu'il fait en 30 secondes, qu'il a de toute façon reçu de son école. Aucune saisie manuelle, aucun concept à comprendre, aucun formulaire à remplir.

Cette mécanique est l'argument de vente principal de Sterny. Elle doit être défendue dans chaque décision produit future.

---

## 2. Pourquoi pas les patterns abstraits

Les rythmes d'alternance réels sont **irréguliers**. C'est un fait observé, pas une hypothèse.

L'exemple du calendrier 2026/2027 du BUT 3 GEA de l'IUT de Saint-Malo (Université de Rennes) le démontre : 4 groupes de formation, 45 semaines chacune, aucun des 4 ne suit un pattern régulier. Les semaines école et entreprise alternent selon les contraintes pédagogiques du programme (examens, projets, vacances, périodes de rendu) et non selon une règle mathématique.

Par conséquent, demander à un alternant de choisir *"je suis en rythme 4-2"* dans un menu déroulant est une fiction. Deux alternants étiquetés "4-2" peuvent avoir zéro semaine en commun dans leur vrai calendrier. L'étiquette est un raccourci descriptif marketing, pas une donnée de matching.

**Conséquences pratiques :**

- Un matching basé sur `rythme_pattern` produit des mises en relation incorrectes, même quand les patterns théoriques concordent.
- Un utilisateur qui se voit proposer un matching "parfait" sur la base d'un pattern abstrait peut se retrouver avec zéro compatibilité réelle. Expérience utilisateur désastreuse, réputation de la plateforme atteinte.
- Le seul matching qui fonctionne est celui qui compare les vraies semaines : *"tu es à l'école les semaines du 31 août, du 14 septembre, du 28 septembre… je suis en entreprise ces mêmes semaines, mon logement est donc libre quand tu en as besoin."*

---

## 3. Conséquences sur l'architecture BDD

### Règle fondamentale : stockage en dates ISO, pas en numéros de semaine

La norme ISO 8601 (reprise en France sous la référence NF EN 28601) définit une numérotation universelle des semaines. La semaine 1 d'une année est celle qui contient le premier jeudi de l'année (ou, de manière équivalente, celle qui contient le 4 janvier). Les semaines vont du lundi au dimanche.

Cette norme est utilisée par la quasi-totalité des établissements scolaires français. En théorie, "semaine 36" désigne donc la même période calendaire pour tout le monde.

**Mais Sterny ne stocke pas de numéros de semaine** (S36, S37, etc.). Sterny stocke **la date ISO du lundi** de chaque semaine (`"2026-08-31"`, `"2026-09-07"`, etc.). Raisons :

- Une date est universelle et non-ambiguë, alors qu'un numéro de semaine peut créer des confusions entre systèmes (ISO vs américain).
- Une date traverse les années civiles sans casser la logique (pas de problème "S53 ou S1 ?" en fin d'année).
- Une date permet de comparer directement les calendriers de deux alternants, même s'ils ont leur planning sur des années différentes.

**Règle pour Claude** : toute feature qui manipule des semaines doit raisonner en dates ISO du lundi (format `"YYYY-MM-DD"`). Aucune feature ne doit s'appuyer sur des numéros de semaine stockés en BDD.

### Sources de vérité du matching

Deux colonnes portent la vérité :

- **`users.rhythm_calendar`** (jsonb) : tableau semaine par semaine du rythme de l'alternant, extrait par le parser IA (ou saisi manuellement en fallback). Chaque entrée a la forme `{ week_start: 'YYYY-MM-DD', status: 'school' | 'company' }` où `week_start` est la date du lundi.

- **`annonces.disponibilites_pattern`** (jsonb) : tableau des lundis (format `"YYYY-MM-DD"`) où le logement est disponible à la location. Calculé automatiquement par Sterny à partir du `rhythm_calendar` de l'hôte et de la ville du logement proposé (voir règle ci-dessous).

Toute logique de matching future doit se baser exclusivement sur ces deux colonnes.

### Modèle officiel des colonnes ville utilisateur

Sterny utilise 4 colonnes BDD pour décrire les villes d'un utilisateur alternant :

| Colonne | Sémantique |
|---|---|
| `users.ville_ecole` | Ville de l'école / centre de formation |
| `users.ville_entreprise` | Ville de l'employeur / lieu de l'alternance entreprise |
| `users.statut_ville_ecole` | `'recherche'` (l'utilisateur cherche un logement dans cette ville) ou `'hote'` (l'utilisateur propose son logement dans cette ville) |
| `users.statut_ville_entreprise` | `'recherche'` ou `'hote'` (même sémantique) |

Une 5e colonne `users.ville` existe historiquement (saisie unique générique) et est **dépréciée** — à ne plus écrire dans les nouveaux flows, à supprimer en phase de nettoyage.

Une colonne `users.ville_recherche_secondaire` existe et a été observée par grep mais sa sémantique exacte n'a pas encore été clarifiée — à investiguer avant tout nouveau code qui la touche.

**Table des cas utilisateur typiques** :

| Cas | `ville_ecole` | `statut_ville_ecole` | `ville_entreprise` | `statut_ville_entreprise` |
|---|---|---|---|---|
| `locataire` qui cherche dans ville d'école | Rennes | `'recherche'` | NULL | NULL |
| `locataire` qui cherche dans ville d'entreprise | NULL | NULL | Quimper | `'recherche'` |
| `hote` qui propose ville d'école | Rennes | `'hote'` | NULL | NULL |
| `hote` qui propose ville d'entreprise | NULL | NULL | Quimper | `'hote'` |
| `les_deux` cherche école + propose entreprise | Rennes | `'recherche'` | Quimper | `'hote'` |
| `les_deux` cherche entreprise + propose école | Rennes | `'hote'` | Quimper | `'recherche'` |
| `les_deux` cherche les 2 villes | Rennes | `'recherche'` | Quimper | `'recherche'` |
| `les_deux` propose les 2 villes (cas marginal) | Rennes | `'hote'` | Quimper | `'hote'` |

**Helper de dérivation** : un helper `deriveVilleRecherchee(user)` doit être créé dans `sterny-react/src/utils/` pour retourner `'ecole' | 'entreprise' | null` selon ces colonnes — à utiliser comme prop par tout composant qui a besoin de cette information (ex. `RhythmManualBuilder` pour la logique de sélection inverse Q8).

**Règle pour Claude** : aucune nouvelle migration BDD ne doit être proposée pour stocker la "ville recherchée" — cette information est dérivable du modèle existant. Toute proposition d'ajouter une colonne `ville_recherchee` est un signal qu'on n'a pas pris connaissance de ce modèle.

**Origine** : grep d'usage des colonnes `ville_*` mené le 2 mai 2026 soir (audit `CompleterProfilPage.jsx`). Le modèle existait déjà et était utilisé par `InscriptionRecherchePage`, `ModifierProfilPage`, `ProfilPage`, `DashboardLocatairePage` — il n'avait juste pas été documenté en VISION.

**Convention de remplissage post-conv 12 (6 mai 2026)** — Suite à la simplification produit du E-4 (suppression du toggle école/entreprise), la convention de remplissage des 4 colonnes par le parcours d'inscription unifié devient :

- **Mono-ville** (`type_user` = `locataire` ou `hote`) : seul `ville_entreprise` est rempli, avec `statut_ville_entreprise = type_user`. Les colonnes `ville_ecole` / `statut_ville_ecole` restent NULL.
- **Bi-ville** (`type_user` = `les_deux`) : `ville_entreprise` = ville où l'utilisateur propose son logement (statut `'hote'`), `ville_ecole` = ville où il cherche (statut `'locataire'`).

Cette convention est purement de slot, non sémantique : la ville stockée dans `ville_entreprise` n'est pas forcément la ville d'entreprise au sens géographique. La sémantique école/entreprise n'est volontairement plus demandée à l'utilisateur (il pense en "ville où je cherche/propose", pas en "ville d'école/entreprise"). Un helper `getVillesUtilisateur(user)` à créer aplatira la lecture pour le matching et le dashboard. Une simplification BDD (colonne unique `ville_principale` ou équivalent) pourra être envisagée post-pilote.

### Fragilité possible des métadonnées document

Les colonnes `parsed_groups->'document_meta'` (school_name, program_name, academic_year, detected_locale) sont extraites par le parser IA en parallèle de `groups`. Selon le format du document uploadé, certains de ces champs peuvent être `null` ou contenir des codes techniques au lieu de libellés humains. Exemples observés en avril 2026 : un planning Hyperplanning au format PDF a renvoyé `school_name: null` et `program_name: "R_CA_A3"` (code technique). Le LLM ne peut pas inventer ce qui n'est pas présent dans le document source.

**Règle pour Claude** : tout écran qui affiche `document_meta` doit gérer le cas `null` (afficher "École non détectée", "Programme non identifié" ou équivalent) plutôt que crasher ou afficher une chaîne vide. Ces métadonnées sont **descriptives**, pas structurelles : leur absence n'invalide pas le matching, qui repose uniquement sur `groups[].weeks`.

### Comment Sterny calcule automatiquement les disponibilités

Sterny ne présume jamais de la situation d'un utilisateur. La plateforme calcule les semaines de disponibilité d'un logement à partir de deux informations fournies explicitement par l'utilisateur :

1. **La ville du logement proposé** (renseignée dans le formulaire de création d'annonce).
2. **Les villes de l'utilisateur** (sa ville d'école et sa ville d'entreprise, renseignées dans son profil).

Le moteur de Sterny compare automatiquement la ville du logement à ces deux villes pour déterminer à quelles semaines du `rhythm_calendar` le logement est libre.

**Exemple concret** :

Un alternant étudie à Rennes et fait son entreprise à Quimper. Il propose un logement situé à Quimper.

- Sterny reconnaît : ville du logement = Quimper = ville d'entreprise de l'utilisateur.
- Donc le logement est libre pendant les semaines où l'utilisateur est à l'école (à Rennes), c'est-à-dire les semaines avec `status='school'` dans son `rhythm_calendar`.
- `disponibilites_pattern` de l'annonce = liste des dates `week_start` des semaines `status='school'`.

**Règle pour Claude** : aucune logique ne doit présumer qu'un hôte loue nécessairement son logement d'école ou son logement d'entreprise. Les deux cas existent. La plateforme déduit toujours de la ville du logement croisée avec les villes de l'utilisateur.

**Conséquence pour les utilisateurs `les_deux`** : un alternant qui propose un logement dans une ville ET en cherche un dans l'autre ville est parfaitement géré par cette logique. Les deux actions sont indépendantes et utilisent la même source `rhythm_calendar` lue dans le bon sens selon la ville concernée par chaque action.

**Pas de semaines vacances dans le modèle.** Les alternants ne bénéficient pas des vacances scolaires : ils sont salariés et ont droit aux mêmes 5 semaines de congés payés par an que tout salarié, posés en accord avec leur employeur. Un planning d'alternance ne contient donc que deux états : semaine école, semaine entreprise. Le modèle binaire `school` / `company` du `rhythm_calendar` reflète cette réalité. Le prompt LLM intègre explicitement cette règle : toute semaine marquée comme vacances scolaires, semaine blanche ou jours fériés dans un document source est classée en `company` par défaut (statut du salarié).

Les 5 semaines de congés que l'alternant pose au fil de l'année sont des décisions personnelles imprévisibles au moment de l'extraction du planning. Elles sont traitées par une mécanique d'ajustement manuel : lors de la création d'annonce, `disponibilites_pattern` est pré-calculé automatiquement à partir du `rhythm_calendar` croisé avec la ville du logement, puis l'hôte **peut modifier manuellement** cette liste pour retirer des semaines (il garde son logement pendant ses congés, il veut y rester pour réviser) ou en ajouter (il rentre chez ses parents pendant les vacances scolaires de son pote locataire). L'hôte connaît sa situation, Sterny lui fait confiance pour l'ajuster. Cette règle s'applique à tout pré-calcul : la donnée automatique est une suggestion, l'utilisateur tranche.

### Distinction passé / présent / futur dans les flux financiers

`users.rhythm_calendar` est un référentiel descriptif du rythme annuel de l'utilisateur. Il ne porte aucune valeur transactionnelle. Aucune facturation, aucune disponibilité de logement, aucun matching ne doit être calculé sur des semaines déjà passées à la date de l'opération.

Les semaines passées présentes dans `rhythm_calendar` servent uniquement à l'historique et à la cohérence du calendrier annuel — elles ne donnent jamais lieu à paiement, occupation, ou match.

**Date d'effet du contrat distincte de la date de signature.** Au moment de la signature d'un contrat de sous-location, l'utilisateur doit pouvoir choisir explicitement la semaine à partir de laquelle son contrat prend effet. Cette semaine ne peut pas être antérieure à la semaine ISO en cours à la date de signature, mais elle peut être la semaine en cours, la semaine suivante, ou plusieurs semaines plus tard selon le besoin de l'utilisateur (temps d'emménagement, contraintes personnelles). La facturation et le calcul des semaines occupées partent de cette date d'effet, pas de la date de signature.

Cette règle s'applique à tous les flux : création d'annonce (`disponibilites_pattern` ne contient que des semaines futures), recherche, candidature, signature, génération d'échéancier de paiement.

**Consultation des plannings historiques en dashboard utilisateur.** Un utilisateur ayant déjà signé un contrat sur une année passée doit pouvoir consulter cet ancien planning en lecture seule depuis son dashboard, pour référence personnelle. Cette consultation est distincte de la saisie d'un planning courant et ne doit pas se confondre avec un sélecteur d'année dans le parcours d'inscription, qui ne propose que l'année courante et l'année suivante.

**À auditer avant tout codage du flux contrat/paiement** : vérifier que chaque endroit du code qui lit `rhythm_calendar` ou `disponibilites_pattern` filtre bien les semaines passées au moment de la requête, et que tout flux de signature offre le choix explicite de la semaine de début.

**Origine** : décision actée le 2 mai 2026 après-midi pendant le cadrage de la troncature dynamique du composant `RhythmManualBuilder` (chemin 3 VISION §5). Tracée dans ETAT-COURANT bloc 2026-05-02 après-midi.

### Colonnes dépréciées

Les colonnes suivantes existent dans la BDD mais n'ont plus vocation à être utilisées dans le matching. Elles restent en place pendant la phase de transition pour ne pas créer de régressions brutales, puis seront supprimées via une migration dédiée en fin de transition.

| Colonne | Statut | Usage futur |
|---|---|---|
| `users.type_alternance` | **Dépréciée** | Descriptif uniquement (affichage) ou suppression |
| `users.rythme_alternance` | **Dépréciée** | Descriptif uniquement ou suppression |
| `annonces.type_alternance` | **Dépréciée** | Descriptif uniquement ou suppression |
| `annonces.rythme_pattern` | **Dépréciée** | Descriptif uniquement ou suppression |

**Règle** : aucune nouvelle feature ne doit s'appuyer sur ces colonnes pour un matching, un filtre, ou une logique métier. Elles sont gelées en attente de suppression.

---

## 4. Pipeline parser : pattern accumulateur

### Pattern accumulateur — contrat de données du parser (validé empiriquement 28 avril 2026)

Le parser rhythm_calendar de Sterny utilise un pattern de structure de données central : le **squelette accumulateur**.

**Principe** : pré-générer un squelette de calendrier hebdomadaire dès qu'on connaît les dates de début et fin de l'année académique. Chaque entrée du squelette représente une semaine ISO et contient les champs suivants :

- `weekStartISO` : date ISO du lundi de la semaine, au format `YYYY-MM-DD` (ex `2025-09-01`)
- `status` : statut métier de la semaine, valeurs possibles `null`, `school`, `company`, `vacation`, `unknown`, `no_anchor`
- `confidence` : niveau de confiance, valeur `null` ou nombre entre `0.0` et `1.0`
- `votes` : tableau d'objets vote, chaque vote contenant `color` (hex `#rrggbb`), `x` et `y` (coordonnées dans le PDF), `source` (nom de la méthode qui a déposé le vote, ex `pdfjs`, `vision_ocr`, `docai`, `user`)
- `anchorX`, `anchorY` : coordonnées de l'ancre de la semaine dans le PDF source, `null` si pas d'ancre trouvée

**Comportement** : chaque méthode d'extraction du pipeline (pdf.js, Vision OCR, DocAI, saisie utilisateur) dépose ses votes dans le squelette. À la fin du pipeline :
- Plusieurs sources d'accord sur une cellule → confidence haute, statut certain
- 1-2 sources d'accord → confidence intermédiaire, statut probable
- Aucune source ou désaccord → confidence basse, remontée ciblée à l'utilisateur

**Origine** : intuition d'architecture posée par Côme en session du 27 avril 2026. Validée empiriquement le 28 avril 2026 dans le spike #1 étape 1B.2 sur Mathis (score 100% de match contre vérité terrain).

**Implémentation de référence** : `docs/spikes/2026-04-28-01-pdf-js-getoperatorlist/etape-1b-2-grid-and-match.mjs`. La structure JSON produite (`output-mathis-grid.json`) est le contrat de données pour tous les spikes futurs et pour le pipeline production.

**Conséquences pour les spikes futurs** :
- Spike #2 (Google Vision OCR) doit déposer ses votes dans la même structure, source `vision_ocr`
- Spike #3 (Google DocAI compute_style_info) idem, source `docai`
- Spike #4 (Azure DI STYLE_FONT) idem, source `azure_di`
- La saisie utilisateur (validation manuelle UI) idem, source `user`, confidence 1.0

**Conséquences pour la production** :
- Le seuil de confidence à partir duquel une cellule est acceptée sans validation utilisateur reste à arbitrer (probablement supérieur ou égal à 0.9, ou exigence de 2 sources d'accord ou plus)
- Les semaines de bordure de calendrier où Hyperplanning omet des jours doivent toujours remonter à l'utilisateur (vu en 1B.2 : 7 semaines à votes faibles sur Mathis)

### Mesure d'une candidate parser — couverture intégrale du planning fixture

Toute candidate technique mesurée par un spike parser doit être évaluée sur **l'intégralité d'un planning fixture** (tous les groupes contenus dans le PDF source si plusieurs groupes coexistent), pas sur un sous-ensemble sélectionné.

**Raison** : un score mesuré sur un seul groupe d'un planning multi-groupes ne reflète pas le score réel en exploitation. Le risque est l'**overfitting involontaire** — un système qui marche très bien sur le groupe précis sur lequel il a été réglé, mais échoue sur les autres groupes du même planning parce qu'il a appris les particularités de ce groupe (positions de cellules, palette précise, structure de grille) au lieu de la règle générale. Sur Sterny, l'utilisateur ne sélectionne pas son groupe : il uploade le PDF entier puis Sterny détecte ses groupes. Si la candidate ne marche que sur un groupe sur quatre, le système est cassé pour 75% des utilisateurs de ce planning sans qu'on l'ait mesuré.

**Conséquence pratique pour les spikes** : la vérité terrain de tout planning fixture multi-groupes doit couvrir **tous les groupes** avant qu'un spike démarre sa phase de mesure. Le tuning éventuel des seuils techniques (filtres couleur, kernels morphologiques, etc.) se fait sur un seul groupe de référence, mais la mesure de validation se fait sur l'ensemble des groupes sans nouveau tuning.

**Conséquence statistique** : sur 45 semaines (1 groupe Martin), 1 erreur représente 2.2% de variation, ce qui rend les scores fragiles autour des seuils >95%. Sur 180 semaines (4 groupes Martin), 1 erreur représente 0.55%, lecture du score 4× plus serrée. Pour des seuils exigeants (>97-98% en cible production), la base 1 groupe est insuffisante.

**Origine** : principe acquis lors du cadrage du spike d'amélioration parser le 30 avril 2026 après-midi bis. Acté pour tous les futurs spikes parser, pas seulement Martin.

### Mapping couleur → statut (school/company) — étape utilisateur obligatoire

Le parser détecte des **couleurs** (jaune, vert, rose, bleu...) sur un planning, pas des **statuts** (school, company). Sur les plannings qui ne contiennent pas de légende textuelle exploitable (ex. : Martin, où aucune mention "jaune = cours / vert = entreprise" n'apparaît dans le PDF), le parser n'a aucun moyen de déduire seul quelle couleur correspond à quelle modalité.

**Conséquence** : le pipeline parser doit toujours présenter à l'utilisateur, en fin d'extraction, un écran de confirmation de la forme « la couleur jaune représente : ☐ tes semaines de cours ☐ tes semaines en entreprise ». Tant que ce mapping n'est pas validé, le calendrier produit reste neutre (pas de catégorie school/company posée).

Cette validation est cohérente avec le principe « UX honnête en amont » (§7 risque 4) : on ne promet pas une extraction 100 % automatique, on présente une étape de validation rapide qui sécurise le matching contre une inversion catastrophique.

Cas où cette étape pourrait être contournée (à n'envisager qu'après spike dédié) : planning contenant une légende textuelle clairement exploitable (mots-clés "centre/école/formation" vs "entreprise/alternance" associés sans ambiguïté à des zones colorées). À ne pas implémenter dans la phase actuelle — toute candidate parser doit livrer son verdict couleur, l'écran de confirmation reste obligatoire.

---

## 5. Stratégie discriminante par format source

Le parser rhythm_calendar de Sterny ne suit pas un chemin unique. Selon la nature du document que l'utilisateur uploade, la plateforme aiguille l'extraction vers une technique adaptée à ce format. Cette stratégie remplace le parsing par vision LLM pure, qui s'est révélé non fiable à grande échelle (cf. §7 risque 4 et DETTE #37).

### Trois chemins, un contrat de données commun

Quel que soit le chemin emprunté, chaque méthode d'extraction dépose ses votes dans le squelette accumulateur défini en §4. Le routage choisit la méthode ; le contrat de données reste identique.

**Chemin 1 — PDFs vectoriels : `pdf.js getOperatorList`**

Pour les PDFs où le contenu est encodé en instructions de dessin vectoriel (texte sélectionnable, formes définies par coordonnées plutôt que par pixels), Sterny utilise la méthode `getOperatorList` de la librairie pdf.js. Cette méthode retourne la liste brute des opérations de dessin du PDF (couleurs de remplissage, rectangles, positions), ce qui permet de lire la couleur de fond de chaque cellule directement, sans OCR (reconnaissance optique de caractères) ni vision LLM.

Validé empiriquement par le spike #1 étape 1B (28 avril 2026) : score consolidé **99.1% sur 162 semaines** (Mathis 100%, Matthieu 98.1%).

**Chemin 2 — Images raster : algorithme manuel sur `ImageData` avec ancrage manuel UI**

Pour les images raster (JPG, PNG — c'est-à-dire des images encodées pixel par pixel, par opposition à des descriptions vectorielles), Sterny utilise un algorithme manuel en TypeScript pur, exécuté côté Edge Function Deno (le runtime serveur TypeScript des Edge Functions Supabase). L'algorithme lit le tableau `ImageData` (la représentation pixel par pixel d'une image en mémoire JavaScript) cellule par cellule.

L'utilisateur clique deux ancres dans l'image (la première et la dernière semaine de son groupe), Sterny en déduit les coordonnées des semaines intermédiaires par division uniforme, puis échantillonne la couleur médiane de chaque cellule sur une fenêtre 7×7 pixels filtrée pour ignorer le texte intra-cellule. La classification jaune = école / vert = entreprise se fait par règles de bucket sur les composantes RGB.

Validé empiriquement par le spike #2 étape 1B (29 avril 2026) : score **93.33% (42/45)** sur Martin FA CG2P G1. Trois erreurs résiduelles tracées en DETTE #41 et à investiguer avant industrialisation production.

**Chemin 3 — Saisie manuelle assistée (couche universelle et fallback obligatoire)**

Pour tout document qui ne tombe ni dans le chemin 1 (PDFs scannés, PDFs sans fonds vectoriels exploitables, formats inconnus) ni dans le chemin 2 (planning manuscrit, photo de mauvaise qualité, format atypique), Sterny propose une UI de saisie manuelle assistée. L'utilisateur reconstruit son rythme semaine par semaine sur un calendrier visuel, avec ou sans pré-remplissage IA selon ce qui aura pu être détecté.

Ce chemin joue aussi un second rôle, indépendant du routage : il est la **couche universelle de validation**. Tout résultat des chemins 1 ou 2 est présenté à l'utilisateur dans la même UI pour confirmation explicite avant que `rhythm_calendar` ne passe au statut `confirmed` (cf. §6 règle de validation visuelle obligatoire).

La conception détaillée du composant de saisie manuelle assistée fait l'objet d'une session dédiée. À ce jour le concept est posé, l'UI ne l'est pas encore.

### Critère de discrimination à l'upload

Sterny détermine le chemin à appliquer en inspectant le fichier uploadé :

1. Si le MIME type (le code qui identifie le type d'un fichier, par exemple `application/pdf` ou `image/jpeg`) est un PDF, Sterny vérifie si le PDF contient des instructions de dessin vectoriel exploitables (présence de fills colorés en quantité cohérente avec un calendrier d'alternance).
   - Oui → chemin 1
   - Non (PDF scanné ou converti depuis image) → chemin 3
2. Si le MIME type est une image raster (`image/jpeg`, `image/png`) → chemin 2
3. Tout autre format → chemin 3

L'heuristique exacte d'aiguillage pour le critère 1 (présence d'instructions vectorielles exploitables dans un PDF) reste à formaliser et à valider sur fixtures avant industrialisation. Une approche simple sera testée d'abord : compter les opérations `setFillRGBColor` (ou équivalent) retournées par `getOperatorList`, et exiger un seuil minimal cohérent avec un calendrier de 40-50 semaines.

### Pourquoi cette stratégie remplace le parsing par vision LLM pure

Les LLM vision (Claude, GPT-4o, Gemini) ne sont pas fiables sur la classification couleur pixel par pixel à grande échelle (180-250 cellules à classer simultanément). Cette limite a été documentée en §7 risque 4 et confirmée empiriquement le 27 avril 2026 sur GPT-4o (5/10) et Gemini (4/10) testés à la main sur les 10 premières semaines de FA CG2P G1 du Planning_Martin.JPG. Aucun prompt engineering ne corrige cette limite structurelle.

L'approche discriminante s'appuie sur la nature exacte du fichier source. Pour un PDF vectoriel, la couleur est une donnée brute lisible par programme — il serait absurde de demander à un LLM vision de la "voir". Pour une image raster, l'algorithme manuel sur `ImageData` lit la couleur des pixels directement, sans intermédiaire qui pourrait deviner. La saisie manuelle assistée garantit un chemin terminal sûr pour tout cas que l'automatique ne sait pas traiter, et joue par ailleurs son rôle de validation visuelle obligatoire pour les chemins 1 et 2.

**Conséquence pour le principe fondateur (§1)** : le rythme réel de l'alternant, extrait de son emploi du temps, reste la seule source de vérité du matching. Ce qui change, c'est la manière dont ce rythme est extrait. La promesse marketing évolue de « uploade ton planning, tout est automatique » vers « uploade ton planning, on extrait ce qui est extractible automatiquement, tu valides ou complètes en quelques clics ». Cette honnêteté en amont est cohérente avec le principe UX énoncé en §7 risque 4.

**Origine** : décision actée le 29 avril 2026 après clôture des spikes #1 (PDFs vectoriels) et #2 (images raster). Tranche l'arbitrage F1/F2/F3 documenté dans DETTE #37 : levier 1 (autre LLM vision) éliminé empiriquement, leviers 2 (pipeline hybride spécifique par format) et 3 (saisie manuelle assistée) retenus en combinaison. DETTE #37 close stratégiquement, voir DETTE-TECHNIQUE.md.

---

## 6. Conséquences sur l'UX

### Upload-first à l'inscription

Le parcours d'inscription d'un nouvel alternant doit être le plus court possible. Idéalement : création de compte → upload du planning → détection automatique du rythme → choix du groupe si le planning en contient plusieurs → fin.

Objectif : **5 minutes maximum**, aucun concept technique à comprendre. L'utilisateur n'a pas besoin de savoir ce qu'est un "rythme symétrique". Il uploade un document qu'il a déjà.

### Parcours d'inscription unifié (décision actée le 2 mai 2026 soir)

**Cible architecture** : les 3 méthodes d'authentification disponibles (inscription email, Google OAuth, Apple OAuth) doivent converger vers un **parcours d'inscription unifié unique**, qui demande exactement les mêmes informations dans le même ordre, et qui garantit le même état BDD final (4 colonnes ville renseignées, `type_user` choisi, `rhythm_calendar` saisi pour `locataire/hote/les_deux`).

**État actuel à corriger** :

- `InscriptionRecherchePage.jsx` est le parcours d'inscription email actuel et écrit les 4 colonnes ville (`ville_ecole`, `statut_ville_ecole`, `ville_entreprise`, `statut_ville_entreprise`).
- `CompleterProfilPage.jsx` est le parcours de complétion post-Google OAuth et écrit uniquement la colonne legacy `users.ville` (sans toucher aux 4 colonnes du modèle officiel décrit en §3).
- Apple OAuth pas implémenté.

**Conséquence concrète** : un utilisateur qui s'inscrit par email arrive avec un état BDD différent d'un utilisateur qui s'inscrit par Google. C'est une dette structurelle qui se voit dès la première utilisation (dashboards qui affichent des choses différentes selon la méthode d'inscription).

**Décision** : refondre le parcours d'inscription en un seul flow unifié, accessible via les 3 méthodes d'authentification. `InscriptionRecherchePage` et `CompleterProfilPage` fusionnent en un seul composant (nom à arrêter pendant le chantier — probablement `ParcoursInscription.jsx` ou équivalent). `GoogleAuthHandler` et le futur `AppleAuthHandler` redirigent vers ce parcours unifié quand `profil_complet = false`. Aucune écriture BDD n'est faite par les handlers OAuth eux-mêmes — toute la saisie se fait dans le parcours unifié.

**Justification** :

- L'inscription est la base de tout site, elle doit être impeccable et cohérente quelle que soit la méthode d'auth utilisée.
- Maintenir 2 parcours séparés multiplie les bugs et les divergences d'état BDD.
- Le chantier unification est l'occasion parfaite pour aligner aussi la saisie sur le modèle officiel `(ville_*, statut_ville_*)` décrit en §3 et arrêter d'écrire les colonnes dépréciées (`users.ville`, `users.type_alternance`, `users.rythme_alternance`).

**Ordre d'implémentation prévisionnel** : le chantier unification inscription doit être traité **avant** l'intégration de `RhythmManualBuilder` dans le parcours d'inscription. L'intégration `RhythmManualBuilder` se fera comme une étape du parcours unifié, une fois ce parcours en place. Faire l'inverse créerait du double travail (intégrer `RhythmManualBuilder` dans `CompleterProfilPage` actuel, puis le re-intégrer dans le parcours unifié après refonte).

**Plan de chantier** : 1 session Claude.ai dédiée pour le cadrage (document `docs/recherche/UNIFICATION-INSCRIPTION.md` — modèle BDD final, séquence des étapes, design des écrans, gestion des 3 méthodes auth), puis 2-3 sessions d'implémentation avec commits atomiques par tranche, puis tests bout-en-bout sur 4 `type_user` × 3 méthodes auth = 12 parcours à valider.

**Bloquant pré-production** : oui. Aucun lancement opérationnel n'est envisageable tant que les 3 méthodes d'inscription ne convergent pas vers le même état BDD.

**Périmètre élargi du chantier (acté 2 mai 2026 soir bis, après audit `docs/_audit/AUDIT-INSCRIPTION-2026-05-02.md`)** :

- Suppression de `InscriptionPartagerPage` (page fantôme : seul lien actif depuis `UserDropdown` sémantiquement incorrect, doublonne le chemin partage de `InscriptionRecherchePage` avec un schéma BDD incohérent).
- Durcissement de la garde sur `/inscription/proprietaire` : route accessible uniquement avec `?r=token` valide (présence + résolution réussie via `users.invitation_token` en BDD). Sans token valide, la page elle-même affiche un message d'aide explicite (pas de redirection 301 silencieuse), cf. précision 3 mai 2026 ci-dessous et amendement conv 17 du 7 mai 2026. Le CTA "Je suis propriétaire" de `ChoixInscriptionPage` est conservé : il route vers `/inscription/proprietaire` qui filtre via la garde token. La sémantique d'inscription proprio reste "par invitation uniquement" — le CTA n'ouvre pas un parcours public, il sert de porte d'entrée pour le proprio invité revenant sans son lien d'invitation (cas du proprio qui reçoit l'email à un moment peu pratique et l'oublie).
- Migration de toute écriture BDD hors de `GoogleAuthHandler` : le handler ne fait que rediriger, aucun INSERT/UPDATE de `users` au callback OAuth. Toute saisie passe par le parcours unifié.
- `profil_complet = true` mis à la sortie du parcours unifié, en **1 seule passe**. Le modèle "inscription minimale puis complétion ultérieure via `/completer-profil`" est abandonné. Si un utilisateur abandonne en cours de parcours, le compte reste avec `profil_complet=false` et la prochaine connexion le ramène au parcours unifié à l'étape où il s'est arrêté (pattern de reprise à concevoir dans le doc de cadrage).
- `users.a_logement` rejoint la liste des colonnes legacy à ne plus écrire (sémantique dérivable de `type_user IN ('hote', 'les_deux')` ou de `statut_ville_* = 'hote'`). Audit ciblé des lectures à mener avant suppression définitive (cohérent avec phase de gel VISION §9).
- Le sens canonique de `type_user` est aligné sur le choix utilisateur explicite : intent "partage" → `type_user = 'hote'` (plus jamais `'locataire'` + `a_logement=true` comme dans `InscriptionRecherchePage` actuel). Lié à DETTE #50.
- Photo et bio profil restent **optionnelles** dans le parcours unifié. Pour minimiser la friction d'inscription, **la bio est retirée de E-6** et reportée à `ModifierProfilPage` post-inscription (amendement spec § 3.10 acté conv 15). La photo reste proposée en E-6 mais sans pression visuelle (cercle compact, lien discret). La complétude du profil "public" est définie par les champs structurants (type_user, villes, statuts villes, rhythm_calendar), pas par photo/bio. **Principe d'incitation post-inscription** : pour ne pas que la plateforme se retrouve avec des profils vides, une mécanique post-inscription doit inciter l'utilisateur à compléter photo et bio (badge profil complet sur dashboard, notification douce 24-48h après inscription, score de visibilité dans les recherches). À implémenter dans une tranche dédiée post-T7 — pas urgent mais nécessaire pour la qualité de l'expérience à l'échelle. Logique généralisable à tout futur champ profil optionnel.
- Les champs profil `date_naissance`, `sexe`, `ecole`, `annee_etudes`, `filiere` (aujourd'hui dans `CompleterProfilPage`) sont intégrés au parcours unifié. Implications RGPD (`date_naissance`, `sexe` sont des données personnelles potentiellement sensibles) à signaler dans la section 6 du doc de cadrage `docs/recherche/UNIFICATION-INSCRIPTION.md` pour consultation DPO.
- **Simplification mono-ville E-4 (acté conv 12 du 6 mai 2026 soir)** : suite à 5 itérations infructueuses de design sur le toggle école/entreprise du E-4 en conv 11 (DETTE #64), décision produit actée — pour `type_user = locataire` ou `type_user = hote`, on ne demande qu'une seule ville à l'utilisateur ; pour `type_user = les_deux`, deux villes avec labels explicites ("Ville où tu proposes" / "Ville où tu cherches"), sans introduire la notion école/entreprise dans l'UX. Le toggle disparaît du parcours. Convention de stockage BDD associée documentée en §3.

---

**Pattern de candidature à profil incomplet — chantier autonome post-T7 (acté conv 15)** :

Décision produit actée conv 15. Quand un alternant clique "Candidater" sur une annonce avec un profil incomplet, l'application **capture l'intention** au lieu de bloquer le clic. Deux niveaux à distinguer :

- **Niveau cosmétique (photo + bio manquantes)** : la candidature est envoyée à l'hôte avec un badge "profil basique" et un message UX qui invite l'alternant à enrichir son profil pour maximiser ses chances. Pas de blocage produit, l'hôte voit la candidature et choisit.
- **Niveau légal (pièce d'identité vérifiée + garant + justificatifs ALUR manquants)** : la candidature est enregistrée en BDD avec un statut `pending_documents` et n'est pas visible côté hôte. Un modal explique à l'alternant qu'il doit fournir ces éléments pour que la candidature soit transmise. Une fois les documents fournis et vérifiés, la candidature passe en statut `submitted` et apparaît côté hôte.

**Architecture associée — page "Mes documents"** : un nouvel onglet accessible depuis le menu burger du dashboard fusionné (au même niveau que "Modifier mon profil", "Mes annonces", "Mes candidatures") permet à l'alternant de gérer son dossier administratif **indépendamment de toute candidature**. Sépare le profil public (photo, bio, ville, rythme — visible par les autres alternants) du dossier administratif privé. Statuts par document : à fournir / en cours de vérification / vérifié / refusé. Visibilité différenciée : l'alternant voit ses propres docs, l'admin Sterny les voit pour vérifier, l'hôte ne voit qu'un statut "vérifié" agrégé (pas les docs eux-mêmes — sinon problème RGPD majeur).

**Justification UX** : le pattern résout le dilemme "bloquer le clic = friction et perte d'utilisateur" vs "laisser passer = mauvaise expérience pour l'hôte". Capture l'intention sans compromettre la qualité côté hôte.

**Justification légale (Niveau 2)** : la France encadre strictement les pièces qu'un bailleur peut demander à un candidat locataire (loi ALUR, liste limitative). La nature exacte du contrat Sterny (location ? mise à disposition ? colocation tournante ?) détermine la liste applicable. La vérification d'identité protège Sterny en tant qu'intermédiaire et l'hôte contre la fraude. Le consentement explicite du garant tiers est requis (le garant n'est pas l'utilisateur du service mais ses données sont collectées).

**Pré-requis avant implémentation** :
- Consultation **avocat immobilier ou notaire** pour valider la nature du contrat Sterny et la liste des pièces légalement exigibles selon le régime applicable.
- Consultation **DPO ou avocat RGPD** pour cadrer le traitement des données sensibles (pièce d'identité, justificatifs financiers, données du garant), durée de conservation, base légale, sous-traitance Stripe Identity.
- Confirmation du mécanisme de consentement explicite du garant tiers.

**Statut** : hors scope du chantier UNIFICATION-INSCRIPTION (T1-T7). Chantier autonome à ouvrir post-T7 ou en parallèle si le besoin métier devient bloquant. À ne pas démarrer avant la consultation des professionnels listés ci-dessus.

---

**Origine** : décision actée le 2 mai 2026 soir pendant la session de cadrage de l'étape D du chantier `RhythmManualBuilder`. L'audit lecture-seule de `CompleterProfilPage` a révélé le désalignement entre `InscriptionRecherchePage` (qui écrit le modèle officiel) et `CompleterProfilPage` (qui écrit la colonne legacy). Le sujet a été élargi de l'étape D originelle à la refonte structurelle de l'inscription. Tracé en ETAT-COURANT bloc 2026-05-02 soir.

**Précision sur le parcours propriétaire (3 mai 2026, conv 2 cadrage UNIFICATION)** :

La garde durcie sur `/inscription/proprietaire` (Q8) n'est pas une fermeture définitive. La route reste publiquement accessible (pas un endpoint interne) mais ne laisse passer que les utilisateurs avec un `?r=token` valide. Deux implications de design à respecter :

1. **UX du proprio invité qui revient sans le lien** (amendement conv 17 du 7 mai 2026) : si un propriétaire reçoit le lien d'invitation par email à un moment peu pratique (au travail, en déplacement) et revient plus tard sur le site directement sans le lien, deux chemins possibles. (a) Il atterrit sur `/inscription` (`ChoixInscriptionPage` refondue T3), sélectionne la carte "Je suis propriétaire", clique Continuer, est routé vers `/inscription/proprietaire` qui détecte l'absence de token et affiche le message d'aide. (b) Il atterrit directement sur `/inscription/proprietaire` (URL mémorisée d'une session précédente, par exemple) qui détecte l'absence de token et affiche le même message d'aide. Dans les deux cas, le message reste sur la page proprio (pas de redirection 301 vers `/inscription`) : "Le parcours propriétaire requiert le lien d'invitation que votre locataire vous a envoyé. Vous l'avez perdu ? Demandez-lui de vous le renvoyer." Conserver le CTA proprio sur `ChoixInscriptionPage` est délibéré — sans ce CTA, un proprio invité arrivant sur `/inscription` n'aurait aucun signal lui indiquant qu'un parcours pour lui existe sur Sterny et conclurait que la plateforme ne le concerne pas.

2. **Réversibilité stratégique** : le code de la garde doit être un simple guard isolable (un paramètre / une feature flag / une variable d'environnement, à arbitrer au moment de l'implémentation), pas une logique enchevêtrée dans la page proprio. Cas d'usage anticipé : si la traction Sterny le justifie plus tard, ouverture du parcours proprio au grand public sans nécessiter d'invitation locataire — on doit pouvoir le faire en flippant un flag, pas en refondant.

Ces deux points sont à intégrer dans la tranche d'implémentation "durcissement garde proprio" du chantier UNIFICATION-INSCRIPTION (T5 du plan d'implémentation, cf. `docs/recherche/UNIFICATION-INSCRIPTION.md` § 7.3.5).

### Rythme personnel comme moteur de la plateforme

Une fois `rhythm_calendar` renseigné, il doit irriguer toute l'UI de la plateforme, sans que l'utilisateur ait à ressaisir quoi que ce soit.

**Exemples concrets à implémenter progressivement** :

- Homepage : barre de recherche pré-remplie avec le rythme de l'utilisateur connecté. Il peut modifier pour explorer mais la valeur par défaut reflète son planning réel.
- Page de recherche : mêmes champs pré-remplis, avec un bouton discret *"↺ revenir à mon planning"* pour reset après exploration.
- Page de création d'annonce (pour les `hote` ou `les_deux`) : étape *Disponibilités* pré-remplie automatiquement, calculée selon la logique de la section 3 (ville du logement croisée avec villes de l'utilisateur).
- Dashboard utilisateur : calendrier visuel du rythme personnel, avec code couleur sur les semaines déjà couvertes par un contrat vs celles qui ne le sont pas.

**Règle sur les modifications manuelles** : si l'utilisateur modifie un champ pré-rempli, la modification survit à la navigation intra-session (state React ou sessionStorage). Au refresh complet de la page ou nouvelle session : retour aux valeurs du rythme personnel.

### Validation visuelle obligatoire après parsing

Le parser IA n'est jamais considéré comme une source de vérité tant que l'utilisateur n'a pas validé visuellement le résultat.

**Règle non négociable** : après upload et parsing, l'utilisateur voit son calendrier extrait sous forme visuelle (carrés fins, un par semaine, code couleur école/entreprise) et doit explicitement confirmer avant que le rythme soit considéré comme actif.

Cette règle se traduit en BDD par la distinction `rhythm_imports.status = 'parsed'` (sorti du parser, pas validé) vs `'confirmed'` (validé par l'utilisateur). **Aucun matching ne doit utiliser un calendrier au statut `'parsed'` non-validé.**

### Multi-fichiers et historique

Un utilisateur peut uploader plusieurs plannings au fil du temps (année 1 puis année 2, changement d'école, correction d'une erreur). Chaque upload crée une nouvelle ligne dans `rhythm_imports`, les anciens restent archivés.

Un seul planning est actif à la fois, référencé par `users.rhythm_import_id`. Les contrats déjà signés référencent leurs dates explicitement, pas le rythme source, donc un changement de planning ne casse pas les contrats existants.

Quand un nouveau planning est détecté pour une période future, l'UI prévient explicitement : *"Nouveau planning détecté à partir de sept 2027. Ton planning actuel reste actif jusque-là."* L'alternant voit la transition venir et peut préparer son déménagement ou renégocier son bail.

### Persistance progressive — amendement post-spec acté le 6 mai 2026

La spec UNIFICATION-INSCRIPTION §1.5 et §2.5 prévoyait initialement un INSERT `users` à E-1 + UPDATE partiels à chaque "Continuer", pour permettre un pattern de reprise après abandon en cours de parcours. L'implémentation livrée des sous-commits E-1 à E-4 (conv 5 à 12) a dévié de cette spec : aucune écriture BDD avant la RPC finale E-7. Cette dérive a été formalisée en conv 13 du 6 mai 2026 (soir bis) comme amendement définitif : report intégral des écritures à E-7 + miroir `sessionStorage` côté client pour le pattern de reprise.

Conséquence : la RPC `complete_inscription_alternant` à E-7 reste la seule transaction BDD du parcours. Le pattern de reprise vit uniquement côté client via `sessionStorage`. Détails et justification dans `docs/recherche/UNIFICATION-INSCRIPTION.md` §1.5 (encart d'amendement).

---

## 7. Dépendance critique à l'IA — analyse du risque

Le principe fondateur de Sterny fait reposer la plateforme sur un parser IA (Claude Sonnet 4.6 via API Anthropic au jour de la rédaction). C'est un choix assumé mais qui crée 4 risques qu'il faut nommer et mitiger explicitement.

### Risque 1 — Échec de parsing sur un document atypique

**Scénario** : un alternant uploade son planning dans un format que le parser ne sait pas traiter (écriture manuscrite, PDF dégradé, tableau atypique, couleurs inversées). L'utilisateur voit un message d'erreur et quitte la plateforme.

**Mitigation obligatoire** :

- Toujours proposer un **fallback de saisie manuelle** semaine par semaine, moins sexy mais non-bloquant.
- Monitorer le taux d'échec du parser via `rhythm_imports.status='failed'`. Si ce taux dépasse un seuil (à définir, par exemple 10%), investiguer et ajuster le prompt ou passer par un fallback OCR (OCR = reconnaissance optique de caractères, via un service comme Google Vision qui extrait le texte brut de l'image et permet une logique de parsing plus simple en cas d'échec de l'IA).

### Risque 2 — Coût API qui explose

**Scénario** : succès marketing, 10 000 inscriptions en un mois, 10 000 appels Claude à ~0,02€ l'un, 200€ de coût API. Gérable. Mais si les utilisateurs retentent plusieurs fois chacun sur échec parser, on peut tripler cette charge.

**Mitigation** :

- **Cache par hash SHA-256** (prévu en Phase 6 du plan original) : un même fichier uploadé par 50 utilisateurs (probable si 50 alternants d'une même école uploadent le même planning) = 1 seul appel LLM puis 49 hits de cache. Coût divisé par 50.
- **Rate limiting par utilisateur** : limiter à N uploads par jour.
- **Monitoring des coûts quotidiens** : alerte au-delà d'un seuil.

### Risque 3 — Vendor lock-in Anthropic

**Scénario** : Anthropic augmente ses prix, change ses conditions, dépriorise son API. Sterny devient non-rentable ou cassé.

**Mitigation déjà en place** :

- Architecture multi-provider prévue (`supabase/functions/parse-school-calendar/providers/`). Le dossier `providers/` permet d'ajouter d'autres LLM (OpenAI, Google) sans toucher au reste du code.
- `rhythm_imports` stocke `llm_provider` et `llm_model` à chaque parse, ce qui permet de changer de fournisseur sans perdre l'historique ni la traçabilité.

### Risque 4 — Fiabilité perçue même quand ça marche

**Scénario initial (rédaction d'origine)** : le parser extrait 44 semaines sur 45 correctement, se trompe sur 1. L'utilisateur ne vérifie pas assez attentivement, valide, signe un contrat avec 1 semaine de décalage. Il ne peut pas habiter son logement la semaine où il est censé être sur place. Conséquences contractuelles et financières.

**Observation en exploitation test (26 avril 2026)** : ce risque s'est matérialisé bien au-delà du scénario d'origine. Tests sur 2 plannings réels (Planning_Martin.JPG image 4 groupes, Planning_Mathis.pdf format Hyperplanning 1 groupe) ont révélé un **taux d'erreur ≥ 50% des cellules**, sans pattern systémique. Ce n'est pas une erreur de bord type "1 semaine sur 45" — c'est un **échec fonctionnel** du parsing par vision LLM sur des tableaux où l'information est encodée dans la couleur de fond des cellules.

**Cause structurelle identifiée** : les LLM vision actuels (Claude, GPT-4o, Gemini) ne sont pas fiables sur la classification couleur pixel-par-pixel à grande échelle (180-250 cellules à classer simultanément). Quand le modèle doute, il devine — d'où le pattern d'erreurs aléatoires observé. **Aucun prompt engineering ne corrige cette limite**.

**Mitigations obligatoires révisées** :

- L'étape de **validation visuelle** (section 6) devient une **étape de correction**, pas seulement de vérification. L'utilisateur doit pouvoir corriger semaine par semaine, intuitivement, sans friction. Sans cette capacité, le pré-remplissage IA est plus dangereux qu'utile.
- Le **fallback de saisie manuelle** (section 7 risque 1) n'est plus une mitigation de bord pour les cas atypiques — il devient potentiellement le **chemin principal** d'entrée du `rhythm_calendar`, l'IA devenant un accélérateur optionnel pour les utilisateurs dont le format de planning permet une extraction fiable.
- Le calendrier visuel doit être suffisamment clair pour qu'une erreur soit détectable au premier coup d'œil (code couleur franc, navigation par mois, zoom possible).
- **Principe UX à respecter sur tout chemin parser** : ne jamais promettre une fluidité (« uploade ton planning, tout est automatique en 30 secondes ») qui peut être démentie par l'échec du parser et la bascule vers une étape plus laborieuse. Cet effet (*expectation violation* + *loss aversion*, parfois nommé *bait-and-switch involontaire*) est particulièrement nuisible sur la cible jeune alternant, où l'attention est courte et l'exigence de fluidité immédiate. Conséquence concrète pour les choix produit : une UX honnête en amont (« on construit ton rythme en 3 minutes ») est préférable à une UX fluide en façade qui se trahit en cours de route. L'IA peut être proposée en accélérateur conditionnel uniquement pour les formats où la fiabilité a été démontrée objectivement par benchmark — jamais comme promesse universelle. Apprentissage acté lors de la session de cadrage du 27 avril 2026.

**Décision stratégique actée le 29 avril 2026** : la stratégie discriminante par format source (§5) tranche cet arbitrage en combinant les leviers 2 (pipeline spécifique par format : pdf.js getOperatorList pour les PDFs vectoriels, algorithme manuel ImageData pour les images raster) et 3 (saisie manuelle assistée comme couche universelle et fallback obligatoire). Le parsing par vision LLM pure est abandonné pour la production. Voir DETTE #37 pour l'historique de l'arbitrage F1/F2/F3.

**Implication pour le positionnement Sterny** : la promesse marketing évolue de "uploade ton planning, tout est automatique" vers "uploade ton planning, on extrait ce qui est extractible automatiquement, tu valides ou complètes en quelques clics". Cette honnêteté en amont reste cohérente avec le principe fondateur (section 1). Question tranchée le 29 avril 2026 par la stratégie discriminante (§5).

**Risque 5 — Fragilité des métadonnées descriptives**

Les champs `document_meta` peuvent être incomplets ou contenir des codes techniques selon le format source. Risque produit : un utilisateur qui voit "École : non détectée" sur sa propre fiche pourrait perdre confiance dans la plateforme.

**Mitigation** : afficher les valeurs `null` ou techniques de manière neutre dans l'UI ("École non identifiée — vérifie ton planning"), permettre à l'utilisateur de **saisir manuellement** ces métadonnées si besoin (futur enrichissement, à prioriser uniquement si ce cas devient fréquent en exploitation), et communiquer clairement que ces champs sont descriptifs et n'affectent pas le matching.

---

## 8. Migration de profil

Un utilisateur n'est pas figé dans le type avec lequel il s'est inscrit. La plateforme garantit sa flexibilité pour accompagner les changements de situation (nouvelle alternance, déménagement, opportunité d'investissement).

**Montée en flexibilité** (déjà en place) : depuis son dashboard, un `locataire` peut devenir `les_deux` s'il veut aussi proposer un logement. Un `hote` peut devenir `les_deux` s'il veut aussi chercher. Le profil `les_deux` est limité à 2 villes maximum (école et entreprise de l'alternant).

**Descente** (à implémenter) : un `les_deux` doit pouvoir redescendre en `locataire` ou `hote` simple s'il ne veut plus avoir les deux casquettes. Cette fonctionnalité est tracée dans `ETAT-COURANT.md`.

**Migration alternant → propriétaire** (hors priorité) : un alternant satisfait qui investit dans un logement pour le louer sur Sterny doit pouvoir migrer de son profil alternant (`locataire`, `hote`, `les_deux`) vers `proprietaire` sans supprimer son compte. Les deux profils sont structurellement différents (l'un est alternant, l'autre non) donc la migration nécessitera une logique dédiée.

---

## 9. Plan de transition vers la vision cible

La transition depuis l'architecture actuelle vers la vision cible se fait en trois phases séquentielles, pour éviter tout nœud dans le code ou toute régression silencieuse.

### Phase de gel fonctionnel

État actuel. Les colonnes dépréciées (`type_alternance`, `rythme_pattern`, `rythme_alternance`) existent, sont écrites par le frontend et lues dans certains endroits. On ne leur ajoute **aucune nouvelle feature**. On les laisse vivre jusqu'à la phase suivante.

**Règle pour Claude** : si on propose de coder une nouvelle logique qui s'appuie sur `rythme_pattern` ou sur les autres colonnes dépréciées, Claude doit refuser et proposer à la place une logique basée sur `rhythm_calendar` et `disponibilites_pattern`.

### Phase de bascule

Les sections du code qui utilisent les colonnes dépréciées pour du matching sont refactorisées pour s'appuyer sur `rhythm_calendar` et `disponibilites_pattern`. Un `AUDIT-ZONE-2-FRONTEND` dédié listera exactement ces sections avant qu'on touche au code.

Pendant cette phase, les deux systèmes coexistent : le nouveau est actif, l'ancien est ignoré mais pas supprimé. C'est la sécurité : si un bug est découvert dans le nouveau système, on peut inspecter l'ancien en comparaison sans avoir à tout restaurer.

### Phase de suppression propre

Une fois que le nouveau système est éprouvé (temps à définir — probablement quelques semaines d'exploitation réelle), les colonnes dépréciées sont supprimées via une migration SQL dédiée. L'UI qui les saisissait (formulaires de profil, de création d'annonce) est nettoyée. Un seul commit bien identifié fait ce nettoyage : `chore: remove deprecated rhythm abstractions after rhythm_calendar transition`.

---

## 10. Ce que Sterny ne fait PAS

Limites volontaires du produit, à défendre face aux tentations de sur-ingénierie ou aux demandes utilisateurs hors cible.

**Rythmes intra-hebdomadaires non supportés.** Sterny fonctionne à la granularité semaine binaire. Une semaine est école OU entreprise, pas un mélange. Les rythmes du type *"2 jours école / 3 jours entreprise chaque semaine"* ne sont pas dans la cible. Garde-fou prévu : détection automatique par le parser (`has_mixed_weeks: true`), message utilisateur clair, table `rhythm_unsupported_requests` pour compter la demande et décider plus tard, sur données réelles, d'ajouter ou non la feature.

**L'application mobile native est différée, pas dépriorisée.** La plateforme web responsive est la priorité immédiate pour permettre un lancement opérationnel dès la rentrée. Mais l'app mobile est indispensable pour la cible (alternants jeunes qui font tout sur leur téléphone) et constitue le chantier suivant, à ouvrir dès que la web est opérationnelle. Les décisions d'architecture doivent donc anticiper cette app mobile à venir : logique métier dans des Edge Functions ou du code client (pas dans la BDD via triggers), SDKs compatibles multi-plateforme, pas de dépendance à des APIs DOM spécifiques au navigateur, etc.

**Sterny n'est pas un moteur de recherche généraliste.** Si un alternant cherche un logement sans rythme à gérer (stage court, formation non-alternance), il ne trouvera pas sa réponse sur Sterny. La plateforme est spécialisée sur le cas d'usage alternance.

**Sterny ne remplace pas un avocat ni un expert-comptable.** Les contrats et processus de la plateforme doivent reposer sur des templates et workflows validés juridiquement en amont. Tout cas particulier doit être validé par un professionnel. La plateforme ne donne pas de conseil juridique personnalisé.

**État actuel de la consultation professionnelle** : **à ce stade du projet, aucun avis professionnel n'a encore été sollicité**. La démo est en cours de finalisation précisément dans le but de pouvoir présenter Sterny à des professionnels de chaque domaine concerné (avocat spécialisé en droit du logement, expert-comptable, DPO pour le RGPD, assureur, notaire). Cette consultation professionnelle est une **étape obligatoire** avant tout lancement opérationnel de la plateforme. Aucune feature juridique ou contractuelle ne doit être considérée comme validée tant que ces consultations n'ont pas eu lieu.

### Pas de découpage technique imposé à l'utilisateur

Les contraintes techniques de Sterny (RPC, migrations, structure BDD) ne doivent jamais transparaître dans l'expérience utilisateur sous forme de friction. Si une opération apparaît naturelle à l'utilisateur (saisir 2 plannings d'un coup, modifier plusieurs champs en une fois, candidater à plusieurs annonces dans la foulée), elle doit être livrée comme une opération unique en surface, quitte à orchestrer plusieurs appels techniques en coulisse.

Conséquence pour l'arbitrage produit/tech : quand une simplification technique entre en conflit avec une fluidité utilisateur, c'est l'utilisateur qui gagne. La complexité reste à la charge du backend et de l'orchestration, pas de la cible.

**Origine** : remarque de Côme le 2 mai 2026 après-midi pendant le cadrage du composant `RhythmManualBuilder` chemin 3, en réaction à une option ergo qui aurait imposé 2 confirmations distinctes pour saisir 2 années académiques. Acté comme principe transversal. La mise en application concrète sur le composant est tracée dans DETTE #46 (modèle de données multi-années).

---

## 11. Critères de succès de la vision

Pour vérifier qu'on tient bien la ligne, quelques critères observables :

- Le temps moyen d'inscription d'un nouvel alternant (création de compte → `rhythm_calendar` confirmé) doit être inférieur à 5 minutes.
- Le taux de succès du parser IA (status `confirmed` / total uploads) doit dépasser 85%.
- Aucune feature de matching ne doit plus s'appuyer sur `rythme_pattern` ou `type_alternance` dans le code actif (vérifié par grep régulier).
- Les utilisateurs `les_deux` doivent pouvoir gérer leurs deux villes (école et entreprise) sans friction, avec pré-remplissage correct des champs dans les deux contextes.

Ces critères seront suivis dans `ETAT-COURANT.md` quand la plateforme sera en exploitation réelle.

---

*Document stable. Si une décision contredit un principe exposé ici, soit la décision doit être révisée, soit ce document doit être mis à jour (avec traçage en tête : date et nature du changement).*
