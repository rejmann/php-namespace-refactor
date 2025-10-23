import 'reflect-metadata';

import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { RenameHandler } from '@app/commands/RenameHandler';
import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { COMPOSER_FILE, WORKSPACE_ROOT_PATH } from '@infra/utils/constants';
import * as fs from 'fs';
import { container } from 'tsyringe';
import { commands, FileRenameEvent, window, workspace } from 'vscode';

export function activate() {
  const files = fs.readdirSync(WORKSPACE_ROOT_PATH);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  const fileRenameHandler = container.resolve(FileRenameHandler);
  workspace.onDidRenameFiles(async (event: FileRenameEvent) => {
    await fileRenameHandler.handle(event);
  });

  const command = ConfigurationLocator.getConfigKey(ConfigKeys.RENAME);
  commands.registerCommand(command, () => {
    const configuration = container.resolve(FeatureFlagManager);
    if (!configuration.isActive({ key: ConfigKeys.RENAME })) {
      return;
    }

    const renameHandler = container.resolve(RenameHandler);
    renameHandler.handle({ activeEditor: window.activeTextEditor });
  });
}
