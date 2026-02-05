import { injectable } from 'tsyringe';
import { TextDocument, Uri, workspace } from 'vscode';

interface CachedDocument {
  document: TextDocument
  text: string
}

@injectable()
export class DocumentCache {
  private cache: Map<string, CachedDocument> = new Map();

  public async getOrOpen(uri: Uri): Promise<CachedDocument> {
    const key = uri.fsPath;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const document = await workspace.openTextDocument(uri.fsPath);
    const cached: CachedDocument = {
      document,
      text: document.getText(),
    };

    this.cache.set(key, cached);
    return cached;
  }

  public clear(): void {
    this.cache.clear();
  }

  public getSize(): number {
    return this.cache.size;
  }
}
