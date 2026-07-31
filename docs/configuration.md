# Configuration

Reference for every setting contributed by the extension (`phpNamespaceRefactor.` prefix), pointing to the code that reads each one. Useful when investigating "the extension isn't respecting setting X" — start with the class listed.

All keys are centralized in `ConfigKeys` (`src/domain/workspace/ConfigurationLocator.ts`). No other place in the codebase references a setting name as a loose string — if a key needs renaming, this is the only spot to change (besides `package.json`).

| Setting | Key (`ConfigKeys`) | Type | Default | Read by |
|---|---|---|---|---|
| `phpNamespaceRefactor.ignoredDirectories` | `IGNORED_DIRECTORIES` | `string[]` | `["/vendor/", "/var/", "/cache/"]` | `WorkspaceIndex` (filters the workspace file scan) |
| `phpNamespaceRefactor.autoImportNamespace` | `AUTO_IMPORT_NAMESPACE` | `boolean` | `true` | `FileMoveOperation` (decides whether to call `MissingClassImporter`) |
| `phpNamespaceRefactor.removeUnusedImports` | `REMOVE_UNUSED_IMPORTS` | `boolean` | `true` | `ImportRemover` (returns early when disabled) |
| `phpNamespaceRefactor.additionalExtensions` | `ADDITIONAL_EXTENSIONS` | `string[]` | `["php"]` | `FileExtensionResolver` and `WorkspaceIndex` |
| `phpNamespaceRefactor.rename` | `RENAME` | `boolean` | `true` | The `phpNamespaceRefactor.rename` command (`extension.ts`) and the F2 keybinding's `when` clause (`package.json`) |
| `phpNamespaceRefactor.editFilesInBackground` | `EDIT_FILES_IN_BACKGROUND` | `boolean` | `true` | `FileEditApplier` |
| `phpNamespaceRefactor.renameProperties` | `RENAME_PROPERTIES` | `boolean \| { renameMismatchedNames?: boolean }` | `false` | `PropertyRenameSettingsResolver`, consumed by `MultiFileReferenceUpdater`/`PropertyRenameOperation` |
| `phpNamespaceRefactor.namespaceMismatchDiagnostics` | `NAMESPACE_MISMATCH_DIAGNOSTICS` | `boolean` | `true` | `NamespaceDiagnosticsBuilder` |
| `phpNamespaceRefactor.highlightNotUsed` | `HIGHLIGHT_NOT_USED` | `boolean` | `true` | `UnusedImportDiagnosticsBuilder` |
| `phpNamespaceRefactor.highlightNotImported` | `HIGHLIGHT_NOT_IMPORTED` | `boolean` | `true` | `MissingImportDiagnosticsBuilder` |
| `phpNamespaceRefactor.removeOnSave` | `REMOVE_ON_SAVE` | `boolean` | `false` | `UseStatementBlockEditsBuilder` |
| `phpNamespaceRefactor.sortOnSave` | `SORT_ON_SAVE` | `boolean` | `false` | `UseStatementBlockEditsBuilder` |
| `phpNamespaceRefactor.sortMode` | `SORT_MODE` | `"natural" \| "length" \| "alphabetical"` | `"natural"` | `UseStatementBlockEditsBuilder`, sorting logic in `UseStatementSorter` |

See [diagnostics.md](./diagnostics.md) for how the last six are wired together (the three diagnostics share one subscriber; the two save-time settings share one edit builder to avoid overlapping edits).

## How configuration is read

Three classes access `workspace.getConfiguration('phpNamespaceRefactor')`, each with a distinct purpose:

- **`ConfigurationLocator`** (`src/domain/workspace/ConfigurationLocator.ts`) — generic read, used for settings of any type (`ignoredDirectories`, `additionalExtensions`)
- **`FeatureFlagManager`** (`src/domain/workspace/FeatureFlagManager.ts`) — specialized `boolean` read, with `defaultValue = true`. Used for every plain on/off flag (`autoImportNamespace`, `removeUnusedImports`, `rename`, `editFilesInBackground`, `namespaceMismatchDiagnostics`, `highlightNotUsed`, `highlightNotImported`) — `removeOnSave` and `sortOnSave` also go through it, but pass `defaultValue: false` explicitly since they mutate the file on every save and shouldn't be on by default
- **`PropertyRenameSettingsResolver`** (`src/domain/property/PropertyRenameSettingsResolver.ts`) — the one setting whose raw value isn't a plain boolean; see [`phpNamespaceRefactor.renameProperties`](#phpnamespacerefactorrenameproperties) below

None of the three caches the `WorkspaceConfiguration` — `ConfigurationLocator`/`FeatureFlagManager` read `workspace.getConfiguration()` in their constructor, and `PropertyRenameSettingsResolver` reads through a fresh `ConfigurationLocator` on every `resolve()` call. All three are `@injectable()` (not singleton), so a fresh read happens on every `container.resolve()`. This means a change to the user's configuration is picked up on the next operation, with no need to reload the window.

## `phpNamespaceRefactor.editFilesInBackground`

Controls how files **not previously open in the editor** are handled when they receive a batched edit (`FileEditApplier.apply`):

- `true` (default) — the edit is applied and the file is saved to disk without ever opening an editor tab
- `false` — every edited file is opened as a tab (`window.showTextDocument`), preserving the behavior that existed before this flag was introduced

Files that were already open before the refactor are never affected by this logic — they simply receive the edit as usual and stay in a "modified" (dirty) state until the user saves them.

## `phpNamespaceRefactor.ignoredDirectories`

Filters files by simple substring match against `fsPath` (not a glob) — see `WorkspaceIndex.execute()`. The default (`/vendor/`, `/var/`, `/cache/`) is always merged with whatever the user configures; there's no way to remove the defaults, only add more directories.

## `phpNamespaceRefactor.additionalExtensions`

Normalized by `normalizeExtensions()` (`src/infra/utils/extensions.ts`): strips leading dots and whitespace, lowercases, and always guarantees `php` is included even if not listed. `FileExtensionResolver.match()` sorts extensions from longest to shortest before comparing, so a compound extension (e.g. `class.php`) is never shadowed by the plain `php` entry.

## `phpNamespaceRefactor.renameProperties`

Master switch for `PropertyRenameOperation` — off by default, unlike the extension's other flags, because it renames identifiers (constructor parameters, promoted/non-promoted properties, `$this->x` usages), not just type hints. Two conditions gate it: the class itself must have actually been renamed (`oldClassName !== newClassName` — a plain directory move is a no-op), and only files `MultiFileReferenceUpdater` already determined were affected by that specific rename are ever touched, never an independent workspace-wide scan — so an unrelated class in another namespace that happens to share a short name is never at risk. The rename is folded into the very same per-file `WorkspaceEdit` as the class-name replacement itself, not a separate later pass.

For each candidate file, `ClassTypedPropertyLocator` looks for the single constructor property typed as the renamed class (promoted or not, readonly or not); if more than one property shares that type, the file is skipped entirely rather than guessing which one to rename — see [file-move.md](./operations/file-move.md#3-property-rename-propertyrenameoperation-optional).

### Accepted values

This one setting doubles as its own sub-option, via `PropertyRenameSettingsResolver`:

```jsonc
"phpNamespaceRefactor.renameProperties": false // disabled (default)
"phpNamespaceRefactor.renameProperties": true // enabled, mismatched names renamed too (default child behavior)
"phpNamespaceRefactor.renameProperties": {} // enabled, mismatched names renamed too (default child behavior)
"phpNamespaceRefactor.renameProperties": { "renameMismatchedNames": false } // enabled, but mismatched names left alone
```

`renameMismatchedNames` controls what happens when a property's current name doesn't already follow the class-name convention:

- unset/`true` (default whenever the feature is enabled) — mismatched names are renamed too, to match the *new* class name (e.g. `$service` → `$newTest`)
- `false` — a property is only renamed if its name already matches the *old* class name (e.g. `$test` for `Test`); a property named something else on purpose (e.g. `$service`) is left untouched

Turning the feature on — via a bare `true` or an object — defaults every child behavior to `true` as well; the object form exists only to dial a specific child back to `false`. Any object value implies the feature is enabled — `false` is the only way to turn it off; there's no `{ "enabled": false }` form.

**Why one polymorphic setting instead of two plain booleans:** VS Code's settings schema doesn't allow a key to be both a leaf value and the parent of another key. An earlier version declared `phpNamespaceRefactor.renameProperties` (boolean) alongside `phpNamespaceRefactor.renameProperties.renameMismatchedNames` (boolean) as two separate keys — VS Code detected the conflict, logged `Ignoring phpNamespaceRefactor.renameProperties.renameMismatchedNames as phpNamespaceRefactor.renameProperties is false` in the console, and silently resolved **both** settings to `false` regardless of what the user configured. Collapsing them into a single `boolean | object` setting sidesteps the conflict entirely, since there's only ever one registered key.
