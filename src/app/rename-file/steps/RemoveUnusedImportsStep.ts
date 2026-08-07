import { UnusedImportRemover } from '@app/rename-file/UnusedImportRemover';
import { ConfigKeys } from '@domain/config/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/config/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';

import { RenameFileStep, RenameFileStepContext } from './RenameFileStep';

@injectable()
export class RemoveUnusedImportsStep implements RenameFileStep {
  constructor(
    @inject(UnusedImportRemover) private unusedImportRemover: UnusedImportRemover,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async apply({ newUri }: RenameFileStepContext): Promise<void> {
    await this.unusedImportRemover.execute({ uri: newUri });
  }

  public isEnabled(): boolean {
    return this.featureFlagManager.isActive({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS });
  }
}
