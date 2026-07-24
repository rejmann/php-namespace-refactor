# PSR-4 autoload resolution

**Files:** `src/infra/autoload/ComposerAutoloadManager.ts`, `src/infra/autoload/AutoloadPathResolver.ts`, `src/infra/autoload/NamespaceAutoloadMapper.ts`, `src/domain/namespace/NamespaceCreator.ts`

## Responsibility

The whole extension depends on the `psr-4` mapping in `composer.json` to convert a file path into a namespace (and vice versa). That mapping is read, cached, and applied by three classes chained together.

## `ComposerAutoloadManager` — reading `composer.json`

Reads `<workspaceRoot>/composer.json` and extracts:

- `autoload["psr-4"]` (production)
- `autoload-dev["psr-4"]` (dev)

The result is kept in a **module-level in-memory cache** (`composerCache` / `cacheModifiedTime`, variables outside the class), invalidated by comparing the file's `mtimeMs` on every call. This means the cache is shared across every instance of the class (not per-injection) and survives between operations, only being discarded when `composer.json` changes on disk.

If the file doesn't exist, is malformed, or no workspace is open, it silently returns `{ autoload: {}, autoloadDev: {} }` — no error is shown to the user in that case.

## `AutoloadPathResolver` — directory → namespace prefix

Given a `psr-4` map (`{"App\\": "src/"}`) and a path relative to the workspace, finds which psr-4 prefix covers that path and returns the namespace matching that file's **directory** (without the class name).

Walks the autoload keys in the order they appear in `composer.json` and uses the first one whose base directory (`src/` in the example above) is a prefix of the given path. It does not sort by specificity — if two psr-4 prefixes map to directories that both match the path, the first one declared in `composer.json` wins.

## `NamespaceAutoloadMapper` — orchestrates the two above

Takes a file `Uri`, resolves the current autoload map via `ComposerAutoloadManager`, strips the workspace root from the path (`WorkspacePathResolver.removeWorkspaceRoot`), and runs `AutoloadPathResolver` against both `autoload` (production) and `autoloadDev`.

## `NamespaceCreator` — a class's full namespace

Combines the namespace resolved by `NamespaceAutoloadMapper` with the class name (extracted from the file name by `WorkspacePathResolver.extractClassNameFromPath`) to produce:

```ts
interface Namespace {
  namespace?: string      // e.g. "App\\Services\\Auth"
  className: string       // e.g. "AuthService"
  fullNamespace: string   // e.g. "App\\Services\\Auth\\AuthService"
}
```

It tries the `autoload` (production) mapping first; if there's no match, it tries `autoloadDev`; if neither maps the directory, `fullNamespace` falls back to just the class name (no namespace) — this is how a file outside any directory mapped in `composer.json` is handled.

## `WorkspacePathResolver.getDirectoryFromNamespace` — the reverse direction

Used by `NamespaceRenameOperation` to figure out, from a **namespace typed by the user** (F2 on the `namespace ...;` line), which directory the file should be moved to:

1. Sorts the psr-4 prefixes from longest to shortest (to match the most specific prefix first, unlike `AutoloadPathResolver`, which uses `composer.json` declaration order)
2. Finds the first prefix that the typed namespace starts with
3. Rebuilds the physical path by substituting the prefix with its mapped base directory

If no psr-4 prefix covers the typed namespace, it throws an error that `NamespaceRenameOperation` catches and shows via `window.showErrorMessage("Error renaming namespace: ...")` — this is the most common "namespace rename doesn't work" scenario reported by users: the new namespace has no matching entry in the `composer.json`'s `autoload`/`autoload-dev`.

## Things to watch for when supporting users

- **Missing `composer.json` or no `psr-4` section**: every class above degrades gracefully (empty mapping), so files end up treated as having no namespace — there's no visible error, just the "namespace doesn't resolve" behavior described above
- **Stale `ComposerAutoloadManager` cache**: only happens if `composer.json` is edited by a process that doesn't update `mtime` (rare); reloading the VS Code window forces a fresh read, since the cache is module-level (lost when the extension deactivates/reactivates)
- **Overlapping psr-4 prefixes**: the behavior differs between directory→namespace resolution (`composer.json` order, via `AutoloadPathResolver`) and namespace→directory resolution (most specific first, via `WorkspacePathResolver.getDirectoryFromNamespace`) — worth checking which of the two flows is involved when investigating an unexpected mapping
