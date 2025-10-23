import { injectable } from 'tsyringe';
import { TextDocument, Uri, workspace } from 'vscode';

interface Props {
  uri: Uri
}

type OpenTextDocument = {
  document: TextDocument
  text: string
}

@injectable()
export class TextDocumentOpener {
  public async execute({ uri }: Props): Promise<OpenTextDocument> {
    const document = await workspace.openTextDocument(uri.fsPath);
    return {
      document,
      text: document.getText(),
    };
  }
}
