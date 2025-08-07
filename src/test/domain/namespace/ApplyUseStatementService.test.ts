import * as assert from 'assert';
import { Position, Range, TextDocument, Uri, WorkspaceEdit } from 'vscode';
import { ApplyUseStatementService } from '../../../domain/namespace/ApplyUseStatementService';

// Mock TextDocument
function createMockDocument(content: string): TextDocument {
  return {
    getText: () => content,
    positionAt: (offset: number) => {
      const lines = content.substring(0, offset).split('\n');
      const line = lines.length - 1;
      const character = lines[line].length;
      return new Position(line, character);
    }
  } as TextDocument;
}

class MockWorkspaceEdit {
  public changes: Array<{
    uri: Uri;
    range: Range;
    newText: string;
  }> = [];

  replace(uri: Uri, range: Range, newText: string): void {
    this.changes.push({ uri, range, newText });
  }
}

suite('ApplyUseStatementService Test Suite', () => {

  test('should apply use statement correctly - before and after comparison', async () => {
    const beforeContent = `<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController {
    // code
}`;

    const afterContent = `<?php

namespace App\\Controllers;

use App\\Models\\User;
use App\\Services\\EmailService;

class UserController {
    // code
}`;

    const document = createMockDocument(beforeContent);
    const workspaceEdit = new MockWorkspaceEdit() as unknown as WorkspaceEdit;
    const uri = Uri.file('/test/UserController.php');
    const service = new ApplyUseStatementService();

    const lastUseEndIndex = beforeContent.indexOf('use App\\Models\\User;') + 'use App\\Models\\User;'.length;

    await service.execute({
      document,
      workspaceEdit,
      uri,
      useNamespace: '\nuse App\\Services\\EmailService;',
      lastUseEndIndex,
      flush: false
    });

    const mockEdit = workspaceEdit as unknown as MockWorkspaceEdit;
    assert.strictEqual(mockEdit.changes.length, 1);

    const change = mockEdit.changes[0];
    const resultContent = beforeContent.substring(0, lastUseEndIndex) +
      change.newText +
      beforeContent.substring(lastUseEndIndex);

    assert.strictEqual(resultContent, afterContent);
  });

  test('should apply use statement at beginning when no use statements exist', async () => {
    const beforeContent = `<?php

namespace App\\Controllers;

class UserController {
    // code
}`;

    const afterContent = `<?php

namespace App\\Controllers;
use App\\Models\\User;

class UserController {
    // code
}`;

    const document = createMockDocument(beforeContent);
    const workspaceEdit = new MockWorkspaceEdit() as unknown as WorkspaceEdit;
    const uri = Uri.file('/test/UserController.php');
    const service = new ApplyUseStatementService();

    const namespaceLineEnd = beforeContent.indexOf('namespace App\\Controllers;') + 'namespace App\\Controllers;'.length;

    await service.execute({
      document,
      workspaceEdit,
      uri,
      useNamespace: '\nuse App\\Models\\User;',
      lastUseEndIndex: namespaceLineEnd,
      flush: false
    });

    const mockEdit = workspaceEdit as unknown as MockWorkspaceEdit;
    assert.strictEqual(mockEdit.changes.length, 1);

    const change = mockEdit.changes[0];
    const resultContent = beforeContent.substring(0, namespaceLineEnd) +
      change.newText +
      beforeContent.substring(namespaceLineEnd);

    assert.strictEqual(resultContent, afterContent);
  });

  test('should not modify content when flush is false', async () => {
    // Estado ANTES
    const beforeContent = `<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController {
    // code
}`;

    const document = createMockDocument(beforeContent);
    const workspaceEdit = new MockWorkspaceEdit() as unknown as WorkspaceEdit;
    const uri = Uri.file('/test/UserController.php');
    const service = new ApplyUseStatementService();

    const lastUseEndIndex = beforeContent.indexOf('use App\\Models\\User;') + 'use App\\Models\\User;'.length;

    await service.execute({
      document,
      workspaceEdit,
      uri,
      useNamespace: '\nuse App\\Services\\EmailService;',
      lastUseEndIndex,
      flush: false
    });

    const mockEdit = workspaceEdit as unknown as MockWorkspaceEdit;
    assert.strictEqual(mockEdit.changes.length, 1);

    assert.strictEqual(document.getText(), beforeContent);
  });
});
