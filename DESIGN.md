---
version: alpha
name: MOMENTUM
colors:
  primary: "#2767A8"
  background: "#F3F7F8"
  text: "#13222B"
  muted: "#566B78"
  calendar: "#A85032"
  success: "#39796C"
  danger: "#A13E28"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  display:
    fontFamily: "ui-rounded, SF Pro Rounded, -apple-system, BlinkMacSystemFont, sans-serif"
rounded:
  control: "10px"
  field: "8px"
  calendar: "12px"
  priority: "20px"
spacing:
  page: "22px"
  section: "22px"
components:
  button:
    height: "48px"
  field:
    height: "48px"
    textColor: "{colors.text}"
  muted-copy:
    textColor: "{colors.muted}"
  calendar-marker:
    textColor: "{colors.calendar}"
  completed-progress:
    backgroundColor: "{colors.success}"
  danger-button:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
---
# MOMENTUM

## Overview

Carnet de route personnel sur iPhone : convertir une intention en un prochain pas puis en un créneau. Le registre est celui d’un outil quotidien, pas d’une page commerciale. L’utilisateur francophone dispose d’un iPhone 16 Pro Max et demande une nouvelle palette. La signature est la fiche de créneau à liseré cuivre, seule surface expressivement différente. Éviter les statistiques géantes, les dégradés de fond et la multiplication des cartes identiques.

Propriétaire des tokens : CSS `:root` de `index.html` (modèle B). Ce fichier documente les valeurs acceptées. Mapping : primary → --blue / boutons, liens, focus ; background → --paper / page ; text → --ink ; muted → --sub ; calendar → --copper / fiche de rendez-vous ; success → --jade / progression et tâches terminées. Danger → bouton de suppression et erreurs. Radius et espacement sont les recettes des classes partagées du même fichier. Les styles des cinq écrans consomment ces propriétaires, sans bibliothèque de thème parallèle.

## Colors

Papier gris bleuté, encre ardoise et bleu d’action. Le cuivre indique un créneau à confirmer, pas une erreur ; le vert indique une progression accomplie. Les échecs comprennent toujours du texte. Le thème clair est choisi explicitement pour cette version ; le contraste forcé reste sous contrôle du système. Les anciennes icônes d’installation sont conservées pour garder l’application reconnaissable.

## Typography

Corps système Apple à 16 px ; titres arrondis 22–30 px. Les textes sont français, courts et alignés à gauche. Aucune police téléchargée, donc pas de saut de police et fonctionnement hors ligne. Seule la marque conserve sa graphie en capitales.

## Layout

Largeur maximale 680 px, gouttière 22 px ou 16 px sur téléphone étroit. Les cinq écrans utilisent le défilement naturel du document. Navigation fixe en bas, marges de sécurité iPhone ; les champs disposent d’une marge de défilement pour le focus. Les champs de date/heure et durée/alerte forment deux colonnes, puis une colonne sous 350 px. La navigation retrouve ses cinq destinations : Aujourd’hui, Actions, Coach, Emploi et Réglages.

## Elevation & Depth

Sections planes et séparateurs discrets. La priorité est une surface bleutée. La fiche de créneau est blanche avec un liseré cuivre. Seul le message global fixe et le dialogue s’élèvent au-dessus du document.

## Shapes

Boutons 10 px, champs 8 px, fiche calendrier 12 px, priorité 20 px. Les rayons matérialisent des rôles, pas une décoration identique sur chaque zone.

## Components

Boutons natifs, emphasis primaire / secondaire / contour, danger réservé à la confirmation finale d’une suppression. Hover, focus et pressed sont visibles ; disabled retire l’action. Les entrées, selects, dates et heures sont natifs : leur fenêtre et leur langue sont celles du système, acceptées pour l’usage iPhone ; seuls les libellés de l’application sont contrôlés en français.

Le dialogue HTML modal assure l’inertie du fond et le focus ; Annuler reçoit le focus initial et Échap annule. Les erreurs restent dans le formulaire ; un message global unique et fermable annonce le résultat. Les scrollbars sont globalement thémées, visibles et compatibles avec les couleurs forcées.

Icônes SVG cohérentes, traits 1.8 px, labels texte toujours présents dans la navigation. Les transitions ne décorent pas le chargement ; la préférence de réduction du mouvement désactive les transitions et le défilement animé.

## Do's and Don'ts

- Afficher les cinq paramètres réels du créneau avant validation.
- Conserver données, identifiants et passerelle existante.
- Ne jamais annoncer qu’un événement Apple est confirmé sans preuve.
- Ne jamais déclencher Raccourcis depuis une génération seule.

## V0.12 — activation de l’IA en ligne

L’identité et les cinq écrans sont conservés. Le consentement réutilise le contrôle checkbox natif, avec la recette partagée `input[type=checkbox]` et la variante de libellé long `.check-field` (44 px minimum). Les boutons, statuts aria-live et détails reprennent les propriétaires existants ; aucune nouvelle couleur ni modalité visuelle. Le mode guidé et le mode distant sont nommés explicitement.
