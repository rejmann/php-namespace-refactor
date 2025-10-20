import { FileRenameEvent, Uri, workspace, WorkspaceEdit } from 'vscode';
import { inject, injectable } from 'tsyringe';
import { FileRenameFeature } from '@app/features/FileRenameFeature';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class FileRenameHandler {
  constructor(
    @inject(FileRenameFeature) private fileRenameFeature: FileRenameFeature,
  ) {}

  public static create({ oldUri, newUri }: Props): void {
    const edit = new WorkspaceEdit();
    edit.renameFile(oldUri, newUri);
    workspace.applyEdit(edit);
  }

  public async handle(event: FileRenameEvent) {
    await this.fileRenameFeature.execute(event.files);
  }
}
