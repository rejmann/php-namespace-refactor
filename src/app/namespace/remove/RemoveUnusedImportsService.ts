import { Range, RelativePattern, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';
import { CreateNamespaceService } from '@domain/namespace/CreateNamespaceService';
import { DocumentReaderService } from '@app/workespace/DocumentReaderService';
import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { injectable } from 'tsyringe';

interface Props {
  uri: Uri
}

@injectable()
export class RemoveUnusedImportsService {
  constructor(
    private readonly createNamespaceService: CreateNamespaceService,
    private readonly documentReaderService: DocumentReaderService
  ) {
  }

  public async execute({ uri }: Props) {
    const { className } = this.createNamespaceService.execute({
      uri: uri.fsPath,
    });

    const directoryPath = FilePathUtils.extractDirectoryFromPath(uri.fsPath);

    const phpFiles = await this.getFilesInDirectory(directoryPath);
    const fileNames: string[] = phpFiles.map(fileUri => FilePathUtils.extractClassNameFromPath(fileUri.fsPath))
      .filter(Boolean)
      .filter(name => name !== className);

    if (!fileNames.length) {
      return;
    }

    for (const file of [uri, ...phpFiles]) {
      const { document } = await this.documentReaderService.execute({ uri: file });

      this.removeImports(
        document,
        file === uri ? fileNames : [className],
      );
    }
  }

  private async getFilesInDirectory(directoryPath: string): Promise<Uri[]> {
    const pattern = new RelativePattern(Uri.parse(`file://${directoryPath}`), '*.php');
    return workspace.findFiles(pattern);
  }

  private removeImports(
    document: TextDocument,
    fileNames: string[],
  ) {
    const text = document.getText();

    const edit = new WorkspaceEdit();
    let isEdit = false;

    const importLines = text.split('\n').filter(line => line.startsWith('use '));
    for (const line of importLines) {
      const parts = line.split(' ');
      if (parts.length < 2) {
        continue;
      }

      const importedClass = parts[1].replace(';', '').split('\\').pop() || '';
      if (!fileNames.includes(importedClass)) {
        continue;
      }

      isEdit = true;

      const lineIndex = text.indexOf(line);
      edit.delete(document.uri, new Range(
        document.positionAt(lineIndex),
        document.positionAt((lineIndex + line.length) + 1)
      ));
    }

    if (false === isEdit) {
      return;
    }

    workspace.applyEdit(edit);
  }
}
