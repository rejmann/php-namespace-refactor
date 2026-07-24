import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { UseStatementInjector } from '../domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '../domain/namespace/UseStatementLocator';
import { FeatureFlagManager } from '../domain/workspace/FeatureFlagManager';
import { FileEditApplier } from '../infra/vscode/FileEditApplier';

function fakeFeatureFlagManager(): FeatureFlagManager {
  return {
    isActive: ({ defaultValue = true }) => defaultValue,
  } as FeatureFlagManager;
}

async function writeTempPhpFile(fileName: string, content: string): Promise<vscode.Uri> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
}

/**
 * Reported bug: a sibling file that already imports a class kept getting the
 * same `use` statement appended again every time an unrelated file in the
 * same directory got renamed/moved, producing several identical duplicate
 * import lines over time.
 */
suite('UseStatementInjector', () => {
  test('does not append a duplicate use statement across repeated calls', async () => {
    const uri = await writeTempPhpFile(
      'Consumer.php',
      '<?php\n\nnamespace App\\User;\n\nclass Consumer\n{\n}\n',
    );

    const injector = new UseStatementInjector(new FileEditApplier(fakeFeatureFlagManager()));
    const locator = new UseStatementLocator();
    const document = await vscode.workspace.openTextDocument(uri);

    for (let attempt = 0; attempt < 4; attempt++) {
      const location = locator.execute({ document });
      await injector.save({
        document,
        workspaceEdit: new vscode.WorkspaceEdit(),
        uri,
        lastUseEndIndex: location.index,
        useNamespace: '\nuse App\\User\\UserRepository;',
        isFirstUse: location.isFirstUse,
        flush: true,
      });
    }

    const text = document.getText();
    const occurrences = (text.match(/use App\\User\\UserRepository;/g) ?? []).length;
    assert.strictEqual(occurrences, 1, `expected exactly one import, got:\n${text}`);
  });

  test('still appends the import the first time it is missing', async () => {
    const uri = await writeTempPhpFile(
      'Consumer.php',
      '<?php\n\nnamespace App\\User;\n\nclass Consumer\n{\n}\n',
    );

    const injector = new UseStatementInjector(new FileEditApplier(fakeFeatureFlagManager()));
    const locator = new UseStatementLocator();
    const document = await vscode.workspace.openTextDocument(uri);

    const location = locator.execute({ document });
    await injector.save({
      document,
      workspaceEdit: new vscode.WorkspaceEdit(),
      uri,
      lastUseEndIndex: location.index,
      useNamespace: '\nuse App\\User\\UserRepository;',
      isFirstUse: location.isFirstUse,
      flush: true,
    });

    assert.ok(
      document.getText().includes('use App\\User\\UserRepository;'),
      `expected the import to be added, got:\n${document.getText()}`,
    );
  });
});
