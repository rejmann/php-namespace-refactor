import 'reflect-metadata';

import { ClassTypedPropertyLocator } from '@domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '@domain/property/ConstructorSpanFinder';
import * as assert from 'assert';

function locate(text: string, className: string) {
  const locator = new ClassTypedPropertyLocator(new ConstructorSpanFinder());
  return locator.execute({ text, className });
}

suite('ClassTypedPropertyLocator', () => {
  test('finds a promoted property', () => {
    const text = [
      'class UserController',
      '{',
      '  public function __construct(private Test $test)',
      '  {',
      '  }',
      '}',
    ].join('\n');

    const match = locate(text, 'Test');
    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'test');
    assert.strictEqual(match!.isPromoted, true);
    assert.strictEqual(match!.hasSeparateDeclaration, false);
  });

  test('finds a promoted readonly property regardless of modifier order', () => {
    const first = locate('function __construct(private readonly Test $test) {}', 'Test');
    const second = locate('function __construct(readonly private Test $test) {}', 'Test');

    assert.strictEqual(first!.propertyName, 'test');
    assert.strictEqual(second!.propertyName, 'test');
  });

  test('finds a non-promoted property confirmed by a constructor assignment', () => {
    const text = [
      'class UserController',
      '{',
      '  private Test $test;',
      '',
      '  public function __construct(Test $test)',
      '  {',
      '    $this->test = $test;',
      '  }',
      '}',
    ].join('\n');

    const match = locate(text, 'Test');
    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'test');
    assert.strictEqual(match!.isPromoted, false);
    assert.strictEqual(match!.hasSeparateDeclaration, true);
  });

  test('finds an untyped property declared only via a @var docblock', () => {
    const text = [
      'class UserService',
      '{',
      '  /**',
      '   * @var UserRepository',
      '   */',
      '  private $repository;',
      '',
      '  public function __construct(UserRepository $repository)',
      '  {',
      '    $this->repository = $repository;',
      '  }',
      '}',
    ].join('\n');

    const match = locate(text, 'UserRepository');
    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'repository');
    assert.strictEqual(match!.isPromoted, false);
    assert.strictEqual(match!.hasSeparateDeclaration, true);
  });

  test('ignores a non-promoted parameter that is never stored on $this', () => {
    const text = [
      'class Validator',
      '{',
      '  public function __construct(Test $test)',
      '  {',
      '    $test->validate();',
      '  }',
      '}',
    ].join('\n');

    assert.strictEqual(locate(text, 'Test'), null);
  });

  test('matches a property with a mismatched name', () => {
    const text = 'function __construct(private Test $service) {}';
    const match = locate(text, 'Test');

    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'service');
  });

  test('matches a nullable type hint', () => {
    const text = 'function __construct(private ?Test $test) {}';
    const match = locate(text, 'Test');

    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'test');
  });

  test('returns null when there is no constructor', () => {
    assert.strictEqual(locate('class Test {}', 'Test'), null);
  });

  test('returns null when the class type does not appear in the constructor', () => {
    const text = 'function __construct(private Other $other) {}';
    assert.strictEqual(locate(text, 'Test'), null);
  });

  test('returns null when two parameters share the same type (ambiguous)', () => {
    const text = 'function __construct(private Test $a, private Test $b) {}';
    assert.strictEqual(locate(text, 'Test'), null);
  });
});
