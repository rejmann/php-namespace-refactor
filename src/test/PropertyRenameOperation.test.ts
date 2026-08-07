import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { PropertyRenameOperation } from '../app/operations/PropertyRenameOperation';
import { ClassTypedPropertyLocator } from '../domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '../domain/property/ConstructorSpanFinder';
import { PropertyNameResolver } from '../domain/property/PropertyNameResolver';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '../domain/workspace/FeatureFlagManager';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';
import { BackgroundSaveStrategy, ShowEditorSaveStrategy } from '../infra/vscode/EditApplyStrategy';
import { FileEditApplier } from '../infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '../infra/vscode/TextDocumentOpener';

function fakePassthroughConfigurationLocator(): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => defaultValue as T,
  } as ConfigurationLocator;
}

function fakeFeatureFlagManager(editFilesInBackground = true): FeatureFlagManager {
  return {
    isActive: ({ defaultValue = true }) => defaultValue && editFilesInBackground,
  } as FeatureFlagManager;
}

function buildOperation({
  editFilesInBackground = true,
} = {}): PropertyRenameOperation {
  const workspacePathResolver = new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakePassthroughConfigurationLocator()),
  );
  const fileEditApplier = new FileEditApplier(
    fakeFeatureFlagManager(editFilesInBackground), new BackgroundSaveStrategy(), new ShowEditorSaveStrategy(),
  );
  const constructorSpanFinder = new ConstructorSpanFinder();

  return new PropertyRenameOperation(
    workspacePathResolver,
    new TextDocumentOpener(),
    fileEditApplier,
    new ClassTypedPropertyLocator(constructorSpanFinder),
    new PropertyNameResolver(),
    constructorSpanFinder,
  );
}

async function writeTempPhpFile(dir: string, fileName: string, content: string): Promise<vscode.Uri> {
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
}

suite('PropertyRenameOperation', () => {
  test('renames a promoted property that matches the old class-name convention', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $test)\n    {\n    }\n\n    public function run(): void\n    {\n        $this->test->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [consumerUri], renameMismatchedNames: false });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private NewTest $newTest'), `expected the promoted property to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->newTest->run();'), `expected $this-> usages to be renamed, got:\n${text}`);
    assert.ok(!text.includes('$test'), `expected no leftover old property name, got:\n${text}`);
  });

  test('renames a non-promoted property confirmed by its constructor assignment', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    private NewTest $test;\n\n    public function __construct(NewTest $test)\n    {\n        $this->test = $test;\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [consumerUri], renameMismatchedNames: false });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private NewTest $newTest;'), `expected the declared property to be renamed, got:\n${text}`);
    assert.ok(text.includes('__construct(NewTest $newTest)'), `expected the constructor parameter to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->newTest = $newTest;'), `expected the assignment to be renamed, got:\n${text}`);
  });

  test('renames an untyped property declared only via a @var docblock', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'UserRepository.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'ClientRepository.php'));

    const consumerContent = '<?php\n\nclass UserService\n{\n    /**\n     * @var ClientRepository\n     */\n    private $repository;\n\n    public function __construct(ClientRepository $repository)\n    {\n        $this->repository = $repository;\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserService.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [consumerUri], renameMismatchedNames: true });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private $clientRepository;'), `expected the untyped declaration to be renamed, got:\n${text}`);
    assert.ok(text.includes('__construct(ClientRepository $clientRepository)'), `expected the constructor parameter to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->clientRepository = $clientRepository;'), `expected the assignment to be renamed, got:\n${text}`);
    assert.ok(!text.includes('$repository'), `expected no leftover old property name, got:\n${text}`);
  });

  test('leaves a mismatched property name untouched when renameMismatchedNames is false', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $service)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [consumerUri], renameMismatchedNames: false });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.strictEqual(text, consumerContent, `expected no changes, got:\n${text}`);
  });

  test('renames a mismatched property name when renameMismatchedNames is true', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $service)\n    {\n        $this->service->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [consumerUri], renameMismatchedNames: true });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private NewTest $newTest'), `expected the mismatched property to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->newTest->run();'), `expected $this-> usages to be renamed, got:\n${text}`);
  });

  test('skips a file when two properties share the renamed class type (ambiguous)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $a, private NewTest $b)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [consumerUri], renameMismatchedNames: true });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.strictEqual(text, consumerContent, `expected no changes when ambiguous, got:\n${text}`);
  });

  test('does nothing when the class name did not actually change', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const sameUri = vscode.Uri.file(path.join(dir, 'Test.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private Test $test)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation();
    await operation.execute({ oldUri: sameUri, newUri: sameUri, affectedFiles: [consumerUri], renameMismatchedNames: false });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.strictEqual(text, consumerContent, `expected no changes, got:\n${text}`);
  });

  /**
   * A file that textually contains the new class name but wasn't part of
   * this rename's affected-files set (e.g. an unrelated class with the same
   * short name in a different namespace) must never be touched - property
   * renaming is scoped to exactly what MultiFileReferenceUpdater determined
   * was affected by this rename, never a broader workspace scan.
   */
  test('ignores a file that matches by text but was not part of the affected-files set', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const unrelatedContent = '<?php\n\nnamespace Other;\n\nclass UnrelatedController\n{\n    public function __construct(private NewTest $test)\n    {\n    }\n}\n';
    const unrelatedUri = await writeTempPhpFile(dir, 'UnrelatedController.php', unrelatedContent);

    const operation = buildOperation();
    await operation.execute({ oldUri, newUri, affectedFiles: [], renameMismatchedNames: false });

    const text = (await vscode.workspace.openTextDocument(unrelatedUri)).getText();
    assert.strictEqual(text, unrelatedContent, `expected the unaffected file to be left untouched, got:\n${text}`);
  });
});
