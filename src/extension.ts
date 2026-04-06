import 'reflect-metadata';

import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { RenameHandler } from '@app/commands/RenameHandler';
import { FileCreatedSubscriber } from '@app/subscribers/FileCreatedSubscriber';
import { FileDeletedSubscriber } from '@app/subscribers/FileDeletedSubscriber';
import { FileSavedSubscriber } from '@app/subscribers/FileSavedSubscriber';
import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { NamespaceIndexBuilder } from '@infra/index/NamespaceIndexBuilder';
import * as fs from 'fs';
import { container } from 'tsyringe';
import { commands, ExtensionContext, FileRenameEvent, window, workspace } from 'vscode';

export async function activate(context: ExtensionContext) {
  await fs.promises.mkdir(context.storageUri!.fsPath, { recursive: true });

  container.register('StorageUri', { useValue: context.storageUri!.fsPath });

  const builder = container.resolve(NamespaceIndexBuilder);
  builder.build(); // fire and forget — não bloqueia a ativação

  const fileCreatedSubscriber = container.resolve(FileCreatedSubscriber);
  workspace.onDidCreateFiles(event => fileCreatedSubscriber.handle(event));

  const fileDeletedSubscriber = container.resolve(FileDeletedSubscriber);
  workspace.onDidDeleteFiles(event => fileDeletedSubscriber.handle(event));

  const fileSavedSubscriber = container.resolve(FileSavedSubscriber);
  workspace.onDidSaveTextDocument(document => fileSavedSubscriber.handle(document));

  const fileRenameHandler = container.resolve(FileRenameHandler);
  workspace.onDidRenameFiles(event => fileRenameHandler.handle(event));

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
