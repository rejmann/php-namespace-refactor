import 'reflect-metadata';

import * as assert from 'assert';
import * as vscode from 'vscode';

import { MISSING_IMPORT_CODE, MissingImportDiagnosticsBuilder } from '../app/services/MissingImportDiagnosticsBuilder';
import { ResolvedMissingImport } from '../app/services/MissingImportResolver';

function fakeFeatureFlagManager(isActive: boolean) {
  return { isActive: () => isActive } as unknown as import('../domain/workspace/FeatureFlagManager').FeatureFlagManager;
}

function fakeMissingImportResolver(resolved: ResolvedMissingImport[]) {
  return { resolve: () => resolved } as unknown as import('../app/services/MissingImportResolver').MissingImportResolver;
}

async function openDocument(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ content, language: 'php' });
}

suite('MissingImportDiagnosticsBuilder', () => {
  test('returns a warning diagnostic for each resolved missing import', async () => {
    const content = '<?php\n\nclass Order {\n    private AuthService $auth;\n}\n';
    const document = await openDocument(content);
    const index = content.indexOf('AuthService');

    const builder = new MissingImportDiagnosticsBuilder(
      fakeFeatureFlagManager(true),
      fakeMissingImportResolver([
        { identifier: 'AuthService', fullNamespace: 'App\\Services\\AuthService', index, length: 'AuthService'.length },
      ]),
    );

    const diagnostics = builder.execute(document);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].code, MISSING_IMPORT_CODE);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(document.getText(diagnostics[0].range), 'AuthService');
  });

  test('returns nothing when the feature flag is disabled', async () => {
    const document = await openDocument('<?php\n\nclass Order {}\n');

    const builder = new MissingImportDiagnosticsBuilder(
      fakeFeatureFlagManager(false),
      fakeMissingImportResolver([
        { identifier: 'AuthService', fullNamespace: 'App\\Services\\AuthService', index: 0, length: 11 },
      ]),
    );

    assert.deepStrictEqual(builder.execute(document), []);
  });
});
