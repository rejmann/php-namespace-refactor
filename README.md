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
    "phpNamespaceRefactor.renameProperties": false
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

- When a class is renamed, also renames its class-typed constructor properties (promoted or not, readonly or not) and every `$this->x` usage to match the new class name — e.g. `private Teste $teste` becomes `private Novo $novo` when `Teste` is renamed to `Novo`.
- If more than one property shares the same type in a constructor, the file is skipped rather than guessing which one to rename.
- Accepts either a boolean or an object:
  ```json
  "phpNamespaceRefactor.renameProperties": true
  ```
  ```json
  "phpNamespaceRefactor.renameProperties": {
      "renameMismatchedNames": true
  }
  ```
  Setting an object automatically enables the feature. `renameMismatchedNames` (default `false`) additionally renames properties whose current name doesn't already match the class name on purpose (e.g. `private Teste $service` becomes `private Novo $novo`); without it, only properties already named after the old class are renamed.

- Default: false.

## Documentation

For architecture, internals, and troubleshooting notes, see [./docs/](./docs/README.md).

## Release notes

See [./CHANGELOG.md](./CHANGELOG.md)

---

By PHP Developer for PHP Developers 🐘
