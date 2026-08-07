# Configuration

Reference for every setting contributed by the extension (`phpNamespaceRefactor.` prefix), pointing to the code that reads each one. Useful when investigating "the extension isn't respecting setting X" — start with the class listed.

All keys are centralized in `ConfigKeys` (`src/domain/workspace/ConfigurationLocator.ts`). No other place in the codebase references a setting name as a loose string — if a key needs renaming, this is the only spot to change (besides `package.json`).

| Setting | Key (`ConfigKeys`) | Type | Default | Read by |
|---|---|---|---|---|
| `phpNamespaceRefactor.ignoredDirectories` | `IGNORED_DIRECTORIES` | `string[]` | `["/vendor/", "/var/", "/cache/"]` | `WorkspaceIndex` (filters the workspace file scan) |
| `phpNamespaceRefactor.autoImportNamespace` | `AUTO_IMPORT_NAMESPACE` | `boolean` | `true` | `FileMoveOperation` (decides whether to call `MissingClassImporter`) |
| `phpNamespaceRefactor.removeUnusedImports` | `REMOVE_UNUSED_IMPORTS` | `boolean` | `true` | `ImportRemover` (returns early when disabled) |
| `phpNamespaceRefactor.additionalExtensions` | `ADDITIONAL_EXTENSIONS` | `string[]` | `["php"]` | `FileExtensionResolver` and `WorkspaceIndex` |
| `phpNamespaceRefactor.editFilesInBackground` | `EDIT_FILES_IN_BACKGROUND` | `boolean` | `true` | `FileEditApplier` |

## How configuration is read

Two classes access `workspace.getConfiguration('phpNamespaceRefactor')`, each with a distinct purpose:

- **`ConfigurationLocator`** (`src/domain/workspace/ConfigurationLocator.ts`) — generic read, used for settings of any type (`ignoredDirectories`, `additionalExtensions`)
- **`FeatureFlagManager`** (`src/domain/workspace/FeatureFlagManager.ts`) — specialized `boolean` read, with `defaultValue = true`. Used for every on/off flag (`autoImportNamespace`, `removeUnusedImports`, `editFilesInBackground`)

Neither class caches the `WorkspaceConfiguration` — each instance reads `workspace.getConfiguration()` in its constructor, and since both are `@injectable()` (not singleton), a fresh read happens on every `container.resolve()`. This means a change to the user's configuration is picked up on the next operation, with no need to reload the window.

## `phpNamespaceRefactor.editFilesInBackground`

Controls how files **not previously open in the editor** are handled when they receive a batched edit (`FileEditApplier.apply`):

- `true` (default) — the edit is applied and the file is saved to disk without ever opening an editor tab
- `false` — every edited file is opened as a tab (`window.showTextDocument`), preserving the behavior that existed before this flag was introduced

Files that were already open before the refactor are never affected by this logic — they simply receive the edit as usual and stay in a "modified" (dirty) state until the user saves them.

## `phpNamespaceRefactor.ignoredDirectories`

Filters files by simple substring match against `fsPath` (not a glob) — see `WorkspaceIndex.execute()`. The default (`/vendor/`, `/var/`, `/cache/`) is always merged with whatever the user configures; there's no way to remove the defaults, only add more directories.

## `phpNamespaceRefactor.additionalExtensions`

Normalized by `normalizeExtensions()` (`src/infra/utils/extensions.ts`): strips leading dots and whitespace, lowercases, and always guarantees `php` is included even if not listed. `FileExtensionResolver.match()` sorts extensions from longest to shortest before comparing, so a compound extension (e.g. `class.php`) is never shadowed by the plain `php` entry.
