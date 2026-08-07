# ClassRenameOperation

**File:** `src/app/operations/ClassRenameOperation.ts`

> **Not currently wired to any command.** This operation used to run from the extension's own F2 keybinding, which was removed in favor of VS Code's native rename (see [architecture.md](../architecture.md)). The class is kept as a building block — given a document and a new class name, it renames the underlying file — but nothing in `extension.ts` calls it today.

## Responsibility

Given the current document and a new class name, renames the underlying file to match (previously triggered when the user pressed F2 on a class declaration line — `class Foo`, `interface Foo`, `trait Foo` — and typed a new name).

## Flow

```
ClassRenameOperation.execute()  ← entry point, currently uncalled
  → FileRenameHandler.create()  ← triggers WorkspaceEdit.renameFile()
  → onDidRenameFiles            ← triggers FileMoveOperation
```

## What it does

Builds the new `Uri`, keeping the same directory and only replacing the file name with the new class name:

```
/src/Domain/OldClass.php  →  /src/Domain/NewClass.php
```

It then delegates the rename to `FileRenameHandler.create()`, which triggers VS Code's `onDidRenameFiles` event — the same event that drives `FileMoveOperation` to:

- Update the `namespace` declaration in the file
- Update the class name inside the file (via `ClassNameUpdater`)
- Update every `use` statement referencing the class throughout the project
- Optionally, rename class-typed constructor properties (and their `$this->x` usages) in the affected files to match the new class name — only when `renameProperties` is enabled, folded into the same pass as the reference update; see `PropertyRenameOperation` in [file-move.md](./file-move.md#2-namespace-and-reference-update-namespacebatchupdater)

## Difference from a direct Explorer rename

There's no separate `FileRenameOperation` class. When the user renames the file directly through the VS Code Explorer, VS Code fires `onDidRenameFiles` directly — the same event drag-and-drop uses — and the flow lands straight in `FileMoveOperation` (see [file-move.md](./file-move.md)), without going through `ClassRenameOperation`. Since nothing currently calls `ClassRenameOperation`, this Explorer-rename path is, in practice, the only one that runs.

## Dependencies

- `WorkspacePathResolver` — extracts the directory and extension from the current path
- `FileRenameHandler` — performs the rename via the VS Code WorkspaceEdit API
