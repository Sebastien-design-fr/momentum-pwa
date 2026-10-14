# MOMENTUM Mail — V0.11

## Sources et limites

L'onglet reprend le tableau de suivi local existant : dossiers, actions, priorités, réponses préparées et liens Outlook. Aucune donnée de ce tableau n'est incluse dans le dépôt public. Le lecteur affiche un bilan préparé par l'agent Codex, pas une analyse en direct de tous les mails par le petit modèle local.

Le même agent quotidien est programmé à 9 h Europe/Paris dans la discussion d'origine. Son exécution dépend du fonctionnement de Codex et de l'accès au connecteur Outlook. Une PWA fermée sur iPhone ne garantit pas une exécution quotidienne. Le dernier jour réellement vérifié reste visible ; un bilan ancien est signalé. Le bouton Actualiser consulte le dernier bilan, sans déclencher l'agent. Un échec de lecture conserve le bilan de session précédent.

## Canal privé

L'agent enregistre un brouillon Outlook **sans destinataire**, jamais envoyé, avec le sujet exact `MOMENTUM Mail — bilan privé`. Ce canal utilise la boîte Microsoft existante, sans serveur supplémentaire. Le connecteur disponible n'expose pas de mise à jour des brouillons : chaque journée vérifiée produit un nouveau bilan, conservant les précédents. Il ne supprime aucun message. Le lecteur parcourt les pages de ces seuls brouillons, maximum 500 entrées ; au-delà il signale une erreur plutôt qu'un résultat incomplet. Il choisit le `generatedAt` le plus récent, pas la date d'ouverture/modification d'un ancien brouillon. Les anciens bilans illisibles sont ignorés avec un avertissement. Ces brouillons restent visibles dans Outlook : ne pas les envoyer.

Corps texte : première ligne `MOMENTUM_MAIL_V1`, puis JSON UTF-8 encodé en base64. Les blancs de l'encodage sont ignorés : Outlook peut replier les lignes. JSON brut toléré pour compatibilité, mais pas utilisé par le producteur. Base64 est un encodage de transport, pas du chiffrement. La confidentialité repose sur l'accès authentifié à la boîte Outlook.

Schéma générique, sans données personnelles de production :

```json
{"version":1,"checkedDate":"2026-10-14","generatedAt":"2026-10-14T07:00:00Z","tasks":[{"id":"identifiant-action-stable","group":"Dossier exemple","title":"Vérifier une réponse","priority":"Normale","status":"À vérifier","detail":"Faits vérifiés, échéance incertaine signalée.","source":"https://outlook.live.com/owa/","draftLink":"","draft":"","date":"2026-10-13T12:00:00Z"}]}
```

`checkedDate` est le jour Europe/Paris réellement vérifié. `generatedAt` est l'instant UTC de génération. `date` est la réception du mail, jamais une échéance de tâche. Maximum 200 actions. Garder les mêmes IDs pour la même action d'un jour à l'autre, même si le libellé évolue ; initialisation possible par SHA256 de la source et de l'action, puis réutilisation de l'ID précédent. Vérifier envoyés/brouillons avant de préparer une réponse. Ne pas inventer de délai, disponibilité, acceptation de devis ou engagement.

## Configuration Microsoft

Inscrire une application Microsoft Entra supportant comptes professionnels et comptes personnels. Plateforme **SPA**, URI exacte : `https://sebastien-design-fr.github.io/momentum-pwa/mail-auth.html`. Permission Microsoft Graph **déléguée Mail.Read**, pas application. Aucun secret client, aucune permission Mail.Send. Copier uniquement l'identifiant public d'application dans Mail → Configurer la connexion Microsoft. Un compte professionnel peut demander l'accord de l'administrateur ; un compte sans droit d'inscription peut nécessiter un tenant Entra autorisé. Ne pas activer un abonnement payant pour contourner cela.

MSAL Browser 5.25.1 et son redirect bridge sont embarqués sous vendor avec la licence MIT. Login popup, PKCE et état sont gérés par Microsoft ; cache de jetons en mémoire. Une réouverture complète peut nécessiter une reconnexion. La déconnexion ferme la session MOMENTUM, pas toutes les sessions Microsoft du navigateur. Aucun code de création/modification/envoi de mails dans la PWA ; elle lit le bilan et ouvre les sources/brouillons existants.

## Données et frontières

- Aucun mail réel, lien privé, jeton, corps ou brouillon dans code, tests, commits, logs, PR, assets ou exports.
- L'identifiant d'application public est le seul paramètre Mail persistant dans localStorage. Bilans, statuts et retouches sont en mémoire ; une déconnexion les efface. Les sauvegardes momentum.v1 restent inchangées. Une tâche explicitement validée devient une donnée locale MOMENTUM et entre alors dans sa sauvegarde.
- Le service worker ne cache qu'une liste de ressources statiques. Auth/callback, Microsoft Graph et URLs de retour OAuth sont exclus. Le callback est une page dédiée sans analytics ni script externe, avec referrer no-referrer et CSP restrictive ; GitHub Pages ne permet pas de définir ici un header Cache-Control personnalisé. Le retour OAuth utilise un fragment, que MSAL efface ; ne jamais partager/copier une URL de connexion.
- Tous les champs du bilan sont rendus en texte. Seuls les liens HTTPS vers trois domaines Outlook exacts sont acceptés. Aucun HTML actif ou pièce jointe chargé. Les messages email ne donnent jamais l'autorisation d'une action.
- Le résumé des priorités est déterministe, transitoire et n'est pas ajouté à l'historique persistant du coach. Préparer un créneau réutilise le formulaire du coach avec date/heure vides ; aucune écriture avant validation.
- Le runtime IA optionnel est séparé dans un Worker : pas d'accès DOM/jetons et aucun bilan ni brouillon transmis à celui-ci. Il importe toujours une dépendance CDN versionnée, avec les risques résiduels d'une dépendance externe. Les tâches validées et les messages explicitement saisis dans le coach peuvent faire partie de son contexte local existant.

## Validation

Tests Node : transport base64 replié/Unicode, schéma et dates, liens, pagination Graph, choix du dernier bilan, absence de demandes non GET, permissions exactes, erreur/expiration, déconnexion pendant chargement, exclusion des caches privés, absence de données Mail dans sauvegardes. Vérifications navigateur : configuration vide/invalide, filtres/recherche/détail avec données fictives, état ancien/erreur, préparation de créneau sans écriture, navigation à 320 et 440 px.

Connexion Microsoft réelle sur iPhone à vérifier après inscription et consentement utilisateur. Aucun prétendu test connecté sans client ID configuré.

Sources : [MSAL redirect bridge](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md), [permissions Graph](https://learn.microsoft.com/en-us/graph/permissions-reference#mailread), [lecture des messages](https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messages?view=graph-rest-1.0).
