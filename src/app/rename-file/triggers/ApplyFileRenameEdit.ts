import { Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  oldUri: Uri
  newUri: Uri
}

export function applyFileRenameEdit({ oldUri, newUri }: Props): void {
  const edit = new WorkspaceEdit();
  edit.renameFile(oldUri, newUri);
  workspace.applyEdit(edit);
}
