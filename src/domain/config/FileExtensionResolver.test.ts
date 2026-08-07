import 'reflect-metadata';

import { ConfigurationLocator, Props } from '@domain/config/ConfigurationLocator';
import { FileExtensionResolver } from '@domain/config/FileExtensionResolver';
import * as assert from 'assert';

function fakeConfigurationLocator(additionalExtensions: string[]): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => (additionalExtensions.length
      ? additionalExtensions as unknown as T
      : defaultValue as T),
  } as ConfigurationLocator;
}

function resolverWith(additionalExtensions: string[] = []): FileExtensionResolver {
  return new FileExtensionResolver(fakeConfigurationLocator(additionalExtensions));
}

/**
 * https://github.com/rejmann/php-namespace-refactor/issues/72
 *
 * `additionalExtensions` must be honoured when matching a file's extension,
 * with the longest configured suffix winning so a compound convention like
 * `class.php` is never shadowed by the plain `php` entry.
 */
suite('FileExtensionResolver', () => {
  suite('match', () => {
    test('matches the default .php extension with no configuration', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.match('Color.php'), '.php');
    });

    test('matches a configured compound extension in full', () => {
      const resolver = resolverWith(['class.php']);
      assert.strictEqual(resolver.match('Color.class.php'), '.class.php');
    });

    test('prefers the longest configured suffix over the plain extension', () => {
      const resolver = resolverWith(['enum.php']);
      assert.strictEqual(resolver.match('Color.enum.php'), '.enum.php');
    });

    test('still matches the plain extension when no compound suffix applies', () => {
      const resolver = resolverWith(['enum.php']);
      assert.strictEqual(resolver.match('Repository.php'), '.php');
    });

    test('matches case-insensitively but returns the suffix in its original case', () => {
      const resolver = resolverWith(['enum.php']);
      assert.strictEqual(resolver.match('Color.ENUM.PHP'), '.ENUM.PHP');
    });

    test('strips a leading dot from configured extensions', () => {
      const resolver = resolverWith(['.class.php']);
      assert.strictEqual(resolver.match('Color.class.php'), '.class.php');
    });

    test('returns null when nothing configured matches', () => {
      const resolver = resolverWith();
      assert.strictEqual(resolver.match('readme.txt'), null);
    });

    test('always includes php even when additionalExtensions omits it', () => {
      const resolver = resolverWith(['trait.php']);
      assert.strictEqual(resolver.match('Color.php'), '.php');
    });
  });
});
