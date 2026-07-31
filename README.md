# PHP Namespace Refactor 🇧🇷

Hi PHP Developers 👋!

PHP Namespace Refactor: Extension for Visual Studio Code that automatically refactors namespace and references when moving PHP files between directories.

## Features

### 🚀 Automatic namespace refactoring

The extension automatically detects when a PHP file or directory is moved (dragged and dropped) between directories and updates:
    - The namespace declared in the file.
    - All references to the old namespace in other files in the project.

When a directory is moved, all PHP files inside it are processed through the same refactor flow.

Ideal for projects using PSR-4, making it easy to reorganize directories without breaking dependencies.

- Ignored Directories: Specify directories to exclude from namespace refactoring.

- Auto Import Namespace: Automatically import objects from the moved class's directory that were not previously imported because they share the same namespace.

- Remove Unused Imports: Clean up unused imports from the same namespace.

- Additional Extensions:  Specify the file extensions to consider during the namespace refactoring process.

- Rename Properties (off by default): When a class is renamed, also rename its class-typed constructor properties (promoted or not, readonly or not) and their `$this->x` usages to match the new class name.

### 🩺 Diagnostics and quick fixes

Beyond the move/rename flow, the extension also watches files as you edit them and surfaces a few checks in the Problems panel, each individually toggleable:

- Namespace Mismatch Diagnostics: Warns when a file's declared namespace doesn't match its PSR-4 location, with a quick fix to correct it in place (no move required).

- Highlight Not Imported: Warns when a class is used in the file but not imported, whenever it resolves to exactly one class elsewhere in the workspace — with a quick fix to add the `use` statement. Ambiguous matches (the same class name found in more than one place) are left alone rather than guessed.

- Highlight Not Used: Flags `use` imports that are never referenced in the file, with a quick fix to remove them.

- Remove On Save / Sort On Save (off by default): Automatically remove unused imports and/or sort the remaining ones every time a PHP file is saved, independently of any move/rename operation. Sort order is configurable (natural, length, or alphabetical).

## Requirements

- PHP 7.4+
- Composer configured in the project for namespace detection.
- Workspace configured in Visual Studio Code with .php files

## Extension Settings

This extension contributes the following settings:

```json
{
    "phpNamespaceRefactor.ignoredDirectories": [
        "/vendor/",
        "/var/",
        "/cache/"
    ],
    "phpNamespaceRefactor.autoImportNamespace": true,
    "phpNamespaceRefactor.removeUnusedImports": true,
    "phpNamespaceRefactor.additionalExtensions": [
        "php"
    ],
    "phpNamespaceRefactor.rename": true,
    "phpNamespaceRefactor.editFilesInBackground": true,
    "phpNamespaceRefactor.renameProperties": false,
    "phpNamespaceRefactor.namespaceMismatchDiagnostics": true,
    "phpNamespaceRefactor.highlightNotUsed": true,
    "phpNamespaceRefactor.highlightNotImported": true,
    "phpNamespaceRefactor.removeOnSave": false,
    "phpNamespaceRefactor.sortOnSave": false,
    "phpNamespaceRefactor.sortMode": "natural"
}
```

### ⚙️ Settings Description

**phpNamespaceRefactor.ignoredDirectories**

- Specifies the directories to ignore during the namespace refactor process.

- Default: "/vendor/", "/var/", "/cache/".

**phpNamespaceRefactor.autoImportNamespace**

- Automatically imports objects from the same namespace of the moved class that were not previously imported.

- Default: true.

**phpNamespaceRefactor.removeUnusedImports**

- Removes unused imports from the same namespace after a namespace refactor operation.

- Default: true.

**phpNamespaceRefactor.additionalExtensions**

- Specifies the file extensions to consider during the namespace refactor process.

- Default: "php".

**phpNamespaceRefactor.rename**

- Can be triggered by pressing F2 or the preferred rename shortcut.
- The feature can be enabled or disabled in the settings.

- Default: true.

**phpNamespaceRefactor.editFilesInBackground**

- Applies refactor edits to files without opening them, keeping only files that were already open in the editor.
- Disable to have every edited file opened in the editor as before.

- Default: true.

**phpNamespaceRefactor.renameProperties**

- When a class is renamed, also renames its class-typed constructor properties (promoted or not, readonly or not) and every `$this->x` usage to match the new class name — e.g. `private Test $test` becomes `private NewTest $newTest` when `Test` is renamed to `NewTest`.
- If more than one property shares the same type in a constructor, the file is skipped rather than guessing which one to rename.
- Accepts either a boolean or an object:
  ```json
  "phpNamespaceRefactor.renameProperties": true
  ```
  ```json
  "phpNamespaceRefactor.renameProperties": {
      "renameMismatchedNames": false
  }
  ```
  Setting `true` (or an empty object) enables the feature with every child behavior on by default, including `renameMismatchedNames` — properties whose current name doesn't already match the class name (e.g. `private Test $service`) get renamed too. Use the object form only to dial a specific child back to `false`.

- Default: false.

**phpNamespaceRefactor.namespaceMismatchDiagnostics**

- Shows a warning and a quick fix when a file's declared namespace doesn't match its PSR-4 location, without requiring a move/rename to fix it.

- Default: true.

**phpNamespaceRefactor.highlightNotUsed**

- Shows a hint and a quick fix for `use` imports that are never referenced in the file.

- Default: true.

**phpNamespaceRefactor.highlightNotImported**

- Shows a warning and a quick fix for classes used in the file that resolve to exactly one class elsewhere in the workspace but aren't imported yet. If the class name matches more than one location in the workspace, it's left alone rather than guessed.

- Default: true.

**phpNamespaceRefactor.removeOnSave**

- Automatically removes unused `use` imports every time a PHP file is saved, independently of any move/rename operation.

- Default: false.

**phpNamespaceRefactor.sortOnSave**

- Automatically sorts `use` imports every time a PHP file is saved, using the order configured in `phpNamespaceRefactor.sortMode`.
- When combined with `removeOnSave`, both happen together as a single edit.

- Default: false.

**phpNamespaceRefactor.sortMode**

- Sort order used by `phpNamespaceRefactor.sortOnSave`. One of:
  - `natural`: case-insensitive, numeric-aware order (e.g. `Item2` before `Item10`).
  - `length`: shortest `use` statement first.
  - `alphabetical`: strict character-by-character order.

- Default: "natural".

## Documentation

For architecture, internals, and troubleshooting notes, see [./docs/](./docs/README.md).

## Release notes

See [./CHANGELOG.md](./CHANGELOG.md)

---

By PHP Developer for PHP Developers 🐘
