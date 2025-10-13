import { Range, RelativePattern, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { TextDocumentOpener } from '@app/services/TextDocumentOpener';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface Props {
  uri: Uri
}

interface RemoveImportsProps {
  document: TextDocument
  fileNames: string[]
}

export class ImportRemover {
  public async execute({ uri }: Props) {
    const featureFlagManager = new FeatureFlagManager();

    if (!featureFlagManager.isActive({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS })) {
      return;
    }

    const { className } = await new NamespaceCreator().execute({ uri });

    const workspacePathService = new WorkspacePathResolver();
    const directoryPath = workspacePathService.extractDirectoryFromPath(uri.fsPath);

    const pattern = new RelativePattern(Uri.parse(`file://${directoryPath}`), '*.php');
    const phpFiles = await workspace.findFiles(pattern);

    const fileNames = phpFiles.map(uri => workspacePathService.extractClassNameFromPath(uri.fsPath))
      .filter(Boolean)
      .filter(name => name !== className);

    if (!fileNames.length) {
      return;
    }

    const textDocumentOpener = new TextDocumentOpener();

    try {
      const { document } = await textDocumentOpener.execute({ uri });
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
        const { document } = await textDocumentOpener.execute({ uri: file });
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
