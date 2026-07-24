import 'reflect-metadata';

import * as assert from 'assert';

import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';

function fakeConfigurationLocator(additionalExtensions: string[]): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => (additionalExtensions.length
      ? additionalExtensions as unknown as T
      : defaultValue as T),
  } as ConfigurationLocator;
}

function resolverWith(additionalExtensions: string[] = []): WorkspacePathResolver {
  return new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakeConfigurationLocator(additionalExtensions)),
  );
}

/**
 * https://github.com/rejmann/php-namespace-refactor/issues/72
 *
 * Compound file-naming conventions (Color.enum.php, Repository.trait.php, ...) must
 * only lose the segments listed in `additionalExtensions`, never a chunk of the class
 * name itself.
 */
suite('WorkspacePathResolver', () => {
  suite('extractClassNameFromPath', () => {
    test('strips a plain .php extension', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Color.php'), 'Color');
    });

    test('honours configured compound extensions, keeping the middle segment out', () => {
      const resolver = resolverWith(['class.php', 'trait.php', 'enum.php', 'interface.php']);

      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Color.enum.php'), 'Color');
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Repository.trait.php'), 'Repository');
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Foo.interface.php'), 'Foo');
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Bar.class.php'), 'Bar');
    });

    test('leaks the middle segment when the compound extension is not configured', () => {
      // Documents today's default behaviour: without `class.php` in
      // additionalExtensions there is no way to tell the middle segment
      // apart from the class name, so it stays in the extracted name.
      const resolver = resolverWith();
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/OutroTest.class.php'), 'OutroTest.class');
    });

    test('matches configured extensions case-insensitively', () => {
      const resolver = resolverWith(['enum.php']);
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Color.ENUM.php'), 'Color');
    });

    test('picks the longest matching suffix so plain .php never shadows a compound extension', () => {
      const resolver = resolverWith(['enum.php']);
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/Color.enum.php'), 'Color');
    });

    test('leaves the file name untouched when no configured extension matches', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.extractClassNameFromPath('/src/Domain/readme.txt'), 'readme.txt');
    });
  });

  suite('extractExtensionFromPath', () => {
    test('returns the plain .php extension', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.extractExtensionFromPath('/src/Domain/Color.php'), '.php');
    });

    test('returns the full compound extension when configured', () => {
      const resolver = resolverWith(['enum.php']);
      assert.strictEqual(resolver.extractExtensionFromPath('/src/Domain/Color.enum.php'), '.enum.php');
    });

    test('falls back to the last dot segment when nothing configured matches', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.extractExtensionFromPath('/src/Domain/readme.txt'), '.txt');
    });
  });

  suite('extractDirectoryFromPath', () => {
    test('returns the containing directory', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.extractDirectoryFromPath('/src/Domain/Color.php'), '/src/Domain');
    });
  });
});
