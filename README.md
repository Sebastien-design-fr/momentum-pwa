# Momentum AI — V0.6

PWA gratuite pour iPhone ; aucun service IA ou notification payante. Mise à jour depuis V0.5 conservant `localStorage` (`momentum.v1`).

## Nouveautés
- Export groupé des tâches datées non terminées dans `momentum-planning.ics` ; téléchargement dans Fichiers, import et validation Apple nécessaires.
- Mention locale « fichier calendrier généré » (ne signifie **pas** ajouté au calendrier).
- Durées et délais des alertes conservés dans les événements exportés.
- Passerelle Raccourcis conservée ; elle ne transmet actuellement **que le titre** et demande un raccourci configuré sur l'iPhone.

## Limites importantes
- Pas de lecture ni de modification d'événements Apple, ni de confirmation d'import possible depuis une PWA.
- L'import `.ics` dépend de la version iOS et peut nécessiter d'ouvrir le fichier dans Fichiers ou de l'envoyer par mail. Un nouvel import peut créer des doublons.
- Pas de notifications automatiques de la PWA lorsque fermée ; les alertes viennent d'Apple **après import**.
- Aucun calendrier / raccourci n'est créé automatiquement.
- Météo gratuite Open-Meteo réservée à usage non commercial sous conditions. À remplacer avant toute commercialisation.

## Publication
Exporter une sauvegarde dans Réglages puis remplacer les fichiers à la racine de GitHub Pages. Ne pas envoyer de données privées sur un dépôt public.
