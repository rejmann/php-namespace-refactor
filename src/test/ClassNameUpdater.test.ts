import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { ClassNameUpdater } from '../app/services/update/ClassNameUpdater';
import { ClassNameBoundaryRegexBuilder } from '../domain/namespace/ClassNameBoundaryRegexBuilder';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '../domain/workspace/FeatureFlagManager';
import { FileExtensionResolver } from '../domain/workspace/FileExtensionResolver';
import { WorkspacePathResolver } from '../domain/workspace/WorkspacePathResolver';
import { ComposerAutoloadManager } from '../infra/autoload/ComposerAutoloadManager';
import { BackgroundSaveStrategy, ShowEditorSaveStrategy } from '../infra/vscode/EditApplyStrategy';
import { FileEditApplier } from '../infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '../infra/vscode/TextDocumentOpener';

function fakeConfigurationLocator(additionalExtensions: string[]): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => (additionalExtensions.length
      ? additionalExtensions as unknown as T
      : defaultValue as T),
  } as ConfigurationLocator;
}

function fakeFeatureFlagManager(): FeatureFlagManager {
  return {
    isActive: ({ defaultValue = true }) => defaultValue,
  } as FeatureFlagManager;
}

function buildUpdater(additionalExtensions: string[]): ClassNameUpdater {
  const workspacePathResolver = new WorkspacePathResolver(
    new ComposerAutoloadManager(),
    new FileExtensionResolver(fakeConfigurationLocator(additionalExtensions)),
  );

  return new ClassNameUpdater(
    new TextDocumentOpener(),
    workspacePathResolver,
    new FileEditApplier(fakeFeatureFlagManager(), new BackgroundSaveStrategy(), new ShowEditorSaveStrategy()),
    new ClassNameBoundaryRegexBuilder(),
  );
}

async function writeTempPhpFile(fileName: string, content: string): Promise<vscode.Uri> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
}

async function waitForText(
  uri: vscode.Uri,
  predicate: (text: string) => boolean,
  timeoutMs = 2000,
): Promise<string> {
  const document = await vscode.workspace.openTextDocument(uri);
  const start = Date.now();

  while (!predicate(document.getText())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for document text condition. Last text:\n${document.getText()}`);
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return document.getText();
}

/**
 * https://github.com/rejmann/php-namespace-refactor/issues/72
 *
 * Compound file names (Color.enum.php, Color.class.php, ...) must not corrupt the
 * declaration once the middle segment is honoured as part of the configured extension.
 */
suite('ClassNameUpdater', () => {
  test('does not corrupt "enum Color" in Color.enum.php when the extension is configured', async () => {
    const uri = await writeTempPhpFile('Color.enum.php', '<?php\n\nenum Color\n{\n    case RED;\n    case BLUE;\n}\n');
    const updater = buildUpdater(['class.php', 'trait.php', 'enum.php', 'interface.php']);

    await updater.execute({ newUri: uri });

    const text = await waitForText(uri, t => t.includes('enum Color'));
    assert.ok(!text.includes('Color.enum'), `declaration got corrupted:\n${text}`);
  });

  test('does not corrupt "class Color" in Color.class.php when the extension is configured', async () => {
    const uri = await writeTempPhpFile('Color.class.php', '<?php\n\nclass Color\n{\n}\n');
    const updater = buildUpdater(['class.php', 'trait.php', 'enum.php', 'interface.php']);

    await updater.execute({ newUri: uri });

    const text = await waitForText(uri, t => t.includes('class Color'));
    assert.ok(!text.includes('Color.class'), `declaration got corrupted:\n${text}`);
  });

  test('renames a mismatched declaration to the file name without leaking the extension segment', async () => {
    const uri = await writeTempPhpFile('Color.enum.php', '<?php\n\nenum Shade\n{\n    case RED;\n}\n');
    const updater = buildUpdater(['enum.php']);

    await updater.execute({ newUri: uri });

    const text = await waitForText(uri, t => t.includes('enum Color'));
    assert.ok(!text.includes('Color.enum'), `declaration got corrupted:\n${text}`);
    assert.ok(!text.includes('Shade'), `old name should have been fully replaced:\n${text}`);
  });

  test('reproduces the reported bug: without the compound extension configured, the declaration is corrupted', async () => {
    // https://github.com/rejmann/php-namespace-refactor/issues/72 as originally reported:
    // additionalExtensions defaults to ["php"], so ".class" leaks into the class name.
    const uri = await writeTempPhpFile('OutroTest.class.php', '<?php\n\nclass Outro\n{\n}\n');
    const updater = buildUpdater([]);

    await updater.execute({ newUri: uri });

    const text = await waitForText(uri, t => t.includes('OutroTest.class'));
    assert.ok(text.includes('class OutroTest.class'), `expected today's known-bad output, got:\n${text}`);
  });

  /**
   * A class can share its name with a sibling namespace (e.g. a
   * RenamedClass.php file next to a RenamedClass/ directory holding
   * Foo/Type.php). When RenamedClass.php is renamed to
   * RenamedClassTest.php, its own aliased imports from that sibling
   * namespace must not be corrupted just because they start with the old name.
   */
  test('does not corrupt its own aliased imports from a sub-namespace sharing its name', async () => {
    const content = [
      '<?php',
      '',
      'namespace App\\Controller;',
      '',
      'use App\\Controller\\RenamedClass\\Foo\\Type as FooType;',
      'use App\\Controller\\RenamedClass\\Bar\\Type as BarType;',
      '',
      'class RenamedClass',
      '{',
      '}',
      '',
    ].join('\n');

    const uri = await writeTempPhpFile('RenamedClassTest.php', content);
    const updater = buildUpdater([]);

    await updater.execute({ newUri: uri });

    const text = await waitForText(uri, t => t.includes('class RenamedClassTest'));
    assert.ok(
      text.includes('use App\\Controller\\RenamedClass\\Foo\\Type as FooType;'),
      `aliased sub-namespace import should be left untouched, got:\n${text}`,
    );
    assert.ok(
      text.includes('use App\\Controller\\RenamedClass\\Bar\\Type as BarType;'),
      `aliased sub-namespace import should be left untouched, got:\n${text}`,
    );
  });
});
