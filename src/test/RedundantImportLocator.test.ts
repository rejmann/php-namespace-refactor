import * as assert from 'assert';

import { findRedundantImports } from '../domain/namespace/RedundantImportLocator';

function removeRanges(text: string, ranges: { start: number, end: number }[]): string {
  return [...ranges].reverse().reduce((result, { start, end }) => result.slice(0, start) + result.slice(end), text);
}

suite('RedundantImportLocator', () => {
  test('finds imports of sibling classes from the file\'s own namespace', () => {
    const text = '<?php\n\nnamespace App\\Sales;\n\nuse App\\Sales\\Invoice;\nuse App\\Domain\\Customer;\n\nclass Order {}\n';

    const ranges = findRedundantImports({ text, namespace: 'App\\Sales', classNames: ['Invoice'] });

    assert.strictEqual(
      removeRanges(text, ranges),
      '<?php\n\nnamespace App\\Sales;\n\nuse App\\Domain\\Customer;\n\nclass Order {}\n',
    );
  });

  /**
   * Matching by short name only used to delete this import, silently
   * switching which class "Invoice" refers to.
   */
  test('keeps an import of a same-named class from another namespace', () => {
    const text = 'namespace App\\Sales;\nuse App\\Legacy\\Invoice;\n';

    assert.deepStrictEqual(findRedundantImports({ text, namespace: 'App\\Sales', classNames: ['Invoice'] }), []);
  });

  /**
   * An aliased import is referenced by its alias; removing it broke every
   * "Bill" reference in the file.
   */
  test('keeps aliased imports', () => {
    const text = 'namespace App\\Sales;\nuse App\\Sales\\Invoice as Bill;\n';

    assert.deepStrictEqual(findRedundantImports({ text, namespace: 'App\\Sales', classNames: ['Invoice'] }), []);
  });

  test('ignores classes that are not listed', () => {
    const text = 'namespace App\\Sales;\nuse App\\Sales\\Order;\n';

    assert.deepStrictEqual(findRedundantImports({ text, namespace: 'App\\Sales', classNames: ['Invoice'] }), []);
  });

  test('handles a leading backslash, CRLF line endings and a last line without newline', () => {
    const text = 'namespace App;\r\nuse \\App\\Foo;\r\nuse App\\Bar;';

    assert.strictEqual(
      removeRanges(text, findRedundantImports({ text, namespace: 'App', classNames: ['Foo', 'Bar'] })),
      'namespace App;\r\n',
    );
  });

  test('removes every duplicated line, not only the first occurrence', () => {
    const text = 'namespace App;\nuse App\\Foo;\nuse App\\Foo;\n';

    assert.strictEqual(
      removeRanges(text, findRedundantImports({ text, namespace: 'App', classNames: ['Foo'] })),
      'namespace App;\n',
    );
  });
});
