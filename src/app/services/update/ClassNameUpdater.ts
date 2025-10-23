import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { inject, injectable } from 'tsyringe';
import { Range, Uri, workspace, WorkspaceEdit } from 'vscode';

import { TextDocumentOpener } from '../TextDocumentOpener';

export const PHP_CLASS_DECLARATION_REGEX = /^\s*(?:abstract\s+)?(?:final\s+)?(?:class|interface|trait)\s+(\w+)/m;

interface Props {
  newUri: Uri,
}

@injectable()
export class ClassNameUpdater {
  constructor(
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
  ) {}

  public async execute({ newUri }: Props): Promise<void> {
    const { document, text } = await this.textDocumentOpener.execute({ uri: newUri });

    const match = PHP_CLASS_DECLARATION_REGEX.exec(text);
    if (!match) {
      return;
    }
    const currentName = match[1];

    const expectedName = this.workspacePathResolver.extractClassNameFromPath(newUri.fsPath);

    if (currentName === expectedName) {
      return;
    }

    const startIndex = match.index! + match[0].indexOf(currentName);
    const endIndex = startIndex + currentName.length;

    const edit = new WorkspaceEdit();
    edit.replace(
      newUri,
      new Range(
        document.positionAt(startIndex),
        document.positionAt(endIndex)
      ),
      expectedName
    );

    workspace.applyEdit(edit);
  }
}
