import { NamespaceIndexStore } from '@infra/index/NamespaceIndexStore';
import { inject, injectable } from 'tsyringe';

import { IndexedAffectedFileFinder } from './IndexedAffectedFileFinder';
import { WorkspaceScanAffectedFileFinder } from './WorkspaceScanAffectedFileFinder';

/**
 * Decides whether the expensive full-text WorkspaceScanAffectedFileFinder needs to
 * run at all, instead of always summing it with the O(1) index lookup like
 * before. The index is only untrustworthy when it hasn't been populated yet
 * (e.g. this session's build()/load() haven't landed anything) - once it
 * has data, it's the sole source of truth and the scan is skipped.
 */
@injectable()
export class AffectedFileSearchResolver {
  constructor(
    @inject(IndexedAffectedFileFinder) private indexFinder: IndexedAffectedFileFinder,
    @inject(WorkspaceScanAffectedFileFinder) private scanFinder: WorkspaceScanAffectedFileFinder,
    @inject(NamespaceIndexStore) private namespaceIndexStore: NamespaceIndexStore,
  ) {}

  public async find(useOldNamespace: string, ignoreFile: string): Promise<string[]> {
    const indexedPaths = await this.indexFinder.find(useOldNamespace, ignoreFile);

    if (!this.namespaceIndexStore.isEmpty()) {
      return indexedPaths;
    }

    const scannedPaths = await this.scanFinder.find(useOldNamespace, ignoreFile);
    return [...new Set([...indexedPaths, ...scannedPaths])];
  }
}
