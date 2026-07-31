import 'reflect-metadata';

import * as assert from 'assert';
import * as vscode from 'vscode';

import { UNUSED_IMPORT_CODE, UnusedImportDiagnosticsBuilder } from '../app/services/UnusedImportDiagnosticsBuilder';
import { ClassNameBoundaryRegexBuilder } from '../domain/namespace/ClassNameBoundaryRegexBuilder';
import { UnusedUseStatementLocator } from '../domain/namespace/UnusedUseStatementLocator';

function fakeFeatureFlagManager(isActive: boolean) {
  return { isActive: () => isActive } as unknown as import('../domain/workspace/FeatureFlagManager').FeatureFlagManager;
}

function buildBuilder(isActive: boolean): UnusedImportDiagnosticsBuilder {
  return new UnusedImportDiagnosticsBuilder(
    fakeFeatureFlagManager(isActive),
    new UnusedUseStatementLocator(new ClassNameBoundaryRegexBuilder()),
  );
}

async function openDocument(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ content, language: 'php' });
}

suite('UnusedImportDiagnosticsBuilder', () => {
  test('returns a hint diagnostic on an unused import', async () => {
    const document = await openDocument('<?php\n\nnamespace App;\n\nuse App\\Services\\AuthService;\n\nclass Order {}\n');
    const builder = buildBuilder(true);

    const diagnostics = builder.execute(document);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].code, UNUSED_IMPORT_CODE);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Hint);
    assert.strictEqual(document.getText(diagnostics[0].range), 'use App\\Services\\AuthService;');
  });

  test('returns nothing when the import is used', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Services\\AuthService;\n\nclass Order {\n    public function __construct(private AuthService $auth) {}\n}\n';
    const document = await openDocument(content);
    const builder = buildBuilder(true);

    assert.deepStrictEqual(builder.execute(document), []);
  });

  test('returns nothing when the feature flag is disabled', async () => {
    const document = await openDocument('<?php\n\nnamespace App;\n\nuse App\\Services\\AuthService;\n\nclass Order {}\n');
    const builder = buildBuilder(false);

    assert.deepStrictEqual(builder.execute(document), []);
  });
});
