import 'reflect-metadata';

import * as assert from 'assert';

import { UseStatementSorter } from '../domain/namespace/UseStatementSorter';

suite('UseStatementSorter', () => {
  const sorter = new UseStatementSorter();

  test('alphabetical sorts strictly by character order', () => {
    const statements = [
      { fullNamespace: 'App\\Item10', line: 'use App\\Item10;' },
      { fullNamespace: 'App\\Item2', line: 'use App\\Item2;' },
      { fullNamespace: 'App\\Apple', line: 'use App\\Apple;' },
    ];

    const result = sorter.sort(statements, 'alphabetical').map(s => s.fullNamespace);

    assert.deepStrictEqual(result, ['App\\Apple', 'App\\Item10', 'App\\Item2']);
  });

  test('natural sorts numeric segments in numeric order', () => {
    const statements = [
      { fullNamespace: 'App\\Item10', line: 'use App\\Item10;' },
      { fullNamespace: 'App\\Item2', line: 'use App\\Item2;' },
      { fullNamespace: 'App\\Apple', line: 'use App\\Apple;' },
    ];

    const result = sorter.sort(statements, 'natural').map(s => s.fullNamespace);

    assert.deepStrictEqual(result, ['App\\Apple', 'App\\Item2', 'App\\Item10']);
  });

  test('length sorts the shortest "use" statement first', () => {
    const statements = [
      { fullNamespace: 'App\\Services\\AuthService', line: 'use App\\Services\\AuthService;' },
      { fullNamespace: 'App\\User', line: 'use App\\User;' },
    ];

    const result = sorter.sort(statements, 'length').map(s => s.fullNamespace);

    assert.deepStrictEqual(result, ['App\\User', 'App\\Services\\AuthService']);
  });

  test('does not mutate the input array', () => {
    const statements = [
      { fullNamespace: 'App\\B', line: 'use App\\B;' },
      { fullNamespace: 'App\\A', line: 'use App\\A;' },
    ];

    sorter.sort(statements, 'alphabetical');

    assert.deepStrictEqual(statements.map(s => s.fullNamespace), ['App\\B', 'App\\A']);
  });
});
