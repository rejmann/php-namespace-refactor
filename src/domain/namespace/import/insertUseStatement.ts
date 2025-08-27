import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  document: TextDocument
  workspaceEdit: WorkspaceEdit
  uri: Uri
  useNamespace: string
  lastUseEndIndex: number
  flush: boolean
}

export async function insertUseStatement({
  document,
  workspaceEdit,
  lastUseEndIndex,
  uri,
  useNamespace,
  flush = false,
}: Props) {
  const endPosition = document.positionAt(lastUseEndIndex);
  workspaceEdit.replace(
    uri,
    new Range(endPosition, endPosition),
    useNamespace,
  );

  if (flush) {
    await workspace.applyEdit(workspaceEdit);
  }
}
