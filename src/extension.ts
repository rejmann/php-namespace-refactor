import * as fs from 'fs';
import { autoImportClassesFromOldDirectory } from './app/namespace/update/import/autoImportClassesFromOldDirectory';
import { cleanupUnusedImportsAfterMove } from './app/namespace/remove/cleanupUnusedImportsAfterMove';
import { COMPOSER_FILE } from './infra/utils/constants';
import { ConfigKeys } from './infra/workspace/configTypes';
import { isFeatureEnabled } from './infra/workspace/vscodeConfig';
import { PHP_EXTENSION } from './infra/utils/constants';
import { refactorNamespaceReferences } from './app/namespace/update/refactorNamespaceReferences';
import { workspace } from 'vscode';
import { WORKSPACE_ROOT } from './infra/utils/constants';

export function activate() {
  const files: string[] = fs.readdirSync(WORKSPACE_ROOT);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  workspace.onDidRenameFiles((event) => {
    event.files.forEach(async (file) => {
      const oldUri = file.oldUri;
      const newUri = file.newUri;

      if (!oldUri.fsPath.endsWith(PHP_EXTENSION) || !newUri.fsPath.endsWith(PHP_EXTENSION)) {
        return;
      }

      await refactorNamespaceReferences({ newUri, oldUri });

      if (isFeatureEnabled({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
        await autoImportClassesFromOldDirectory({
          oldFileName: oldUri.fsPath,
          newUri,
        });
      }

      await cleanupUnusedImportsAfterMove({ uri: newUri });
    });
  });
}
