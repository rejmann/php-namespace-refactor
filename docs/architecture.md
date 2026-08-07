# Architecture

Overview of how the extension is organized, to help you find the right place when investigating a bug or support question.

## Layers

The code in `src/` follows three layers, mapped in `tsconfig.json` as aliases (`@app/*`, `@domain/*`, `@infra/*`):

| Layer | Folder | Responsibility |
|---|---|---|
| `app` | `src/app/` | Orchestration: commands, VS Code event handlers, features, and high-level operations (class/namespace rename, file move) |
| `domain` | `src/domain/` | Pure business rules (PHP parsing, path resolution, validation, feature flags), with no direct dependency on the VS Code API wherever possible |
| `infra` | `src/infra/` | External integrations: reading `composer.json`, the on-disk namespace index, calls to the VS Code API (`WorkspaceEdit`, `TextDocument`) |

Inside `app/`:

- `commands/` — entry points triggered by VS Code events (`FileRenameHandler`)
- `operations/` — runs a full refactor operation (`FileMoveOperation`). `ClassRenameOperation` and `NamespaceRenameOperation` also live here but aren't currently wired to any command — see the note in [operations/class-rename.md](./operations/class-rename.md)
- `services/` — reusable steps used by the operations (`NamespaceBatchUpdater`, `MissingClassImporter`, `DirectoryMovedFilesResolver`, `remove/ImportRemover`, `update/*`)
- `subscribers/` — react to workspace events to keep the namespace index up to date (`FileCreatedSubscriber`, `FileDeletedSubscriber`, `FileSavedSubscriber`)

Detailed documentation for each operation: [docs/operations/](./operations/).

## Dependency injection

Every class is registered with `tsyringe` (`@injectable()` / `@singleton()` decorators) and resolved via `container.resolve(...)`. There's no central bindings file — `tsyringe` automatically resolves any class decorated with `@injectable()`/`@singleton()` from its constructor, with no need for per-class explicit configuration.

One exception is registered manually in `extension.ts`:

- `'StorageUri'` — a string with the workspace's storage path, injected into `NamespaceIndex` via `@inject('StorageUri')`

`NamespaceIndex` is `@singleton()` (a single shared instance across the whole extension); every other class is `@injectable()` (a new instance on each `resolve`/injection).

## Activation (`src/extension.ts`)

When the extension activates, `activate()` does the following:

1. Creates the workspace's storage directory (`context.storageUri`) and registers its path in the DI container
2. Fires `NamespaceIndexBuilder.build()` **without awaiting it** (fire-and-forget) — the index is built in the background so it doesn't delay activation. See [namespace-index.md](./namespace-index.md)
3. Registers the three file-event subscribers (`onDidCreateFiles`, `onDidDeleteFiles`, `onDidSaveTextDocument`), which keep the index up to date
4. Registers the `onDidRenameFiles` handler (`FileRenameHandler`), triggered by drag-and-drop or a rename in the Explorer

F2 (rename symbol) inside a file is no longer intercepted by the extension — it's left to VS Code's native rename, provided by whatever PHP language server is installed. The extension no longer contributes a keybinding or command for it.

## Main flows

```
User drags a file/directory in the Explorer, or renames it there
  → onDidRenameFiles
  → FileRenameHandler.handle()
  → FileMoveOperation.execute()
  See: docs/operations/file-move.md
```

In other words: **every** namespace/reference update ultimately goes through `FileMoveOperation`, triggered by `onDidRenameFiles`.

## Other documents

- [Configuration](./configuration.md) — every setting and the classes that read them
- [Namespace index](./namespace-index.md) — the on-disk cache used to quickly locate files affected by a rename
- [PSR-4 autoload resolution](./autoload.md) — how `composer.json` is read and mapped to namespaces/directories
