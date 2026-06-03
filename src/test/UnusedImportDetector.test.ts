import 'reflect-metadata';

import * as assert from 'assert';

import { UnusedImportDetector } from '../domain/namespace/UnusedImportDetector';

suite('UnusedImportDetector', () => {
  let detector: UnusedImportDetector;

  setup(() => {
    detector = new UnusedImportDetector();
  });

  /**
   * Scenario 5 – when moving a class to a directory where it is used by other
   * classes, those classes must receive the import automatically.
   * UnusedImportDetector decides which class names are in use and not yet
   * imported.
   */
  suite('Scenario 5 – detect classes that need to be imported', () => {
    test('returns className when it is used in the content and not yet imported', () => {
      const content = 'namespace App\\Http;\n\nclass Controller {\n  public function index(UserService $s) {}\n}';
      const result = detector.execute({ contentDocument: content, classes: ['UserService'] });
      assert.deepStrictEqual(result, ['UserService']);
    });

    test('returns multiple classes that are used and not imported', () => {
      const content = 'namespace App;\n\nclass Foo {\n  public function run(UserService $u, OrderService $o) {}\n}';
      const result = detector.execute({
        contentDocument: content,
        classes: ['UserService', 'OrderService', 'PaymentService'],
      });
      assert.ok(result.includes('UserService'));
      assert.ok(result.includes('OrderService'));
      assert.strictEqual(result.length, 2);
    });

    test('does not return classes already imported via use statement', () => {
      const content = 'namespace App;\nuse App\\Domain\\UserService;\n\nclass Foo {\n  public function run(UserService $u) {}\n}';
      const result = detector.execute({ contentDocument: content, classes: ['UserService'] });
      assert.deepStrictEqual(result, []);
    });
  });

  /**
   * Scenario 2 – when moving to the same directory where the class is already
   * used, no import should be added. The detector must not return a class that
   * already has a use statement.
   *
   * Scenario 6 – when a class moves to a directory where another class already
   * uses it and both end up in the same directory, the use statement should be
   * removed. The detector must not flag the class as "needs import".
   */
  suite('Scenario 2/6 – no duplicate import when use statement already exists', () => {
    test('excludes a class with a fully-qualified use statement', () => {
      const content = 'namespace App;\nuse App\\Services\\Order;\n\nclass Checkout {\n  function pay(Order $o) {}\n}';
      const result = detector.execute({ contentDocument: content, classes: ['Order'] });
      assert.deepStrictEqual(result, []);
    });

    test('does not return a class that does not appear in the body even without a use statement', () => {
      const content = [
        'namespace App;',
        'use App\\Domain\\User;',
        'use App\\Domain\\Product;',
        'class Cart { function add(User $u, Product $p) {} }',
      ].join('\n');

      const result = detector.execute({
        contentDocument: content,
        classes: ['User', 'Product', 'Order'],
      });

      assert.deepStrictEqual(result, []);
    });

    test('returns only classes without a use statement when they appear in the body', () => {
      const content = [
        'namespace App;',
        'use App\\Domain\\User;',
        'use App\\Domain\\Product;',
        'class Cart { function add(User $u, Product $p, Order $o) {} }',
      ].join('\n');

      const result = detector.execute({
        contentDocument: content,
        classes: ['User', 'Product', 'Order'],
      });

      assert.deepStrictEqual(result, ['Order']);
      assert.ok(!result.includes('User'));
      assert.ok(!result.includes('Product'));
    });
  });

  suite('Additional cases', () => {
    test('returns empty when none of the listed classes are used', () => {
      const content = 'namespace App;\n\nclass Foo { function bar() { return 1; } }';
      const result = detector.execute({ contentDocument: content, classes: ['UserService', 'OrderService'] });
      assert.deepStrictEqual(result, []);
    });

    test('returns empty when the class list is empty', () => {
      const result = detector.execute({ contentDocument: 'class Foo {}', classes: [] });
      assert.deepStrictEqual(result, []);
    });

    test('does not duplicate results when a class appears multiple times in the content', () => {
      const content = 'class Foo { function a(UserService $u) {} function b(UserService $u) {} }';
      const result = detector.execute({ contentDocument: content, classes: ['UserService'] });
      assert.strictEqual(result.length, 1);
    });
  });
});
