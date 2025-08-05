import * as fs from 'fs';
import * as path from 'path';
import { COMPOSER_FILE, PHP_EXTENSION, WORKSPACE_ROOT } from './infra/utils/constants';
import { ConfigKeys } from './infra/workspace/configTypes';
import { Container } from '@infra/di/Container';
import { importMissingClasses } from './app/namespace/update/import/importMissingClasses';
import { isConfigEnabled } from './infra/workspace/vscodeConfig';
import { removeUnusedImports } from './app/namespace/remove/removeUnusedImports';
import { updateReferences } from './app/namespace/update/updateReferences';
import { workspace } from 'vscode';

export function activate() {
  const files: string[] = fs.readdirSync(WORKSPACE_ROOT);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  new Container().loadServicesFrom(path.join(WORKSPACE_ROOT, "src"));

  workspace.onDidRenameFiles((event) => {
    event.files.forEach(async (file) => {
      const oldUri = file.oldUri;
      const newUri = file.newUri;

      if (!oldUri.fsPath.endsWith(PHP_EXTENSION) || !newUri.fsPath.endsWith(PHP_EXTENSION)) {
        return;
      }

      await updateReferences({ newUri, oldUri });

      if (isConfigEnabled({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
        await importMissingClasses({
          oldFileName: oldUri.fsPath,
          newUri,
        });
      }

      await removeUnusedImports({ uri: newUri });
    });
  });
}
