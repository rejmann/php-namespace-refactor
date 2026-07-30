# ClassRenameOperation

**File:** `src/app/operations/ClassRenameOperation.ts`

## Responsibility

Runs when the user presses F2 with the cursor on the class declaration line (`class Foo`, `interface Foo`, `trait Foo`) and types a new name.

## Flow

```
F2 (registered command)
  → RenameHandler.handle()
  → RenameFeature.execute()
  → detects ClassType at the cursor
  → ClassRenameOperation.execute()  ← here
  → FileRenameHandler.create()      ← triggers WorkspaceEdit.renameFile()
  → onDidRenameFiles                ← triggers FileMoveOperation
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
- Optionally, rename class-typed constructor properties (and their `$this->x` usages) in the affected files to match the new class name — only when `renameProperties` is enabled, see `PropertyRenameOperation` in [file-move.md](./file-move.md#3-property-rename-propertyrenameoperation-optional)

## Difference from a direct Explorer rename

There's no separate `FileRenameOperation` class. When the user renames the file directly through the VS Code Explorer (F2 on the tree item, without going through this extension's command), VS Code fires `onDidRenameFiles` directly — the same event drag-and-drop uses — and the flow lands straight in `FileMoveOperation` (see [file-move.md](./file-move.md)), without going through `ClassRenameOperation`.

Both paths produce the same end result (a same-directory file rename, followed by the namespace/class/reference update), but they differ in origin:

- **F2 inside the file, on `class Foo`/`interface Foo`/`trait Foo`** — triggers `ClassRenameOperation`, which builds the new `Uri` and delegates to `FileRenameHandler.create()`
- **F2 (or a manual rename) on the Explorer item** — doesn't go through `ClassRenameOperation`; VS Code already fires `onDidRenameFiles` on its own, and `FileMoveOperation` handles it the same way as a drag-and-drop

## Dependencies

- `WorkspacePathResolver` — extracts the directory and extension from the current path
- `FileRenameHandler` — performs the rename via the VS Code WorkspaceEdit API
