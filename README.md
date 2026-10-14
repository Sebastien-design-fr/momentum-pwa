# MOMENTUM v0.10 — PWA iPhone

Un accueil centré sur une prochaine étape, trois actions prioritaires, et un coach adapté aux tâches et candidatures existantes. Les cinq écrans, sauvegardes et la passerelle Calendrier restent disponibles. Les données conservent la clé `momentum.v1` et leurs identifiants.

## Coach sans nouveau raccourci

Les **conseils guidés** fonctionnent immédiatement, y compris hors ligne après installation de la PWA. Ils utilisent les échéances, les tâches non terminées, les candidatures à suivre, le temps disponible et le ton choisi.

La **conversation IA locale expérimentale** s’active dans Coach → « Conversation IA sur cet appareil ». Premier téléchargement de environ 900 Mo : préférer le Wi-Fi. Aucun compte, abonnement, clé API ou serveur d’inférence. Les messages et le contexte sont traités localement ; les téléchargements techniques viennent des hébergeurs publics du moteur et du modèle.

Moteur WebLLM **0.2.85**, chargé à la demande depuis `esm.run`. Modèle **Qwen2.5-1.5B-Instruct**, quantifié en q4f16 si le GPU accepte `shader-f16`, sinon q4f32. Fenêtre de contexte 2048 tokens, historique et données volontairement limités.

Le modèle se recharge en mémoire à chaque ouverture. Son cache peut être conservé par le navigateur, mais Safari peut l’évacuer. Le chargement dépend du réseau et des caches disponibles ; la conversation IA hors ligne après fermeture n’est pas garantie. « Revenir aux conseils guidés » libère le modèle de la mémoire sans supprimer tâches ni échanges.

## Limites Apple et qualité

Safari 26 prend en charge WebGPU, mais cela ne garantit pas l’exécution de ce modèle sur chaque iPhone : mémoire, disponibilité du GPU, onglets et version du navigateur peuvent limiter ou interrompre le chargement. Une absence de GPU ou une erreur conserve les conseils guidés. Il n’y a pas d’accès direct à Apple Intelligence depuis cette PWA.

Ce petit modèle peut se tromper ou donner une réponse peu utile. Les essais réels ont montré qu’il peut inventer des détails dans une accroche de CV malgré les consignes : la réponse doit être vérifiée et corrigée avant réutilisation. Une indication le rappelle au-dessus de la saisie en mode IA. Les réponses ne créent aucune tâche ni événement. « Préparer une action depuis mon message » transfère uniquement le dernier message au planificateur ; l’utilisateur vérifie et valide la proposition. Le raccourci Calendrier existant reste utilisé, sans nouvelle installation.

Le fonctionnement de l’IA doit encore être validé **dans la PWA installée sur l’iPhone 16 Pro Max de l’utilisateur**. Un viewport mobile vérifie la mise en page, pas le GPU ni la mémoire d’iOS.

Sources techniques : [Safari 26 / WebGPU](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [WebLLM](https://webllm.mlc.ai/docs/user/get_started.html), [modèle Qwen2.5](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct).

## Calendrier et données

MOMENTUM Bridge est livré sous forme de raccourci Apple signé, installable depuis Réglages. La validation transmet titre, créneau et alerte sans ressaisie. Création testée sur macOS Sequoia 15.7.2 ; lancement depuis l’iPhone confirmé par l’utilisateur. Le coach ne modifie pas les événements Apple existants.

Installation, contrat et limites : [BRIDGE.md](BRIDGE.md).

La mise à jour remplace les fichiers PWA et renouvelle uniquement les anciens caches MOMENTUM. Elle conserve les caches du modèle et des autres applications. Un effacement des données du navigateur reste susceptible de supprimer les données locales ; exporter une sauvegarde depuis Réglages permet de les conserver ailleurs.

## Vérification

```sh
TZ=Europe/Paris node --test tests/*.test.cjs
python3 shortcuts/build_bridge.py
python3 shortcuts/test_shortcut_structure.py
```

Les tests couvrent conservation des données V0.8.1, dates/durées/alertes Bridge, priorités, contexte de conversation, conseils, streaming, interruption, absence de WebGPU, échec de chargement et protection des caches. La génération réelle est vérifiée séparément dans le navigateur : les doubles de test ne prouvent pas la compatibilité iOS.

Vérifications manuelles réalisées : chargement et rechargement du modèle Qwen2.5-1.5B, génération réelle, interruption et retour aux conseils guidés dans le navigateur Chromium du Mac ; navigation et formulaires à 320 et 440 pixels de large ; action terminée retirée de l’accueil mais conservée dans Actions. Les 13 tests automatisés passent. Aucun de ces essais ne valide la mémoire ou le GPU de l’iPhone.


## V0.10 : du coach au créneau

Écris « Ajoute appeler le garage demain à 15 h, pendant 30 minutes, alerte 15 minutes avant ». Le coach affiche directement une fiche éditable avec titre, date, heure, durée et alerte. Tu peux compléter une demande incomplète par « demain à 15 h ». Le bouton Ajouter à Calendrier valide une seule fois et transmet au raccourci existant. La préparation des demandes explicites utilise un analyseur local déterministe ; elle ne nécessite pas de télécharger le modèle génératif. Le modèle reste utilisé pour les conversations libres et demeure expérimental.

Le créneau est vérifié avant toute écriture et ouverture Apple : date/heure réellement existantes, créneau futur, valeurs acceptées par le raccourci, titre non vide. Les durées disponibles restent 30/60/90/120 minutes et les alertes 0/15/30/60/1440. Aucune valeur demandée hors contrat n’est arrondie silencieusement. Une tâche identique au même début est bloquée ; Actions permet de renvoyer la tâche existante, avec le même identifiant, si Raccourcis n’a pas pu être ouvert.

Une fiche n’est pas une tâche enregistrée : Annuler ne crée rien. Les demandes complexes ou ambiguës doivent être corrigées dans la fiche. Pas d’accès direct à Calendrier, de détection générale des conflits avec les autres événements, ni d’exécution silencieuse en arrière-plan. Les autorisations Apple peuvent apparaître ; le résultat reste à vérifier dans Calendrier.

Nouvelle palette claire gris bleuté / ardoise / bleu, fiche calendrier cuivre, progression verte. Les cinq écrans, données momentum.v1, identifiants et fichier signé Bridge sont conservés. DESIGN.md et UX-CONTRACT.md documentent les choix. Les formulaires, confirmations, erreurs et actions utilisent les primitives partagées ; les dates et listes gardent les contrôles natifs iPhone.

Validation V0.10 : 26 tests Node, dont exécution du code complet avec interception de l’ouverture externe. Aucun de ces tests ne crée un événement Apple. Audit statique Premium strict et lint DESIGN.md exécutés séparément. Contrôle navigateur des clarifications, champs modifiables, annulation, clavier, confirmations et vues 320/440 px. Le raccourci demeure celui déjà testé et confirmé par l’utilisateur ; le nouveau parcours dans la PWA installée reste à essayer sur l’iPhone.

## V0.11.1

Retrait de l’onglet Mail et de la configuration Microsoft à la demande de l’utilisateur. Navigation à cinq destinations, bibliothèque Microsoft, callback et modules Mail retirés. Les données momentum.v1, le Coach et le Bridge Calendrier sont conservés. Le runtime IA optionnel reste dans son Worker séparé et le cache applicatif garde sa liste explicite de ressources statiques.

Le tableau de bord email et son agent quotidien restent indépendants dans leur discussion d’origine. MOMENTUM n’a plus de connexion à la messagerie.
