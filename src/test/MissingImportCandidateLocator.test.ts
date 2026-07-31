import 'reflect-metadata';

import * as assert from 'assert';

import { MissingImportCandidateLocator } from '../domain/namespace/MissingImportCandidateLocator';

suite('MissingImportCandidateLocator', () => {
  const locator = new MissingImportCandidateLocator();

  test('flags a bare capitalized identifier used as a type hint', () => {
    const content = '<?php\n\nnamespace App;\n\nclass Order {\n    public function __construct(private AuthService $auth) {}\n}\n';

    const result = locator.execute(content, 'Order');

    assert.deepStrictEqual(result.map(c => c.identifier), ['AuthService']);
  });

  test('does not flag an identifier that is already imported', () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Services\\AuthService;\n\nclass Order {\n    public function __construct(private AuthService $auth) {}\n}\n';

    assert.deepStrictEqual(locator.execute(content, 'Order'), []);
  });

  test('does not flag an identifier covered by an aliased import', () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Services\\AuthService as Auth;\n\nclass Order {\n    public function __construct(private Auth $auth) {}\n}\n';

    assert.deepStrictEqual(locator.execute(content, 'Order'), []);
  });

  test('does not flag the file\'s own class name', () => {
    const content = '<?php\n\nnamespace App;\n\nclass Order {\n    public function make(): Order { return new Order(); }\n}\n';

    assert.deepStrictEqual(locator.execute(content, 'Order'), []);
  });

  test('does not flag a multi-segment FQCN reference', () => {
    const content = '<?php\n\nnamespace App;\n\nclass Order {\n    public function make(): \\App\\Services\\AuthService { return \\App\\Services\\AuthService::make(); }\n}\n';

    assert.deepStrictEqual(locator.execute(content, 'Order'), []);
  });

  test('flags the class before "::" but not the constant/method after it', () => {
    const content = '<?php\n\nnamespace App;\n\nclass Order {\n    public function make() { return Status::ACTIVE; }\n}\n';

    const result = locator.execute(content, 'Order');

    assert.deepStrictEqual(result.map(c => c.identifier), ['Status']);
  });

  test('deduplicates repeated usages of the same missing identifier', () => {
    const content = '<?php\n\nnamespace App;\n\nclass Order {\n    private AuthService $a;\n    private AuthService $b;\n}\n';

    const result = locator.execute(content, 'Order');

    assert.strictEqual(result.length, 1);
  });
});
