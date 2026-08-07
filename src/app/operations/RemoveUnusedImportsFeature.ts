import { ImportRemover } from '@app/services/remove/ImportRemover';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';

import { MoveFileFeature, MoveFileFeatureContext } from './MoveFileFeature';

@injectable()
export class RemoveUnusedImportsFeature implements MoveFileFeature {
  constructor(
    @inject(ImportRemover) private importRemover: ImportRemover,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async apply({ newUri }: MoveFileFeatureContext): Promise<void> {
    await this.importRemover.execute({ uri: newUri });
  }

  public isEnabled(): boolean {
    return this.featureFlagManager.isActive({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS });
  }
}
