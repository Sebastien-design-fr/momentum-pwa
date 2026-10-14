# UX Contract

## Product context

Compagnon personnel français pour iPhone, six écrans : Aujourd’hui (Jour dans la navigation), Actions, Coach, Emploi, Mail, Réglages. Accessibilité visée WCAG 2.2 AA. Dates stockées YYYY-MM-DD ; heures locales de l’appareil ; instants ISO calculés par Bridge. L’usage de référence est Europe/Paris. Japon non applicable. Connexion Mail Microsoft déléguée, sans serveur supplémentaire, selon MAIL.md.

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

Forms use novalidate and application errors. Required title, exact date/time, future timestamp, allowed duration/alert, DST validity and duplicates are checked before write. Explicit unsupported durations are never silently rounded. Missing fields are described in text and invalid fields reference the existing error slot. Select/date popup semantics stay OS-owned. Microsoft Mail settings use the same fieldError helper; no password or secret field exists.

## Verification

Node tests: TZ=Europe/Paris node --test tests/*.test.cjs. Calendar-flow tests execute the actual application code with intercepted external URL dispatch, including one-confirmation, cancellation, duplicates and storage failure. They do not create real Calendar events. Browser checks cover narrow layout, draft editing, keyboard, native popup, cancel dialog, empty/error states and sibling screens. Physical iPhone GPU and keyboard behavior remain user-device checks.

## Mail contract (V0.11)

Business source: user requests daily Outlook dashboard integration; MAIL.md defines private transport, schema, delegated permissions, execution limits and retention. mail.js owns snapshot validation, authentication and read-only Graph transport. mail-ui.js owns the reusable mail list/detail/filters and transient status/draft edits; all results use shared feedback/fieldError. Existing action registry/navigation and showCoachDraft are reused. Native dates/selects remain unchanged.

No table selection or bulk action. Mail renders a bounded report (200 actions), local search with a visible clear button, priority order, and stable selection while filtering. Empty/no-results states include recovery. Detail focuses its heading after explicit selection. Config → register public client ID → login popup → load last report. Invalid IDs remain in the form; connection refusal shows retry. Refresh is duplicate-guarded, timeout-bounded per request and stale-safe by session generation. Error preserves the old in-memory report. Daily checking is performed by the existing Codex automation at 9 h Europe/Paris when its environment is available; PWA refresh reads the latest report, not the inbox itself. Last actual checked date is always visible.

Logout clears report, edits, local statuses and its transient coach summary/unedited prepared draft; it does not revoke all Microsoft browser sessions or delete user-validated tasks. Unsaved reply edits explicitly last for this session only. No mail body enters persistent coach history, local backup or service-worker cache. Read-only Mail.Read is broader than just report access and is disclosed. No Mail.Send or PWA write endpoint. Preparing a calendar entry has blank date/time and no write until the canonical confirmation.

Verification evidence: tests/mail.test.cjs and tests/mail-ui.test.cjs. Physical Microsoft login/consent on iPhone remains dependent on the user's app registration. Fixtures for visual verification are fictional and stay outside the published repository.
