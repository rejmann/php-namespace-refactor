import { FileMoveOperation } from '@app/operations/FileMoveOperation';
import { inject, injectable } from 'tsyringe';
import { FileRenameEvent, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class FileRenameHandler {
  constructor(
    @inject(FileMoveOperation) private fileMoveOperation: FileMoveOperation,
  ) {}

  public static create({ oldUri, newUri }: Props): void {
    const edit = new WorkspaceEdit();
    edit.renameFile(oldUri, newUri);
    workspace.applyEdit(edit);
  }

  public async handle(event: FileRenameEvent) {
    await this.fileMoveOperation.execute(event.files);
  }
}
