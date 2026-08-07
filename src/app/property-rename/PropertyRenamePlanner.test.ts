import 'reflect-metadata';

import { PropertyRenamePlanner } from '@app/property-rename/PropertyRenamePlanner';
import { ConfigurationLocator, Props } from '@domain/config/ConfigurationLocator';
import { FileExtensionResolver } from '@domain/config/FileExtensionResolver';
import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { ClassTypedPropertyLocator } from '@domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '@domain/property/ConstructorSpanFinder';
import { PropertyNameResolver } from '@domain/property/PropertyNameResolver';
import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

function fakePassthroughConfigurationLocator(): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => defaultValue as T,
  } as ConfigurationLocator;
}

function buildPlanner(): PropertyRenamePlanner {
  const phpFilePathResolver = new PhpFilePathResolver(
    new FileExtensionResolver(fakePassthroughConfigurationLocator()),
  );
  const constructorSpanFinder = new ConstructorSpanFinder();

  return new PropertyRenamePlanner(
    phpFilePathResolver,
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

/**
 * Mirrors what ReferenceRewriter does per affected file: resolve the
 * old/new property-name convention once for the class rename, then fold
 * collectEdits() into a WorkspaceEdit for this one file.
 */
async function renameProperties(
  planner: PropertyRenamePlanner,
  oldUri: vscode.Uri,
  newUri: vscode.Uri,
  targetUri: vscode.Uri,
  renameMismatchedNames: boolean,
): Promise<string> {
  const names = planner.resolveNames(oldUri, newUri);
  const document = await vscode.workspace.openTextDocument(targetUri);

  if (names) {
    const edit = new vscode.WorkspaceEdit();
    planner.collectEdits(edit, targetUri, document, document.getText(), names, renameMismatchedNames);
    await vscode.workspace.applyEdit(edit);
  }

  return document.getText();
}

suite('PropertyRenamePlanner', () => {
  test('renames a promoted property that matches the old class-name convention', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $test)\n    {\n    }\n\n    public function run(): void\n    {\n        $this->test->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const text = await renameProperties(buildPlanner(), oldUri, newUri, consumerUri, false);

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

    const text = await renameProperties(buildPlanner(), oldUri, newUri, consumerUri, false);

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

    const text = await renameProperties(buildPlanner(), oldUri, newUri, consumerUri, true);

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

    const text = await renameProperties(buildPlanner(), oldUri, newUri, consumerUri, false);

    assert.strictEqual(text, consumerContent, `expected no changes, got:\n${text}`);
  });

  test('renames a mismatched property name when renameMismatchedNames is true', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $service)\n    {\n        $this->service->run();\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const text = await renameProperties(buildPlanner(), oldUri, newUri, consumerUri, true);

    assert.ok(text.includes('private NewTest $newTest'), `expected the mismatched property to be renamed, got:\n${text}`);
    assert.ok(text.includes('$this->newTest->run();'), `expected $this-> usages to be renamed, got:\n${text}`);
  });

  test('skips a file when two properties share the renamed class type (ambiguous)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const oldUri = vscode.Uri.file(path.join(dir, 'Test.php'));
    const newUri = vscode.Uri.file(path.join(dir, 'NewTest.php'));

    const consumerContent = '<?php\n\nclass UserController\n{\n    public function __construct(private NewTest $a, private NewTest $b)\n    {\n    }\n}\n';
    const consumerUri = await writeTempPhpFile(dir, 'UserController.php', consumerContent);

    const text = await renameProperties(buildPlanner(), oldUri, newUri, consumerUri, true);

    assert.strictEqual(text, consumerContent, `expected no changes when ambiguous, got:\n${text}`);
  });

  test('resolveNames returns null when the class name did not actually change', () => {
    const sameUri = vscode.Uri.file('/tmp/Test.php');

    assert.strictEqual(buildPlanner().resolveNames(sameUri, sameUri), null);
  });
});
