# SpotSan V2 — Plan de refonte UX & lots de réalisation

Document de référence vivant. À tenir à jour au fil de la réalisation (cocher les cases, ajouter les décisions prises dans "Décisions actées"). Rédigé le 2026-08-21 suite au retour d'usage sur SpotSan v1.

> ## 🎯 Objet principal de l'outil pour UrBizia (à ne jamais perdre de vue)
>
> **La détection des Incivilités et Vandalismes est la raison d'être principale de SpotSan pour UrBizia** — pas une fonctionnalité parmi d'autres. Le but est de constituer, via les photos remontées par les utilisateurs, une **base d'entraînement pour une IA de détection automatique des Incivilités et Vandalismes**. Toute décision touchant à cette fonction (facilité de déclaration, qualité/quantité des photos collectées, structuration des tags qui serviront de labels d'entraînement) doit être traitée en priorité, avant le confort des autres écrans. Voir §5.6.

## 1. Constat de départ (v1)

Retours terrain remontés par les utilisateurs :

1. Personne ne crée de compte, tout le monde reste en anonyme.
2. Confusion entre les infos affichées (lecture, remontées par d'autres) et le formulaire (saisie) — les gens cliquent sur les données existantes en espérant les modifier.
3. Le formulaire paraît trop long *au premier coup d'œil* (avant même d'avoir essayé de le remplir) → abandon.
4. Le bouton photo (une barre fine) n'est pas identifié comme un déclencheur de prise de vue.
5. Sans reconnaissance de l'utilisateur, un avis modifié devient un avis supplémentaire au lieu d'une mise à jour → avis dupliqués, stats faussées.

## 2. Décision de principe

- **Archiver v1** (tag/branche gelés) pour pouvoir y revenir si v2 n'aboutit pas.
- **Repartir de la base de v1** (carte, data model toilettes, sync Supabase) mais reconstruire les parcours compte/consultation/saisie en s'appuyant sur les patterns d'apps grand public (Google Maps/Waze pour la carte et la fiche lieu, apps de livraison pour les formulaires par étapes, appareils photo natifs pour la capture).

## 3. Principes directeurs (à respecter pendant toute la réalisation)

- **Lecture ≠ saisie, visuellement sans ambiguïté.** Les infos remontées par les prédécesseurs sont dans des cartes/blocs non cliquables (ou clic = zoom photo seulement) ; la saisie ne se fait que dans l'écran formulaire dédié, jamais en éditant le bloc de lecture in situ.
- **Un avis par personne par lieu, amendable.** Techniquement : `upsert` sur une contrainte unique `(user_id, ub_id)`, jamais un `insert` brut pour un utilisateur qui a déjà un avis sur ce lieu.
- **Valeurs par défaut qui réduisent la saisie**, pas qui l'alourdissent : équipement non coché = "absent / sans objet" par défaut, pas un champ obligatoire à renseigner activement.
- **Progressive disclosure** : sections repliables / étapes, jamais un mur unique qui scrolle à l'infini dès l'ouverture.
- **Cible tactile généreuse** pour toute action fréquente (bouton photo, étoiles, pouce), pas de zone < 44px.
- **Offline-first préservé** : tout ce qui existe en v1 sur ce point (queue locale, sync différée, dégradation silencieuse) doit survivre à la refonte.
- **Français partout**, conventions de code existantes (voir `CLAUDE.md` v1) sauf décision explicite contraire (§4).

### 3.1 Échelle d'état standard (composant unique réutilisé dans toute l'appli, y compris l'avis général)

Décidé le 2026-08-21, complété le 2026-08-21 — **un seul composant d'échelle, utilisé absolument partout**, y compris pour l'avis général (plus de distinction étoiles/reste) :

- Échelle à 5 niveaux, partout : 👎 pouce baissé · 🙁 triste · 😐 neutre · 🙂 souriant · 👍 pouce levé.
- **Raison de l'abandon des étoiles pour l'avis général** : les étoiles ont été inventées pour adoucir un avis potentiellement dénigrant envers un commerce/une personne. Ici ça ne s'applique pas — nommer clairement l'état évite au contraire les faux espoirs, en particulier pour une personne en situation de handicap qui pourrait croire à tort qu'un sanitaire reste praticable alors qu'il est dégradé. La clarté prime sur la retenue.
- Extensions possibles par élément, en plus de l'échelle à 5 niveaux, quand pertinent : **Abs** (absent — valeur par défaut, rien à faire pour l'utilisateur), **HS** (hors service), **Vide** (consommable épuisé : papier, savon, essuie-tout).
- **Poubelle** : échelle à 5 niveaux + **Abs** (par défaut) + **Débordante**, mais **pas de "Vide"** — un état "vide" n'est pas réellement constatable sur le terrain (impossible de savoir si elle vient d'être vidée), donc pas fiable à collecter.
- **Code couleur à la sélection, décidé 2026-08-21** (implémenté dans `EchelleEtat.svelte`, Lot 0bis) : niveaux 👎🙁 (négatif) → fond rouge `#C55A7A` (texte blanc) ; niveau 😐 (neutre) → fond gris-marron `#DDD5CB` (texte foncé) ; niveaux 🙂👍 (positif) → fond vert `#C9FFC3` (texte foncé). Même logique pour les extensions : **Abs** suit le code neutre (gris-marron) ; **HS**/**Vide**/**Débordante** suivent le code négatif (rouge) — ce sont toutes des signalisations de problème. Point d'implémentation à retenir : le texte des boutons ne doit jamais être une couleur héritée du thème clair/sombre de l'appareil quand le fond du bouton est volontairement fixe (clair ou coloré) — sinon le texte devient illisible en mode sombre (bug rencontré et corrigé lors du Lot 0bis).

### 3.2 Conventions de nommage & rédaction

- **Format des numéros de téléphone**, à adopter partout dans l'outil (code, DB, affichage) :
  - International : `+33 000 000 001` — indicatif pays puis 3 groupes de 3 chiffres.
  - Local (France) : `0 000 000 01` — `0` puis les mêmes 9 chiffres, groupés 3/3/2.
- **"Incivilités et Vandalismes"** : toujours au pluriel, dans tous les libellés d'écran, boutons, textes d'aide. (Le nom de table existant `Incident_Reports` reste en anglais/singulier côté DB — cette règle concerne uniquement les textes visibles par l'utilisateur.)
- **Numéro de version affiché**, décidé 2026-08-21 : `src/lib/version.js` exporte `APP_VERSION`, affiché dans le bandeau et le titre de l'onglet (même convention que v1, qui affiche `APP_VERSION` dans son panneau "À propos" — voir `SpotSan/app.js`). v1 est actuellement en `v6.0` ; **v2 redémarre à `v8.0`** (choix de Gilles, pas de v7). À incrémenter pour tout changement visible par l'utilisateur.

## 4. Décisions

### 4.1 Décisions actées (2026-08-21)

- **Téléphone déclaratif, sans vérification SMS dans un premier temps** (confirmé — c'était déjà le principe retenu). Pas de coût, pas d'OTP à ce stade. Pour pouvoir ajouter une vérification plus tard sans réécrire le modèle : la table utilisateurs prévoit dès maintenant une colonne `phone_verified boolean default false` (jamais vraie tant qu'aucun module de vérification n'existe) et un identifiant interne stable (voir 4.1 ci-dessous) qui ne dépend pas du téléphone. Ajouter la vérification plus tard consistera à brancher un écran OTP qui passe ce booléen à `true` — aucune reprise du modèle de données.
  - *Pour mémoire, un OTP ("one-time password") est le code à usage unique envoyé par SMS pour prouver que l'utilisateur possède bien le numéro déclaré. C'est ce mécanisme qui a un coût (l'envoi du SMS passe par un opérateur tiers payant type Twilio) — pas la vérification en elle-même.*
- **Identifiant utilisateur = UUID interne UrBizia, pas le numéro de téléphone directement.** Le numéro de portable reste le moyen de connexion (login) et un attribut modifiable de l'utilisateur, mais la clé technique qui relie un avis à son auteur (`user_id` dans `Sanitary_Reviews`, voir Lot 4) est cet identifiant interne. Raison : un numéro de téléphone peut changer (perte, changement d'opérateur, réattribution) — si on l'utilisait comme clé, changer de numéro romprait le lien avec tout l'historique d'avis de la personne.
- **Échelle d'état standard** : voir §3.1.
- **Mécanisme technique de la connexion déclarative** — décidé et implémenté au Lot 1 (2026-08-21) : Supabase Auth **anonyme** (`signInAnonymously`), pas un système maison. `SitInZen_Users.user_id` référence `auth.users` par contrainte FK — il fallait donc une vraie session Supabase Auth d'une façon ou d'une autre ; l'auth anonyme donne cette session sans mot de passe ni SMS, tout en gardant un chemin propre vers une vraie vérification téléphone plus tard (lier la session anonyme à un numéro). Nécessite le provider "Anonymous Sign-Ins" activé dans le tableau de bord Supabase du projet (pas d'outil d'intégration pour le faire à la place de l'utilisateur — fait manuellement par Gilles le 2026-08-21).
- **Compte SpotSan V2 = extension de `SitInZen_Users`**, pas une nouvelle table. Ajouts prévus par `ALTER TABLE` additif uniquement (rien renommé/supprimé) : `pseudo`, `avatar_url`, `handicaps text[]` (sous-ensemble de `['Visuel','Surdité','Moteur']`), `consent_at timestamptz`, `phone_verified boolean default false`. `Is_PMR` existant reste tel quel (utilisé par le module badge) ; à voir en Lot 1 s'il se déduit de `handicaps` contenant `'Moteur'` ou reste saisi indépendamment.
- **Pas de second projet Supabase pour "isoler v1".** Le projet `UrBizia-DataWareHouse` est partagé par tous les outils UrBizia (contrairement à GitHub, 1 repo par outil) et `SanitaryBlocks_Inventory` est déjà partagée StatSan↔SpotSan — le dupliquer casserait ce partage ou emporterait FBS/RFQ/StatSan pour rien. La recouvrabilité de v1 vient du dépôt GitHub archivé (code intact, même Supabase) + du Lot 4 qui n'est prévu qu'en ajouts, jamais en suppression des colonnes/RPC v1 existants.

### 4.3 Audit Supabase du 2026-08-21 — découvertes à trancher avant le Lot 1/4

Le projet Supabase `UrBizia-DataWareHouse` (`mnsfstjgrueyuvejfvvk`) est **un seul projet partagé par tous les outils UrBizia** (FBS, RFQ, StatSan, EkoMa, SpotSan) — contrairement à GitHub où chaque outil a son propre dépôt. `SanitaryBlocks_Inventory` en particulier est déjà partagée entre StatSan (source de vérité) et SpotSan : ce n'est pas une table "SpotSan seul".

**Inventaire des tables actuelles (schéma `public`)**, groupées par famille :
- *StatSan/SpotSan (données sanitaires)* : `SanitaryBlocks_Inventory`, `POI_Inventory`, `POI_Category_Icons`, `Studies`, `Study_Entities`, `Incident_Reports`.
- *Contrôle d'accès physique par badge (module séparé, en cours, ne pas toucher incidemment)* : `SitInZen_Users`, `SitInZen_Badges`, `Sanitaire_Access_Points`, `Access_Grants`.
- *Accès centralisé aux outils* : `profiles`, `tool_access`, `contractors`.
- *FBS/RFQ* : `fbs`, `pcrm`, `sow`, `rfq_fiches`, `fbs_backup_log`, `acronymes`, `competences`, `lexique`, `lexique_domaines`.
- *Divers SpotSan déjà en base mais pas dans le modèle actuel décrit par `CLAUDE.md`* : `Toilet_Ratings`, `Toilet_Photos`, `Toilet_Equipment_Reports`, `Toilet_Position_Votes`, `Mobile_Debug_Log`.
- *Archivées (schéma `archive`, 0 ligne)* : `toilette_annotations`, `new_points`.

**Convention de nommage déjà en usage** (à suivre pour les nouvelles tables V2, ex. `Sanitary_Reviews`) : familles StatSan/SpotSan/StatSan-access en `PascalCase_Avec_Underscores` (`SanitaryBlocks_Inventory`, `Incident_Reports`, `SitInZen_Users`...) ; familles FBS/RFQ en `snake_case` minuscule (`fbs`, `contractors`, `tool_access`...). Cohérent en soi (une convention par périmètre fonctionnel) — rien à corriger, juste à respecter selon la famille dans laquelle on écrit.

**Deux découvertes qui changent la donne pour ce plan :**

1. ~~**`Toilet_Ratings` / `Toilet_Photos` / `Toilet_Equipment_Reports` / `Toilet_Position_Votes`... tentative antérieure abandonnée, plus rien ne les lit**~~ — **corrigé le 2026-08-21, cette première analyse était fausse.** En creusant pour la migration du Lot 4 : ces tables sont **activement alimentées en ce moment même** par le RPC `report_toilet_feedback`, qui est le vrai chemin d'écriture de SpotSan v1 en production. Le mécanisme réel : chaque soumission insère une ligne d'historique dans `Toilet_Ratings`/`Toilet_Equipment_Reports`/`Toilet_Photos` (par `device_id`, jusqu'à 3 photos gardées par catégorie), **puis `SanitaryBlocks_Inventory.Rating_*`/`Equipment` sont recalculés comme une moyenne glissante sur tout l'historique** — ce n'est donc pas "dernière écriture gagne" comme le documentait `CLAUDE.md` (v1), mais une vraie moyenne multi-soumissions. **Point clé** : ce mécanisme n'a aucune déduplication par appareil — modifier son avis ajoute une ligne de plus dans la moyenne au lieu de la remplacer. C'est une preuve concrète, en base, du problème de fond signalé en tête de conversation (avis modifié = avis supplémentaire) que ce projet corrige. `CLAUDE.md` de SpotSan v1 est à corriger sur ce point (pas fait ici, hors périmètre v2).
2. **`SitInZen_Users` existe déjà** (0 ligne, table vide mais structure en place) et couvre déjà une bonne partie du compte utilisateur qu'on est en train de concevoir : `user_id` (UUID, lié à `auth.users`), `Phone` (unique, commentée "carte d'identité de fait"), `Full_Name`, `Birthdate`, `Is_PMR`, `Has_Enfant_Key`, `Sexe_Declare`. C'est exactement la table identifiée le 2026-08-05 comme candidate pour l'"Usager identifié" de PointSan Mobile — donc le compte SpotSan V2 qu'on conçoit maintenant et cette table pourraient être **la même chose**, pas deux systèmes séparés. Il manquerait juste : pseudo, avatar, handicaps (Visuel/Surdité/Moteur — plus riche que le seul `Is_PMR`), consentement horodaté, `phone_verified`.

### 4.4 Décisions encore ouvertes

- [x] **Nouveau dépôt Git ou branche sur l'existant** — *Décidé et fait, 2026-08-21* : nouveau dépôt `GiBruGa/SpotSan-V2` créé (public), cloné localement (`SpotSan-V2/`), ce document déplacé dedans. v1 reste intouchée à son adresse actuelle (`GiBruGa/SpotSan`, local `SpotSan/`) — **rien n'est renommé pour l'instant**, voir la décision de bascule ci-dessous.
- [x] **Bascule de production v1 → v2** — *Décidé 2026-08-21* : on ne touche à rien côté v1 tant que v2 n'est pas testée de façon un peu avancée (v1 est en production réelle, sert des utilisateurs de terrain aujourd'hui — un renommage prématuré risquerait de casser l'app pour ceux qui l'ont déjà installée en PWA, `gibruga.github.io/SpotSan/` ne suit pas forcément une redirection de renommage). Quand v2 sera prête : renommer `GiBruGa/SpotSan` → `GiBruGa/SpotSan-V1` (clarté), et faire la bascule des utilisateurs vers v2 (`GiBruGa/SpotSan-V2`, à ce moment-là probablement lui-même renommé pour reprendre l'adresse `SpotSan` de production, ou redirigé — modalité exacte à définir au moment de la bascule). Voir Lot 9.
- [x] **Migration des avis existants** — *Décidé 2026-08-21* : toutes les données v1 sans auteur (`Rating_*`/`Equipment`/`Comment` de `SanitaryBlocks_Inventory`, `Incident_Reports`, **et** les tables orphelines `Toilet_Ratings`/`Toilet_Photos`/`Toilet_Equipment_Reports`/`Toilet_Position_Votes`) sont migrées vers l'utilisateur placeholder "Paul Hixe" (§4.5) — rien n'est jeté.
- [x] **Photos par équipement** — *Décidé* : modèle à 3 niveaux + taxonomies actées, voir §4.6/§5.6.
- [ ] **Découverte non anticipée, 2026-08-21 : les sessions Supabase Auth sont partagées entre toutes les PWA UrBizia hébergées sous `gibruga.github.io`.** GitHub Pages sert EkoMa/StatSan/FBS/RFQ/SpotSan/SpotSan-V2 comme des *sous-chemins* d'une seule origine (`https://gibruga.github.io/...`), et `localStorage` (où Supabase Auth stocke la session) est partagé par origine, pas par app. Concrètement : Gilles, déjà connecté à EkoMa avec son compte admin réel, a ouvert SpotSan V2 et son `assurerSession()` a réutilisé cette session existante au lieu de créer une session anonyme — son profil SpotSan V2 ("GBG") est donc rattaché à son compte admin EkoMa (`user_id` `1a294edc-...`), pas à un compte anonyme séparé. Ni bug ni intentionnel — personne n'y avait pensé. À trancher : on considère ça comme une SSO bienvenue (pratique : un seul compte pour tout UrBizia), ou faut-il isoler les sessions SpotSan (ex. client Supabase avec une clé de stockage dédiée) pour ne pas mélanger identité "outil interne" et identité "usager terrain anonyme" ? Pas bloquant, mais à clarifier avant d'ouvrir l'app à de vrais utilisateurs de terrain.
- [x] **`Incident_Reports.user_id`** — *Fait* : colonne `user_id uuid` ajoutée au Lot 4, utilisée par `SignalerIncivilite.svelte` (Lot 6) pour attribuer chaque signalement à son auteur réel.
- [x] **Anonymisation des personnes identifiables** — *Chantier lancé et fait pour les visages, 2026-08-22.* Floutage automatique **entièrement côté client, gratuit, sans API externe payante** : détection de visages (`@tensorflow-models/blazeface`) directement dans le navigateur, pixelisation avant l'envoi. Appliqué à **toutes** les photos (avis niveaux 1/2, Incivilités/Vandalismes) **sauf l'avatar** (montrer son visage est le but). Voir `src/lib/anonymisation.js`.
  - **Choix technique** : MediaPipe Tasks Vision essayé en premier puis abandonné — son runtime WASM fait ~11 Mo (toutes tâches vision confondues), bien trop lourd pour une PWA mobile terrain. BlazeFace (TensorFlow.js) est nettement plus léger. Import dynamique (pas statique) pour ne pas alourdir le bundle principal chargé par tout le monde dès l'ouverture de l'app — le modèle ne se télécharge qu'au moment réel d'une prise de photo.
  - **Limite assumée** : ne détecte que les **visages**, pas les plaques d'immatriculation — pas d'équivalent aussi mature/léger côté outils gratuits pour ça. Risque jugé faible (photos I&V surtout des intérieurs/équipements) mais pas nul (photos "vue de loin"/"accès" pouvant capter une rue). Reste un point de vigilance manuel.
  - **Dépendance externe résiduelle** : `blazeface.load()` télécharge les poids du modèle depuis le CDN TensorFlow Hub (`tfhub.dev`/`storage.googleapis.com`) au tout premier floutage — gratuit, mais pas un fichier local comme le reste de l'app ; nécessite un réseau la première fois (puis mis en cache par le service worker).
  - **Testé** : pipeline vérifié de bout en bout dans le navigateur (chargement du modèle, détection sans erreur, upload réussi) avec une image de test sans visage détectable (aucun outil disponible pour fabriquer une vraie photo de visage dans cet environnement) — le floutage réel sur un vrai visage reste à confirmer par Gilles sur un vrai appareil/vraie photo.

### 4.5 Utilisateur placeholder pour reprendre les données v1 (décidé 2026-08-21)

Pour ne rien perdre de ce qui a déjà été saisi (en particulier les Incivilités et Vandalismes, §3.2) au moment de basculer sur le modèle "un avis = un utilisateur" : toutes les données existantes sans auteur sont rattachées à un unique utilisateur placeholder.

- Nom : **Paul Hixe**.
- Téléphone : **+33 000 000 001** (format standard §3.2).
- Portée : tout ce qui aujourd'hui n'a pas d'auteur individualisable — colonnes `Rating_*`/`Equipment`/`Comment` de `SanitaryBlocks_Inventory`, et `Incident_Reports` (`Reported_by`).
- "Paul Hixe" sera créé dans `SitInZen_Users` (décision §4.1 : réutilisation actée) — pas encore fait, dépend de la mise en place des colonnes additionnelles (Lot 1).
- `Incident_Reports` n'a aujourd'hui pas de colonne `user_id` (seulement `Reported_by text`) : à la migration, soit on y ajoute `user_id` et on le pointe vers "Paul Hixe", soit on se contente de mettre `Reported_by = 'Paul Hixe'` en texte — à trancher au moment du Lot 4 selon si on veut que ces 9 signalements historiques deviennent des "avis" au sens plein du terme ou restent une trace en lecture seule.

### 4.6 Photos — modèle à 3 niveaux (décidé, 2026-08-21)

Suite aux précisions de Gilles, abandon de la simple opposition "5 catégories v1 vs photo par équipement" (§4.6 précédente version) au profit d'un modèle à trois niveaux distincts, cohérent avec l'objet principal de l'outil (voir bandeau en tête de document et §5.6) :

1. **Infos critiques PMR** — champs structurés dédiés (pas des tags génériques, doivent rester fiables et faciles à retrouver) : vue de loin, signalétique, accès. Détail en §5.6.1.
2. **Confort/équipements** — photo + tag choisi dans une liste fermée (chips, pas de texte libre), non directif, réutilise directement la liste d'équipements de §5.5 étape 3 plutôt que d'inventer un second vocabulaire. Détail en §5.6.2.
3. **Incivilités et Vandalismes** — même mécanique tag+photo que le niveau 2, mais le tag devient **obligatoire** et suit une taxonomie stable dans le temps, car ces tags serviront de **labels d'entraînement pour l'IA de détection** (l'objet principal de l'outil, voir bandeau en tête de document) — pas juste un confort de navigation pour l'utilisateur suivant. Détail en §5.6.3.

Ceci remplace les 5 catégories fixes de v1 (`Environment`/`CloseUp`/`Interior`/`Seat`/`Sink`) : `Environment` devient la "vue de loin" du niveau 1 ; `CloseUp`/`Interior`/`Seat`/`Sink` sont remplacées par les photos taguées des niveaux 2 et 3, plus précises.

### 4.7 Stack technique — *Décidé 2026-08-21 : Vite + Svelte*

SpotSan V2 passe à un vrai outillage de build, en rupture assumée avec le "tout vanilla, pas de build" de FBS/RFQ/StatSan/EkoMa — justifié par le fait que SpotSan est l'outil prioritaire de la suite et que la structure en composants réduit durablement les bugs de répétition (ex. le piège "garder les `addEventListener` synchronisés à la main" du v1 actuel).

- **Vite** : outil de build/dev-server. **Svelte** : framework à composants choisi plutôt que React pour rester léger (peu de cérémonie, compile en JS quasi-vanilla à l'exécution, petit bundle — important pour un usage mobile terrain, potentiellement en zone mal couverte).
- **Risque principal identifié, à traiter avec soin en Lot 4bis** : le moteur offline/sync de v1 (`dirtyFeedback`/`pendingNewToilets`/`pendingIncidents`, la queue locale qui permet de saisir sans réseau et de synchroniser plus tard) doit être repensé dans le modèle réactif de Svelte, pas juste recopié — c'est la fonctionnalité la plus critique de l'app (le terrain n'a pas toujours de réseau) donc la plus de soin à apporter pendant le portage, avec test réel en coupant le réseau avant de considérer ce lot terminé.
- **Déploiement** : ajouter un workflow GitHub Actions qui build (`vite build`) et publie sur GitHub Pages à chaque push sur `main`, pour garder le geste "push → site à jour" sans étape manuelle à se souvenir de faire (aujourd'hui inexistant, à créer).

## 5. Parcours cible

### 5.1 Compte utilisateur
- Identifiant = n° de portable + préfixe pays.
- Choix pseudo + avatar — **décidé 2026-08-21 : une vraie photo (prise ou choisie dans la galerie du téléphone)**, pas une liste fermée d'emoji comme prévu initialement. Réutilise `BoutonPhoto` (Lot 6) sans son biais "appareil photo arrière" (prop `capture={null}`, laisse le choix natif complet). Par défaut, sans photo choisie : **logo SpotSan** (`icon-192.png`), pas un emoji générique.
- Champs optionnels : sexe (ou refus de préciser), année de naissance, handicaps (**Visuel / Moteur**, choix multiple — "Surdité" retiré de la liste le 2026-08-21 ; la contrainte `check` en base autorise toujours `Surdité` pour ne pas invalider les données déjà déclarées par ce biais, seule l'offre à l'inscription a changé).
- Texte de légalité sur la collecte de données affiché à l'inscription.
- Rappel visible à tout moment : suppression du compte + des données personnelles sur demande.
- Bandeau d'en-tête : avatar + pseudo + menu utilisateur → infos personnelles, suppression du compte.

### 5.2 Carte
- Inchangée, sauf : le point bleu de position utilisateur doit être **toujours au premier plan** (pane Leaflet dédié au-dessus des marker clusters) et **plus visible** (taille augmentée / halo), pour ne plus disparaître sous les autres marqueurs au zoom 1km.

### 5.3 Fiche sanitaire (lecture)
Bloc en lecture seule, non éditable au clic, dans cet ordre :
1. Mention "Informations données par vos prédécesseurs".
2. Photos.
3. Stats avis général + état (odeur, propreté...).
4. Configuration / prestations (nb de cellules, PMR, etc.).
5. Équipements (douches, urinoirs, lave-mains...).

Puis bouton **"Donnez votre avis"** → bascule vers le formulaire.

### 5.4 Reprise de l'avis précédent de l'utilisateur
- Si l'utilisateur a déjà un avis sur ce lieu : le retrouver, afficher sa date, préremplir le formulaire avec ses dernières valeurs.
- Bouton **Sauvegarder** → `update` de son avis existant (pas un nouvel avis) + date mise à jour.
- Bouton **Sortir sans sauvegarder** → abandon, aucune écriture.
- Les deux en boutons flottants, toujours visibles pendant la saisie.

### 5.5 Formulaire "Donner son avis" — structure
**Étape 1 — Avis général**
- Avis général : échelle standard 5 niveaux (§3.1) — plus de composant étoiles séparé.
- **Commentaire libre, optionnel** — décidé 2026-08-21, en réponse à un usage réel constaté en v1 (ex. "Nettoyage par arrosage au sol..."). Colonne `commentaire` sur `Sanitary_Reviews`, déjà ajoutée au Lot 4.

**Étape 2 — Configuration (prestations)**, en grille compacte multi-colonnes :

| Cellule | Accessibilité | Type (si toilette) | État |
|---|---|---|---|
| Toilettes PMR | Séparé Dames/Messieurs · Mixte | Classique · Automatique · Chimique · Sèche | échelle standard §3.1 (👎…👍) · Abs *(par défaut)* · HS |
| Toilettes Standard | idem | idem | idem |
| Urinoir Hommes | Séparé Dames/Messieurs · Mixte | — | idem |
| Urinoir Femmes | idem | — | idem |
| Douches PMR | idem | — | idem |
| Douches Standard | idem | — | idem |
| Vestiaires PMR | idem | — | idem |
| Vestiaires Standards | idem | — | idem |

Chaque ligne démarre à l'état "absent / sans objet" — l'utilisateur ne touche que ce qui existe réellement sur place (réduit la saisie perçue comme longue).

**Étape 3 — Équipements**, échelle standard §3.1 partout (photos : voir §5.6.2, système de tags plutôt qu'un bouton par équipement) :
- Siège de toilette (Adulte / Enfant-surbaissé) + état — toilettes uniquement.
- Distributeur papier toilette + état, avec "Vide" — si toilette.
- Lave-main (par cellule ou commun) + état, avec "Abs" *(par défaut)* et "HS".
- Distributeur de savon + état, avec "Vide".
- Sèche-main + état.
- Distributeur d'essuie-tout + état, avec "Vide".
- Poubelle + état, avec "Débordante" (pas de "Vide", non constatable — §3.1).
- Éclairage naturel : oui / non.
- Verrou mécanique de sûreté : oui / non.

### 5.6 Photos, signalétique & Incivilités/Vandalismes (décidé, 2026-08-21)

Voir bandeau en tête de document : la collecte de photos d'Incivilités et Vandalismes (§5.6.3) pour entraîner une IA de détection est **l'objet principal de l'outil pour UrBizia**. Ce qui suit priorise cette fonction, avant le confort des autres écrans.

#### 5.6.1 Infos critiques PMR (niveau 1)

Champs structurés dédiés, affichés en priorité dans le bloc lecture (§5.3), chacun avec sa propre photo optionnelle. **Chaque type de photo a une finalité précise, à afficher comme consigne de cadrage au moment de la prise de vue** — sans quoi ces 3 catégories deviennent aussi floues que l'ancien "CloseUp" de v1 et perdent leur utilité :

- **Vue de loin** (remplace `Environment` de v1). *Finalité : repérer visuellement le sanitaire en arrivant dans la zone, dans un environnement parfois chargé (mobilier urbain, foule, végétation).* Consigne à afficher : cadrer depuis l'endroit où un usager arriverait typiquement (rue, parking, allée), en gardant des repères du décor environnant — pas un gros plan.
- **Signalétique**. État d'usage constaté — Disponible / Momentanément indisponible (nettoyage) / Condamné-HS — pour ne pas se déplacer pour rien. *Finalité : rendre l'état déclaré vérifiable par une photo du panneau/de l'indicateur réel (affiche de fermeture, voyant, scellés).* Consigne à afficher : cadrer le panneau ou l'indicateur lui-même, pas une vue large.
- **Accès**. Rampe, pente d'escalier, main courante, largeur de passage. *Finalité : permettre à une personne de juger à l'avance si son handicap spécifique est compatible, avant de se déplacer.* Consigne à afficher : cadrer le cheminement d'accès (porte, marches, rampe) de façon à ce que la largeur et la pente soient visibles.

#### 5.6.2 Confort/équipements (niveau 2)

Photo + tag choisi dans une liste fermée (chips à taper, pas de texte libre), optionnel, non directif — pour donner une idée sans être normatif. Plusieurs photos possibles, chacune avec un ou plusieurs tags.

**Tags retenus, actés le 2026-08-21** (liste resserrée par Gilles, remplace la proposition précédente) :
- Siège toilette
- Lave-main
- Visibilité distributeurs (eau, savon, séchage)
- Poubelle
- Distributeur papier toilette / essuie-tout

**Tags envisagés, non retenus au lancement** — à réévaluer selon l'usage réel plutôt qu'ajoutés par anticipation (risque de surcharger le formulaire, cf. principe §3 "réduire la saisie perçue comme longue") : éclairage naturel, verrou mécanique anti-intrusion, commande porte, décompte du temps d'utilisation, luminosité, ambiance.
- *Remarque* : éclairage naturel et verrou mécanique sont déjà des champs à part entière en étape 3 (§5.5) — pas besoin d'un tag en plus, ce serait redondant.
- *Remarque* : commande porte et décompte du temps d'utilisation décrivent plutôt des sanitaires automatiques (déjà couvert par le champ `Automatic` existant) qu'un problème de confort ponctuel — à creuser plus tard comme un champ structuré dédié si besoin, pas comme un tag photo.
- *Remarque* : luminosité et ambiance sont trop subjectives pour un tag+photo unique — mieux couvertes par la photo "vue de loin" (§5.6.1) déjà prévue, qui donne déjà une idée de l'ambiance générale.

#### 5.6.3 Incivilités et Vandalismes (niveau 3 — objet principal de l'outil)

Reprend le flux "signaler" déjà existant en v1 (photo obligatoire + texte libre optionnel, écriture en append-only dans `Incident_Reports`, jamais modifiable/supprimable — préserve l'intégrité de la base d'entraînement), avec deux changements :
- **Tag obligatoire**, choisi dans une taxonomie fermée et stable dans le temps (pas retouchée au fil de l'eau, car elle définit les classes que l'IA apprendra à reconnaître). **Taxonomie actée le 2026-08-21**, établie par Gilles à partir des fréquences constatées sur le terrain (remplace la proposition générique précédente) :
  - Excès de papier dans les toilettes / corps étranger rigide
  - Déchets, papiers, fluides non identifiés dans le bol du lave-main
  - Défaut de nettoyage (salissures par accumulation, calcaire, algues)
  - Dégradation matérielle (bris, casses, coups, griffures)
  - Graffiti / Tag
  - Déchets / encombrants abandonnés
  - Équipement arraché
  - Feu / Brûlure
  - Salissures volontaires
  - Serrure ou porte forcée
  - Excréments au sol ou sur les murs
  - Autre (texte libre, comme aujourd'hui)
- **Mise en avant dans l'interface** : le bouton "Signaler une Incivilité ou un Vandalisme" doit être aussi visible/accessible que "Donnez votre avis" — pas une fonction secondaire enfouie dans un menu, cohérent avec le fait que c'est l'objet principal de l'outil.
- ⚠️ **Point à ne pas oublier, à traiter avant mise en production** : ces photos alimentant une base d'entraînement IA, vérifier qu'elles ne capturent pas de personnes identifiables (visages, plaques d'immatriculation) sans consentement — au minimum un rappel à l'utilisateur au moment de la prise de vue, éventuellement un floutage automatique à envisager plus tard. Pas tranché, à revoir avec Gilles.

## 6. Agrégation des avis → stats "Avis précédents"

Objectif : à partir de tous les avis individuels sur un lieu, remonter **les 2 configurations les plus plausibles** et **les 2 états les plus fréquents**.

**Proposition d'algorithme :**

1. Le modèle "un avis par utilisateur, amendable" (§3) élimine déjà le problème classique du double-comptage : à un instant donné il n'existe qu'un seul avis courant par utilisateur et par lieu, donc chaque personne pèse pour 1, pas pour N mises à jour successives.
2. Traiter la **configuration comme un vecteur complet** (tuple : nb de chaque type de cellule + leurs sous-attributs), pas champ par champ — sinon on peut recomposer un "consensus" incohérent qu'aucun utilisateur n'a réellement rapporté (ex. moyenne bancale entre "2 PMR + 1 douche + 5 urinoirs" et "0 PMR + 0 douche + 40 urinoirs").
3. Regrouper les avis dont le vecteur configuration est **identique**, compter les occurrences, classer par fréquence décroissante (départage par récence). Les 2 vecteurs les plus fréquents = "les 2 configurations les plus plausibles".
4. Une saisie aberrante isolée (ex. quelqu'un rapporte 40 urinoirs par erreur) ne matche aucun autre vecteur → elle reste un singleton et sort naturellement du top 2, sans détection d'outlier explicite à coder.
5. Sous un seuil d'échantillon (ex. < 3 avis), ne pas fabriquer de "consensus" : afficher plutôt le dernier avis en date tel quel, avec sa date, en indiquant "à confirmer" plutôt qu'une fausse certitude statistique.
6. Même logique pour les états (portes/propreté/odeur) : mode des tuples d'état, top 2.
7. Amélioration possible plus tard (v2.1) si le matching exact produit trop de singletons faute de volume : tolérance de distance entre vecteurs proches (ex. ±1 sur un comptage) pour les regrouper — à ne faire que si l'exact-match s'avère insuffisant en usage réel, pas en anticipation.

Algorithme retenu pour le lancement (Lot 8) — seule brique non encore éprouvée sur des données réelles, à surveiller une fois du volume accumulé.

## 7. Lots de réalisation

### Séquencement pour le lancement

Tous les points de conception sont actés (seuls restent ouverts, sans bloquer le démarrage : `Incident_Reports.user_id` §4.4, anonymisation photos I&V §5.6.3 — à trancher avant la mise en prod, pas avant de commencer). Ordre recommandé, en 5 phases :

- **Phase 1 — Fondations (Lot 0 + Lot 0bis).** Rien d'autre ne peut commencer sérieusement avant : dépôt v2, scaffolding Vite+Svelte, et surtout le portage/test du moteur offline-sync (le risque principal du projet, §4.7) — le valider tôt évite de découvrir un problème structurel après avoir construit tout le reste par-dessus.
- **Phase 2 — Backend (Lot 1 + Lot 4), en parallèle.** Comptes utilisateurs (`SitInZen_Users` étendue, "Paul Hixe") et modèle de données avis (`Sanitary_Reviews`, migration des données héritées) peuvent avancer de front — tous deux du travail Supabase, indépendants l'un de l'autre jusqu'à ce que Lot 4 ait besoin d'un `user_id` valide à référencer.
- **Phase 3 — Écrans (Lot 2, 3, 5, 6), en parallèle une fois Phase 1+2 posées.** Carte, fiche lecture, formulaire "Donner son avis", photos 3-niveaux — tous consomment le socle de composants (Lot 0bis) et le schéma (Lot 4). Le Lot 6 (photos, niveau 3 = objet principal de l'outil) mérite d'être traité en premier dans cette phase, pas en dernier, vu sa priorité affichée en tête de document.
- **Phase 4 — Polish (Lot 7).** *Terminée 2026-08-21* pour la partie technique (étapes visibles, valeurs par défaut) — livrée avec les Lots 5/6 plutôt qu'en tâche séparée. Reste le test utilisateur informel, qui ne peut se faire qu'avec un vrai usage.
- **Phase 5 — Stats (Lot 8).** *Terminée 2026-08-21* — implémentation + affichage faits aux Lots 3/4. Le chemin "≥ 3 avis" n'a pas encore été observé en vrai dans l'interface (voir détail au Lot 8), se vérifiera avec l'usage réel.

**Toutes les phases du plan initial (1 à 5, Lots 0 à 8) sont maintenant faites et vérifiées dans la mesure du possible sans utilisateurs réels.** Restent, dans l'ordre de priorité suggéré :
1. Essai réel par Gilles sur un vrai téléphone (photo réelle via l'appareil, pas simulée — voir la limite notée au Lot 6).
2. Trancher les points encore ouverts (§4.4) : réutilisation ou non de la session partagée `gibruga.github.io`, anonymisation des photos I&V, stack/décisions mineures restantes s'il y en a.
3. Lot 9 (bascule de production) — seulement quand Gilles juge que v2 est prête.

Prochaine action concrète : créer le nouveau dépôt GitHub (Lot 0) — reste à choisir son nom, `GiBruGa/SpotSan` restant pris par v1.

### Lot 0 — Cadrage & archivage
- [ ] Ce document relu et validé.
- [ ] Décisions §4.4 restantes tranchées (reste : session partagée `gibruga.github.io`, anonymisation I&V — aucune ne bloque, mais à trancher avant la mise en prod).
- [x] v1 archivée : nouveau dépôt GitHub pour v2 (§4.4).

### Lot 0bis — Socle technique Vite + Svelte
- [x] **Scaffolding Vite + Svelte** — fait 2026-08-21 : Node.js LTS installé sur la machine, projet créé (Svelte 5, JS, pas TypeScript), arborescence `src/lib/components/`. Composant réutilisable `EchelleEtat.svelte` créé pour l'échelle standard §3.1 (5 niveaux + `extensions` en props pour Abs/HS/Débordante...) — vérifié fonctionnel en dev (binding réactif testé au clic dans le navigateur).
- [x] **Workflow GitHub Actions** — fait 2026-08-21 : `.github/workflows/deploy.yml` (build + `actions/deploy-pages`), Pages configurée en source "GitHub Actions" côté GitHub. Se déclenche au prochain push sur `main`.
- [x] **Portage soigné du moteur offline/sync** — fait au Lot 5 comme prévu (voir détail là-bas), une fois qu'il y a eu de vraies écritures à mettre en queue. Testé réseau coupé dans le navigateur, comportement conforme.
- [x] **Service worker / PWA** — fait 2026-08-21, via `vite-plugin-pwa` (génère un service worker de précache app-shell + `runtimeCaching` réseau-d'abord pour les ressources externes, plutôt qu'un fichier écrit à la main — les noms de fichiers Vite changent à chaque build). `public/manifest.json` réutilise les icônes v1, nommé "SpotSan V2 (beta)" pour rester visuellement distinct de v1 si les deux PWA sont installées côte à côte pendant les tests.

### Lot 1 — Comptes utilisateurs (fait et vérifié 2026-08-21)
- [x] `ALTER TABLE SitInZen_Users` additif : `pseudo`, `avatar_url`, `handicaps text[]` (contrainte sous-ensemble Visuel/Surdité/Moteur), `consent_at timestamptz`, `phone_verified boolean default false`. Rien renommé/supprimé, policies existantes du module badge non touchées. Migration `sitinzen_users_add_spotsan_v2_fields`.
- [x] **Connexion déclarative** : implémentée via **Supabase Auth anonyme** (`supabase.auth.signInAnonymously()`) plutôt qu'un système ad hoc — chaque appareil obtient une vraie session/`user_id` stable sans mot de passe ni SMS. Nécessite le provider "Anonymous Sign-Ins" activé côté tableau de bord Supabase (fait). Vérifier le téléphone plus tard = lier cette session anonyme à un vrai numéro (`auth.updateUser({phone})`), sans reprise de modèle.
- [x] Utilisateur placeholder **"Paul Hixe"** créé (`+33 000 000 001`, `user_id = 28123f5d-8081-46d9-b4b2-b5b23a1c59cd`) — migration `create_paul_hixe_placeholder_user`. À référencer au Lot 4 pour la migration des données v1 héritées.
- [x] Écran d'inscription (`src/lib/components/Inscription.svelte`) : téléphone (format standard §3.2), pseudo, avatar (liste fermée d'emoji pour l'instant — simplification à revoir si un vrai upload photo est souhaité), sexe/année de naissance/handicaps facultatifs, texte légal + case de consentement, rappel du droit à la suppression.
- [x] **Self-service suppression** : deux niveaux — suppression du profil seul possible en client (policy RLS `sitinzen_users_delete_own`), et suppression complète du compte (profil **+** compte `auth.users` lui-même, qui nécessite les droits admin) via l'Edge Function `delete-own-account` (déployée avec `verify_jwt` plateforme actif — la vérification automatique ne bloque pas le pré-vol CORS, contrairement à une crainte initiale ; la fonction vérifie en plus elle-même l'identité de l'appelant dans son code, jamais depuis le corps de la requête). Testé de bout en bout dans le navigateur : compte créé, menu affiché, suppression confirmée, ligne `SitInZen_Users` et compte `auth.users` disparus en base.
- [x] Bandeau d'en-tête (`src/lib/components/BandeauEntete.svelte`) : avatar + pseudo + menu (infos personnelles, suppression du compte avec confirmation).

### Lot 2 — Carte (fait et vérifié 2026-08-21)
- [x] **Point bleu utilisateur en pane dédié au-dessus des clusters, taille augmentée** — pane Leaflet `position-utilisateur` créé avec un z-index supérieur au pane des marqueurs (650 vs 600), halo + point via `divIcon` (plus gros et plus visible qu'un marqueur standard). Corrige le tout premier problème signalé en début de projet.
- [x] Carte Leaflet + `leaflet.markercluster` (npm, pas de CDN — cohérent avec le choix Vite), tuiles CARTO clair/sombre selon `prefers-color-scheme` (repris de v1).
- [x] Chargement des sanitaires **par zone visible** (`chargerSanitairesDansZone`, filtre par bbox sur `Latitude`/`Longitude`, rafraîchi à chaque déplacement de la carte) plutôt qu'un fichier de seed de 18 Mo comme en v1 — plus adapté à une app qui parle directement à Supabase. Vérifié dans le navigateur : clusters visibles à l'échelle France, marqueurs individuels au zoom, clic → ouverture de la fiche.
- **Non fait dans ce lot, à noter pour plus tard** : les chips de filtre par source (`verified`/`gouv`/`osm`/`certified`/`supprimées`) de v1 n'ont pas été reconstruits — un seul style de marqueur pour l'instant. Pas dans le périmètre explicite du Lot 2 (qui ne listait que le point bleu), mais à reprendre si Gilles veut la parité complète avec v1.

### Lot 3 — Fiche sanitaire (lecture) (fait et vérifié 2026-08-21)
- [x] Réorganisation du bloc lecture (ordre §5.3 : mention "prédécesseurs" → photos → avis/état → configuration → équipements), **non cliquable** (`pointer-events: none` sur le bloc entier, sauf le bouton "Donnez votre avis" qui est explicitement en dehors) — corrige la deuxième confusion signalée en début de projet (cliquer sur les données existantes en espérant les modifier).
- [x] Bouton "Donnez votre avis" → ouvre le formulaire du Lot 5 pour le lieu affiché.
- [x] **Repli intelligent sur les données héritées** : si `get_avis_summary` n'a pas assez d'avis V2 (`suffisant: false`), la fiche retombe sur les comptages v1 déjà fiables (`MSB`/`PMR`/`Urinals`/...) plutôt que d'afficher un vide. Avec 1 seul avis, affiche "à confirmer" + le contenu brut plutôt qu'un faux consensus (conforme à l'algorithme §6).
- [x] Retour à la fiche après sauvegarde d'un avis **rechargé à chaud** (`{#key}`) pour montrer l'avis fraîchement donné, pas une version périmée.
- Vérifié de bout en bout dans le navigateur : clic sur un marqueur → fiche affichée avec repli v1 correct → "Donnez votre avis" → sauvegarde → retour fiche à jour ("À confirmer — un seul avis...").

### Lot 4 — Modèle de données "avis" (fait et vérifié 2026-08-21)
- [x] Table `Sanitary_Reviews` : clé primaire `(user_id, ub_id)` (un avis par utilisateur par lieu, amendable — pas de colonne id séparée, la contrainte fait le travail), `created_at`/`updated_at` (déclenchement automatique par trigger `_touch_updated_at` à chaque `update`). `user_id` référence `auth.users` directement (comme `Access_Grants`), pas `SitInZen_Users` — même valeur, cohérent avec la convention déjà en place dans le schéma.
- [x] **`configuration` et `etats` séparés en deux colonnes jsonb distinctes**, précision par rapport au plan initial : `configuration` porte la structure du lieu (quelles cellules existent, accessibilité, type — stable dans le temps), `etats` porte l'état de fonctionnement de chaque cellule et équipement (volatile, change à chaque visite). Cette séparation est ce qui permet à l'algorithme §6 de calculer "2 configurations plausibles" et "2 états fréquents" comme deux agrégats vraiment distincts plutôt qu'un seul objet mélangeant les deux. Colonnes équipements (`eclairage_naturel`, `verrou_mecanique`) et photos (§5.6, prévues pour le Lot 6 : `photo_vue_loin`, `signaletique`, `photo_signaletique`, `photo_acces`, `photos_confort`) ajoutées dès maintenant pour ne pas re-migrer le schéma plus tard.
- [x] RLS : select/insert/update/delete restreints à `auth.uid() = user_id` — un utilisateur ne voit que ses propres avis en direct (pas de fuite d'identité individuelle vers les autres utilisateurs).
- [x] Fonction `get_avis_summary(p_ub_id)` (`SECURITY DEFINER`, lit tous les avis du lieu malgré le RLS restrictif ci-dessus, ne renvoie que des agrégats) : implémente l'algorithme §6 — vecteurs identiques regroupés, top 2 par fréquence, retombe sur le dernier avis brut si moins de 3 avis plutôt que fabriquer un faux consensus. Testée en base, comportement conforme.
- [x] `Incident_Reports.user_id uuid` ajoutée (nullable, `references auth.users`) — décision §4.4 mise en œuvre. Les 9 signalements v1 existants restent `null` (pas d'auteur identifiable) ; les nouveaux signalements V2 (Lot 6) pourront le renseigner.
- [x] **Migration des données v1 héritées vers "Paul Hixe"** : 12 avis créés à partir de l'état courant de `SanitaryBlocks_Inventory` (toutes les toilettes ayant un `Rating_Overall`/`Equipment`/`Comment` renseigné). Approximations à connaître :
  - Échelle v1 (-5..+5) → échelle standard V2 (1..5) par mapping linéaire, y compris pour les valeurs sentinelles `-1` du jsonb `Equipment` v1 (qui semblent signifier "non noté" plutôt qu'une vraie note négative) — elles atterrissent au milieu de l'échelle (3), un choix défendable mais pas garanti exact.
  - `configuration` migrée est **grossière** : v1 n'a que des comptages globaux (MSB/PMR/Urinals/Showers/ChangingRooms), pas de détail accessibilité/type par cellule, et pas de répartition PMR/standard pour douches et vestiaires — seule la présence (compte > 0) a pu être déduite, `accessibilite` déduite de `Mixte`, `type` déduit de `Automatic` (toilettes uniquement).
  - Les commentaires libres v1 (`Comment`) ne sont **pas repris** : `Sanitary_Reviews` n'a pas de colonne commentaire (le formulaire V2 tel que conçu au §5.5 n'en prévoit pas — à confirmer si c'est voulu, voir remarque plus bas). Les textes restent consultables sur `SanitaryBlocks_Inventory.Comment`, colonne non supprimée.
  - **Découverte en cours de route, corrigée dans le document** (§4.3) : les tables `Toilet_Ratings`/`Toilet_Photos`/`Toilet_Equipment_Reports` ne sont pas mortes — elles sont la vraie source d'écriture de v1 en production (historique par soumission + moyenne glissante recalculée à chaque avis). La migration s'appuie sur cette moyenne déjà calculée (`SanitaryBlocks_Inventory`), qui est la valeur la plus représentative disponible — les lignes d'historique individuelles (par `device_id`, non attribuables à un utilisateur réel) ne sont pas reprises une par une.
- [x] **Commentaire libre optionnel** — décidé et ajouté 2026-08-21 : colonne `commentaire text` sur `Sanitary_Reviews`. Les 4 commentaires v1 déjà présents sur les toilettes migrées ont été rétro-remplis dans les avis de "Paul Hixe". `get_avis_summary` renvoie désormais aussi le commentaire dans `dernier_avis`.

### Lot 5 — Formulaire "Donner son avis"
- [x] Préremplissage depuis le dernier avis de l'utilisateur (si existant) + affichage de la date ("Reprise de ton dernier avis du JJ/MM/AAAA").
- [x] Boutons flottants Sauvegarder / Sortir sans sauvegarder.
- [x] Sauvegarder = `upsert` sur `(user_id, ub_id)` — vérifié : deux sauvegardes successives du même utilisateur sur le même lieu ne créent toujours qu'une seule ligne.
- [x] Étape 1 avis général : échelle standard 5 niveaux (§3.1) + commentaire libre optionnel.
- [x] Étape 2 configuration en grille compacte, échelle standard (§5.5, §3.1) : chaque cellule démarre à "Abs", les sous-options (accessibilité/type) n'apparaissent qu'une fois l'état touché (progressive disclosure, §3).
- [x] Étape 3 équipements, échelle standard (§5.5, §3.1). *(Photo par équipement reportée au Lot 6, comme prévu par §5.6.)*
- [x] **Moteur offline/sync porté et testé** (§4.7 — risque principal du projet, maintenant traité) : `queueAvis.js`, queue locale `localStorage` avec relecture automatique au démarrage et sur l'évènement `online`. **Testé en conditions simulées de coupure réseau dans le navigateur** : sauvegarde → échec réseau détecté → mise en attente locale (badge visible "avis en attente d'envoi") → reconnexion → envoi automatique → vérifié en base, une seule ligne, aucune perte ni duplication.

**Bug rencontré et corrigé en cours de route** : `bind:value={etats[cle]}` plantait (`props_invalid_value`) quand la clé n'existait pas encore dans l'objet réactif `etats`. Corrigé en initialisant `etats` avec toutes les clés à `'Abs'` dès la déclaration — qui est de toute façon le comportement demandé par le plan ("chaque ligne démarre à l'état absent"), donc la correction du bug a aussi comblé un oubli d'implémentation.

**Simplification assumée pour ce lot** : pas encore de carte/fiche sanitaire (Lot 2/3) pour choisir un lieu réel — un sélecteur provisoire (champ texte UB_id) permet d'exercer le formulaire en attendant. À retirer quand le Lot 2/3 sera fait.

### Lot 6 — Photos (fait et vérifié 2026-08-21)
- [x] **Nouveau bouton de capture** (`BoutonPhoto.svelte`) : gros bouton rond façon obturateur (72px, anneau + halo), remplace la barre fine de v1. Compression client (redimension 1600px + JPEG 72%, même principe que v1) avant envoi vers Supabase Storage.
- [x] **Buckets réutilisés de v1** plutôt que recréés : `PointSan-Photos` (public, pour avis/niveaux 1+2) et `PointSan-Incidents` (privé, lecture réservée aux comptes avec accès outil `pointsan_mobile` — cohérent avec l'usage "base d'entraînement", pas un accès public). Policies déjà en place, aucune n'a eu besoin d'être modifiée.
- [x] **Niveau 1** (§5.6.1) intégré en étape 4 du formulaire d'avis (Lot 5) : vue de loin / signalétique (3 états + photo) / accès, **chacun avec sa consigne de cadrage affichée au-dessus du bouton**, colonnes `Sanitary_Reviews.photo_vue_loin`/`signaletique`/`photo_signaletique`/`photo_acces` (déjà prêtes depuis le Lot 4).
- [x] **Niveau 2** (§5.6.2) : tags équipements (réutilise la liste `EQUIPEMENTS` de `cellules.js`, 7 tags), chaque photo ajoutée à `Sanitary_Reviews.photos_confort` (jsonb, tableau `{tag, url}` — plusieurs photos possibles, vérifié).
- [x] **Niveau 3** (§5.6.3) — `SignalerIncivilite.svelte`, écran dédié, séparé du formulaire d'avis (comme en v1) : bouton "Signaler une Incivilité ou un Vandalisme" **dans la fiche sanitaire, aussi visible que "Donnez votre avis"** (même style de bouton, juste une couleur différente). Photo et tag **obligatoires** (validation testée), taxonomie fixe à 12 valeurs actée le 2026-08-21 stockée en contrainte `check` sur `Incident_Reports.tag`. Append-only confirmé : aucune policy `UPDATE`/`DELETE` sur `Incident_Reports`, seul un `INSERT` est possible.
- Testé de bout en bout dans le navigateur (photo simulée par injection de fichier synthétique, le mécanisme de capture réelle `capture="environment"` n'étant testable que sur un vrai appareil) : niveau 1+2 sauvegardés dans `Sanitary_Reviews` avec de vraies URLs Supabase Storage, niveau 3 enregistré dans `Incident_Reports` avec `tag`+`Photo`+`user_id`, fichier vérifié présent dans le bucket `PointSan-Incidents`.
- **Non tranché, à faire avant la mise en production** (signalé au Lot 4, toujours vrai) : anonymisation des personnes identifiables dans les photos I&V — aucun garde-fou technique ajouté à ce stade, juste noté.
- **Simplification assumée** : le mécanisme de compression/upload n'a été vérifié qu'avec des images de test générées en mémoire (petites, ~2 Ko) — à revérifier avec de vraies photos de téléphone (taille/format réels, limite de 5 Mo du bucket) une fois testé sur un appareil physique.

### Lot 7 — Perception de la longueur du formulaire (revu 2026-08-21 — déjà satisfait par les Lots 5/6, sauf un point)
- [x] Découpage en étapes visibles (indicateur de progression) — les 4 boutons d'étape de `FormulaireAvis.svelte` (1. Avis / 2. Configuration / 3. Équipements / 4. Photos), fait au Lot 5, complété au Lot 6.
- [x] Valeurs par défaut "absent" pour ne toucher que l'existant — `etatsParDefaut()`, fait au Lot 5.
- [ ] **Test utilisateur informel sur la perception "long" avant/après — ne peut pas être fait par moi seul.** Nécessite un vrai usage par Gilles ou un utilisateur de terrain une fois l'app essayée ; à revenir dessus après un premier retour d'usage réel, pas avant.

### Lot 8 — Stats "Avis précédents" (revu 2026-08-21 — déjà satisfait par les Lots 3/4)
- [x] Implémentation algorithme §6 — fonction `get_avis_summary`, faite et testée au Lot 4.
- [x] Affichage des 2 configurations + 2 états les plus fréquents sur la fiche lecture — fait au Lot 3 (`FicheSanitaire.svelte`).
- **Point non vérifié visuellement, à garder à l'œil** : le chemin d'affichage "≥ 3 avis" (`suffisant: true`, vraies 2 configurations/2 états les plus fréquents avec fréquences) n'a été testé qu'en SQL direct (Lot 4), pas encore observé dans l'interface — chaque test de bout en bout jusqu'ici n'a produit qu'un seul avis par lieu de test (les comptes de test étaient supprimés après chaque vérification). Se vérifiera naturellement dès qu'un même lieu aura reçu 3 avis réels ; sinon, à tester en créant 3 comptes de test sur le même `UB_id` sans les supprimer entre-temps.

### Lot 9 — Bascule de production v1 → v2 (à déclencher seulement quand v2 est testée de façon avancée, §4.4)
- [ ] Renommer `GiBruGa/SpotSan` → `GiBruGa/SpotSan-V1` (v1 gelée, plus de trafic dessus à ce stade).
- [ ] Décider et exécuter la modalité de reprise d'adresse pour v2 (renommage de `SpotSan-V2` → `SpotSan`, ou redirection) — à définir au moment venu.
- [ ] Communiquer aux utilisateurs de terrain la bascule (réinstallation PWA si l'URL change).
- [ ] Vérifier que le lien `homepage`/Pages de v1 (actuellement `https://gibruga.github.io/SpotSan/`) reste résolu quelque part (redirection ou message) plutôt que de finir en 404 sec.

## 8. Suivi

_(À compléter au fil de l'eau : date, lot, décision ou avancement.)_

- 2026-08-22 — **Chantier d'anonymisation des photos lancé et livré pour les visages** : détection + floutage 100% côté client (BlazeFace/TensorFlow.js), gratuit, appliqué à toutes les photos sauf l'avatar. MediaPipe essayé puis abandonné (WASM 11 Mo, trop lourd) au profit de BlazeFace avec import dynamique (ne charge qu'au moment d'une vraie prise de photo, pas au chargement de l'app). Plaques d'immatriculation non automatisées (pas d'outil gratuit mature équivalent), reste un point de vigilance manuel. Testé de bout en bout dans le navigateur ; le floutage sur un vrai visage reste à confirmer sur un vrai appareil.

- 2026-08-21 — **Lot 6 terminé et vérifié** (photos, 3 niveaux) : bouton de capture façon obturateur, niveau 1 (vue de loin/signalétique/accès avec consignes de cadrage) intégré au formulaire d'avis, niveau 2 (tags équipements, plusieurs photos) idem, niveau 3 (Incivilités/Vandalismes — objet principal de l'outil) en écran séparé avec bouton aussi visible que "Donnez votre avis", photo+tag obligatoires, append-only. Buckets Storage v1 réutilisés tels quels. Testé de bout en bout (upload réel vers Supabase Storage, vérifié en base et dans le bucket). **Phase 3 du plan (Lots 2, 3, 5, 6) terminée.** Restent : Lot 7 (perception longueur), Lot 8 (stats), et le point non tranché sur l'anonymisation des photos I&V avant mise en prod.
- 2026-08-21 — **Lots 2 et 3 terminés et vérifiés** : carte Leaflet avec point utilisateur corrigé (pane dédié, halo, plus visible — le tout premier problème signalé), chargement des sanitaires par zone visible, fiche sanitaire en lecture non cliquable avec repli sur les données v1 quand pas encore assez d'avis V2. Parcours complet vérifié dans le navigateur : carte → clic marqueur → fiche → "Donnez votre avis" → sauvegarde → retour fiche à jour. Numéro de version affiché ajouté (`v8.0`, v1 étant en `v6.0`, pas de v7 — choix de Gilles). Chips de filtre par source de v1 non reconstruits, hors périmètre explicite du lot.
- 2026-08-21 — **Lot 5 terminé et vérifié** : formulaire "Donner son avis" en 3 étapes, préremplissage/reprise de l'avis précédent, boutons flottants, upsert confirmé sans duplication. **Le moteur offline/sync (risque principal du projet) a été porté et testé en conditions de coupure réseau simulée** — sauvegarde mise en attente localement, badge visible, envoi automatique à la reconnexion, aucune perte ni doublon vérifié en base. Bug de binding Svelte rencontré et corrigé en route (a aussi comblé un oubli : les cellules doivent démarrer à "Abs"). Sélecteur de sanitaire provisoire en attendant le Lot 2/3.
- 2026-08-21 (nuit, en autonomie) — **Gotcha de test noté** : GitHub Pages met `index.html` en cache 10 min (`Cache-Control: max-age=600`) — après un déploiement rapide de plusieurs correctifs successifs, un onglet resté ouvert peut charger un bundle JS déjà remplacé (404 sur les anciens fichiers hashés). Se manifeste comme une fausse alerte de bug ; vérifier avec une URL en cache-bust (`?bust=...`) ou attendre 10 min avant de conclure qu'un correctif déployé ne marche pas.
- 2026-08-21 (nuit, en autonomie) — **Lots 7 et 8 refermés** : leurs parties automatisables étaient déjà couvertes par les Lots 3/4/5/6, il ne restait que la vérification. Un bug de déploiement trouvé et corrigé au passage : le logo par défaut de l'avatar utilisait un chemin absolu `/icon-192.png` (404 en production, l'app étant servie sous `/SpotSan-V2/`) — remplacé par `import.meta.env.BASE_URL`, vérifié sur le vrai déploiement. **Toutes les phases du plan initial (Lots 0 à 8) sont maintenant faites et vérifiées dans la mesure du possible sans utilisateurs réels.** Restent uniquement des décisions qui appartiennent à Gilles (session partagée `gibruga.github.io`, anonymisation photos I&V, test utilisateur informel, bascule Lot 9) — rien de plus à construire sans son arbitrage.
- 2026-08-21 — **Retours utilisateur sur l'inscription intégrés** : contraste insuffisant à la sélection corrigé (fond plein + texte blanc, `Inscription.svelte`), avatar remplacé par une vraie photo (prise ou galerie, réutilise `BoutonPhoto` sans biais caméra arrière) avec le logo SpotSan comme défaut plutôt qu'un emoji, liste des handicaps réduite à Visuel/Moteur. Bug corrigé au passage : `BandeauEntete` affichait l'URL de l'avatar en texte brut au lieu d'une image. **Découverte notée en §4.4** : les sessions Supabase Auth sont partagées entre toutes les PWA `gibruga.github.io` (même origine) — le compte SpotSan V2 de Gilles s'est rattaché à son compte admin EkoMa existant plutôt qu'à une session anonyme, à trancher si c'est voulu.
- 2026-08-21 — Champ **commentaire libre optionnel** ajouté à `Sanitary_Reviews` (point ouvert du Lot 4 tranché) : 4 commentaires v1 rétro-remplis dans les avis "Paul Hixe" déjà migrés, `get_avis_summary` mis à jour pour le renvoyer.
- 2026-08-21 — **Lot 4 terminé et vérifié** : table `Sanitary_Reviews`, RLS, fonction d'agrégation `get_avis_summary` (testée), `Incident_Reports.user_id` ajoutée, 12 avis migrés vers "Paul Hixe" (approximatif, voir détail dans le Lot 4). **Découverte majeure en cours de route** : les tables `Toilet_Ratings`/`Toilet_Photos`/`Toilet_Equipment_Reports`, décrites à tort en §4.3 comme un schéma abandonné, sont en réalité activement écrites par `report_toilet_feedback` (le vrai chemin d'écriture de v1 en production) — corrigé dans le document. Elles prouvent noir sur blanc le problème de fond du projet : la moyenne v1 n'est pas dédupliquée par appareil, donc modifier son avis biaise la moyenne au lieu de la remplacer. Point ouvert repéré : absence de champ commentaire libre dans le formulaire V2 prévu — à trancher avant le Lot 5.

- 2026-08-21 — **Lot 1 terminé et vérifié de bout en bout** dans le navigateur : schéma `SitInZen_Users` étendu, connexion anonyme Supabase Auth (provider activé par Gilles), Paul Hixe créé, écran d'inscription, bandeau + menu, suppression de compte complète (profil + `auth.users`) via Edge Function `delete-own-account`. Un bug de CORS sur l'Edge Function a été rencontré et corrigé en route (voir §4.1) — pas un problème de fond, juste une étape de mise au point.
- 2026-08-21 — **Lot 0bis lancé et pour l'essentiel terminé** : Node.js LTS installé, scaffold Vite+Svelte 5 en place, composant `EchelleEtat.svelte` créé et vérifié dans le navigateur, service worker/PWA via `vite-plugin-pwa`, workflow GitHub Actions de déploiement configuré (Pages en mode "GitHub Actions"). Le portage du moteur offline-sync est délibérément repoussé au Lot 5 (rien à synchroniser tant que le formulaire n'existe pas) — reste le point de vigilance principal du projet.
- 2026-08-21 — Lancement effectif : dépôt `GiBruGa/SpotSan-V2` créé et poussé (ce document y a été déplacé). Décision de bascule (Lot 9) actée : v1 reste intouchée en production tant que v2 n'est pas testée de façon avancée ; renommage `SpotSan`→`SpotSan-V1` et bascule des utilisateurs de terrain repoussés à ce moment-là, pas maintenant.

- 2026-08-21 — Document créé à partir des retours d'usage v1 et du cadrage donné par Gilles.
- 2026-08-21 — Réponses de Gilles intégrées (1ère vague) : téléphone déclaratif sans OTP (avec `phone_verified` prévu pour plus tard), échelle standard 5 étoiles (avis général) / 5 niveaux pouce-smiley (tout le reste) + Abs/HS/Vide, identifiant utilisateur = UUID interne (pas le téléphone directement). Restent ouverts : libellé état "plein" pour la poubelle, nouveau dépôt vs branche, stack technique, sort des données `Rating_*`/`Equipment` héritées, périmètre des photos par équipement.
- 2026-08-21 — Tous les points de conception actés. Nettoyage des références obsolètes dans le document (§4.6/§5.6 marquées décidées, numéro de lot corrigé §6). Plan de travail en 5 phases ajouté en tête de §7 pour le lancement. Restent ouverts sans bloquer le démarrage : `Incident_Reports.user_id` (recommandation par défaut retenue : ajouter la colonne), anonymisation photos I&V (à trancher avant mise en prod).
- 2026-08-21 — Taxonomies §5.6.2 et §5.6.3 actées : tags confort/équipements resserrés à 5 (siège, lave-main, visibilité distributeurs, poubelle, distributeur papier/essuie-tout) avec 6 tags envisagés mais volontairement non retenus au lancement (2 redondants avec des champs existants, 2 relevant plutôt d'un futur champ "sanitaire automatique", 2 trop subjectifs pour un tag) ; taxonomie Incivilités/Vandalismes (12 tags) établie par Gilles à partir des fréquences terrain, remplace la proposition générique initiale.
- 2026-08-21 — **Objet principal de l'outil clarifié par Gilles et mis en évidence en tête de document** : SpotSan existe d'abord pour collecter des photos d'Incivilités et Vandalismes en vue d'entraîner une IA de détection — priorité absolue sur les autres écrans. §4.6/§5.6 réécrites en conséquence : modèle photo à 3 niveaux (infos critiques PMR avec consigne de cadrage par finalité / confort-équipement à tags optionnels / Incivilités-Vandalismes à tag obligatoire servant de label d'entraînement, taxonomie proposée à valider). Point de vigilance ajouté : anonymisation des personnes identifiables dans les photos I&V, non tranché.
- 2026-08-21 — Stack technique tranchée : **Vite + Svelte**, rupture assumée avec le "tout vanilla" du reste de la suite UrBizia puisque SpotSan est l'outil prioritaire. Point de vigilance identifié et noté (§4.7, Lot 0bis) : le portage du moteur offline/sync est le risque principal du projet, à valider par un test réseau coupé avant de clore ce lot. Seul point encore ouvert : périmètre des photos par équipement (§4.6).
- 2026-08-21 — Réponses de Gilles intégrées (3e vague) : tables `Toilet_*` orphelines migrées vers "Paul Hixe" comme le reste. §4.6 (photos par équipement) et §4.7 (stack technique) ajoutées pour expliquer ces deux points en clair, avec recommandation, en attente de décision.
- 2026-08-21 — Réponses de Gilles intégrées (2e vague) : échelle standard étendue à l'avis général (plus d'étoiles séparées), poubelle = "Débordante" sans "Vide". Audit Supabase effectué : découverte de `SitInZen_Users` (candidate pour le compte SpotSan V2) et de tables `Toilet_*` orphelines d'un schéma antérieur. Gilles a tranché : nouveau dépôt GitHub pour v2 avec redéploiement Pages ; migration des données v1 sans auteur vers un utilisateur placeholder "Paul Hixe" (+33 000 000 001) ; format téléphone standard adopté (§3.2) ; règle "Incivilités et Vandalismes" toujours au pluriel actée ; réutilisation de `SitInZen_Users` confirmée ; pas de second projet Supabase confirmé. Restent ouverts : sort des tables `Toilet_*` orphelines, stack technique, périmètre photos par équipement.
