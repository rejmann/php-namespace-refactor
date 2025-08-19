import * as fs from 'fs';
import { COMPOSER_FILE, PHP_EXTENSION, WORKSPACE_ROOT } from '@infra/utils/constants';
import { ConfigKeys } from '@infra/workspace/configTypes';
import { importMissingClasses } from '@app/namespace/update/import/importMissingClasses';
import { isConfigEnabled } from '@infra/workspace/vscodeConfig';
import { removeUnusedImports } from '@app/namespace/remove/removeUnusedImports';
import { updateReferences } from '@app/namespace/update/updateReferences';
import { workspace } from 'vscode';

export function activate() {
  const files: string[] = fs.readdirSync(WORKSPACE_ROOT);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  workspace.onDidRenameFiles(async (event) => {
    for (const { oldUri, newUri } of event.files) {
      if (!oldUri.fsPath.endsWith(PHP_EXTENSION)
        || !newUri.fsPath.endsWith(PHP_EXTENSION)) {
        continue;
      }

      try {
        await updateReferences({ newUri, oldUri });

        if (isConfigEnabled({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
          await importMissingClasses({
            oldFileName: oldUri.fsPath,
            newUri,
          });
        }

        await removeUnusedImports({ uri: newUri });
      } catch (error) {
        console.error('Error processing file rename:', error);
        throw error;
      }
    }
  });
}
