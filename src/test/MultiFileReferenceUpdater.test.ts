import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { PropertyRenameOperation } from '../app/operations/PropertyRenameOperation';
import { ImportRemover } from '../app/services/remove/ImportRemover';
import { AffectedFilesResolver } from '../app/services/update/AffectedFilesResolver';
import { IndexAffectedFilesFinder } from '../app/services/update/IndexAffectedFilesFinder';
import { MultiFileReferenceUpdater } from '../app/services/update/MultiFileReferenceUpdater';
import { ScanAffectedFilesFinder } from '../app/services/update/ScanAffectedFilesFinder';
import { ClassNameBoundaryRegexBuilder } from '../domain/namespace/ClassNameBoundaryRegexBuilder';
import { UseStatementCreator } from '../domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '../domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '../domain/namespace/UseStatementLocator';
import { ClassTypedPropertyLocator } from '../domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '../domain/property/ConstructorSpanFinder';
import { PropertyNameResolver } from '../domain/property/PropertyNameResolver';
import { PropertyRenameSettingsResolver } from '../domain/property/PropertyRenameSettingsResolver';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '../domain/workspace/FeatureFlagManager';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';
import { NamespaceIndex } from '../infra/index/NamespaceIndex';
import { WorkspaceIndex } from '../infra/index/WorkspaceIndex';
import { BackgroundSaveStrategy, ShowEditorSaveStrategy } from '../infra/vscode/EditApplyStrategy';
import { FileEditApplier } from '../infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '../infra/vscode/TextDocumentOpener';
import { WorkspaceFileReader } from '../infra/vscode/WorkspaceFileReader';

function fakePropertyRenameSettingsResolver(enabled = false): PropertyRenameSettingsResolver {
  return {
    resolve: () => ({ enabled, renameMismatchedNames: false }),
  } as PropertyRenameSettingsResolver;
}

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

function buildUpdater(
  namespaceIndex: NamespaceIndex,
  editFilesInBackground = true,
  propertyRenameEnabled = false,
): MultiFileReferenceUpdater {
  const workspacePathResolver = new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakeConfigurationLocator()),
  );
  const fileEditApplier = new FileEditApplier(
    fakeFeatureFlagManager(editFilesInBackground), new BackgroundSaveStrategy(), new ShowEditorSaveStrategy(),
  );
  const constructorSpanFinder = new ConstructorSpanFinder();

  const propertyRenameOperation = new PropertyRenameOperation(
    workspacePathResolver,
    new TextDocumentOpener(),
    fileEditApplier,
    new ClassTypedPropertyLocator(constructorSpanFinder),
    new PropertyNameResolver(),
    constructorSpanFinder,
  );

  const affectedFilesResolver = new AffectedFilesResolver(
    new IndexAffectedFilesFinder(namespaceIndex),
    new ScanAffectedFilesFinder(new WorkspaceIndex(fakeConfigurationLocator()), new WorkspaceFileReader()),
    namespaceIndex,
  );

  return new MultiFileReferenceUpdater(
    workspacePathResolver,
    { execute: async () => {} } as unknown as ImportRemover,
    { single: ({ fullNamespace }: { fullNamespace: string }) => `\nuse ${fullNamespace};` } as UseStatementCreator,
    new WorkspaceIndex(fakeConfigurationLocator()),
    affectedFilesResolver,
    new TextDocumentOpener(),
    new UseStatementLocator(),
    new UseStatementInjector(fileEditApplier),
    fileEditApplier,
    new ClassNameBoundaryRegexBuilder(),
    propertyRenameOperation,
    fakePropertyRenameSettingsResolver(propertyRenameEnabled),
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

  test('with property renaming enabled, renames the constructor property in the same pass as the class rename', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const oldUri = vscode.Uri.file(path.join(dir, 'Order.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'PurchaseOrder.php'));

    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    public function __construct(private Order $order)\n    {\n    }\n\n    public function run(): void\n    {\n        $this->order->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    const updater = buildUpdater(namespaceIndex, true, true);

    await updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\Domain\\PurchaseOrder',
      newUri,
      oldUri,
    });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();

    assert.ok(
      text.includes('private PurchaseOrder $purchaseOrder'),
      `expected the constructor property to be renamed alongside the class, got:\n${text}`,
    );
    assert.ok(
      text.includes('$this->purchaseOrder->run();'),
      `expected $this-> usages to be renamed, got:\n${text}`,
    );
    assert.ok(!/\$order\b/.test(text), `expected no leftover old property name, got:\n${text}`);
  });

  test('with property renaming enabled, renames a non-promoted property in the same pass as the class rename', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const oldUri = vscode.Uri.file(path.join(dir, 'Order.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'PurchaseOrder.php'));

    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    private Order $order;\n\n    public function __construct(Order $order)\n    {\n        $this->order = $order;\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    const updater = buildUpdater(namespaceIndex, true, true);

    await updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\Domain\\PurchaseOrder',
      newUri,
      oldUri,
    });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();

    assert.ok(
      text.includes('private PurchaseOrder $purchaseOrder;'),
      `expected the declared property to be renamed alongside the class, got:\n${text}`,
    );
    assert.ok(
      text.includes('__construct(PurchaseOrder $purchaseOrder)'),
      `expected the constructor parameter to be renamed, got:\n${text}`,
    );
    assert.ok(
      text.includes('$this->purchaseOrder = $purchaseOrder;'),
      `expected the assignment to be renamed, got:\n${text}`,
    );
    assert.ok(!/\$order\b/.test(text), `expected no leftover old property name, got:\n${text}`);
  });

  test('with renameMismatchedNames off, still renames the class name and import even when the property name is left untouched', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const oldUri = vscode.Uri.file(path.join(dir, 'Order.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'PurchaseOrder.php'));

    // "$service" doesn't follow the old class-name convention ("order"), so
    // with renameMismatchedNames off the property itself must stay
    // untouched - but that must not stop the class name and import from
    // being renamed everywhere else in this same file.
    const consumerContent = '<?php\n\nnamespace App\\Http;\n\nuse App\\Domain\\Order;\n\nclass OrderController\n{\n    public function __construct(private Order $service)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'OrderController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    // propertyRenameEnabled=true, renameMismatchedNames defaults to false in fakePropertyRenameSettingsResolver
    const updater = buildUpdater(namespaceIndex, true, true);

    await updater.execute({
      useOldNamespace: 'App\\Domain\\Order',
      useNewNamespace: 'App\\Domain\\PurchaseOrder',
      newUri,
      oldUri,
    });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();

    assert.ok(text.includes('use App\\Domain\\PurchaseOrder;'), `expected the import to be renamed, got:\n${text}`);
    assert.ok(
      text.includes('private PurchaseOrder $service'),
      `expected the class name in the type hint to be renamed while the mismatched property name stays, got:\n${text}`,
    );
  });

  /**
   * A class can share its name with a sibling namespace (e.g. a
   * RenamedClass.php file next to a RenamedClass/ directory holding
   * Foo/FormType.php and Bar/FormType.php). Renaming the class
   * to RenamedClassTest must not corrupt aliased imports that merely
   * start with the old FQCN but actually point into that sibling namespace.
   */
  test('renaming a class does not corrupt aliased imports from a sub-namespace sharing its name', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));

    const oldUri = vscode.Uri.file(path.join(dir, 'RenamedClass.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'RenamedClassTest.php'));

    const consumerContent = [
      '<?php',
      '',
      'namespace App\\Controller;',
      '',
      'use App\\Controller\\RenamedClass;',
      'use App\\Controller\\RenamedClass\\Foo\\FormType as FooFormType;',
      'use App\\Controller\\RenamedClass\\Bar\\FormType as BarFormType;',
      '',
      'class RenamedClassController',
      '{',
      '    private RenamedClass $instance;',
      '}',
      '',
    ].join('\n');
    const consumerUri = await writeTempPhpFile(dir, 'RenamedClassController.php', consumerContent);

    const namespaceIndex = new NamespaceIndex(os.tmpdir());
    namespaceIndex.parseAndAdd(consumerUri.fsPath, consumerContent);

    const updater = buildUpdater(namespaceIndex);

    await updater.execute({
      useOldNamespace: 'App\\Controller\\RenamedClass',
      useNewNamespace: 'App\\Controller\\RenamedClassTest',
      newUri,
      oldUri,
    });

    const document = await vscode.workspace.openTextDocument(consumerUri);
    const text = document.getText();

    assert.ok(
      text.includes('use App\\Controller\\RenamedClassTest;'),
      `the exact FQCN import should be renamed, got:\n${text}`,
    );
    assert.ok(
      text.includes('private RenamedClassTest $instance;'),
      `the bare class name usage should be renamed, got:\n${text}`,
    );
    assert.ok(
      text.includes('use App\\Controller\\RenamedClass\\Foo\\FormType as FooFormType;'),
      `the aliased sub-namespace import should be left untouched, got:\n${text}`,
    );
    assert.ok(
      text.includes('use App\\Controller\\RenamedClass\\Bar\\FormType as BarFormType;'),
      `the aliased sub-namespace import should be left untouched, got:\n${text}`,
    );
  });
});
