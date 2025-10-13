import "reflect-metadata";
import * as fs from 'fs';
import { COMPOSER_FILE, PHP_EXTENSION } from '@infra/utils/constants';
import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { container } from "tsyringe";
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { ImportRemover } from '@app/services/remove/ImportRemover';
import { MissingClassImporter } from '@app/services/MissingClassImporter';
import { NamespaceBatchUpdater } from '@app/services/NamespaceBatchUpdater';
import { workspace } from 'vscode';
import { WorkspacePathResolver } from './domain/workspace/WorkspacePathResolver';

export function activate() {
  const files: string[] = fs.readdirSync(new WorkspacePathResolver().getRootPath());
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  workspace.onDidRenameFiles(async (event) => {
    const importRemover = container.resolve(ImportRemover);
    const missingClassImporter = container.resolve(MissingClassImporter);
    const namespaceBatchUpdater = container.resolve(NamespaceBatchUpdater);
    const featureFlagManager = container.resolve(FeatureFlagManager);

    for (const { oldUri, newUri } of event.files) {
      if (!oldUri.fsPath.endsWith(PHP_EXTENSION)
        || !newUri.fsPath.endsWith(PHP_EXTENSION)) {
        continue;
      }

      try {
        await namespaceBatchUpdater.execute({ newUri, oldUri });

        if (featureFlagManager.isActive({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
          await missingClassImporter.execute({
            oldUri,
            newUri,
          });
        }

        await importRemover.execute({ uri: newUri });
      } catch (error) {
        // eslint-disable-next-line no-undef
        console.error('Error processing file rename:', error);
        throw error;
      }
    }
  });
}
