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
import { WorkspaceIndex } from '../infra/index/WorkspaceIndex';
import { FileEditApplier } from '../infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '../infra/vscode/TextDocumentOpener';

function fakePassthroughConfigurationLocator(): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => defaultValue as T,
  } as ConfigurationLocator;
}

function fakeRenameMismatchConfigurationLocator(renameMismatched: boolean): ConfigurationLocator {
  return {
    get: <T>(): T => renameMismatched as unknown as T,
  } as unknown as ConfigurationLocator;
}

function fakeFeatureFlagManager(editFilesInBackground = true): FeatureFlagManager {
  return {
    isActive: ({ defaultValue = true }) => defaultValue && editFilesInBackground,
  } as FeatureFlagManager;
}

function buildOperation({
  files = [] as vscode.Uri[],
  renameMismatched = false,
  editFilesInBackground = true,
} = {}): PropertyRenameOperation {
  const workspacePathResolver = new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakePassthroughConfigurationLocator()),
  );
  const workspaceIndex = { execute: async () => files } as unknown as WorkspaceIndex;
  const fileEditApplier = new FileEditApplier(fakeFeatureFlagManager(editFilesInBackground));
  const constructorSpanFinder = new ConstructorSpanFinder();

  return new PropertyRenameOperation(
    workspacePathResolver,
    workspaceIndex,
    new TextDocumentOpener(),
    fileEditApplier,
    fakeRenameMismatchConfigurationLocator(renameMismatched),
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
    const oldUri = vscode.Uri.file(path.join(dir, 'Teste.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'Novo.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private Novo $teste)\n    {\n    }\n\n    public function run(): void\n    {\n        $this->teste->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation({ files: [consumerUri] });
    await operation.execute({ oldUri, newUri });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private Novo $novo'), `expected the promoted property to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->novo->run();'), `expected $this-> usages to be renamed, got:\n${text}`);
    assert.ok(!text.includes('teste'), `expected no leftover old property name, got:\n${text}`);
  });

  test('renames a non-promoted property confirmed by its constructor assignment', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Teste.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'Novo.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    private Novo $teste;\n\n    public function __construct(Novo $teste)\n    {\n        $this->teste = $teste;\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation({ files: [consumerUri] });
    await operation.execute({ oldUri, newUri });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private Novo $novo;'), `expected the declared property to be renamed, got:\n${text}`);
    assert.ok(text.includes('__construct(Novo $novo)'), `expected the constructor parameter to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->novo = $novo;'), `expected the assignment to be renamed, got:\n${text}`);
  });

  test('leaves a mismatched property name untouched when the sub-flag is off', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Teste.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'Novo.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private Novo $service)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation({ files: [consumerUri], renameMismatched: false });
    await operation.execute({ oldUri, newUri });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.strictEqual(text, consumerContent, `expected no changes, got:\n${text}`);
  });

  test('renames a mismatched property name when the sub-flag is on', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Teste.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'Novo.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private Novo $service)\n    {\n        $this->service->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation({ files: [consumerUri], renameMismatched: true });
    await operation.execute({ oldUri, newUri });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.ok(text.includes('private Novo $novo'), `expected the mismatched property to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->novo->run();'), `expected $this-> usages to be renamed, got:\n${text}`);
  });

  test('skips a file when two properties share the renamed class type (ambiguous)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Teste.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'Novo.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private Novo $a, private Novo $b)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation({ files: [consumerUri], renameMismatched: true });
    await operation.execute({ oldUri, newUri });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.strictEqual(text, consumerContent, `expected no changes when ambiguous, got:\n${text}`);
  });

  test('does nothing when the class name did not actually change', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const sameUri = vscode.Uri.file(path.join(dir, 'Teste.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private Teste $teste)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const operation = buildOperation({ files: [consumerUri] });
    await operation.execute({ oldUri: sameUri, newUri: sameUri });

    const text = (await vscode.workspace.openTextDocument(consumerUri)).getText();
    assert.strictEqual(text, consumerContent, `expected no changes, got:\n${text}`);
  });
});
