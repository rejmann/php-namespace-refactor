import { FileMoveOperation } from '@app/operations/FileMoveOperation';
import { inject, injectable } from 'tsyringe';
import { FileRenameEvent, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class FileRenameHandler {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    @inject(FileMoveOperation) private fileMoveOperation: FileMoveOperation,
  ) {}

  public static create({ oldUri, newUri }: Props): void {
    const edit = new WorkspaceEdit();
    edit.renameFile(oldUri, newUri);
    workspace.applyEdit(edit);
  }

  public handle(event: FileRenameEvent): void {
    this.queue = this.queue
      .then(() => this.fileMoveOperation.execute(event.files))
      .catch(() => {});
  }
}
