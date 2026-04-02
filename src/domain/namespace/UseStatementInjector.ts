import { injectable } from 'tsyringe';
import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  document: TextDocument
  workspaceEdit: WorkspaceEdit
  uri: Uri
  useNamespace: string
  lastUseEndIndex: number
  flush: boolean
  isFirstUse?: boolean
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
    isFirstUse = false,
  }: Props) {
    if (isFirstUse) {
      const documentText = document.getText();
      const afterNamespace = documentText.slice(lastUseEndIndex);
      const trailingNewlines = afterNamespace.match(/^\n+/)?.[0] ?? '';
      const startPosition = document.positionAt(lastUseEndIndex);
      const endPosition = document.positionAt(lastUseEndIndex + trailingNewlines.length);
      const normalizedUse = useNamespace.replace(/^\n+/, '');
      workspaceEdit.replace(uri, new Range(startPosition, endPosition), `\n\n${normalizedUse}\n\n`);
    } else {
      const endPosition = document.positionAt(lastUseEndIndex);
      workspaceEdit.replace(uri, new Range(endPosition, endPosition), useNamespace);
    }

    if (!flush) {
      return;
    }

    await this.flush(workspaceEdit);
  }

  public async flush(edit: WorkspaceEdit): Promise<void> {
    await workspace.applyEdit(edit);
  }
}
