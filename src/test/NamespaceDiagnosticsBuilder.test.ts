import 'reflect-metadata';

import * as assert from 'assert';
import * as vscode from 'vscode';

import { NAMESPACE_MISMATCH_CODE, NamespaceDiagnosticsBuilder } from '../app/services/NamespaceDiagnosticsBuilder';
import { Namespace } from '../domain/namespace/NamespaceCreator';
import { NamespaceMismatchDetector } from '../domain/namespace/NamespaceMismatchDetector';

function fakeFeatureFlagManager(isActive: boolean) {
  return { isActive: () => isActive } as unknown as import('../domain/workspace/FeatureFlagManager').FeatureFlagManager;
}

function fakeNamespaceCreator(namespace?: string) {
  return {
    execute: async (): Promise<Namespace> => ({
      namespace,
      className: 'Order',
      fullNamespace: namespace ? `${namespace}\\Order` : 'Order',
    }),
  } as unknown as import('../domain/namespace/NamespaceCreator').NamespaceCreator;
}

async function openDocument(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ content, language: 'php' });
}

function buildBuilder(isActive: boolean, expectedNamespace?: string): NamespaceDiagnosticsBuilder {
  return new NamespaceDiagnosticsBuilder(
    fakeFeatureFlagManager(isActive),
    fakeNamespaceCreator(expectedNamespace),
    new NamespaceMismatchDetector(),
  );
}

suite('NamespaceDiagnosticsBuilder', () => {
  test('returns a warning diagnostic on the namespace line when it does not match PSR-4', async () => {
    const document = await openDocument('<?php\n\nnamespace App\\Old;\n\nclass Order {}\n');
    const builder = buildBuilder(true, 'App\\New');

    const diagnostics = await builder.execute(document);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].code, NAMESPACE_MISMATCH_CODE);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(document.getText(diagnostics[0].range), 'namespace App\\Old;');
  });

  test('returns nothing when the declared namespace already matches PSR-4', async () => {
    const document = await openDocument('<?php\n\nnamespace App\\New;\n\nclass Order {}\n');
    const builder = buildBuilder(true, 'App\\New');

    assert.deepStrictEqual(await builder.execute(document), []);
  });

  test('returns nothing when there is no namespace declaration in the file', async () => {
    const document = await openDocument('<?php\n\nclass Order {}\n');
    const builder = buildBuilder(true, 'App\\New');

    assert.deepStrictEqual(await builder.execute(document), []);
  });

  test('returns nothing when the feature flag is disabled', async () => {
    const document = await openDocument('<?php\n\nnamespace App\\Old;\n\nclass Order {}\n');
    const builder = buildBuilder(false, 'App\\New');

    assert.deepStrictEqual(await builder.execute(document), []);
  });
});
