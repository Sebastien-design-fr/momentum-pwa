# MOMENTUM v0.7 — Apple Bridge (prototype)

Gratuit, sans API ni serveur payant. Publication : remplacer les fichiers du dépôt GitHub Pages, en conservant la structure à la racine. Sauvegarder les données avant toute mise à jour.

## Important
Le bouton **Valider et programmer dans Apple** sauvegarde la tâche localement, puis déclenche l’URL `shortcuts://run-shortcut` avec une entrée JSON (`title`, `start`, `end`, `alert`, `id`, `notes`). Il faut créer le raccourci **MOMENTUM Bridge** une fois dans Raccourcis sur l’iPhone (instructions détaillées dans Réglages). Le raccourci doit analyser le JSON et utiliser l’action Apple « Ajouter un nouvel événement » sans formulaire de confirmation. Les permissions système initiales restent obligatoires.

Momentum ne peut **pas prouver** que le raccourci a bien créé l’événement : contrôler le calendrier sur l’iPhone. Les alertes paramétrables et la déduplication nécessitent une configuration dans Raccourcis et leur disponibilité dépend des actions iOS. Le bouton de secours .ics reste disponible.

Aucune donnée privée ne doit être ajoutée au dépôt public. Open-Meteo gratuit non commercial sous conditions, à revoir avant distribution commerciale.
