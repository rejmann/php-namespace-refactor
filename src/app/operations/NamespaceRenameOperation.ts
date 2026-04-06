import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { inject, injectable } from 'tsyringe';
import { TextDocument, Uri, window } from 'vscode';

interface Props {
  document: TextDocument
  newNamespace: string
}

@injectable()
export class NamespaceRenameOperation {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
  ) {}

  public async execute({ document, newNamespace }: Props): Promise<void> {
    try {
      const oldPath = document.uri.fsPath;
      const fileName = this.workspacePathResolver.extractClassNameFromPath(oldPath);
      const newDirectoryPath = await this.workspacePathResolver.getDirectoryFromNamespace(newNamespace);

      FileRenameHandler.create({
        oldUri: document.uri,
        newUri: Uri.file(`${newDirectoryPath}/${fileName}.php`),
      });
    } catch (error) {
      window.showErrorMessage(`Error renaming namespace: ${error}`);
    }
  }
}
