import { TextDocumentOpener } from '@app/services/TextDocumentOpener';
import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { inject, injectable } from 'tsyringe';
import { Range, RelativePattern, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  uri: Uri
}

interface RemoveImportsProps {
  document: TextDocument
  fileNames: string[]
}

@injectable()
export class ImportRemover {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator,
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
  ) {}

  public async execute({ uri }: Props) {
    if (!this.featureFlagManager.isActive({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS })) {
      return;
    }

    const { className } = await this.namespaceCreator.execute({ uri });

    const directoryPath = this.workspacePathResolver.extractDirectoryFromPath(uri.fsPath);

    const pattern = new RelativePattern(Uri.parse(`file://${directoryPath}`), '*.php');
    const phpFiles = await workspace.findFiles(pattern);

    const fileNames = phpFiles.map(uri => this.workspacePathResolver.extractClassNameFromPath(uri.fsPath))
      .filter(Boolean)
      .filter(name => name !== className);

    if (!fileNames.length) {
      return;
    }

    try {
      const { document } = await this.textDocumentOpener.execute({ uri });
      await this.removeImports({
        document,
        fileNames,
      });
    } catch (_) {
      // Main file might not exist, skip processing
    }

    const otherFiles = phpFiles.filter(file => file.fsPath !== uri.fsPath);

    await Promise.all(otherFiles.map(async (file) => {
      try {
        const { document } = await this.textDocumentOpener.execute({ uri: file });
        await this.removeImports({
          document,
          fileNames: [className],
        });
      } catch (_) {
        return;
      }
    }));
  }

  private async removeImports({ document, fileNames }: RemoveImportsProps) {
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

    await workspace.applyEdit(edit);
  }
}
