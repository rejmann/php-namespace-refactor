# Technical documentation

Documentation to support development and troubleshooting of the PHP Namespace Refactor extension. For installation, user settings, and general usage, see the [main README](../README.md).

## Where to start

- **[Architecture](./architecture.md)** — project layers, dependency injection, activation flow. Start here if this is your first time reading the codebase.
- **[Configuration](./configuration.md)** — every setting and which class reads it.

## How each operation works

- **[Namespace rename](./operations/namespace-rename.md)** — F2 on `namespace Foo\Bar;`
- **[Class rename](./operations/class-rename.md)** — F2 on `class Foo`/`interface Foo`/`trait Foo`
- **[File move](./operations/file-move.md)** — drag-and-drop in the Explorer (and the convergence point of the two flows above)
- **[Diagnostics and quick fixes](./diagnostics.md)** — namespace-mismatch/unused-import/missing-import checks in the Problems panel, and the `removeOnSave`/`sortOnSave` save-time edits

## Infrastructure

- **[Namespace index](./namespace-index.md)** — on-disk cache (`namespace-index.json`) used to locate references quickly, how it's built and kept up to date, and how to inspect/clear it
- **[PSR-4 autoload resolution](./autoload.md)** — how `composer.json` is read and mapped to namespaces/directories; starting point for investigating "namespace rename doesn't work"
