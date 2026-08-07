import { MissingClassImporter } from '@app/services/MissingClassImporter';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';

import { MoveFileFeature, MoveFileFeatureContext } from './MoveFileFeature';

@injectable()
export class AutoImportNamespaceFeature implements MoveFileFeature {
  constructor(
    @inject(MissingClassImporter) private missingClassImporter: MissingClassImporter,
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async apply({ oldUri, newUri }: MoveFileFeatureContext): Promise<void> {
    await this.missingClassImporter.execute({ oldUri, newUri });
  }

  public isEnabled(): boolean {
    return this.featureFlagManager.isActive({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE });
  }
}
