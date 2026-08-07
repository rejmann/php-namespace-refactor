import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { inject, injectable } from 'tsyringe';

import { AffectedFilesFinder } from './AffectedFilesFinder';

@injectable()
export class IndexAffectedFilesFinder implements AffectedFilesFinder {
  constructor(
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  public async find(useOldNamespace: string, ignoreFile: string): Promise<string[]> {
    return this.namespaceIndex
      .getFilesUsing(useOldNamespace)
      .filter(fsPath => fsPath !== ignoreFile);
  }
}
