import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { MissingImportResolver } from '../app/services/MissingImportResolver';
import { MissingImportCandidateLocator } from '../domain/namespace/MissingImportCandidateLocator';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';
import { NamespaceIndex } from '../infra/index/NamespaceIndex';

function fakeConfigurationLocator(): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => defaultValue as T,
  } as ConfigurationLocator;
}

function buildWorkspacePathResolver(): WorkspacePathResolver {
  return new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakeConfigurationLocator()),
  );
}

function buildResolver(namespaceIndex: NamespaceIndex): MissingImportResolver {
  return new MissingImportResolver(
    buildWorkspacePathResolver(),
    new MissingImportCandidateLocator(),
    namespaceIndex,
  );
}

async function openOrderDocument(dir: string): Promise<vscode.TextDocument> {
  const filePath = path.join(dir, 'Order.php');
  await fs.writeFile(
    filePath,
    '<?php\n\nnamespace App\\Domain;\n\nclass Order {\n    public function __construct(private AuthService $auth) {}\n}\n',
    'utf8',
  );
  return vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
}

suite('MissingImportResolver', () => {
  test('resolves a candidate that matches exactly one class in the workspace index', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const document = await openOrderDocument(dir);

    const namespaceIndex = new NamespaceIndex(dir, buildWorkspacePathResolver());
    namespaceIndex.parseAndAdd(path.join(dir, 'AuthService.php'), 'namespace App\\Services;\nclass AuthService {}');

    const resolved = buildResolver(namespaceIndex).resolve(document);

    assert.strictEqual(resolved.length, 1);
    assert.strictEqual(resolved[0].identifier, 'AuthService');
    assert.strictEqual(resolved[0].fullNamespace, 'App\\Services\\AuthService');
  });

  test('skips a candidate that resolves to more than one class (ambiguous)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const document = await openOrderDocument(dir);

    const namespaceIndex = new NamespaceIndex(dir, buildWorkspacePathResolver());
    namespaceIndex.parseAndAdd(path.join(dir, 'One', 'AuthService.php'), 'namespace App\\One;\nclass AuthService {}');
    namespaceIndex.parseAndAdd(path.join(dir, 'Two', 'AuthService.php'), 'namespace App\\Two;\nclass AuthService {}');

    assert.deepStrictEqual(buildResolver(namespaceIndex).resolve(document), []);
  });

  test('skips a candidate whose only match is already in the same declared namespace', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const document = await openOrderDocument(dir);

    const namespaceIndex = new NamespaceIndex(dir, buildWorkspacePathResolver());
    namespaceIndex.parseAndAdd(path.join(dir, 'AuthService.php'), 'namespace App\\Domain;\nclass AuthService {}');

    assert.deepStrictEqual(buildResolver(namespaceIndex).resolve(document), []);
  });

  test('returns nothing when the identifier does not resolve to any indexed class', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
    const document = await openOrderDocument(dir);

    const namespaceIndex = new NamespaceIndex(dir, buildWorkspacePathResolver());

    assert.deepStrictEqual(buildResolver(namespaceIndex).resolve(document), []);
  });
});
