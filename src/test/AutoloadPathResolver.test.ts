import 'reflect-metadata';

import * as assert from 'assert';

import { AutoloadPathResolver, mostSpecificFirst, psr4Entries } from '../infra/autoload/AutoloadPathResolver';

function resolve(autoloads: Parameters<AutoloadPathResolver['execute']>[0]['autoloads'], file: string) {
  return new AutoloadPathResolver().execute({ autoloads, workspaceRoot: file });
}

suite('AutoloadPathResolver', () => {
  test('maps a file to the namespace of its directory', async () => {
    assert.strictEqual(await resolve([{ 'App\\': 'src/' }], 'src/Domain/User.php'), 'App\\Domain');
    assert.strictEqual(await resolve([{ 'App\\': 'src/' }], 'src/User.php'), 'App');
  });

  /**
   * Entries used to be tried in composer.json order, so a broader mapping
   * declared first shadowed a more specific one.
   */
  test('prefers the most specific directory regardless of declaration order', async () => {
    const autoload = { 'App\\': 'src/', 'Domain\\': 'src/Domain/' };

    assert.strictEqual(await resolve([autoload], 'src/Domain/Sales/Order.php'), 'Domain\\Sales');
  });

  test('matches whole path segments only', async () => {
    assert.strictEqual(await resolve([{ 'App\\': 'src' }], 'srcfoo/Domain/User.php'), null);
  });

  /**
   * NamespaceCreator used to stop at autoload: an unmatched autoload gave ''
   * rather than null, so files under autoload-dev got no namespace.
   */
  test('uses autoload-dev too, the most specific entry winning across both', async () => {
    const autoload = { 'App\\': 'src/' };
    const autoloadDev = { 'App\\Tests\\': 'tests/' };

    assert.strictEqual(await resolve([autoload, autoloadDev], 'tests/Unit/UserTest.php'), 'App\\Tests\\Unit');
  });

  test('handles ./ directories, directories without a trailing slash and the project root', async () => {
    assert.strictEqual(await resolve([{ 'App\\': './src' }], 'src/Domain/User.php'), 'App\\Domain');
    assert.strictEqual(await resolve([{ 'App\\': '' }], 'src/User.php'), 'App\\src');
  });

  test('handles a prefix mapped to several directories', async () => {
    assert.strictEqual(await resolve([{ 'App\\': ['src/', 'lib/'] }], 'lib/Util/Str.php'), 'App\\Util');
  });

  test('maps the global namespace to an empty string', async () => {
    assert.strictEqual(await resolve([{ '': 'src/' }], 'src/User.php'), '');
    assert.strictEqual(await resolve([{ '': 'src/' }], 'src/Domain/User.php'), 'Domain');
  });

  test('returns null when no mapping applies', async () => {
    assert.strictEqual(await resolve([{ 'App\\': 'src/' }], 'bin/Tool.php'), null);
    assert.strictEqual(await resolve([{}, undefined], 'src/User.php'), null);
  });

  suite('mostSpecificFirst', () => {
    test('orders entries by prefix length, longest first', () => {
      const entries = psr4Entries([{ 'App\\': 'src/' }, { 'App\\Tests\\': 'tests/', 'Acme\\': 'acme/' }]);

      assert.deepStrictEqual(
        mostSpecificFirst(entries, 'prefix').map(entry => entry.prefix),
        ['App\\Tests', 'Acme', 'App'],
      );
    });
  });
});
