# NamespaceRenameOperation

**File:** `src/app/operations/NamespaceRenameOperation.ts`

> **Not currently wired to any command.** This operation used to run from the extension's own F2 keybinding, which was removed in favor of VS Code's native rename (see [architecture.md](../architecture.md)). The class is kept as a building block — given a document and a new namespace, it moves the underlying file to the directory that namespace maps to — but nothing in `extension.ts` calls it today.

## Responsibility

Given the current document and a new namespace, moves the underlying file to the directory that namespace maps to via PSR-4 (previously triggered when the user pressed F2 with the cursor on the `namespace Foo\Bar;` line and typed a new namespace).

## Flow

```
NamespaceRenameOperation.execute()  ← entry point, currently uncalled
  → FileRenameHandler.create()      ← triggers WorkspaceEdit.renameFile()
  → onDidRenameFiles                ← triggers FileMoveOperation
```

## What it does

1. Extracts the class name from the current path (e.g. `UserController`)
2. Resolves the new namespace to its corresponding directory via PSR-4:

```
App\Services\Auth  →  /src/Services/Auth
```

3. Builds the new `Uri`:

```
/src/Domain/UserController.php  →  /src/Services/Auth/UserController.php
```

4. Delegates to `FileRenameHandler.create()`, which triggers `FileMoveOperation` (see [file-move.md](./file-move.md)) to update the namespace and references across the project.

## Error behavior

If the given namespace has no PSR-4 mapping in `composer.json`, it shows an error message via `window.showErrorMessage` and aborts the operation. Details on how PSR-4 mapping is resolved: [autoload.md](../autoload.md).

## Dependencies

- `WorkspacePathResolver` — resolves namespace → directory and extracts the class name from the current path
- `FileRenameHandler` — performs the rename via the VS Code WorkspaceEdit API
