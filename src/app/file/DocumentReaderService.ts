import { TextDocument, Uri, workspace } from 'vscode';
import { injectable } from 'tsyringe';

interface Props {
  uri: Uri
}

interface DocumentReaderResult {
  document: TextDocument
  text: string
}

@injectable()
export class DocumentReaderService {
  public async execute({ uri }: Props): Promise<DocumentReaderResult> {
    const document = await workspace.openTextDocument(uri.fsPath);

    return {
      document,
      text: document.getText(),
    };
  }
}
