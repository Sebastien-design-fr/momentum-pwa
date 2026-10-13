# MOMENTUM — PWA iPhone (prototype 0.1)

Prototype **sans API payante** : tâches, suggestions locales, suivi des candidatures et sauvegarde JSON. Fonctionne hors ligne après chargement. Les données sont stockées **sur l'appareil uniquement** (`localStorage`) : pas de synchronisation ni de compte, pas d'IA conversationnelle, de recherche d'emploi automatique ou de notifications push dans cette version.

## Installation sur iPhone, gratuitement

1. Créer un dépôt GitHub **public** nommé `momentum-pwa` (ne jamais y ajouter des données personnelles ou des clés API).
2. Ajouter les fichiers de ce dossier **à la racine** du dépôt (`index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`).
3. Dans **Settings → Pages**, sélectionner **Deploy from a branch**, `main` et `/ (root)`, puis enregistrer.
4. Ouvrir l'URL GitHub Pages `https://VOTRE-PSEUDO.github.io/momentum-pwa/` dans **Safari sur iPhone**.
5. Toucher **Partager → Sur l'écran d'accueil → Ajouter**.

Tester localement sur Mac : `python3 -m http.server 8000`, puis ouvrir `http://localhost:8000`.

## Précautions

- Les informations sont uniquement enregistrées dans le navigateur ou dans la PWA, et peuvent disparaître si ses données sont effacées. Le bouton **Exporter ma sauvegarde** permet de conserver un fichier JSON privé.
- Ne pas mettre ton CV, ton historique personnel ou une clé API dans un dépôt public.
- Les notifications iPhone, la synchronisation et les agents autonomes nécessiteront des composants supplémentaires et ne sont **pas** simulés ici.
