import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { inject, injectable } from 'tsyringe';
import { Range, TextDocument, Uri, WorkspaceEdit } from 'vscode';

const LEADING_NEWLINES_REGEX = /^\n+/;
const EXISTING_USE_STATEMENT_REGEX = /^use\s+([\w\\]+)/gm;
const USE_STATEMENT_REGEX = /use\s+([\w\\]+)\s*;/g;

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
    const text = document.getText();
    const newStatements = this.excludeAlreadyImported(useNamespace, text);

    if (!newStatements) {
      if (flush) {
        await this.flush(workspaceEdit);
      }
      return;
    }

    const trailingNewlines = isFirstUse
      ? (text.slice(lastUseEndIndex).match(LEADING_NEWLINES_REGEX)?.[0] ?? '')
      : '';
    workspaceEdit.replace(
      uri,
      new Range(
        document.positionAt(lastUseEndIndex),
        document.positionAt(lastUseEndIndex + trailingNewlines.length),
      ),
      isFirstUse
        ? `\n\n${newStatements.replace(LEADING_NEWLINES_REGEX, '')}\n\n`
        : newStatements
    );

    if (!flush) {
      return;
    }

    await this.flush(workspaceEdit);
  }

  /**
   * A file already covered by a `use` statement for a namespace must not get
   * a duplicate appended. Without this, touching the same directory across
   * several separate renames/moves kept re-inserting the same import.
   */
  private excludeAlreadyImported(useNamespace: string, text: string): string {
    const alreadyImported = new Set(
      [...text.matchAll(EXISTING_USE_STATEMENT_REGEX)].map(match => match[1]),
    );

    let result = '';
    for (const match of useNamespace.matchAll(USE_STATEMENT_REGEX)) {
      if (!alreadyImported.has(match[1])) {
        result += `\nuse ${match[1]};`;
      }
    }

    return result;
  }
}
