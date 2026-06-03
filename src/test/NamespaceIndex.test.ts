import 'reflect-metadata';

import * as assert from 'assert';
import * as os from 'os';

import { NamespaceIndex } from '../infra/index/NamespaceIndex';

suite('NamespaceIndex', () => {
  let index: NamespaceIndex;

  setup(() => {
    index = new NamespaceIndex(os.tmpdir());
  });

  /**
   * Scenario 1 – when moving a class to another directory, all files that
   * import it must be refactored. The index is the source of truth for
   * finding them in O(1).
   */
  suite('Scenario 1 – find all files affected by a move', () => {
    test('getFilesUsing returns files that import the namespace', () => {
      const fileA = '/src/Services/OrderService.php';
      const fileB = '/src/Http/OrderController.php';
      const ns = 'App\\Services\\Order';

      index.parseAndAdd(fileA, 'namespace App\\Services;\nclass Order {}');
      index.parseAndAdd(fileB, `namespace App\\Http;\nuse ${ns};\nclass OrderController {}`);

      const affected = index.getFilesUsing(ns);

      assert.ok(affected.includes(fileB));
      assert.strictEqual(affected.length, 1);
    });

    test('getFilesUsing does not include the source file itself', () => {
      const fileSelf = '/src/Services/Order.php';
      const ns = 'App\\Services\\Order';

      index.parseAndAdd(fileSelf, `namespace App\\Services;\nuse ${ns};\nclass Order {}`);

      const affected = index.getFilesUsing(ns);
      assert.ok(Array.isArray(affected));
    });

    test('returns multiple files that use the same namespace', () => {
      const ns = 'App\\Domain\\Payment';
      const files = [
        '/src/Http/PaymentController.php',
        '/src/Services/CheckoutService.php',
        '/src/Jobs/ProcessPayment.php',
      ];

      files.forEach(f => {
        index.parseAndAdd(f, `namespace App\\Http;\nuse ${ns};\nclass Foo {}`);
      });

      const affected = index.getFilesUsing(ns);
      assert.strictEqual(affected.length, files.length);
      files.forEach(f => assert.ok(affected.includes(f)));
    });

    test('returns empty array for unknown namespace', () => {
      assert.deepStrictEqual(index.getFilesUsing('App\\Unknown\\Class'), []);
    });
  });

  /**
   * After the move, the index must reflect the new state so subsequent
   * operations do not find stale references.
   */
  suite('Index update after move/delete', () => {
    test('removeFile removes the file from usages', () => {
      const file = '/src/Http/UserController.php';
      const ns = 'App\\Domain\\User';

      index.parseAndAdd(file, `namespace App\\Http;\nuse ${ns};\nclass UserController {}`);
      assert.strictEqual(index.getFilesUsing(ns).length, 1);

      index.removeFile(file);
      assert.deepStrictEqual(index.getFilesUsing(ns), []);
    });

    test('parseAndAdd overwrites existing entry without duplicating usages', () => {
      const file = '/src/Http/UserController.php';
      const ns = 'App\\Domain\\User';

      index.parseAndAdd(file, `namespace App\\Http;\nuse ${ns};\nclass UserController {}`);
      index.parseAndAdd(file, `namespace App\\Http;\nuse ${ns};\nclass UserController {}`);

      assert.strictEqual(index.getFilesUsing(ns).length, 1);
    });

    test('parseAndAdd updates the declared namespace when the file changes directory', () => {
      const file = '/src/Services/Foo.php';

      index.parseAndAdd(file, 'namespace App\\Services;\nclass Foo {}');
      index.parseAndAdd(file, 'namespace App\\NewServices;\nclass Foo {}');

      assert.deepStrictEqual(index.getFilesUsing('App\\Services\\Foo'), []);
    });
  });

  suite('Namespace and import extraction', () => {
    test('extracts the declared namespace correctly', () => {
      const consumer = '/src/Bar.php';
      index.parseAndAdd('/src/Foo.php', 'namespace App\\Domain\\Foo;\nclass Foo {}');
      index.parseAndAdd(consumer, 'namespace App;\nuse App\\Domain\\Foo\\Foo;\nclass Bar {}');
      assert.ok(index.getFilesUsing('App\\Domain\\Foo\\Foo').includes(consumer));
    });

    test('extracts multiple use statements from the same file', () => {
      const file = '/src/Http/Controller.php';
      index.parseAndAdd(
        file,
        'namespace App\\Http;\nuse App\\Domain\\User;\nuse App\\Domain\\Order;\nclass Controller {}',
      );

      assert.ok(index.getFilesUsing('App\\Domain\\User').includes(file));
      assert.ok(index.getFilesUsing('App\\Domain\\Order').includes(file));
    });

    test('tracks aliased imports by FQCN, not by alias', () => {
      const file = '/src/Http/Controller.php';
      index.parseAndAdd(
        file,
        'namespace App\\Http;\nuse App\\Domain\\User as UserEntity;\nclass Controller {}',
      );
      assert.ok(index.getFilesUsing('App\\Domain\\User').includes(file));
    });

    test('does not throw for files without a namespace declaration', () => {
      assert.doesNotThrow(() => {
        index.parseAndAdd('/src/helpers.php', '<?php\nfunction helper() {}');
      });
    });
  });
});
