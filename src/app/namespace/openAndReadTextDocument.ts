import { TextDocument, Uri, workspace } from 'vscode';

interface Props {
  uri: Uri
}

type OpenTextDocument = {
  document: TextDocument
  text: string
}

export async function openAndReadTextDocument({
  uri,
}: Props): Promise<OpenTextDocument> {
  const document = await workspace.openTextDocument(uri.fsPath);

  return {
    document,
    text: document.getText(),
  };
}
