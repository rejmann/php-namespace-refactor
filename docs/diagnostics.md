# Diagnostics and quick fixes

**Files:** `src/app/services/NamespaceDiagnosticsBuilder.ts`, `src/app/services/UnusedImportDiagnosticsBuilder.ts`, `src/app/services/MissingImportDiagnosticsBuilder.ts`, `src/app/services/MissingImportResolver.ts`, `src/app/services/SingleImportInserter.ts`, `src/app/services/UseStatementBlockEditsBuilder.ts`, `src/app/subscribers/NamespaceDiagnosticsSubscriber.ts`, `src/app/commands/NamespaceCodeActionProvider.ts`, `src/app/commands/UnusedImportCodeActionProvider.ts`, `src/app/commands/MissingImportCodeActionProvider.ts`, `src/infra/vscode/NamespaceDiagnosticCollection.ts`

## Responsibility

Separate from the move/rename/F2 flows (see [architecture.md](./architecture.md#main-flows)), the extension also watches PHP documents as they're opened, saved, and closed, and surfaces three independent checks in the Problems panel. Each has its own feature flag (see [configuration.md](./configuration.md)) and its own `Diagnostic.code`, so a `CodeActionProvider` only ever reacts to the diagnostics it knows how to fix.

| Check | Builder | Diagnostic code | Severity | Quick fix (`CodeActionProvider`) |
|---|---|---|---|---|
| Declared namespace doesn't match PSR-4 location | `NamespaceDiagnosticsBuilder` | `namespace-mismatch` | Warning | `NamespaceCodeActionProvider` — replaces the `namespace ...;` line in place |
| `use` import never referenced in the file | `UnusedImportDiagnosticsBuilder` | `unused-import` | Hint (`DiagnosticTag.Unnecessary`, fades the text) | `UnusedImportCodeActionProvider` — deletes the whole line |
| Class used but not imported, resolves to exactly one class in the workspace | `MissingImportDiagnosticsBuilder` | `missing-import` | Warning | `MissingImportCodeActionProvider` — inserts a `use` statement via the `phpNamespaceRefactor.insertMissingImport` command |

## Event flow

`NamespaceDiagnosticsSubscriber` (registered in `extension.ts`) is the single entry point that runs all three builders and merges their output into one `NamespaceDiagnosticCollection` (a thin wrapper around `languages.createDiagnosticCollection`):

```
workspace.onDidOpenTextDocument   → subscriber.handle(document)
workspace.onDidSaveTextDocument   → subscriber.handle(document)
workspace.onDidCloseTextDocument  → subscriber.clear(document)
workspace.textDocuments (on activate) → subscriber.handle(document), so already-open files get diagnostics immediately
```

There's no `onDidChangeActiveTextEditor`/keystroke-level trigger on purpose — recomputing on every keystroke would be noisy and unnecessary; open + save covers the practical editing workflow.

## Namespace mismatch: why the range is trimmed

`NAMESPACE_DECLARATION_REGEX` (`src/domain/namespace/PhpPatterns.ts`) allows leading blank lines via `\s*` — other call sites (`MovedFileNamespaceUpdater`) rely on that to normalize spacing when replacing the line. `NamespaceDiagnosticsBuilder` trims that leading whitespace off before building the diagnostic's `Range`, otherwise the warning underline (and the quick fix's replace range) would start on the blank line above `namespace ...;` instead of the line itself.

## Missing import: resolving a bare identifier to a class

`MissingImportCandidateLocator` (domain, pure) scans the document text for bare capitalized identifiers that aren't already namespace-qualified, aren't right after `::`/`->` (a member access, not a class reference), aren't already imported/aliased, and aren't the file's own class name. It also blanks out the `namespace ...;` declaration itself before scanning (same-length space padding, so every other match's offset stays correct) — otherwise `namespace App;` would have its own `App` segment mistaken for a used-but-unimported identifier.

`MissingImportResolver` (app) takes each candidate and looks it up via `NamespaceIndex.findClassLocations()` (new method — derives each indexed file's class name from its file name, the same convention as `WorkspacePathResolver.extractClassNameFromPath`). A candidate is only ever flagged when:

- exactly one file in the workspace declares a class by that name (zero matches = unresolved, more than one = ambiguous — both are skipped rather than guessed, same philosophy as the ambiguous-property-rename skip in `PropertyRenameOperation`), and
- that one match isn't already in the file's own declared namespace (already in scope without an import, same rule `MissingClassImporter` applies for the move flow)

This means built-in/global PHP classes (`Exception`, `Closure`, etc.) are never flagged — they're not in the workspace's own namespace index, so they simply don't resolve.

The quick fix (`MissingImportCodeActionProvider`) re-runs `MissingImportResolver` against the document rather than stashing the resolved FQCN on the diagnostic, then triggers the `phpNamespaceRefactor.insertMissingImport` command, which delegates to `SingleImportInserter` — a thin wrapper around the same `UseStatementLocator`/`UseStatementCreator`/`UseStatementInjector` trio `MissingClassImporter` already uses for the move flow, so insertion point, duplicate-avoidance, and blank-line handling all stay consistent between the two features.

## Save-time edits: `removeOnSave` and `sortOnSave`

Unlike the three diagnostics above, `removeOnSave` and `sortOnSave` don't go through the Problems panel — they mutate the file directly on save, via `workspace.onWillSaveTextDocument` + `event.waitUntil(...)`. This is deliberate: contributing edits through `waitUntil` folds them into the save that's already happening, so the file doesn't get saved once, then edited again into a dirty state (which is what using `onDidSaveTextDocument` + `workspace.applyEdit` would cause).

Both behaviors are computed by a single class, `UseStatementBlockEditsBuilder`, instead of two independent subscribers. They act on the same contiguous block of `use` lines, so two separate edits (one deleting unused lines, one reordering the rest) would overlap — VS Code rejects overlapping edits within one `TextEdit[]`. Instead, the builder:

1. Locates every `use` line (`USE_STATEMENT_REGEX`) and checks they're on consecutive document lines — if anything is interleaved (a comment, a blank line), it bails out entirely rather than risk reordering across it.
2. If `removeOnSave` is on, drops the ones `UnusedUseStatementLocator` reports as unreferenced.
3. If `sortOnSave` is on, reorders what's left via `UseStatementSorter`, using the mode from `phpNamespaceRefactor.sortMode` (`natural` | `length` | `alphabetical`).
4. If the result is identical to the original block, returns no edit at all.
5. Otherwise, replaces the whole original block (first `use` line to last) with the final block in a single `TextEdit`.

If every import ends up removed, this can leave one blank line behind where the block used to be — a minor cosmetic gap, not a correctness issue, consistent with the regex-based (not AST-based) approach used throughout this codebase.
