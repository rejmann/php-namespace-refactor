import { PHP_CLASS_DECLARATION_REGEX } from '@domain/namespace/PhpPatterns';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Range, Uri, workspace, WorkspaceEdit } from 'vscode';

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

    const newText = text.replace(new RegExp(`\\b${currentName}\\b`, 'g'), expectedName);

    const edit = new WorkspaceEdit();
    edit.replace(
      newUri,
      new Range(
        document.positionAt(0),
        document.positionAt(text.length)
      ),
      newText
    );

    workspace.applyEdit(edit);
  }
}
