import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { inject, injectable } from 'tsyringe';

import { IndexAffectedFilesFinder } from './IndexAffectedFilesFinder';
import { ScanAffectedFilesFinder } from './ScanAffectedFilesFinder';

/**
 * Decides whether the expensive full-text ScanAffectedFilesFinder needs to
 * run at all, instead of always summing it with the O(1) index lookup like
 * before. The index is only untrustworthy when it hasn't been populated yet
 * (e.g. this session's build()/load() haven't landed anything) - once it
 * has data, it's the sole source of truth and the scan is skipped.
 */
@injectable()
export class AffectedFilesResolver {
  constructor(
    @inject(IndexAffectedFilesFinder) private indexFinder: IndexAffectedFilesFinder,
    @inject(ScanAffectedFilesFinder) private scanFinder: ScanAffectedFilesFinder,
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  public async find(useOldNamespace: string, ignoreFile: string): Promise<string[]> {
    const indexedPaths = await this.indexFinder.find(useOldNamespace, ignoreFile);

    if (!this.namespaceIndex.isEmpty()) {
      return indexedPaths;
    }

    const scannedPaths = await this.scanFinder.find(useOldNamespace, ignoreFile);
    return [...new Set([...indexedPaths, ...scannedPaths])];
  }
}
