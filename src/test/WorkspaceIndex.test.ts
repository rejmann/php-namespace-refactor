import * as assert from 'assert';

import { isIgnoredPath } from '../infra/index/WorkspaceIndex';

const DEFAULTS = ['/vendor/', '/var/', '/cache/'];

suite('WorkspaceIndex', () => {
  suite('isIgnoredPath', () => {
    test('ignores files inside an ignored directory of the project', () => {
      assert.strictEqual(isIgnoredPath('vendor/acme/lib/Foo.php', DEFAULTS), true);
      assert.strictEqual(isIgnoredPath('var/cache/Container.php', DEFAULTS), true);
      assert.strictEqual(isIgnoredPath('src/Infra/cache/Item.php', DEFAULTS), true);
    });

    test('keeps project files', () => {
      assert.strictEqual(isIgnoredPath('src/Domain/User.php', DEFAULTS), false);
    });

    /**
     * The project itself living under /var/www used to make every file match
     * "/var/", since the absolute path was checked.
     */
    test('does not ignore a project living under an ignored-looking directory', () => {
      assert.strictEqual(isIgnoredPath('src/Domain/User.php', DEFAULTS), false);
      assert.strictEqual(isIgnoredPath('/src/Domain/User.php', DEFAULTS), false);
    });

    test('normalizes Windows separators', () => {
      assert.strictEqual(isIgnoredPath('vendor\\acme\\Foo.php', DEFAULTS), true);
    });

    test('honours configured directories', () => {
      assert.strictEqual(isIgnoredPath('build/Generated.php', [...DEFAULTS, '/build/']), true);
    });
  });
});
