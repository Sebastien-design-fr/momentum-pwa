# MOMENTUM AI — V0.3

Application PWA personnelle gratuite pour iPhone. Déploiement : GitHub Pages, branche `main`, dossier racine.

## Nouveautés
- Saisie de tâches par dictée **native du clavier iPhone** ou texte libre. Aucun service vocal payant.
- Reconnaissance simple des dates, jours de la semaine et heures (règles locales, pas une IA générative).
- Suggestions météo Open-Meteo pour les tâches extérieures, sur demande et connexion Internet. Critères approximatifs, sans garantie sur les conditions réelles.
- Validation manuelle avant enregistrement, puis export `.ics` par tâche datée avec alerte 30 min avant. **L'utilisateur doit ajouter le fichier au calendrier.**
- Liste des tâches planifiées sur l'accueil.

## Limitations importantes
- Pas de notifications push autonomes ni de surveillance météo lorsque l'application est fermée.
- Le calendrier iOS peut ne pas ouvrir directement un fichier .ics téléchargé ; passer par Fichiers ou l'import calendrier si nécessaire.
- Données locales uniquement dans le navigateur ; exportez une sauvegarde avant de supprimer les données du site.
- Open-Meteo : l'accès gratuit standard est réservé aux usages non commerciaux sous conditions ; avant toute commercialisation, obtenir une licence et revoir les mentions légales/conditions.
- GitHub Pages ne doit pas servir de plateforme pour exploiter un SaaS commercial.

## Mise à jour
Remplacer les fichiers à la racine de `momentum-pwa` par ceux de cette version. La sauvegarde et les tâches V0.2 sont conservées (clé `momentum.v1`, enrichie avec des dates facultatives).
