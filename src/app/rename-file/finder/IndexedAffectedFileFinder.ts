import { NamespaceIndexStore } from '@infra/index/NamespaceIndexStore';
import { inject, injectable } from 'tsyringe';

import { AffectedFileFinder } from './AffectedFileFinder';

@injectable()
export class IndexedAffectedFileFinder implements AffectedFileFinder {
  constructor(
    @inject(NamespaceIndexStore) private namespaceIndexStore: NamespaceIndexStore,
  ) {}

  public async find(useOldNamespace: string, ignoreFile: string): Promise<string[]> {
    return this.namespaceIndexStore
      .getFilesUsing(useOldNamespace)
      .filter(fsPath => fsPath !== ignoreFile);
  }
}
