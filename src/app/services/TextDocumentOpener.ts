import { DocumentCache } from '@app/services/cache/DocumentCache';
import { inject, injectable } from 'tsyringe';
import { TextDocument, Uri, workspace } from 'vscode';

interface Props {
  uri: Uri
  useCache?: boolean
}

type OpenTextDocument = {
  document: TextDocument
  text: string
}

@injectable()
export class TextDocumentOpener {
  constructor(
    @inject(DocumentCache) private documentCache: DocumentCache,
  ) {}

  public async execute({ uri, useCache = false }: Props): Promise<OpenTextDocument> {
    if (useCache) {
      return this.documentCache.getOrOpen(uri);
    }

    const document = await workspace.openTextDocument(uri.fsPath);
    return {
      document,
      text: document.getText(),
    };
  }
}
