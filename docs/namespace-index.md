# Namespace index

**Files:** `src/infra/index/NamespaceIndex.ts`, `src/infra/index/NamespaceIndexBuilder.ts`, `src/infra/index/WorkspaceIndex.ts`

## Responsibility

To update every reference (`use` statement) to a moved/renamed class without scanning the whole workspace on every operation, the extension keeps an inverted index on disk: `namespace-index.json`. It maps each namespace to the classes that import it, letting `MultiFileReferenceUpdater` (see [file-move.md](./operations/file-move.md)) quickly locate the files affected by a rename.

The index is an optimization, not a source of truth: `MultiFileReferenceUpdater` always complements the index result with a direct workspace scan (`findAffectedPathsByScan`), so a stale or corrupted index falls back, at worst, to full-scan behavior — it never silently leaves a reference un-updated.

## How it's built

On extension activation (`extension.ts`), `NamespaceIndexBuilder.build()` is fired **without `await`** (fire-and-forget), so it doesn't delay activation:

1. `WorkspaceIndex.execute()` lists every PHP file in the workspace (respecting `ignoredDirectories` and `additionalExtensions`, see [configuration.md](./configuration.md))
2. Each file is read and passed to `NamespaceIndex.parseAndAdd()`, which extracts via regex:
   - **`declares`** — the namespace declared in the file (`namespace Foo\Bar;`)
   - **`imports`** — the file's list of `use` statements
3. At the end, `NamespaceIndex.save()` writes the result to disk

## How it's kept up to date

Three subscribers, registered in `extension.ts`, update the index incrementally as the user works — without ever rebuilding the whole index:

| VS Code event | Subscriber (`src/app/subscribers/`) | Effect on the index |
|---|---|---|
| `onDidCreateFiles` | `FileCreatedSubscriber` | Reads the new file and calls `parseAndAdd` |
| `onDidDeleteFiles` | `FileDeletedSubscriber` | Calls `removeFile`, also clearing the corresponding `usages` entries |
| `onDidSaveTextDocument` | `FileSavedSubscriber` (`.php` files only) | Re-parses the saved content and calls `parseAndAdd` |

`parseAndAdd` always removes the file's previous entry before adding the new one (internal `removeFile` call), so re-saving a file never leaves `usages` with duplicate or stale entries for that file.

Each subscriber persists (`NamespaceIndex.save()`) after processing its event — there's no debounce, so a rapid sequence of saves produces one disk write per event.

The file rename/move itself (`FileMoveOperation`) does **not** update the index directly; the update happens indirectly once the affected files are rewritten and VS Code fires `onDidSaveTextDocument` for them (via `FileEditApplier`).

## Where the cache is stored

The file is written to VS Code's workspace storage, isolated per project:

```
~/.config/Code/User/workspaceStorage/<workspace-hash>/<publisher>.<extension>/namespace-index.json
```

To find the hash for the current workspace:

```bash
grep -rl "your-project-folder-name" ~/.config/Code/User/workspaceStorage/*/workspace.json
```

Example output:
```
/home/user/.config/Code/User/workspaceStorage/58c76f185bb1a645e121bf49daf7664c/workspace.json
```

The cache path would then be:

```
~/.config/Code/User/workspaceStorage/58c76f185bb1a645e121bf49daf7664c/rejman.php-namespace-refactor/namespace-index.json
```

## Cache format

```json
{
  "files": {
    "/path/to/src/Models/User.php": {
      "declares": "App\\Models",
      "imports": ["App\\Services\\AuthService"]
    }
  },
  "usages": {
    "App\\Models\\User": [
      "/path/to/src/Controllers/UserController.php"
    ]
  }
}
```

- `files` — the declared namespace and imports of each indexed file
- `usages` — inverted index: for each fully-qualified namespace, which files import it via `use`

## Inspecting or clearing the cache

**View the cache:**
```bash
cat ~/.config/Code/User/workspaceStorage/<hash>/rejman.php-namespace-refactor/namespace-index.json | jq
```

**Delete the cache** (it will be rebuilt on next activation):
```bash
rm ~/.config/Code/User/workspaceStorage/<hash>/rejman.php-namespace-refactor/namespace-index.json
```

**Find every cache for this extension across projects:**
```bash
find ~/.config/Code/User/workspaceStorage -name "namespace-index.json" 2>/dev/null
```

## Signs something is wrong with the index

Since `MultiFileReferenceUpdater` always falls back to a scan, a broken index shouldn't cause un-updated references — only make the operation slower (equivalent to a full workspace scan on every rename). If a user reports noticeable slowness on refactors after heavy use, deleting the cache (above) and letting it rebuild on the next activation is the first troubleshooting step.
