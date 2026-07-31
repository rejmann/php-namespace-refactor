import 'reflect-metadata';

import * as assert from 'assert';

import { NamespaceMismatchDetector } from '../domain/namespace/NamespaceMismatchDetector';

suite('NamespaceMismatchDetector', () => {
  const detector = new NamespaceMismatchDetector();

  test('flags a declared namespace that differs from the expected one', () => {
    const result = detector.execute({
      declaredNamespace: 'App\\Old',
      expectedNamespace: 'App\\New',
    });
    assert.strictEqual(result, true);
  });

  test('does not flag a declared namespace that matches the expected one', () => {
    const result = detector.execute({
      declaredNamespace: 'App\\Services',
      expectedNamespace: 'App\\Services',
    });
    assert.strictEqual(result, false);
  });

  test('does not flag when there is no declared namespace to compare (nothing to insert into)', () => {
    const result = detector.execute({
      declaredNamespace: null,
      expectedNamespace: 'App\\Services',
    });
    assert.strictEqual(result, false);
  });

  test('does not flag when PSR-4 resolves no expected namespace (file outside any autoload prefix)', () => {
    const result = detector.execute({
      declaredNamespace: 'App\\Services',
      expectedNamespace: undefined,
    });
    assert.strictEqual(result, false);
  });
});
