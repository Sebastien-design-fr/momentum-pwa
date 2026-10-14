# MOMENTUM Bridge — raccourci importable

Le fichier signé `shortcuts/MOMENTUM Bridge.shortcut` crée un événement à partir du JSON transmis par la validation MOMENTUM. Le titre utilise la vraie valeur title ; il ne contient pas le texte fixe « Titre ». Les cinq alertes sont configurées par branches à égalité exacte. Aucun réseau, script, abonnement ou saisie supplémentaire dans le raccourci.

## Installer
Ouvrir le fichier signé dans Raccourcis, conserver le nom exact MOMENTUM Bridge et remplacer l'ancienne version si nécessaire. Un seul raccourci doit porter ce nom.
Le raccourci utilise le calendrier par défaut de chaque appareil. Choisir un calendrier iCloud pour synchroniser les événements.
La synchronisation iCloud de Raccourcis doit être activée sur Mac et iPhone avec le même compte Apple.
L'installation et les autorisations initiales sont nécessaires. Ne pas lancer le raccourci seul pour créer une tâche : sa donnée d'entrée vient de MOMENTUM.

## Contrat
Texte JSON contenant title, id, start, end et alert.
Dates V0.8 start/end : YYYY-MM-DD HH:mm, heure locale.
Lorsque startISO/endISO sont présents, ils ont priorité et fixent les instants UTC.
Les alertes acceptées sont 0, 15, 30, 60, 1440 minutes.
Les notes sont construites par le raccourci : Momentum-ID: id.
La recherche de doublons utilise les notes exactes et la date de début, dans tous les calendriers accessibles.
Un champ obligatoire manquant, une date illisible ou une alerte non acceptée arrête le raccourci.
Le raccourci ne met pas à jour les événements existants et ne propage pas les suppressions ou les coches MOMENTUM.
Un changement de créneau du même identifiant n'est pas traité comme une mise à jour.

## Validation réelle, 14 octobre 2026
macOS Sequoia 15.7.2 :
- Import du fichier signé réussi ; raccourci installé sous MOMENTUM Bridge.
- Lancement par shortcuts://run-shortcut avec input=text, identique au protocole de la PWA.
- Titre TEST MOMENTUM — Garage & café correctement affiché.
- Événement du 15 octobre, 18:10–18:40 ; durée 30 minutes ; notes avec l'identifiant reçu.
- Alertes vérifiées dans les événements Apple : au début, 15 minutes, 30 minutes, 1 heure, 1 jour avant.
- Durée 90 minutes et conversion ISO UTC vers l'heure locale vérifiées.
- Après correction du filtre, deux lancements d'un nouvel identifiant conservent un seul événement.
- Alerte invalide 115 : aucun événement créé.
- Destination constatée sur ce Mac : Travail, appartenant à iCloud.
- Les six événements fictifs créés pendant la recette ont été supprimés ; aucun événement utilisateur supprimé.
- Signature du fichier final vérifiée et contenu relu : cinq égalités exactes, références du filtre présentes.
- 5 tests de structure passent ; 4 tests JavaScript de transmission passent.

Non vérifié : lancement depuis la PWA sur iOS 26.6.2, retour à la PWA, livraison effective d'une notification, refus/révocation des permissions et synchronisation sur l'iPhone.
Les permissions et dialogues système Apple peuvent imposer une interaction initiale. L'ouverture du raccourci n'est pas une preuve de création pour la PWA ; le statut local reste « non confirmé ».

## Sources et reproduction
MOMENTUM Bridge.plist : source lisible du fichier exporté par Apple, sans données de tâches personnelles.
build_bridge.py : générateur sans dépendance tierce ; écrit seulement dans shortcuts/draft.
test_shortcut_structure.py : contrôles des références, groupes, champs, alertes et filtre.
Commande : python3 shortcuts/build_bridge.py puis python3 shortcuts/test_shortcut_structure.py.
Pour distribuer une nouvelle génération, signer le fichier draft avec shortcuts sign, importer et reprendre les tests Apple. La signature seule ne valide pas le comportement.
Ne pas modifier directement un fichier signé : sa signature deviendrait invalide.

## PWA et données
Clé localStorage momentum.v1 conservée, sans migration. Les tâches, offres, préférences et historique existants restent dans leur origine actuelle.
Le correctif PWA de cette branche conserve l'alerte 0 et bloque la transmission si la sauvegarde échoue.
La V0.8 actuellement installée remplace encore le choix 0 par 30 si elle n'a pas reçu ce correctif ; le raccourci ne peut pas retrouver une valeur perdue dans le JSON.
La mise en production V0.8.1 est suivie dans la PR #1. La publication conserve la clé momentum.v1 et renouvelle seulement les anciens caches MOMENTUM. Les réglages existants proposent désormais le fichier importable dans la même carte Bridge.
Le service worker inclut bridge.js ; le fichier de raccourci n'est pas mis en cache pour permettre les mises à jour d'installation.

Références Apple :
- https://support.apple.com/en-ke/guide/shortcuts/apd624386f42/ios
- https://support.apple.com/guide/shortcuts-mac/sync-shortcuts-apdb3a4240b0/mac
- https://support.apple.com/en-gb/guide/shortcuts-mac/apd455c82f02/mac
