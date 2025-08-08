import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';
import { injectable } from 'tsyringe';

interface Props {
  document: TextDocument
  workspaceEdit?: WorkspaceEdit
  uri: Uri
  useNamespace: string
  lastUseEndIndex: number
  flush: boolean
}

@injectable()
export class ApplyUseStatementService {
  public async execute({
    document,
    workspaceEdit,
    lastUseEndIndex,
    uri,
    useNamespace,
    flush = false,
  }: Props): Promise<void> {
    const endPosition = document.positionAt(lastUseEndIndex);

    const edit = workspaceEdit || new WorkspaceEdit();

    edit.replace(
      uri,
      new Range(endPosition, endPosition),
      useNamespace,
    );

    if (!flush) {
      return;
    }

    await workspace.applyEdit(edit);
  }
}
