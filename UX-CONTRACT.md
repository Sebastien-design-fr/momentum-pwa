# UX Contract

## Product context

Compagnon personnel français pour iPhone, cinq écrans : Aujourd’hui, Actions, Coach, Emploi, Réglages. Accessibilité visée WCAG 2.2 AA. Dates stockées YYYY-MM-DD ; heures locales de l’appareil ; instants ISO calculés par Bridge. L’usage de référence est Europe/Paris. Japon et authentification Microsoft non applicables.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Calendar permissions and side effects | BRIDGE.md / bridge.js payload contract | Existing Apple integration contract | 2026-10-14 |
| Local data and backup | README.md / momentum.v1 | Existing product contract | 2026-10-14 |
| Cost and shortcuts | User request: no additional cost, reuse installed Bridge | Explicit task decision | 2026-10-14 |
| Colors and screen redesign | User request to improve interface and colors | Explicit task decision | 2026-10-14 |
| Deletion | Existing local deletion, Calendar unchanged | Existing lifecycle | 2026-10-14 |

## Visual contract

DESIGN.md documents the approved palette and index.html is the runtime token owner. No framework or UI library. Light theme, native Apple-friendly controls, SVG icons, global scrollbar baseline.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select + .field recipes | DESIGN.md | native | browser popup and keyboard |
| Date | Native date/time + MomentumPlanner | BRIDGE.md / planner.js | native | parser tests and browser input |
| Form | fieldError + MomentumPlanner.validate | app.js / planner.js | coach draft / manual planner | calendar-flow tests |
| Scrollbar | Global CSS root and fallback | index.html | forced colors | computed style / screenshot |
| Toast | feedback and feedback-area | app.js | info / persistent recovery | browser live region |
| CRUD | savePlannedAction / action registry / confirmation dialog | app.js / BRIDGE.md | stay in originating screen | calendar-flow tests |

## Dataset navigation

Local arrays are capped at 500 entries by the existing data contract. Home displays three pending actions. Actions retains completed entries after pending ones; no table, remote paging, search or bulk selection. Navigation preserves unsaved field values within the same loaded page. No sensitive task title enters route URLs.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Prepare calendar action | Explicit chat request or planner submit | Editable draft | Same screen | Five fields displayed | Ask for missing fields | Scroll draft into view | planner.js |
| Add calendar action | Ajouter à Calendrier | Validate + local save before launch | Originating screen | Saved locally, Apple request unconfirmed | Keep draft or retry existing ID from Actions | Preserve usable form | BRIDGE.md |
| Cancel draft | Annuler | none | Same screen | No action/event created | none | Previous context | User one-validation requirement |
| Delete local entry | Delete control then dialog confirmation | Modal | Same list | Local deletion | Cancel leaves data unchanged | Restore trigger | Existing lifecycle |
| Import/reset data | Named dialog confirmation | Modal | Réglages | Inline status | Preserve existing data if cancelled | Restore trigger | README.md |

## Overlays and feedback

HTML dialog is the canonical modal: title/description, Cancel initial focus, native focus containment, Escape cancellation, body scroll lock and trigger restoration. Browser alert/confirm/prompt are prohibited. feedback-area is a single dismissible fixed status surface; fields retain actionable errors. Apple system permissions are OS-owned.

## Async and resilience

Calendar side effects are never launched by model text. The same title and start is blocked for new tasks; retries use the existing task ID, preserving the shortcut’s idempotence key. Saved flags mean request launched, not event confirmed. No background Calendar access. Storage failure blocks dispatch. Conversation can be stopped and errors fall back to guided advice. Replaced/imported state invalidates the current draft and stale model replies. Drafts are transient until confirmation; in-page navigation preserves fields. The existing single-device local data store is not a server synchronization service.

## Validation

Forms use novalidate and application errors. Required title, exact date/time, future timestamp, allowed duration/alert, DST validity and duplicates are checked before write. Explicit unsupported durations are never silently rounded. Missing fields are described in text and invalid fields reference the existing error slot. Select/date popup semantics stay OS-owned. No secrets or accounts.

## Verification

Node tests: TZ=Europe/Paris node --test tests/*.test.cjs. Calendar-flow tests execute the actual application code with intercepted external URL dispatch, including one-confirmation, cancellation, duplicates and storage failure. They do not create real Calendar events. Browser checks cover narrow layout, draft editing, keyboard, native popup, cancel dialog, empty/error states and sibling screens. Physical iPhone GPU and keyboard behavior remain user-device checks.


## Coach response contract — V0.12

Deux modes : conseils guidés hors ligne, conversation distante Pollinations Classic. L’activation requiert une case native de consentement puis un bouton explicite, pour la session uniquement. Aucun appel au fournisseur avant cette activation. L’interface décrit les messages/contexte transmis et la limite d’une demande toutes les 30 secondes par IP. Aucun compte ni secret, aucune carte, aucun paiement automatique. Les réponses sont traitées hors de l’appareil selon les conditions du fournisseur.

`input[type=checkbox]` est la recette native partagée pour les tâches et le consentement. `.task-check` est la variante compacte ; `.check-field` contient un libellé long, avec cible d’au moins 44 px. Palette et contrôles existants conservés.

Une demande pendant le délai local reste dans la saisie et n’entre pas dans l’historique. HTTP 402/429 respecte Retry-After, sans paiement et sans essai automatique. Une panne affiche clairement le recours aux conseils guidés pour les sujets couverts. Une rédaction ou question libre non couverte reste en échec explicite ; pas de réponse inventée de secours. Arrêter interrompt la requête côté navigateur ; Revenir aux conseils guidés désactive les nouveaux envois. Le chargement du service n’affiche jamais une disponibilité garantie.

Le modèle reçoit un historique borné et uniquement les données pertinentes. Les courts ajustements conservent le sujet sur plusieurs tours. Les capacités réelles et les CV sans faits sont traités localement. Le planificateur et l’écriture Calendrier restent entièrement déterministes, avec la même validation explicite avant Raccourcis. Les données utilisateur et leur format sont conservés.
