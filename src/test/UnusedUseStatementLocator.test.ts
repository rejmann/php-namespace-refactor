import 'reflect-metadata';

import * as assert from 'assert';

import { ClassNameBoundaryRegexBuilder } from '../domain/namespace/ClassNameBoundaryRegexBuilder';
import { UnusedUseStatementLocator } from '../domain/namespace/UnusedUseStatementLocator';

function buildLocator(): UnusedUseStatementLocator {
  return new UnusedUseStatementLocator(new ClassNameBoundaryRegexBuilder());
}

suite('UnusedUseStatementLocator', () => {
  test('flags an import that is never referenced in the body', () => {
    const content = [
      '<?php',
      '',
      'namespace App;',
      '',
      'use App\\Services\\AuthService;',
      '',
      'class Order {}',
      '',
    ].join('\n');

    const result = buildLocator().execute(content);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].fullNamespace, 'App\\Services\\AuthService');
  });

  test('does not flag an import that is referenced in the body', () => {
    const content = [
      '<?php',
      '',
      'namespace App;',
      '',
      'use App\\Services\\AuthService;',
      '',
      'class Order {',
      '    public function __construct(private AuthService $auth) {}',
      '}',
      '',
    ].join('\n');

    assert.deepStrictEqual(buildLocator().execute(content), []);
  });

  test('does not flag an import referenced only through its alias', () => {
    const content = [
      '<?php',
      '',
      'namespace App;',
      '',
      'use App\\Services\\AuthService as Auth;',
      '',
      'class Order {',
      '    public function __construct(private Auth $auth) {}',
      '}',
      '',
    ].join('\n');

    assert.deepStrictEqual(buildLocator().execute(content), []);
  });

  test('does not treat an indented trait "use" inside a class body as an import', () => {
    const content = [
      '<?php',
      '',
      'namespace App;',
      '',
      'class Order {',
      '    use SomeTrait;',
      '}',
      '',
    ].join('\n');

    assert.deepStrictEqual(buildLocator().execute(content), []);
  });

  test('returns an empty array for a file with no imports', () => {
    const content = '<?php\n\nnamespace App;\n\nclass Order {}\n';

    assert.deepStrictEqual(buildLocator().execute(content), []);
  });
});
