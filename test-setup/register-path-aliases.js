/**
 * The extension bundles @app/@domain/@infra path aliases with esbuild for the
 * production build, but `compile-tests` only runs plain tsc, which leaves
 * those aliases unresolved in the compiled `out/` output. Node can't resolve
 * them at test-run time without this shim, so this must load before mocha
 * requires any spec file (wired via `mocha.require` in .vscode-test.mjs).
 */
const path = require('path');
const Module = require('module');

const OUT_DIR = path.join(__dirname, '..', 'out');

const ALIASES = {
  '@app/': path.join(OUT_DIR, 'app') + path.sep,
  '@domain/': path.join(OUT_DIR, 'domain') + path.sep,
  '@infra/': path.join(OUT_DIR, 'infra') + path.sep,
};

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, ...rest) {
  for (const [prefix, target] of Object.entries(ALIASES)) {
    if (request.startsWith(prefix)) {
      const resolved = path.join(target, request.slice(prefix.length));
      return originalResolveFilename.call(this, resolved, ...rest);
    }
  }

  return originalResolveFilename.call(this, request, ...rest);
};
