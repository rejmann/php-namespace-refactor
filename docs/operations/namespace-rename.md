# NamespaceRenameOperation

**File:** `src/app/operations/NamespaceRenameOperation.ts`

## Responsibility

Runs when the user presses F2 with the cursor on the `namespace Foo\Bar;` line and types a new namespace.

## Flow

```
F2 (registered command)
  → RenameHandler.handle()
  → RenameFeature.execute()
  → detects NamespaceType at the cursor
  → NamespaceRenameOperation.execute()  ← here
  → FileRenameHandler.create()          ← triggers WorkspaceEdit.renameFile()
  → onDidRenameFiles                    ← triggers FileMoveOperation
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
