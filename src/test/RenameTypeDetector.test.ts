import 'reflect-metadata';

import * as assert from 'assert';
import * as vscode from 'vscode';

import { ClassType, NamespaceType, RenameTypeDetector } from '../domain/rename/RenameTypeDetector';

async function openDocument(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ content, language: 'php' });
}

suite('RenameTypeDetector', () => {
  let detector: RenameTypeDetector;

  setup(() => {
    detector = new RenameTypeDetector();
  });

  /**
   * Scenario 3 – when renaming a class by name: detect that the cursor is on
   * the class declaration to trigger ClassRenameOperation.
   *
   * Scenario 4 – when renaming the namespace via F2: detect that the cursor is
   * on the namespace declaration to trigger NamespaceRenameOperation.
   */
  suite('Scenario 3/4 – detect rename type (namespace vs class)', () => {
    test('identifies a namespace line', async () => {
      const content = '<?php\nnamespace App\\Domain;\nclass Order {}';
      const doc = await openDocument(content);
      const position = new vscode.Position(1, 10);
      const result = detector.execute({ document: doc, position });
      assert.strictEqual(result, NamespaceType);
    });

    test('identifies a class line', async () => {
      const content = '<?php\nnamespace App\\Domain;\nclass Order {}';
      const doc = await openDocument(content);
      const position = new vscode.Position(2, 6);
      const result = detector.execute({ document: doc, position });
      assert.strictEqual(result, ClassType);
    });

    test('identifies an abstract class line', async () => {
      const content = '<?php\nnamespace App;\nabstract class BaseService {}';
      const doc = await openDocument(content);
      const position = new vscode.Position(2, 0);
      const result = detector.execute({ document: doc, position });
      assert.strictEqual(result, ClassType);
    });

    test('identifies an interface line', async () => {
      const content = '<?php\nnamespace App;\ninterface PaymentInterface {}';
      const doc = await openDocument(content);
      const position = new vscode.Position(2, 0);
      const result = detector.execute({ document: doc, position });
      assert.strictEqual(result, ClassType);
    });

    test('identifies a trait line', async () => {
      const content = '<?php\nnamespace App;\ntrait HasTimestamps {}';
      const doc = await openDocument(content);
      const position = new vscode.Position(2, 0);
      const result = detector.execute({ document: doc, position });
      assert.strictEqual(result, ClassType);
    });

    test('throws when the cursor is on an unidentifiable line', async () => {
      const content = '<?php\n// some comment\nclass Foo {}';
      const doc = await openDocument(content);
      const position = new vscode.Position(1, 0);
      assert.throws(() => detector.execute({ document: doc, position }));
    });
  });
});
