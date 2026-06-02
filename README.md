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


## Namespace Index Cache

To speed up namespace lookups, the extension builds a `namespace-index.json` on every activation. This index maps each namespace to the files that import it, avoiding a full workspace scan on every refactor operation.

### How it works

On activation, all PHP files in the workspace are scanned and two maps are built:

- **`files`** — each file's declared namespace and its `use` imports.
- **`usages`** — inverted index: given a namespace, which files import it.

The index is kept up-to-date during the session via file system events:

| Event | Action |
|---|---|
| File created | Parses the new file and adds it to the index |
| File saved | Re-parses the file and updates its entry |
| File deleted | Removes the file from the index |

### Where the cache is stored

The file is stored in VS Code's workspace storage, isolated per project and per session:

```
~/.config/Code/User/workspaceStorage/<workspace-hash>/<publisher>.<extension>/namespace-index.json
```

To find the hash for your current project:

```bash
grep -rl "your-project-folder" ~/.config/Code/User/workspaceStorage/*/workspace.json
```

Example output:
```
/home/user/.config/Code/User/workspaceStorage/58c76f185bb1a645e121bf49daf7664c/workspace.json
```

The cache path would then be:

```
~/.config/Code/User/workspaceStorage/58c76f185bb1a645e121bf49daf7664c/rejman.php-namespace-refactor/namespace-index.json
```

### Cache format

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

### Inspecting or clearing the cache

**View the cache:**
```bash
cat ~/.config/Code/User/workspaceStorage/<hash>/rejman.php-namespace-refactor/namespace-index.json | jq
```

**Delete the cache** (it will be rebuilt on next activation):
```bash
rm ~/.config/Code/User/workspaceStorage/<hash>/rejman.php-namespace-refactor/namespace-index.json
```

**Find all caches for this extension across projects:**
```bash
find ~/.config/Code/User/workspaceStorage -name "namespace-index.json" 2>/dev/null
```

## Release notes

See [./CHANGELOG.md](./CHANGELOG.md)

---

By PHP Developer for PHP Developers 🐘
