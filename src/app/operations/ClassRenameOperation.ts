import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { inject, injectable } from 'tsyringe';
import { TextDocument, Uri } from 'vscode';

interface Props {
  document: TextDocument
  newClassName: string
}

@injectable()
export class ClassRenameOperation {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
  ) {}

  public execute({ document, newClassName }: Props): void {
    const oldPath = document.uri.fsPath;
    const directory = this.workspacePathResolver.extractDirectoryFromPath(oldPath);
    const extension = oldPath.substring(oldPath.lastIndexOf('.'));

    FileRenameHandler.create({
      oldUri: document.uri,
      newUri: Uri.file(`${directory}/${newClassName}${extension}`),
    });
  }
}
