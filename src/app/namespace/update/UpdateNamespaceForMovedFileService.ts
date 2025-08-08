import { Range, Uri, workspace, WorkspaceEdit } from 'vscode';
import { injectable } from 'tsyringe';
import { openTextDocument } from '../openTextDocument';


interface Props {
  newNamespace: string,
  newUri: Uri,
}

@injectable()
export class UpdateNamespaceForMovedFileService {
  public async execute({ newNamespace, newUri }: Props) {
    const { document, text } = await openTextDocument({ uri: newUri });

    const namespaceRegex = /^\s*namespace\s+[\w\\]+;/m;
    const match = text.match(namespaceRegex);

    if (!match) {
      return false;
    }

    const startIndex = match.index!;
    const startPosition = document.positionAt(startIndex);
    const endPosition = document.positionAt(startIndex + match[0].length);

    const namespaceReplace = `\nnamespace ${newNamespace};`;

    const edit = new WorkspaceEdit();

    edit.replace(
      newUri,
      new Range(startPosition, endPosition),
      namespaceReplace,
    );

    workspace.applyEdit(edit);

    return true;
  }
}
