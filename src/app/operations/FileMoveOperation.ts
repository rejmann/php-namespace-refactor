import { DirectoryMovedFilesResolver } from '@app/services/DirectoryMovedFilesResolver';
import { MissingClassImporter } from '@app/services/MissingClassImporter';
import { NamespaceBatchUpdater } from '@app/services/NamespaceBatchUpdater';
import { ImportRemover } from '@app/services/remove/ImportRemover';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';

import type { FileMove } from './FileMove';

@injectable()
export class FileMoveOperation {
  constructor(
    @inject(DirectoryMovedFilesResolver) private directoryMovedFilesResolver: DirectoryMovedFilesResolver,
    @inject(NamespaceBatchUpdater) private namespaceBatchUpdater: NamespaceBatchUpdater,
    @inject(MissingClassImporter) private missingClassImporter: MissingClassImporter,
    @inject(ImportRemover) private importRemover: ImportRemover,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async execute(files: ReadonlyArray<FileMove>): Promise<void> {
    const resolvedFiles = await this.directoryMovedFilesResolver.execute(files);

    for (const { oldUri, newUri } of resolvedFiles) {
      if (!newUri.fsPath.endsWith('.php') || !oldUri.fsPath.endsWith('.php')) {
        continue;
      }

      try {
        await this.namespaceBatchUpdater.execute({ newUri, oldUri });

        if (this.featureFlagManager.isActive({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
          await this.missingClassImporter.execute({ oldUri, newUri });
        }

        await this.importRemover.execute({ uri: newUri });
      } catch (error) {
        console.error('Error processing file move:', error); // eslint-disable-line
        throw error;
      }
    }
  }
}
