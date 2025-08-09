import 'reflect-metadata';
import * as assert from 'assert';
import { Position, TextDocument, Uri, WorkspaceEdit } from 'vscode';
import { ApplyUseStatementService } from '@domain/namespace/ApplyUseStatementService';
import { CreateUseStatementService } from '@domain/namespace/CreateUseStatementService';
import { DocumentReaderService } from '@app/workspace/DocumentReaderService';
import { ImportMissingClassesService } from '@app/namespace/import/ImportMissingClassesService';
import { UseStatementAnalyzerService } from '@domain/namespace/UseStatementAnalyzerService';

// Mock para TextDocument
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

function createMockDocumentReader(initialText: string) {
  return {
    execute: async ({ uri }: { uri: Uri }) => ({
      document: createMockDocument(initialText),
      text: initialText
    })
  } as DocumentReaderService;
}

function createMockCreateUseStatement() {
  return {
    execute: (params: { className: string; directoryPath: string }) => {
      return `use App\\Old\\${params.className};\n`;
    }
  } as CreateUseStatementService;
}

function createMockUseStatementAnalyzer() {
  return {
    execute: (params: { document: TextDocument }) => {
      const text = params.document.getText();
      const namespaceMatch = text.match(/namespace [^;]+;/);
      if (namespaceMatch) {
        return namespaceMatch.index! + namespaceMatch[0].length;
      }
      return 0;
    }
  } as UseStatementAnalyzerService;
}

function createMockApplyUseStatement() {
  let wasModified = false;
  const modifications: string[] = [];

  return {
    wasModified: () => wasModified,
    getModifications: () => modifications,
    execute: async (params: {
      document: TextDocument;
      workspaceEdit: WorkspaceEdit;
      uri: Uri;
      lastUseEndIndex: number;
      useNamespace: string;
      flush: boolean;
    }) => {
      wasModified = true;
      modifications.push(params.useNamespace);
    }
  } as ApplyUseStatementService & { wasModified: () => boolean; getModifications: () => string[] };
}

// Mock simples para ImportMissingClassesService com override do método getClassesNamesInDirectory
class TestableImportMissingClassesService extends ImportMissingClassesService {
  private mockFiles: string[] = [];

  public setMockFiles(files: string[]) {
    this.mockFiles = files;
  }

  public getClassesNamesInDirectory(directory: string): string[] {
    if (directory === '/old/path') {
      return this.mockFiles.filter(file => file.endsWith('.php'))
        .map(file => file.replace('.php', ''));
    }
    return [];
  }
}

suite('ImportMissingClassesService Test Suite', () => {
  test('should do nothing when no classes need importing', async () => {
    const beforeText = `<?php
namespace App\\New;

class MyClass {
    public function test() {
        return 'hello';
    }
}`;

    const mockDocumentReader = createMockDocumentReader(beforeText);
    const mockApplyUseStatement = createMockApplyUseStatement();
    const mockCreateUseStatement = createMockCreateUseStatement();
    const mockUseStatementAnalyzer = createMockUseStatementAnalyzer();

    const service = new TestableImportMissingClassesService(
      mockCreateUseStatement,
      mockUseStatementAnalyzer,
      mockDocumentReader,
      mockApplyUseStatement
    );

    // Configurar mock para não retornar arquivos
    service.setMockFiles([]);

    const oldFileName = '/old/path/MyClass.php';
    const newUri = Uri.file('/new/path/MyClass.php');

    // Estado antes da execução
    assert.strictEqual(mockApplyUseStatement.wasModified(), false);

    await service.execute({ oldFileName, newUri });

    // Verificar que o arquivo NÃO foi modificado
    assert.strictEqual(mockApplyUseStatement.wasModified(), false);
    assert.strictEqual(mockApplyUseStatement.getModifications().length, 0);
  });
});
