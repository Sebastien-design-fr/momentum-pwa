# MOMENTUM Bridge — état de développement

## Analyse de la V0.8
PWA statique sans serveur ni dépendances. Données dans localStorage, clé momentum.v1.
La validation du planificateur crée la tâche puis ouvre shortcuts://run-shortcut.
Aucun raccourci livré dans le dépôt. bridgeLaunched signifie seulement une tentative de lancement.
Le choix d'alerte 0 était remplacé par 30 à cause de ||30.
Aucune modification d'interface ou de clé de stockage dans cette branche.

## Implémentation
bridge.js centralise et valide le contrat. Les clés historiques title/start/end/alert/id/notes restent compatibles.
Les nouvelles clés startISO/endISO/alertISO fixent les instants UTC, duration et version précisent le contrat.
Le raccourci final doit préférer les dates ISO pour éviter les ambiguïtés de changement d'heure.
Les heures locales inexistantes sont refusées avant la sauvegarde.
Une erreur de stockage bloque la transmission et laisse la proposition disponible.
Aucun serveur, abonnement, export manuel de tâches ou accès iCloud avec identifiants.
Supprimer/cocher une tâche MOMENTUM ne modifie pas un événement Apple existant.

## Raccourci importable et iCloud
Apple documente le lancement avec texte :
https://support.apple.com/en-ke/guide/shortcuts/apd624386f42/ios
Apple documente la synchronisation des raccourcis entre appareils du même compte :
https://support.apple.com/guide/shortcuts-mac/sync-shortcuts-apdb3a4240b0/mac
Apple documente la signature d'un fichier existant :
https://support.apple.com/en-gb/guide/shortcuts-mac/apd455c82f02/mac

Versions cibles indiquées : iOS 26.6.2 et macOS Sequoia 15.7.2.
Inspection de Raccourcis sur le Mac : Ajouter un nouvel évènement propose bien
Au moment de l’évènement, 15 minutes, 30 minutes, 1 heure et 1 jour avant,
ainsi que le réglage Afficher la feuille de composition. Les branches par alerte sont donc
une piste concrète sur Mac ; leur fonctionnement sur iPhone reste à valider.
Un prototype distinct « MOMENTUM Bridge — développement » a été créé pour inspecter les actions.
Il est incomplet et ne doit pas être utilisé comme passerelle de production.
L’export signé d’une action de référence a été récupéré après un délai ; il ne constitue pas le Bridge.

La commande shortcuts sign est disponible dans cet environnement. Elle signe un raccourci existant ;
elle ne fournit pas de commande de création de ses actions.
Aucun .shortcut signé ou lien iCloud testé n'est livré à ce stade.
Un fichier plist construit avec des identifiants privés non vérifiés ne serait pas une garantie d'importation.
Étape restante : construire et exporter le raccourci dans Raccourcis Apple, tester son import sur iPhone,
puis signer l'export pour distribution. La synchronisation iCloud du raccourci n'est pas celle des données
localStorage MOMENTUM. Choisir un calendrier iCloud si les événements doivent apparaître sur Mac et iPhone.

## Contrat du raccourci à valider sur appareil
1. Recevoir le texte JSON et obtenir son dictionnaire. Refuser une version inconnue ou un champ manquant.
2. Extraire title, id, startISO, endISO, alert et notes. Convertir les instants ISO en dates.
3. Choisir une fois le calendrier de destination, sans demander une sélection à chaque exécution.
4. Chercher dans ce calendrier un événement avec la note exacte Momentum-ID: id.
   Si les filtres de notes ne sont pas disponibles, chercher sur l'intervalle début/fin puis comparer
   explicitement les notes. Ne pas se contenter du titre, et ne pas limiter la recherche au premier résultat.
5. Si déjà présent, terminer sans créer de doublon.
6. Ajouter un événement avec dates, titre et notes, et désactiver l'écran de composition.
7. Vérifier les alertes : si la valeur dynamique n'est pas acceptée, utiliser des branches par valeur
   0/15/30/60/1440 avec actions configurées. Si cela n'est pas disponible sur la version cible,
   l'exigence d'alertes variables reste non satisfaite ; ne pas remplacer silencieusement par une valeur fixe.
8. Accorder les permissions système une fois. Aucune nouvelle saisie ou validation métier à chaque tâche.

La PWA n'accède pas directement à EventKit. L'ouverture d'une URL ne prouve pas une écriture dans Calendrier.
iOS peut afficher un dialogue de lancement ou d'autorisation ; le code web ne peut le supprimer.
Aucune exécution automatique en arrière-plan n'est implémentée.

## Validation
TZ=Europe/Paris node --test tests/bridge.test.cjs : 4 tests passent.
node --check app.js : passe.
Tests : toutes les durées/alertes, alerte zéro, URL/JSON exacts, Unicode, minuit,
dates impossibles et changements d'heure.
Non testé : navigation réelle PWA→Raccourcis, import/signature, écriture Calendrier,
alertes et absence de doublons dans Apple, permissions refusées et synchronisation iCloud.
Recette iPhone : tester chaque alerte, deux tâches de même titre avec IDs distincts,
deux exécutions du même ID, refus de permission, calendrier iCloud, changement d'heure.
Ne pas fusionner/déployer avant cette recette. main et la version installée restent inchangées.
