import { injectable } from 'tsyringe';
import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  document: TextDocument
  workspaceEdit: WorkspaceEdit
  uri: Uri
  useNamespace: string
  lastUseEndIndex: number
  flush: boolean
}

@injectable()
export class UseStatementInjector {
  public async save({
    document,
    workspaceEdit,
    lastUseEndIndex,
    uri,
    useNamespace,
    flush = false,
  }: Props  ) {
    const endPosition = document.positionAt(lastUseEndIndex);
    workspaceEdit.replace(
      uri,
      new Range(endPosition, endPosition),
      useNamespace,
    );

    if (!flush) {
      return;
    }

    await this.flush(workspaceEdit);
  }

  public async flush(edit: WorkspaceEdit): Promise<void> {
    await workspace.applyEdit(edit);
  }
}
