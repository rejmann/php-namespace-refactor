import { injectable } from 'tsyringe';
import { workspace, WorkspaceEdit } from 'vscode';

@injectable()
export class FileEditApplier {
  public async apply(edit: WorkspaceEdit): Promise<boolean> {
    return workspace.applyEdit(edit);
  }
}
