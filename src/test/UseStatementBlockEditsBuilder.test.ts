import 'reflect-metadata';

import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { UseStatementBlockEditsBuilder } from '../app/services/UseStatementBlockEditsBuilder';
import { ClassNameBoundaryRegexBuilder } from '../domain/namespace/ClassNameBoundaryRegexBuilder';
import { UnusedUseStatementLocator } from '../domain/namespace/UnusedUseStatementLocator';
import { UseStatementSorter } from '../domain/namespace/UseStatementSorter';
import { ConfigurationLocator, Props } from '../domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '../domain/workspace/FeatureFlagManager';

function fakeFeatureFlagManager(flags: Record<string, boolean>): FeatureFlagManager {
  return {
    isActive: ({ key, defaultValue }: { key: string, defaultValue?: boolean }) => flags[key] ?? defaultValue ?? true,
  } as unknown as FeatureFlagManager;
}

function fakeConfigurationLocator(sortMode: string): ConfigurationLocator {
  return {
    get: <T>({ defaultValue }: Props<T>): T => (sortMode as unknown as T) ?? defaultValue as T,
  } as ConfigurationLocator;
}

function buildBuilder(flags: Record<string, boolean>, sortMode = 'natural'): UseStatementBlockEditsBuilder {
  return new UseStatementBlockEditsBuilder(
    fakeFeatureFlagManager(flags),
    fakeConfigurationLocator(sortMode),
    new UnusedUseStatementLocator(new ClassNameBoundaryRegexBuilder()),
    new UseStatementSorter(),
  );
}

async function openPhpDocument(content: string): Promise<vscode.TextDocument> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-namespace-refactor-'));
  const filePath = path.join(dir, 'Order.php');
  await fs.writeFile(filePath, content, 'utf8');
  return vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
}

suite('UseStatementBlockEditsBuilder', () => {
  test('removeOnSave alone deletes only the unused import, keeping the others in place', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Zebra;\nuse App\\Unused;\nuse App\\Apple;\n\nclass Order {\n    public function __construct(private Zebra $z, private Apple $a) {}\n}\n';
    const document = await openPhpDocument(content);

    const edits = buildBuilder({ removeOnSave: true, sortOnSave: false }).execute(document);

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(document.getText(edits[0].range), 'use App\\Zebra;\nuse App\\Unused;\nuse App\\Apple;');
    assert.strictEqual(edits[0].newText, 'use App\\Zebra;\nuse App\\Apple;');
  });

  test('sortOnSave alone reorders without removing anything', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Zebra;\nuse App\\Apple;\n\nclass Order {\n    public function __construct(private Zebra $z, private Apple $a) {}\n}\n';
    const document = await openPhpDocument(content);

    const edits = buildBuilder({ removeOnSave: false, sortOnSave: true }, 'alphabetical').execute(document);

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, 'use App\\Apple;\nuse App\\Zebra;');
  });

  test('combines removal and sorting into a single edit', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Zebra;\nuse App\\Unused;\nuse App\\Apple;\n\nclass Order {\n    public function __construct(private Zebra $z, private Apple $a) {}\n}\n';
    const document = await openPhpDocument(content);

    const edits = buildBuilder({ removeOnSave: true, sortOnSave: true }, 'alphabetical').execute(document);

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, 'use App\\Apple;\nuse App\\Zebra;');
  });

  test('returns no edits when both flags are disabled', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Zebra;\nuse App\\Unused;\n\nclass Order {\n    public function __construct(private Zebra $z) {}\n}\n';
    const document = await openPhpDocument(content);

    const edits = buildBuilder({ removeOnSave: false, sortOnSave: false }).execute(document);

    assert.deepStrictEqual(edits, []);
  });

  test('returns no edits when the block is already in its final form', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Apple;\nuse App\\Zebra;\n\nclass Order {\n    public function __construct(private Zebra $z, private Apple $a) {}\n}\n';
    const document = await openPhpDocument(content);

    const edits = buildBuilder({ removeOnSave: true, sortOnSave: true }, 'alphabetical').execute(document);

    assert.deepStrictEqual(edits, []);
  });

  test('skips the whole block when something is interleaved between "use" lines', async () => {
    const content = '<?php\n\nnamespace App;\n\nuse App\\Zebra;\n// keep me between the imports\nuse App\\Apple;\n\nclass Order {\n    public function __construct(private Zebra $z, private Apple $a) {}\n}\n';
    const document = await openPhpDocument(content);

    const edits = buildBuilder({ removeOnSave: true, sortOnSave: true }, 'alphabetical').execute(document);

    assert.deepStrictEqual(edits, []);
  });
});
