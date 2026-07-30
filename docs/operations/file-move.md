# FileMoveOperation

**File:** `src/app/operations/FileMoveOperation.ts`

## Responsibility

Runs when VS Code fires `onDidRenameFiles` — which covers both dragging a `.php` file/directory to another directory in the Explorer and renaming an item directly through the Explorer (F2 on the tree item). This is the convergence point for **every** refactor flow in the extension: the internal F2 commands (`ClassRenameOperation`, `NamespaceRenameOperation`) also end up here, since they delegate the physical rename to the same `onDidRenameFiles` event (see [class-rename.md](./class-rename.md) and [namespace-rename.md](./namespace-rename.md)).

## Flow

```
onDidRenameFiles (VS Code event)
  → FileRenameHandler.handle()        ← queues the execution (see below)
  → FileMoveOperation.execute(files)
      → DirectoryMovedFilesResolver.execute()   1. expands directory moves into per-file moves
      → for each .php file:
          → NamespaceBatchUpdater.execute()      2. updates namespace/class + references
          → PropertyRenameOperation.execute()    3. (optional) renames class-typed properties to match the new class name
          → MissingClassImporter.execute()       4. (optional) auto-imports classes from the old directory
          → ImportRemover.execute()              5. (optional, checked internally) removes stale imports
```

### Serialized queue

`FileRenameHandler` keeps a chained `Promise` (`this.queue`) and never dispatches two `FileMoveOperation` runs in parallel — each `handle()` only runs after the previous execution (success or failure) has finished. This prevents two renames fired in quick succession (e.g. moving several files at once, or a namespace rename that re-enters the same event) from corrupting the namespace index or applying edits on top of an inconsistent `WorkspaceEdit`.

## What it does, step by step

### 1. Directory expansion (`DirectoryMovedFilesResolver`)

The `onDidRenameFiles` event delivers a single `{oldUri, newUri}` pair even when an **entire directory** was moved — not one event per file. `DirectoryMovedFilesResolver` resolves this:

- If `newUri` points to a directory that still exists on disk, it recursively lists the whole contents and rebuilds each file's `oldUri` from its relative path
- If `newUri` no longer exists on disk at check time (the directory was already reorganized by another operation) but the move "looks like" a directory move (no extension on either path), it tries to rebuild the move set from documents already open in the editor (`workspace.textDocuments`) that sit inside the new directory
- If neither heuristic expands anything, it's treated as a single file move

Files not ending in `.php` (on either the source or destination side) are filtered out afterward.

### 2. Namespace and reference update (`NamespaceBatchUpdater`)

For each moved file, `src/app/services/NamespaceBatchUpdater.ts`:

1. Resolves the expected new `fullNamespace` from the new path (`NamespaceCreator`, see [autoload.md](../autoload.md))
2. Also resolves what namespace the **old** path would have had (same calculation applied to `oldUri`) — used only as a reference to decide the next steps; the file itself is already at the new path
3. If the namespace (directory) didn't change but the `fullNamespace` did — i.e. only the **file/class name** changed, without moving directories — calls `ClassNameUpdater`, which rewrites the `class`/`interface`/`trait` declaration in the file itself to match the new file name
4. Calls `MovedFileNamespaceUpdater`, which rewrites the moved file's `namespace ...;` line to the new namespace
5. If the namespace declaration wasn't found/changed (step 4 returns `false`), the operation stops here — there's nothing to propagate for a file with no `namespace` declaration
6. Otherwise, calls `MultiFileReferenceUpdater` to propagate the change across the rest of the project

`NamespaceBatchUpdater.execute()` returns the list of files `MultiFileReferenceUpdater` determined were affected (empty when it never ran, e.g. no `namespace` declaration to key off). `FileMoveOperation` forwards that same list into step 3 below, so property renaming only ever touches files this specific rename actually reached — never an independent, broader scan.

#### `MultiFileReferenceUpdater` — how affected files are found

Combines two sources, without relying on either alone:

- **Index** (`NamespaceIndex.getFilesUsing(oldFullNamespace)`) — O(1) lookup, see [namespace-index.md](../namespace-index.md)
- **Scan** (`findAffectedPathsByScan`) — reads every file in the workspace (via `WorkspaceIndex`) and checks which ones contain the old namespace's text

The union of both lists is the final set. This means even an empty/stale index never leaves references un-updated — it just makes the operation slower.

For each affected file, it replaces via regex:
- every occurrence of the old fully-qualified namespace with the new one
- if the **class name** also changed, every occurrence of the old name with the new one (excluding spans already covered by the namespace substitution, to avoid overlapping ranges)
- if the file had no occurrence of the old namespace at all (i.e. didn't match either case above) but sits in the same directory as the moved file, it tries to insert a new `use` statement

Every edit across every affected file is accumulated into a **single `WorkspaceEdit`** before being applied (`FileEditApplier.apply`), so the whole refactor shows up as one undo-stack entry in VS Code instead of one edit per file — see [issue #72](https://github.com/rejmann/php-namespace-refactor/issues/72).

At the end, `MultiFileReferenceUpdater` always calls `ImportRemover.execute({ uri: newUri })` for the moved file itself (in addition to the call `FileMoveOperation` already makes in step 5 below — both are no-ops if the flag is disabled or there's nothing to remove).

### 3. Property rename (`PropertyRenameOperation`, optional)

Only runs if `renameProperties` resolves to enabled (off by default — see [configuration.md](../configuration.md#phpnamespacerefactorrenameproperties)). `PropertyRenameSettingsResolver` reads the raw setting (`boolean | { renameMismatchedNames?: boolean }`) once in `FileMoveOperation` and turns it into `{ enabled, renameMismatchedNames }`; only `enabled` gates whether this step runs at all. Also only acts when the class itself was actually renamed (`oldClassName !== newClassName`); a plain move to a different directory with the same class name is a no-op.

1. Derives the expected old/new property names from the class names (`PropertyNameResolver`, e.g. `Teste` → `teste`)
2. Builds the candidate file list from the `affectedFiles` `FileMoveOperation` received back from `NamespaceBatchUpdater` (step 2's output), plus the moved file itself — deliberately **not** an independent workspace-wide scan, so a differently-namespaced class that happens to share a short name is never touched
3. For each candidate file whose text contains the new class name, `ClassTypedPropertyLocator` looks for the constructor property typed as that class — promoted or not, readonly or not, confirming a non-promoted parameter by checking for a `$this->x = $x;` assignment in the constructor body (see `ConstructorSpanFinder` for how the constructor's parameter list and body are located via brace/paren matching). The property's own declaration line doesn't need a type hint to be found this way — a legacy `private $x;` typed only via a `@var ClassName` docblock is still matched and renamed, via `PropertyDeclarationPattern`, once the constructor param already confirmed what class it holds
4. If more than one property shares that type in the same file, it's ambiguous — the file is skipped entirely rather than guessing
5. If exactly one property is found: it's renamed when its current name already matches the *old* class-name convention, or — only when `renameMismatchedNames` also resolved to `true` — regardless of what it was named before
6. Renaming rewrites the constructor parameter/property declaration and every `$this->x` usage in that file, accumulated into a single `WorkspaceEdit` (its own undo stop, separate from `MultiFileReferenceUpdater`'s)

### 4. Auto-import of classes from the source directory (`MissingClassImporter`, optional)

Only runs if the `autoImportNamespace` flag is enabled. Lists the `.php` files still left in the source directory, checks which classes from those files are used in the moved file's text but not imported, and inserts the corresponding `use` statements.

### 5. Removing stale imports (`ImportRemover`)

Unlike the other flags, the `removeUnusedImports` check happens **inside** `ImportRemover` itself (not in `FileMoveOperation`) — so it's always called, but returns immediately if the flag is disabled.

When enabled: it collects the class names declared in the other files of the moved file's directory and removes, from both the moved file and the other files in that directory, any `use` statements referencing those classes that no longer make sense after the move.

## Feature flags

| Flag | Behavior |
|---|---|
| `renameProperties` (`true`/`{}`) | Enables step 3 (renaming class-typed constructor properties to match the new class name) |
| `renameProperties: { renameMismatchedNames: true }` | Extends step 3 to also rename properties whose name doesn't already match the class-name convention |
| `autoImportNamespace` | Enables step 4 (auto-import of classes from the old directory) |
| `removeUnusedImports` | Enables the import removal in step 5 (checked inside `ImportRemover`) |
| `editFilesInBackground` | Doesn't change what's edited, only whether touched files open a tab in the editor or are saved silently — see [configuration.md](../configuration.md) |

## Error handling

Each file in the batch is processed inside its own `try/catch` in `FileMoveOperation.execute`; a failure on one file (`console.error` + `throw`) stops processing the **remaining** files in that same batch — there's no rollback of edits already applied to earlier files in the loop.

## Dependencies

- `DirectoryMovedFilesResolver` — expands directory moves into per-file moves
- `NamespaceBatchUpdater` — orchestrates the namespace, class name, and reference update
- `PropertyRenameOperation` — renames class-typed constructor properties (and their `$this->x` usages) to match a renamed class
- `MissingClassImporter` — detects and injects missing imports
- `ImportRemover` — removes unused imports
- `FeatureFlagManager` — checks which features are enabled in the settings
