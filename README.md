MOMENTUM v0.8 — PWA iPhone.

Fonctionnement visé : l'utilisateur valide une tâche dans MOMENTUM, puis MOMENTUM Bridge reçoit les données et demande à Raccourcis de créer un événement Apple Calendrier.

Vérification en cours : confirmer sur un iPhone réel que le raccourci reçoit effectivement le JSON, sait extraire title, start, end et notes, puis enregistre un événement dans le calendrier sélectionné. Les alertes configurables et la détection de doublons ne sont pas encore garanties.

Limitations : une PWA n'a pas d'accès direct à EventKit ; l'ouverture d'un raccourci n'est pas une preuve que l'événement a été créé. L'installation et les autorisations initiales du raccourci sont nécessaires. Aucun service payant n'est requis. Les informations personnelles de l'utilisateur ne doivent pas être déposées dans ce dépôt public.
