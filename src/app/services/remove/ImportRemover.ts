import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { findRedundantImports } from '@domain/namespace/RedundantImportLocator';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Range, RelativePattern, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  uri: Uri
}

interface RemoveImportsProps {
  document: TextDocument
  namespace: string
  fileNames: string[]
}

@injectable()
export class ImportRemover {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator,
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(FileEditApplier) private fileEditApplier: FileEditApplier,
  ) {}

  public async execute({ uri }: Props) {
    if (!this.featureFlagManager.isActive({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS })) {
      return;
    }

    const { namespace, className } = await this.namespaceCreator.execute({ uri });
    if (!namespace) {
      return;
    }

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
        namespace,
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
          namespace,
          fileNames: [className],
        });
      } catch (_) {
        return;
      }
    }));
  }

  /**
   * After the move, `document` shares `namespace` with the other files of its
   * directory, so imports between them are redundant.
   */
  private async removeImports({ document, namespace, fileNames }: RemoveImportsProps) {
    const ranges = findRedundantImports({
      text: document.getText(),
      namespace,
      classNames: fileNames,
    });

    if (!ranges.length) {
      return;
    }

    const edit = new WorkspaceEdit();
    for (const { start, end } of ranges) {
      edit.delete(document.uri, new Range(document.positionAt(start), document.positionAt(end)));
    }

    await this.fileEditApplier.apply(edit);
  }
}
