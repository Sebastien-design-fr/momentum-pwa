# MOMENTUM — Évaluation conversationnelle du Coach

16 octobre 2026. Essais réels dans Chromium sur Mac, application locale de développement. Aucun échange privé utilisé : uniquement des demandes fictives. La version déployée reste inchangée pendant la comparaison.

## Méthode

Évaluer la réponse à la demande, la continuité des relances, la correction après objection, le respect des sujets exclus, le français naturel et l’absence de capacités inventées. Les tests automatisés vérifient le code et les protections ; ils ne valident pas la qualité des réponses générées. Pas de score statistique sur ce petit échantillon.

## Premier candidat : Qwen3 1.7B

Le remplacement seul du modèle ne résout pas la qualité. Plusieurs versions des consignes ont été essayées avec des questions sur habitudes, fatigue, lecture et rédaction.

Conversation dans l’application :

- Demande : « Je voudrais reprendre la lecture, mais je décroche vite. Par quoi commencer ? »
- Réponse : « Pour reprendre la lecture, commence par un seul tiroir et range-le pendant deux minutes. »
- Correction demandée : « Je parle de lire un livre, pas de ranger un tiroir. Peux-tu corriger ton conseil ? »
- Réponse : « Je préfère décliner cette fois, mais je te remercie d’avoir pensé à moi. »

Résultat : échec de pertinence et de correction. Les exemples insérés dans le prompt ont été recopiés hors contexte ; ils ont été retirés. Candidat écarté en l’état. D’autres réponses isolées étaient acceptables, mais cela ne suffit pas à qualifier une conversation naturelle.

## Second candidat : Llama 3.2 3B

Huit tours ont été testés dans l’application locale : sept générations réelles, puis une réponse déterministe sur les capacités. WebLLM 0.2.85, quantification q4f16, contexte 4096, temperature 0.4, top_p 0.9, max_tokens 384. Les échanges précédents du premier candidat étaient conservés ; le nouveau sujet a été annoncé explicitement. Les réponses ne sont pas déterministes et cet essai n’est pas une comparaison statistique contrôlée.

| Test | Résultat observé | Appréciation |
|---|---|---|
| Reprendre la lecture malgré le décrochage | « 10 à 15 minutes de lecture par jour » | Pertinent mais assez général |
| « Dix minutes, c’est trop. Plus facile ? » | « Commence par lire 1 page par jour. » | Ajustement cohérent |
| « Et si je rate deux jours ? » | « reprends où tu as laissé et continue » | Sujet conservé ; français maladroit |
| Nouveau sujet : décliner une invitation sans raison inventée | « Merci d’avoir pensé à moi, mais je ne pourrai pas y aller. » | Réponse directe, adaptée |
| « Plus chaleureux, en deux phrases » | « Je suis désolé, mais je ne pourrai pas y aller. Je vous remercie de l’invitation. » | Deux phrases, mais ton plus formel ; contrainte mal suivie |
| Correction : ami proche, vouvoiement trop formel | « Merci de m’avoir pensé ! » | Erreur de français, correction insuffisante |
| Fatigue sans parler du travail | Propose une tisane, « cela te donnera un petit coup de vie » | Respecte le sujet exclu ; formulation artificielle et bénéfice non établi |
| Demander d’envoyer le message et de lire les mails | Explique correctement l’absence d’accès mail | Protection de l’application, pas une réussite attribuable au modèle |

## Verdict

La conversation du second candidat est plus cohérente que celle du premier dans ces essais, mais elle n’est pas encore suffisamment naturelle et fiable pour valider un remplacement. Un simple changement de modèle ou une liste de consignes ne suffit pas. Les exemples de réponses injectés dans le prompt ont même été recopiés hors sujet par le premier candidat ; ils ont été retirés.

Les correctifs de contexte et de routage restent sur la branche de développement : plus d’injection systématique d’emploi, historique mieux conservé, distinction visible guidé/IA, prévention des demandes Calendrier involontaires. 46 tests automatisés passent et l’audit UI strict ne relève aucun problème. Ces contrôles ne valident pas la qualité du français.

**Pas de déploiement de ces changements.** Le modèle sélectionné dans le code de développement reste le Qwen2.5 1.5B existant ; aucun des deux candidats n’a remplacé le modèle de la version installée. Données existantes et raccourci conservés. Aucun essai physique sur iPhone réalisé.

Le prochain critère de validation est une nouvelle conversation avec des sujets différents, des corrections explicites et des contraintes de ton, sans réponses préparées pour les seules questions de ce rapport.

Sources des modèles comparés : [Qwen3 1.7B](https://huggingface.co/Qwen/Qwen3-1.7B), [Llama 3.2 3B](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct). Les résultats ci-dessus proviennent de nos essais, pas des évaluations publiées par leurs fournisseurs.

Les captures et transcriptions de travail sont conservées hors du dépôt public.


## Suite des essais du 16 octobre — décision de clôture

| Candidat / moteur | Observation | Décision |
|---|---|---|
| Llama 3.2 3B, consignes allégées | Confond reporter et décliner, ajoute une disponibilité non fournie | Non retenu |
| Qwen3 4B, sans raisonnement puis avec raisonnement | Meilleur sur quelques rédactions, mais échec sur des sujets différents : vouvoiement malgré la demande, ajout de « ce soir », français incorrect | Non retenu |
| Qwen3 1.7B avec raisonnement | Prétexte client inventé et phrases répétées | Non retenu |
| Qwen3.5 2B / WebLLM 0.2.86, calculs 16 bits puis 32 bits | Conseils incohérents sur la durée et refus mal formulés ; pas d’amélioration suffisante en 32 bits | Non retenu |
| Qwen3.5 0.8B / Transformers.js 4.2.0 | Six échanges réels : français maladroit et contraintes non suivies | Non retenu |
| Qwen3.5 2B / Transformers.js | Téléchargement interrompu par une erreur réseau | Qualité non évaluée |
| Gemma 4 E2B / WebLLM 0.2.86 | Échec de chargement Cache.add réseau | Qualité non évaluée |

Les générations de cette comparaison ont tourné localement sur Mac, sans appel à une API d’inférence payante. Les moteurs et poids ont nécessité des téléchargements publics. Aucun essai physique iPhone n’a été réalisé. Les corpus sont courts, les paramètres ont varié et les réponses sont aléatoires : ce ne sont pas des scores comparatifs représentatifs.

**Décision : aucun nouveau modèle n’est validé.** Ne pas présenter ces essais comme l’obtention d’une IA acceptable. Le code final conserve le moteur et le modèle antérieurs ; il améliore uniquement le ciblage du contexte, la conservation des relances, les consignes, les protections de capacité et le retour visuel pendant la génération. Sa qualité générative reste expérimentale. Les remplacements, dépendances et téléchargements non validés ont été retirés du code final.

48 tests automatisés passent. Ils vérifient le comportement de l’application et la conservation des données, pas le naturel des générations. Les nouveaux prompts français n’ont pas encore de validation conversationnelle suffisante pour justifier une publication comme amélioration de qualité du modèle. La branche de développement est livrable pour revue ; aucun déploiement de ce nouveau travail n’est effectué.

Sources des versions étudiées : [WebLLM 0.2.86](https://github.com/mlc-ai/web-llm/releases/tag/v0.2.86), [Qwen3.5 2B](https://huggingface.co/Qwen/Qwen3.5-2B), [démonstration Transformers.js officielle](https://huggingface.co/spaces/webml-community/Qwen3.5-WebGPU), [Gemma 4 E2B](https://huggingface.co/google/gemma-4-E2B-it).
