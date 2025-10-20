# PHP Namespace Refactor 🇧🇷

Hi PHP Developers 👋!

PHP Namespace Refactor: Extension for Visual Studio Code that automatically refactors namespace and references when moving PHP files between directories.

## Features

### 🚀 Automatic namespace refactoring

The extension automatically detects when a PHP file is moved (dragged and dropped) between directories and updates:
    - The namespace declared in the file.
    - All references to the old namespace in other files in the project.

Ideal for projects using PSR-4, making it easy to reorganize directories without breaking dependencies.

- Ignored Directories: Specify directories to exclude from namespace refactoring.

- Auto Import Namespace: Automatically import objects from the moved class's directory that were not previously imported because they share the same namespace.

- Remove Unused Imports: Clean up unused imports from the same namespace.

- Additional Extensions:  Specify the file extensions to consider during the namespace refactoring process.

## Requirements

- PHP 7.4+
- Composer configured in the project for namespace detection.
- Workspace configured no Visual Studio Code com arquivos .php

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
    "phpNamespaceRefactor.rename": true
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


## Release notes

See [./CHANGELOG.md](./CHANGELOG.md)

---

By PHP Developer for PHP Developers 🐘
