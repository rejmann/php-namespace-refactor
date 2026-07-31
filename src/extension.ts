import 'reflect-metadata';

import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { INSERT_MISSING_IMPORT_COMMAND, MissingImportCodeActionProvider } from '@app/commands/MissingImportCodeActionProvider';
import { NamespaceCodeActionProvider } from '@app/commands/NamespaceCodeActionProvider';
import { RenameHandler } from '@app/commands/RenameHandler';
import { UnusedImportCodeActionProvider } from '@app/commands/UnusedImportCodeActionProvider';
import { SingleImportInserter } from '@app/services/SingleImportInserter';
import { UseStatementBlockEditsBuilder } from '@app/services/UseStatementBlockEditsBuilder';
import { FileCreatedSubscriber } from '@app/subscribers/FileCreatedSubscriber';
import { FileDeletedSubscriber } from '@app/subscribers/FileDeletedSubscriber';
import { FileSavedSubscriber } from '@app/subscribers/FileSavedSubscriber';
import { NamespaceDiagnosticsSubscriber } from '@app/subscribers/NamespaceDiagnosticsSubscriber';
import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { NamespaceIndexBuilder } from '@infra/index/NamespaceIndexBuilder';
import * as fs from 'fs';
import { container } from 'tsyringe';
import { commands, ExtensionContext, FileRenameEvent, languages, Uri, window, workspace } from 'vscode';

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

  const namespaceDiagnosticsSubscriber = container.resolve(NamespaceDiagnosticsSubscriber);
  workspace.onDidOpenTextDocument(document => namespaceDiagnosticsSubscriber.handle(document));
  workspace.onDidSaveTextDocument(document => namespaceDiagnosticsSubscriber.handle(document));
  workspace.onDidCloseTextDocument(document => namespaceDiagnosticsSubscriber.clear(document));
  workspace.textDocuments.forEach(document => namespaceDiagnosticsSubscriber.handle(document));

  const useStatementBlockEditsBuilder = container.resolve(UseStatementBlockEditsBuilder);
  workspace.onWillSaveTextDocument((event) => {
    event.waitUntil(Promise.resolve(useStatementBlockEditsBuilder.execute(event.document)));
  });

  languages.registerCodeActionsProvider(
    { language: 'php' },
    container.resolve(NamespaceCodeActionProvider),
    { providedCodeActionKinds: NamespaceCodeActionProvider.providedCodeActionKinds },
  );

  languages.registerCodeActionsProvider(
    { language: 'php' },
    container.resolve(UnusedImportCodeActionProvider),
    { providedCodeActionKinds: UnusedImportCodeActionProvider.providedCodeActionKinds },
  );

  languages.registerCodeActionsProvider(
    { language: 'php' },
    container.resolve(MissingImportCodeActionProvider),
    { providedCodeActionKinds: MissingImportCodeActionProvider.providedCodeActionKinds },
  );

  commands.registerCommand(INSERT_MISSING_IMPORT_COMMAND, async (uri: Uri, fullNamespace: string) => {
    const document = await workspace.openTextDocument(uri);
    const singleImportInserter = container.resolve(SingleImportInserter);
    await singleImportInserter.execute({ document, fullNamespace });
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
