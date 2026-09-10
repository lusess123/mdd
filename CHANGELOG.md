# Changelog

All three public packages share a version. Each new feature links to documentation and an executable demo. Historical demos track the current compatible release.

## [0.2.0] — 2026-09-10

### Added

- Seven standard filters with compact/advanced layouts: text, ID, reference, enum, boolean, number and datetime. Typed enums preserve `false`, numeric zero and string zero; decimal strings retain precision. [Guide](https://mmd.zyking.xyz/docs/#filters) · [Demo](https://mmd.zyking.xyz/playground/embedded/).
- Copyable readonly IDs, continuous row numbers, writable-field trimming and stable pagination snapshots. [Guide](https://mmd.zyking.xyz/docs/#embedded) · [Demo](https://mmd.zyking.xyz/playground/embedded/).
- Reference labels, batching, caching, invalidation, paginated selection, conditional targets and related lists with inherited defaults. [Guide](https://mmd.zyking.xyz/docs/#relations) · [Demo](https://mmd.zyking.xyz/playground/embedded/).
- `MmdResourcePage`, nested CRUD dialogs, related record navigation and `initialOpenView`. The host need not implement resource routing. [Guide](https://mmd.zyking.xyz/docs/#embedded) · [Demo](https://mmd.zyking.xyz/playground/embedded/).
- Query adapters, mutation lifecycle hooks, version storage and unsaved-form protection on dialog close. [Guide](https://mmd.zyking.xyz/docs/#lifecycle) · [Demo](https://mmd.zyking.xyz/playground/embedded/).

### Fixed

- Action buttons keep their accessible name during loading animations and expose busy state, allowing validation failures to be corrected and retried reliably.

- Loading unrelated metadata or switching related tabs no longer reloads the parent record or erases an edit draft.
- Creating from a related list passes writable defaults without reusing the parent's primary key.
- Failed pagination keeps the displayed rows and their sequence numbers consistent.
- Cancelled mutations do not show an error; late reference responses cannot restore invalidated cache entries.

### Compatibility

- Existing `MmdRenderer` usage remains supported; omitting `onOpenView` uses built-in dialogs.
- URL persistence is optional. Related tabs follow `list.persistQuery` or an explicit state adapter; default embedded usage leaves the URL unchanged.
- Shell, menu, auth, database permissions, business audit rules and framework routing remain host responsibilities. No ApplicationShell export.
- Key fields remain hidden by default; `list: true` enables display. Readonly fields are omitted from form writes.
- The new embedded demo uses per-page memory data and the real Engine; the original Product Playground continues to use the deployed database API.

## [0.1.2]

- Fixed row action context and clarified form validation errors.
- [Action guide](https://mmd.zyking.xyz/docs/#section-04) · [Product demo](https://mmd.zyking.xyz/playground/).

## [0.1.1]

- Added JSON formatting and submit-time validation, plus configurable default CRUD actions.
- [Guide](https://mmd.zyking.xyz/docs/#embedded) · [JSON editor demo](https://mmd.zyking.xyz/playground/embedded/).

## [0.1.0]

- First stable contracts, Engine and React renderer packages; Product CRUD, custom fields/actions, bilingual UI and HTTP API integration.
- [Getting started](https://mmd.zyking.xyz/docs/) · [Product demo](https://mmd.zyking.xyz/playground/).
