import { inject, injectable } from 'tsyringe';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { ImportRemover } from '@app/services/remove/ImportRemover';
import { MissingClassImporter } from '@app/services/MissingClassImporter';
import { NamespaceBatchUpdater } from '@app/services/NamespaceBatchUpdater';
import { Uri } from 'vscode';

interface Props extends ReadonlyArray<{
  oldUri: Uri
  newUri: Uri
}> {}

@injectable()
export class FileRenameFeature {
  constructor(
    @inject(ImportRemover) private importRemover: ImportRemover,
    @inject(MissingClassImporter) private missingClassImporter: MissingClassImporter,
    @inject(NamespaceBatchUpdater) private namespaceBatchUpdater: NamespaceBatchUpdater,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async execute(files: Props) {
    for (const { oldUri, newUri } of files) {
      if (!oldUri.fsPath.endsWith('.php')
        || !newUri.fsPath.endsWith('.php')) {
        continue;
      }

      try {
        await this.namespaceBatchUpdater.execute({ newUri, oldUri });

        if (this.featureFlagManager.isActive({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
          await this.missingClassImporter.execute({
            oldUri,
            newUri,
          });
        }

        await this.importRemover.execute({ uri: newUri });
      } catch (error) {
        // eslint-disable-next-line no-undef
        console.error('Error processing file rename:', error);
        throw error;
      }
    }
  }
}
