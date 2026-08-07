import 'reflect-metadata';

import { FileCreatedListener } from '@app/index-listeners/FileCreatedListener';
import { FileDeletedListener } from '@app/index-listeners/FileDeletedListener';
import { FileSavedListener } from '@app/index-listeners/FileSavedListener';
import { AutoImportUsedClassesStep } from '@app/rename-file/steps/AutoImportUsedClassesStep';
import { RemoveUnusedImportsStep } from '@app/rename-file/steps/RemoveUnusedImportsStep';
import { FileExplorerRenameBridge } from '@app/rename-file/triggers/FileExplorerRenameBridge';
import { NamespaceIndexBuilder } from '@infra/index/NamespaceIndexBuilder';
import { NamespaceIndexRepository } from '@infra/index/NamespaceIndexRepository';
import { NamespaceIndexStore } from '@infra/index/NamespaceIndexStore';
import * as fs from 'fs';
import { container } from 'tsyringe';
import { ExtensionContext, workspace } from 'vscode';

export async function activate(context: ExtensionContext) {
  await fs.promises.mkdir(context.storageUri!.fsPath, { recursive: true });

  container.register('StorageUri', { useValue: context.storageUri!.fsPath });

  // Order here is the apply order inside RenameFileUseCase's per-file loop.
  container.register('RenameFileStep', { useClass: AutoImportUsedClassesStep });
  container.register('RenameFileStep', { useClass: RemoveUnusedImportsStep });

  // Cache from the previous session, so getFilesUsing works before the scan below finishes.
  const namespaceIndexStore = container.resolve(NamespaceIndexStore);
  const cachedIndex = await container.resolve(NamespaceIndexRepository).load();
  if (cachedIndex) {
    namespaceIndexStore.hydrate(cachedIndex);
  }

  const builder = container.resolve(NamespaceIndexBuilder);
  builder.build(); // fire and forget — não bloqueia a ativação, faz refresh/prune em background

  const fileCreatedListener = container.resolve(FileCreatedListener);
  workspace.onDidCreateFiles(event => fileCreatedListener.handle(event));

  const fileDeletedListener = container.resolve(FileDeletedListener);
  workspace.onDidDeleteFiles(event => fileDeletedListener.handle(event));

  const fileSavedListener = container.resolve(FileSavedListener);
  workspace.onDidSaveTextDocument(document => fileSavedListener.handle(document));

  const fileExplorerRenameBridge = container.resolve(FileExplorerRenameBridge);
  workspace.onDidRenameFiles(event => fileExplorerRenameBridge.handle(event));
}
