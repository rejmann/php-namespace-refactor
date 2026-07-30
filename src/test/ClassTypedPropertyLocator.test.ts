import 'reflect-metadata';

import * as assert from 'assert';

import { ClassTypedPropertyLocator } from '../domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '../domain/property/ConstructorSpanFinder';

function locate(text: string, className: string) {
  const locator = new ClassTypedPropertyLocator(new ConstructorSpanFinder());
  return locator.execute({ text, className });
}

suite('ClassTypedPropertyLocator', () => {
  test('finds a promoted property', () => {
    const text = [
      'class UserController',
      '{',
      '  public function __construct(private Teste $teste)',
      '  {',
      '  }',
      '}',
    ].join('\n');

    const match = locate(text, 'Teste');
    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'teste');
    assert.strictEqual(match!.isPromoted, true);
    assert.strictEqual(match!.hasSeparateDeclaration, false);
  });

  test('finds a promoted readonly property regardless of modifier order', () => {
    const first = locate('function __construct(private readonly Teste $teste) {}', 'Teste');
    const second = locate('function __construct(readonly private Teste $teste) {}', 'Teste');

    assert.strictEqual(first!.propertyName, 'teste');
    assert.strictEqual(second!.propertyName, 'teste');
  });

  test('finds a non-promoted property confirmed by a constructor assignment', () => {
    const text = [
      'class UserController',
      '{',
      '  private Teste $teste;',
      '',
      '  public function __construct(Teste $teste)',
      '  {',
      '    $this->teste = $teste;',
      '  }',
      '}',
    ].join('\n');

    const match = locate(text, 'Teste');
    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'teste');
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
      '  public function __construct(Teste $teste)',
      '  {',
      '    $teste->validate();',
      '  }',
      '}',
    ].join('\n');

    assert.strictEqual(locate(text, 'Teste'), null);
  });

  test('matches a property with a mismatched name', () => {
    const text = 'function __construct(private Teste $service) {}';
    const match = locate(text, 'Teste');

    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'service');
  });

  test('matches a nullable type hint', () => {
    const text = 'function __construct(private ?Teste $teste) {}';
    const match = locate(text, 'Teste');

    assert.ok(match);
    assert.strictEqual(match!.propertyName, 'teste');
  });

  test('returns null when there is no constructor', () => {
    assert.strictEqual(locate('class Teste {}', 'Teste'), null);
  });

  test('returns null when the class type does not appear in the constructor', () => {
    const text = 'function __construct(private Other $other) {}';
    assert.strictEqual(locate(text, 'Teste'), null);
  });

  test('returns null when two parameters share the same type (ambiguous)', () => {
    const text = 'function __construct(private Teste $a, private Teste $b) {}';
    assert.strictEqual(locate(text, 'Teste'), null);
  });
});
