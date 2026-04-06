import 'reflect-metadata';

import * as assert from 'assert';
import * as vscode from 'vscode';

import { UseStatementLocator } from '../domain/namespace/UseStatementLocator';

async function openDocument(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ content, language: 'php' });
}

suite('UseStatementLocator', () => {
  let locator: UseStatementLocator;

  beforeEach(() => {
    locator = new UseStatementLocator();
  });

  /**
   * Scenario 5/6 – find the correct insertion point for adding or removing
   * use statements after moving a class between directories.
   */
  suite('Scenario 5 – insertion point for a new use statement', () => {
    test('returns position after the last existing use statement with isFirstUse = false', async () => {
      const lastUse = 'use App\\Domain\\Order;';
      const content = [
        '<?php',
        'namespace App\\Http;',
        '',
        'use App\\Domain\\User;',
        lastUse,
        '',
        'class Controller {}',
      ].join('\n');

      const doc = await openDocument(content);
      const location = locator.execute({ document: doc });

      assert.strictEqual(location.isFirstUse, false);
      const expectedEnd = content.indexOf(lastUse) + lastUse.length;
      assert.strictEqual(location.index, expectedEnd);
    });

    test('returns position after namespace when there are no use statements with isFirstUse = true', async () => {
      const nsLine = 'namespace App\\Http;';
      const content = ['<?php', nsLine, '', 'class Controller {}'].join('\n');

      const doc = await openDocument(content);
      const location = locator.execute({ document: doc });

      assert.strictEqual(location.isFirstUse, true);
      const nsEnd = content.indexOf(nsLine) + nsLine.length;
      assert.strictEqual(location.index, nsEnd);
    });

    test('returns index 0 when there is no namespace or use statements', async () => {
      const doc = await openDocument('<?php\nclass Foo {}');
      const location = locator.execute({ document: doc });
      assert.strictEqual(location.index, 0);
    });
  });

  suite('Additional cases', () => {
    test('uses position after an aliased use statement as the insertion point', async () => {
      const useLine = 'use App\\Domain\\User as UserEntity;';
      const content = `namespace App;\n${useLine}\nclass Foo {}`;
      const doc = await openDocument(content);
      const location = locator.execute({ document: doc });

      assert.strictEqual(location.isFirstUse, false);
      const expected = content.indexOf(useLine) + useLine.length;
      assert.strictEqual(location.index, expected);
    });

    test('file with only a namespace declaration returns isFirstUse = true with index > 0', async () => {
      const doc = await openDocument('<?php\nnamespace App\\Services;');
      const location = locator.execute({ document: doc });
      assert.strictEqual(location.isFirstUse, true);
      assert.ok(location.index > 0);
    });
  });
});
