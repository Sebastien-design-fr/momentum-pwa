MOMENTUM v0.8.1 — PWA iPhone.

MOMENTUM Bridge est livré sous forme de raccourci Apple signé, installable depuis Réglages. La validation transmet le titre, le créneau et l’alerte sans ressaisie. Tests de création réalisés dans Calendrier sur macOS Sequoia 15.7.2 ; le lancement depuis la PWA iPhone reste à vérifier sur iOS 26.6.2.

Installation, contrat, tests et limites : BRIDGE.md. Aucun service payant ; données conservées sous momentum.v1. La mise à jour remplace les fichiers PWA et renouvelle uniquement les anciens caches MOMENTUM.

Tests JavaScript : TZ=Europe/Paris node --test tests/*.test.cjs
Tests du générateur : python3 shortcuts/build_bridge.py puis python3 shortcuts/test_shortcut_structure.py
