# Vision architecture Sterny

Document de référence stratégique. Décrit **où on va** et **pourquoi**, pas comment on y va au quotidien (c'est le rôle d'`ETAT-COURANT.md`) ni les règles projet (c'est `CONTEXTE-PROJET.md`).

Ce document est la boussole de Sterny. Il doit être lu par toute nouvelle session Claude avant de proposer une évolution technique ou produit. Toute décision qui contredit ce document est un signal d'alarme : soit la décision est mauvaise, soit ce document doit être mis à jour.

**Dernière mise à jour** : 25 avril 2026 — note sur la fragilité possible des métadonnées document selon format source (section 3 et section 5).

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

## 4. Conséquences sur l'UX

### Upload-first à l'inscription

Le parcours d'inscription d'un nouvel alternant doit être le plus court possible. Idéalement : création de compte → upload du planning → détection automatique du rythme → choix du groupe si le planning en contient plusieurs → fin.

Objectif : **5 minutes maximum**, aucun concept technique à comprendre. L'utilisateur n'a pas besoin de savoir ce qu'est un "rythme symétrique". Il uploade un document qu'il a déjà.

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

---

## 5. Dépendance critique à l'IA — analyse du risque

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

**Scénario** : le parser extrait 44 semaines sur 45 correctement, se trompe sur 1. L'utilisateur ne vérifie pas assez attentivement, valide, signe un contrat avec 1 semaine de décalage. Il ne peut pas habiter son logement la semaine où il est censé être sur place. Conséquences contractuelles et financières.

**Mitigation obligatoire** :

- L'étape de **validation visuelle** (section 4) n'est pas un confort UX, c'est un garde-fou critique. Elle ne doit jamais être supprimée pour alléger le flow.
- Le calendrier visuel doit être suffisamment clair pour qu'une erreur d'une semaine soit détectable au premier coup d'œil (code couleur franc, navigation par mois, zoom possible).

**Risque 5 — Fragilité des métadonnées descriptives**

Les champs `document_meta` peuvent être incomplets ou contenir des codes techniques selon le format source. Risque produit : un utilisateur qui voit "École : non détectée" sur sa propre fiche pourrait perdre confiance dans la plateforme.

**Mitigation** : afficher les valeurs `null` ou techniques de manière neutre dans l'UI ("École non identifiée — vérifie ton planning"), permettre à l'utilisateur de **saisir manuellement** ces métadonnées si besoin (futur enrichissement, à prioriser uniquement si ce cas devient fréquent en exploitation), et communiquer clairement que ces champs sont descriptifs et n'affectent pas le matching.

---

## 6. Migration de profil

Un utilisateur n'est pas figé dans le type avec lequel il s'est inscrit. La plateforme garantit sa flexibilité pour accompagner les changements de situation (nouvelle alternance, déménagement, opportunité d'investissement).

**Montée en flexibilité** (déjà en place) : depuis son dashboard, un `locataire` peut devenir `les_deux` s'il veut aussi proposer un logement. Un `hote` peut devenir `les_deux` s'il veut aussi chercher. Le profil `les_deux` est limité à 2 villes maximum (école et entreprise de l'alternant).

**Descente** (à implémenter) : un `les_deux` doit pouvoir redescendre en `locataire` ou `hote` simple s'il ne veut plus avoir les deux casquettes. Cette fonctionnalité est tracée dans `ETAT-COURANT.md`.

**Migration alternant → propriétaire** (hors priorité) : un alternant satisfait qui investit dans un logement pour le louer sur Sterny doit pouvoir migrer de son profil alternant (`locataire`, `hote`, `les_deux`) vers `proprietaire` sans supprimer son compte. Les deux profils sont structurellement différents (l'un est alternant, l'autre non) donc la migration nécessitera une logique dédiée.

---

## 7. Plan de transition vers la vision cible

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

## 8. Ce que Sterny ne fait PAS

Limites volontaires du produit, à défendre face aux tentations de sur-ingénierie ou aux demandes utilisateurs hors cible.

**Rythmes intra-hebdomadaires non supportés.** Sterny fonctionne à la granularité semaine binaire. Une semaine est école OU entreprise, pas un mélange. Les rythmes du type *"2 jours école / 3 jours entreprise chaque semaine"* ne sont pas dans la cible. Garde-fou prévu : détection automatique par le parser (`has_mixed_weeks: true`), message utilisateur clair, table `rhythm_unsupported_requests` pour compter la demande et décider plus tard, sur données réelles, d'ajouter ou non la feature.

**L'application mobile native est différée, pas dépriorisée.** La plateforme web responsive est la priorité immédiate pour permettre un lancement opérationnel dès la rentrée. Mais l'app mobile est indispensable pour la cible (alternants jeunes qui font tout sur leur téléphone) et constitue le chantier suivant, à ouvrir dès que la web est opérationnelle. Les décisions d'architecture doivent donc anticiper cette app mobile à venir : logique métier dans des Edge Functions ou du code client (pas dans la BDD via triggers), SDKs compatibles multi-plateforme, pas de dépendance à des APIs DOM spécifiques au navigateur, etc.

**Sterny n'est pas un moteur de recherche généraliste.** Si un alternant cherche un logement sans rythme à gérer (stage court, formation non-alternance), il ne trouvera pas sa réponse sur Sterny. La plateforme est spécialisée sur le cas d'usage alternance.

**Sterny ne remplace pas un avocat ni un expert-comptable.** Les contrats et processus de la plateforme doivent reposer sur des templates et workflows validés juridiquement en amont. Tout cas particulier doit être validé par un professionnel. La plateforme ne donne pas de conseil juridique personnalisé.

**État actuel de la consultation professionnelle** : **à ce stade du projet, aucun avis professionnel n'a encore été sollicité**. La démo est en cours de finalisation précisément dans le but de pouvoir présenter Sterny à des professionnels de chaque domaine concerné (avocat spécialisé en droit du logement, expert-comptable, DPO pour le RGPD, assureur, notaire). Cette consultation professionnelle est une **étape obligatoire** avant tout lancement opérationnel de la plateforme. Aucune feature juridique ou contractuelle ne doit être considérée comme validée tant que ces consultations n'ont pas eu lieu.

---

## 9. Critères de succès de la vision

Pour vérifier qu'on tient bien la ligne, quelques critères observables :

- Le temps moyen d'inscription d'un nouvel alternant (création de compte → `rhythm_calendar` confirmé) doit être inférieur à 5 minutes.
- Le taux de succès du parser IA (status `confirmed` / total uploads) doit dépasser 85%.
- Aucune feature de matching ne doit plus s'appuyer sur `rythme_pattern` ou `type_alternance` dans le code actif (vérifié par grep régulier).
- Les utilisateurs `les_deux` doivent pouvoir gérer leurs deux villes (école et entreprise) sans friction, avec pré-remplissage correct des champs dans les deux contextes.

Ces critères seront suivis dans `ETAT-COURANT.md` quand la plateforme sera en exploitation réelle.

---

*Document stable. Si une décision contredit un principe exposé ici, soit la décision doit être révisée, soit ce document doit être mis à jour (avec traçage en tête : date et nature du changement).*
