import { DirectoryMovedFilesResolver } from '@app/services/DirectoryMovedFilesResolver';
import { MissingClassImporter } from '@app/services/MissingClassImporter';
import { NamespaceBatchUpdater } from '@app/services/NamespaceBatchUpdater';
import { ImportRemover } from '@app/services/remove/ImportRemover';
import { PropertyRenameSettingsResolver } from '@domain/property/PropertyRenameSettingsResolver';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';

import type { FileMove } from './FileMove';
import { PropertyRenameOperation } from './PropertyRenameOperation';

@injectable()
export class FileMoveOperation {
  constructor(
    @inject(DirectoryMovedFilesResolver) private directoryMovedFilesResolver: DirectoryMovedFilesResolver,
    @inject(NamespaceBatchUpdater) private namespaceBatchUpdater: NamespaceBatchUpdater,
    @inject(MissingClassImporter) private missingClassImporter: MissingClassImporter,
    @inject(ImportRemover) private importRemover: ImportRemover,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(PropertyRenameOperation) private propertyRenameOperation: PropertyRenameOperation,
    @inject(PropertyRenameSettingsResolver) private propertyRenameSettingsResolver: PropertyRenameSettingsResolver,
  ) {}

  public async execute(files: ReadonlyArray<FileMove>): Promise<void> {
    const resolvedFiles = await this.directoryMovedFilesResolver.execute(files);

    for (const { oldUri, newUri } of resolvedFiles) {
      if (!newUri.fsPath.endsWith('.php') || !oldUri.fsPath.endsWith('.php')) {
        continue;
      }

      try {
        const affectedFiles = await this.namespaceBatchUpdater.execute({ newUri, oldUri });

        const propertyRenameSettings = this.propertyRenameSettingsResolver.resolve();
        if (propertyRenameSettings.enabled) {
          await this.propertyRenameOperation.execute({
            oldUri,
            newUri,
            affectedFiles,
            renameMismatchedNames: propertyRenameSettings.renameMismatchedNames,
          });
        }

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
