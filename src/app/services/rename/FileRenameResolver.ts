import { inject, injectable } from 'tsyringe';
import { NamespaceType, RenameTypeDetector } from './RenameTypeDetector';
import { Position, TextDocument, Uri, window } from 'vscode';
import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface Props {
  document: TextDocument
  position: Position
  newName: string
}

@injectable()
export class FileRenameResolver {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(RenameTypeDetector) private renameTypeDetector: RenameTypeDetector,
  ) {
  }

  public async execute({ document, position, newName }: Props): Promise<void> {
    if (!newName.length) {
      throw new Error('New name cannot be empty');
    }

    const currentUri = document.uri;
    const oldPath = currentUri.fsPath;

    if (this.isNamespaceType(document, position)) {
      try {
        const fileName = this.workspacePathResolver.extractClassNameFromPath(oldPath);
        const newDirectoryPath = await this.workspacePathResolver.getDirectoryFromNamespace(newName);

        FileRenameHandler.create({
          oldUri: currentUri,
          newUri: Uri.file(`${newDirectoryPath}/${fileName}.php`),
        });
        return;
      } catch (error) {
        window.showErrorMessage(`Error renaming namespace: ${error}`);
      }
    }

    const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const extension = oldPath.substring(oldPath.lastIndexOf('.'));

    FileRenameHandler.create({
      oldUri: currentUri,
      newUri: Uri.file(`${directory}/${newName}${extension}`),
    });
  }

  private isNamespaceType(document: TextDocument, position: Position): boolean {
    return NamespaceType === this.renameTypeDetector.execute({ document, position });
  }
}
