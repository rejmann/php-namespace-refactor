import * as fs from 'fs';
import { COMPOSER_FILE, PHP_EXTENSION, WORKSPACE_PATH } from '@infra/utils/constants';
import { container } from 'tsyringe';
import { ImportMissingClassesFeature } from '@app/namespace/update/import/ImportMissingClassesFeature';
import { RemoveUnusedImportsFeature } from '@app/namespace/remove/RemoveUnusedImportsFeature';
import { UpdateUserStatementFeature } from '@app/namespace/update/UpdateUseStatementFeature';
import { workspace } from 'vscode';

export function activate() {
  const files: string[] = fs.readdirSync(WORKSPACE_PATH);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  const updateUserStatementFeature = container.resolve(UpdateUserStatementFeature);
  const removeUnusedImportsFeature = container.resolve(RemoveUnusedImportsFeature);
  const importMissingClassesFeature = container.resolve(ImportMissingClassesFeature);

  workspace.onDidRenameFiles((event) => {
    event.files.forEach(async (file) => {
      const oldUri = file.oldUri;
      const newUri = file.newUri;

      if (!oldUri.fsPath.endsWith(PHP_EXTENSION) || !newUri.fsPath.endsWith(PHP_EXTENSION)) {
        return;
      }

      updateUserStatementFeature.execute({ newUri, oldUri });

      importMissingClassesFeature.execute({ oldUri, newUri });

      removeUnusedImportsFeature.execute({ uri: newUri });
    });
  });
}
