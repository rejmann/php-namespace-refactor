import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { ImportRemover } from '../app/services/remove/ImportRemover';
import { MultiFileReferenceUpdater } from '../app/services/update/MultiFileReferenceUpdater';
import { UseStatementCreator } from '../domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '../domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '../domain/namespace/UseStatementLocator';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '../domain/workspace/FeatureFlagManager';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';
import { NamespaceIndex } from '../infra/index/NamespaceIndex';
import { WorkspaceIndex } from '../infra/index/WorkspaceIndex';
import { FileEditApplier } from '../infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '../infra/vscode/TextDocumentOpener';

function fakeConfigurationLocator(): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => defaultValue as T,
  } as ConfigurationLocator;
}

function fakeFeatureFlagManager(editFilesInBackground = true): FeatureFlagManager {
  return {
    isActive: ({ defaultValue = true }) => defaultValue && editFilesInBackground,
  } as FeatureFlagManager;
}

function buildUpdater(namespaceIndex: NamespaceIndex, editFilesInBackground = true): MultiFileReferenceUpdater {
  const workspacePathResolver = new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakeConfigurationLocator()),
  );
  const fileEditApplier = new FileEditApplier(fakeFeatureFlagManager(editFilesInBackground));

  return new MultiFileReferenceUpdater(
    workspacePathResolver,
    { execute: async () => {} } as unknown as ImportRemover,
    { single: ({ fullNamespace }: { fullNamespace: string }) => `\nuse ${fullNamespace};` } as UseStatementCreator,
    new WorkspaceIndex(fakeConfigurationLocator()),
    namespaceIndex,
    new TextDocumentOpener(),
    new UseStatementLocator(),
    new UseStatementInjector(fileEditApplier),
    fileEditApplier,
  );
}

async function writeTempPhpFile(dir: string, fileName: string, content: string): Promise<vscode.Uri> {
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
}

// vscode.window.showTextDocument can resolve slightly before the active
// editor is fully registered, so an 'undo' fired right after may target
// nothing the first time. Retry a few times rather than assume one call lands.
async function undoUntil(document: vscode.TextDocument, predicate: (text: string) => boolean, attempts = 5): Promise<void> {
  for (let attempt = 0; attempt < attempts && !predicate(document.getText()); attempt++) {
    await vscode.commands.executeCommand('undo');
  }
}

/**
 * https://github.com/rejmann/php-namespace-refactor/issues/72 (item 4)
 *
 * Multi-file reference updates used to write straight to disk via
 * workspace.fs.writeFile, bypassing VS Code's undo stack entirely. A refactor
 * that touched several files could then only be undone in some of them.
 */
suite('MultiFileReferenceUpdater', () => {
  test('updates references through an undoable edit instead of a raw disk write', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const orderUri = await writeTempPhpFile(
      dir,
      'Order.php',
      '<?php\n\nnamespace App\\NewDomain;\n\nclass Order\n{\n}\n',
    );

    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    private Order $order;\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    // editFilesInBackground disabled here so the edit is left as an unsaved
    // editor change, matching this test's original assumption — the
    // background-save behaviour itself is covered separately below.
    const updater = buildUpdater(namespaceIndex, false);

    await updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\NewDomain\\Order',
      newUri: orderUri,
      oldUri: orderUri,
    });

    const document = await vscode.workspace.openTextDocument(consumerUri);
    assert.ok(
      document.getText().includes('use App\\NewDomain\\Order;'),
      `expected the updated reference, got:\n${document.getText()}`,
    );
    assert.ok(document.isDirty, 'the edit should be an unsaved change applied through the editor, not a raw disk write');

    await vscode.window.showTextDocument(document);
    await undoUntil(document, text => text.includes('use App\\Domain\\Order;'));

    assert.ok(
      document.getText().includes('use App\\Domain\\Order;'),
      `undo should restore the original reference, got:\n${document.getText()}`,
    );
  });

  /**
   * https://github.com/rejmann/php-namespace-refactor/issues/73
   *
   * Files were left half on disk (workspace.fs.writeFile) and half as
   * unsaved editor changes (workspace.applyEdit), forcing manual conflict
   * resolution per file — especially painful over SSH. With
   * editFilesInBackground on (the default), files that weren't already open
   * get their edit saved straight through instead of sitting dirty.
   */
  test('with editFilesInBackground on, saves edits to files that were not already open', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const orderUri = await writeTempPhpFile(
      dir,
      'Order.php',
      '<?php\n\nnamespace App\\NewDomain;\n\nclass Order\n{\n}\n',
    );

    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    private Order $order;\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    const updater = buildUpdater(namespaceIndex, true);

    await updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\NewDomain\\Order',
      newUri: orderUri,
      oldUri: orderUri,
    });

    const document = await vscode.workspace.openTextDocument(consumerUri);
    assert.ok(
      document.getText().includes('use App\\NewDomain\\Order;'),
      `expected the updated reference, got:\n${document.getText()}`,
    );
    assert.ok(!document.isDirty, 'a file that was not already open should be saved straight through, not left dirty');

    const onDiskContent = await fs.readFile(consumerUri.fsPath, 'utf8');
    assert.ok(
      onDiskContent.includes('use App\\NewDomain\\Order;'),
      `expected the saved file on disk to contain the updated reference, got:\n${onDiskContent}`,
    );
  });

  test('with editFilesInBackground on, leaves already-open files as an unsaved editor change', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const orderUri = await writeTempPhpFile(
      dir,
      'Order.php',
      '<?php\n\nnamespace App\\NewDomain;\n\nclass Order\n{\n}\n',
    );

    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    private Order $order;\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    // Simulate the user already having the affected file open before the refactor runs.
    const openedDocument = await vscode.workspace.openTextDocument(consumerUri);
    await vscode.window.showTextDocument(openedDocument, { preview: false });

    const updater = buildUpdater(namespaceIndex, true);

    await updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\NewDomain\\Order',
      newUri: orderUri,
      oldUri: orderUri,
    });

    assert.ok(
      openedDocument.getText().includes('use App\\NewDomain\\Order;'),
      `expected the updated reference, got:\n${openedDocument.getText()}`,
    );
    assert.ok(openedDocument.isDirty, 'a file that was already open should stay as an unsaved editor change');

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('renaming the class itself does not double-replace the class name inside its own FQCN', async () => {
    // The bare class name (e.g. "Order") is always a substring of its own
    // FQCN match (e.g. "App\Domain\Order"), so combining both replacements
    // into one WorkspaceEdit risks registering overlapping ranges for the
    // same file. Regression test for that combination.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const oldUri = vscode.Uri.file(path.join(dir, 'Order.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'PurchaseOrder.php'));

    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    private Order $order;\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    const updater = buildUpdater(namespaceIndex);

    await assert.doesNotReject(() => updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\Domain\\PurchaseOrder',
      newUri,
      oldUri,
    }));

    const document = await vscode.workspace.openTextDocument(consumerUri);
    const text = document.getText();

    assert.ok(text.includes('use App\\Domain\\PurchaseOrder;'), `FQCN not updated, got:\n${text}`);
    assert.ok(text.includes('private PurchaseOrder $order;'), `bare class name not updated, got:\n${text}`);
    assert.strictEqual(
      (text.match(/use App\\Domain\\PurchaseOrder;/g) ?? []).length, 1,
      `the import line should not be duplicated, got:\n${text}`,
    );
    assert.ok(!/\bprivate Order \$order\b/.test(text), `old bare class name should be gone, got:\n${text}`);
  });

  /**
   * A class can share its name with a sibling namespace (e.g. a
   * RevisaoCadastral.php file next to a RevisaoCadastral/ directory holding
   * DadosPessoais/FormType.php and Endereco/FormType.php). Renaming the class
   * to RevisaoCadastralTeste must not corrupt aliased imports that merely
   * start with the old FQCN but actually point into that sibling namespace.
   */
  test('renaming a class does not corrupt aliased imports from a sub-namespace sharing its name', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const oldUri = vscode.Uri.file(path.join(dir, 'RevisaoCadastral.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'RevisaoCadastralTeste.php'));

    const consumerContent = [
      '<?php',
      '',
      'namespace App\\Controller\\PreCadastro\\Atendimento;',
      '',
      'use App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastral;',
      'use App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastral\\DadosPessoais\\FormType as DadosPessoaisFormType;',
      'use App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastral\\Endereco\\FormType as EnderecoFormType;',
      '',
      'class RevisaoCadastralController',
      '{',
      '    private RevisaoCadastral $revisaoCadastral;',
      '}',
      '',
    ].join('\n');
    const consumerUri = await writeTempPhpFile(dir, 'RevisaoCadastralController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    const updater = buildUpdater(namespaceIndex);

    await updater.execute({
      useOldNamespace: 'App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastral',
      useNewNamespace: 'App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastralTeste',
      newUri,
      oldUri,
    });

    const document = await vscode.workspace.openTextDocument(consumerUri);
    const text = document.getText();

    assert.ok(
      text.includes('use App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastralTeste;'),
      `the exact FQCN import should be renamed, got:\n${text}`,
    );
    assert.ok(
      text.includes('private RevisaoCadastralTeste $revisaoCadastral;'),
      `the bare class name usage should be renamed, got:\n${text}`,
    );
    assert.ok(
      text.includes('use App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastral\\DadosPessoais\\FormType as DadosPessoaisFormType;'),
      `the aliased sub-namespace import should be left untouched, got:\n${text}`,
    );
    assert.ok(
      text.includes('use App\\Controller\\PreCadastro\\Atendimento\\RevisaoCadastral\\Endereco\\FormType as EnderecoFormType;'),
      `the aliased sub-namespace import should be left untouched, got:\n${text}`,
    );
  });
});
