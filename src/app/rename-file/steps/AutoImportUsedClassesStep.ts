import { MissingImportInserter } from '@app/rename-file/MissingImportInserter';
import { ConfigKeys } from '@domain/config/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/config/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';

import { RenameFileStep, RenameFileStepContext } from './RenameFileStep';

@injectable()
export class AutoImportUsedClassesStep implements RenameFileStep {
  constructor(
    @inject(MissingImportInserter) private missingImportInserter: MissingImportInserter,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async apply({ oldUri, newUri }: RenameFileStepContext): Promise<void> {
    await this.missingImportInserter.execute({ oldUri, newUri });
  }

  public isEnabled(): boolean {
    return this.featureFlagManager.isActive({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE });
  }
}
