import { MissingClassImporter } from '@app/services/MissingClassImporter';
import { NamespaceBatchUpdater } from '@app/services/NamespaceBatchUpdater';
import { ImportRemover } from '@app/services/remove/ImportRemover';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';
import { Uri } from 'vscode';

interface FileMove {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class FileMoveOperation {
  constructor(
    @inject(NamespaceBatchUpdater) private namespaceBatchUpdater: NamespaceBatchUpdater,
    @inject(MissingClassImporter) private missingClassImporter: MissingClassImporter,
    @inject(ImportRemover) private importRemover: ImportRemover,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async execute(files: ReadonlyArray<FileMove>): Promise<void> {
    for (const { oldUri, newUri } of files) {
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
        console.error('Error processing file move:', error);
        throw error;
      }
    }
  }
}
