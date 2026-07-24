import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { inject, injectable } from 'tsyringe';
import { Range, TextDocument, Uri, WorkspaceEdit } from 'vscode';

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
  constructor(
    @inject(FileEditApplier) private fileEditApplier: FileEditApplier,
  ) {}

  public async flush(edit: WorkspaceEdit): Promise<void> {
    await this.fileEditApplier.apply(edit);
  }

  public async save({
    document,
    workspaceEdit,
    lastUseEndIndex,
    uri,
    useNamespace,
    flush = false,
    isFirstUse = false,
  }: Props) {
    const trailingNewlines = isFirstUse
      ? (document.getText().slice(lastUseEndIndex).match(/^\n+/)?.[0] ?? '')
      : '';
    workspaceEdit.replace(
      uri,
      new Range(
        document.positionAt(lastUseEndIndex),
        document.positionAt(lastUseEndIndex + trailingNewlines.length),
      ),
      isFirstUse
        ? `\n\n${useNamespace.replace(/^\n+/, '')}\n\n`
        : useNamespace
    );

    if (!flush) {
      return;
    }

    await this.flush(workspaceEdit);
  }
}
