# MOMENTUM V0.12 — IA en ligne sans inscription

PWA personnelle pour iPhone. Les cinq écrans, la palette, les données `momentum.v1` et le raccourci MOMENTUM Bridge sont conservés. Travail sur `dev/coach-relevance-v0112` ; publication à vérifier séparément.

## Deux modes clairement indiqués

Les conseils guidés fonctionnent immédiatement et hors ligne après installation. Ils répondent aux situations prises en charge, sans prétendre offrir une conversation libre.

La conversation en ligne utilise **Pollinations Classic**, sans compte, clé API, carte bancaire ni abonnement. Active-la dans Coach après avoir autorisé l’envoi des données. L’activation dure jusqu’à la fermeture ou au rechargement de la page ; Revenir aux conseils guidés arrête les nouvelles requêtes. Aucun téléchargement de modèle et aucun accès au GPU ne sont nécessaires. Les anciens modules expérimentaux locaux restent dans le dépôt pour compatibilité historique, mais ne sont plus chargés par le parcours Coach.

Le modèle anonyme annoncé par le fournisseur lors des essais est GPT-OSS 20B, alias `openai-fast`. Pollinations peut changer son modèle. Il ne s’agit pas d’un accès direct à l’API OpenAI.

## Gratuité et disponibilité

La documentation Classic annonce une demande texte à la fois, au moins 30 secondes entre demandes par adresse IP. Une IP partagée peut être limitée plus tôt. Ces limites et la disponibilité peuvent changer : aucun engagement de service.

MOMENTUM ne contient ni clé, ni portefeuille, ni mécanisme de paiement. Une réponse HTTP 402 ou 429 provoque une attente ou un retour guidé ; elle ne déclenche jamais de paiement, d’inscription ou de bascule vers une API payante. Aucun nouvel essai automatique n’est effectué. Les délais locaux sont séparés des données utilisateur et ne constituent pas un quota garanti par le fournisseur. Un message saisi pendant l’attente reste dans le champ, sans requête ni ajout à l’historique.

## Données transmises

Sans activation explicite, aucun appel au service. Après activation : le message courant, jusqu’à six messages récents bornés à environ 1500 caractères au total, et les actions/candidatures pertinentes lorsque la question les concerne. Aucune liste complète envoyée systématiquement. Le nom du profil n’est pas ajouté automatiquement.

Les requêtes partent directement du navigateur vers `https://text.pollinations.ai/openai` en POST JSON. Les prompts ne sont pas placés dans les URL ; cookies et référent ne sont pas envoyés, les redirections sont refusées. Le service externe applique sa propre politique de confidentialité : le traitement n’est pas local et MOMENTUM ne garantit pas la rétention ou l’usage des données par ce fournisseur. L’historique MOMENTUM reste sur l’appareil.

Sources fournisseur : [API Classic et limites](https://raw.githubusercontent.com/pollinations/pollinations/master/APIDOCS.md), [modèle disponible](https://text.pollinations.ai/models), [confidentialité](https://pollinations.ai/privacy), [conditions](https://pollinations.ai/terms).

## Qualité et limites

Le contexte est ciblé selon la demande. Les relances de rédaction conservent leur sujet. Les capacités réelles et les CV dépourvus de faits ont des réponses déterministes avant tout appel distant. Les erreurs du service sont expliquées et les conseils guidés servent de secours pour les demandes couvertes. Aucune fausse réponse libre n’est produite en cas d’échec. Les réponses restent à vérifier : notamment faits personnels, CV et conseils. Voir [AI-EVALUATION.md](AI-EVALUATION.md) pour les générations réelles et leurs limites.

## Calendrier et conservation

Une demande explicite peut préparer une fiche locale ; aucune réponse de modèle ne crée de tâche ni d’événement. L’utilisateur vérifie puis valide une fois Ajouter à Calendrier. Les données et identifiants restent dans `momentum.v1`. Le raccourci existant est réutilisé, sans nouvelle installation. Contrat, durées, alertes et limites Apple : [BRIDGE.md](BRIDGE.md).

La mise à jour renouvelle seulement les caches applicatifs MOMENTUM ; elle n’efface ni les données locales ni les caches des modèles historiques. Aucun message POST distant n’entre dans le cache de la PWA. Un effacement des données du navigateur reste susceptible de supprimer les données locales : les sauvegardes existantes restent disponibles dans Réglages.

## Vérification

`TZ=Europe/Paris node --test tests/*.test.cjs`

Les tests couvrent conservation des données, consentement, POST sans clé ni données en URL, attente sans double requête, refus de paiement, erreurs, interruption, timeout et maintien de la validation Calendrier. Les tests automatiques ne prouvent pas la qualité du modèle : des conversations réelles séparées sont nécessaires. Les essais navigateur sur Mac ne prouvent pas le comportement physique de la PWA installée sur iPhone.
