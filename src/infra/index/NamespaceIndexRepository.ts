import * as fs from 'fs';
import * as path from 'path';
import { inject, singleton } from 'tsyringe';

import { IndexData } from './NamespaceIndexStore';

const INDEX_FILENAME = 'namespace-index.json';

@singleton()
export class NamespaceIndexRepository {
  private readonly indexPath: string;

  constructor(
    @inject('StorageUri') storagePath: string,
  ) {
    this.indexPath = path.join(storagePath, INDEX_FILENAME);
  }

  /**
   * Returns null on a missing or corrupted file - the caller keeps whatever
   * default it already has, build() is what repopulates the store either way.
   */
  public async load(): Promise<IndexData | null> {
    try {
      const raw = await fs.promises.readFile(this.indexPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async save(data: IndexData): Promise<void> {
    await fs.promises.writeFile(this.indexPath, JSON.stringify(data));
  }
}
