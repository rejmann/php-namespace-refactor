import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { ClassRenameOperation } from '../app/operations/ClassRenameOperation';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';

function fakeConfigurationLocator(additionalExtensions: string[]): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => (additionalExtensions.length
      ? additionalExtensions as unknown as T
      : defaultValue as T),
  } as ConfigurationLocator;
}

function buildOperation(additionalExtensions: string[]): ClassRenameOperation {
  const workspacePathResolver = new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakeConfigurationLocator(additionalExtensions)),
  );

  return new ClassRenameOperation(workspacePathResolver);
}

async function writeTempPhpFile(fileName: string, content: string): Promise<{ uri: vscode.Uri, dir: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, 'utf8');
  return { uri: vscode.Uri.file(filePath), dir };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * https://github.com/rejmann/php-namespace-refactor/issues/72
 *
 * The renamed file must keep the full configured extension (e.g. `.class.php`),
 * not just the last `.php` segment.
 */
suite('ClassRenameOperation', () => {
  test('keeps the ".class.php" extension when renaming Old.class.php to New', async () => {
    const { uri, dir } = await writeTempPhpFile('Old.class.php', '<?php\n\nclass Old\n{\n}\n');
    const document = await vscode.workspace.openTextDocument(uri);
    const operation = buildOperation(['class.php', 'trait.php', 'enum.php', 'interface.php']);

    operation.execute({ document, newClassName: 'New' });

    const expectedPath = path.join(dir, 'New.class.php');
    const oldPath = uri.fsPath;

    await waitUntil(async () => (await pathExists(expectedPath)) && !(await pathExists(oldPath)));

    assert.ok(await pathExists(expectedPath), 'New.class.php should exist after the rename');
    assert.ok(!(await pathExists(oldPath)), 'Old.class.php should no longer exist after the rename');
  });

  test('keeps a plain ".php" extension when no compound extension is configured', async () => {
    const { uri, dir } = await writeTempPhpFile('Old.php', '<?php\n\nclass Old\n{\n}\n');
    const document = await vscode.workspace.openTextDocument(uri);
    const operation = buildOperation([]);

    operation.execute({ document, newClassName: 'New' });

    const expectedPath = path.join(dir, 'New.php');
    await waitUntil(() => pathExists(expectedPath));

    assert.ok(await pathExists(expectedPath), 'New.php should exist after the rename');
  });
});
