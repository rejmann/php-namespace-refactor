import 'reflect-metadata';

import { FileRenameHandler } from '@app/commands/FileRenameHandler';
import { AutoImportNamespaceFeature } from '@app/operations/AutoImportNamespaceFeature';
import { RemoveUnusedImportsFeature } from '@app/operations/RemoveUnusedImportsFeature';
import { FileCreatedSubscriber } from '@app/subscribers/FileCreatedSubscriber';
import { FileDeletedSubscriber } from '@app/subscribers/FileDeletedSubscriber';
import { FileSavedSubscriber } from '@app/subscribers/FileSavedSubscriber';
import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { NamespaceIndexBuilder } from '@infra/index/NamespaceIndexBuilder';
import * as fs from 'fs';
import { container } from 'tsyringe';
import { ExtensionContext, workspace } from 'vscode';

export async function activate(context: ExtensionContext) {
  await fs.promises.mkdir(context.storageUri!.fsPath, { recursive: true });

  container.register('StorageUri', { useValue: context.storageUri!.fsPath });

  // Order here is the apply order inside FileMoveOperation's per-file loop.
  container.register('MoveFileFeature', { useClass: AutoImportNamespaceFeature });
  container.register('MoveFileFeature', { useClass: RemoveUnusedImportsFeature });

  const namespaceIndex = container.resolve(NamespaceIndex);
  await namespaceIndex.load(); // cache from the previous session, so getFilesUsing works before the scan below finishes

  const builder = container.resolve(NamespaceIndexBuilder);
  builder.build(); // fire and forget — não bloqueia a ativação, faz refresh/prune em background

  const fileCreatedSubscriber = container.resolve(FileCreatedSubscriber);
  workspace.onDidCreateFiles(event => fileCreatedSubscriber.handle(event));

  const fileDeletedSubscriber = container.resolve(FileDeletedSubscriber);
  workspace.onDidDeleteFiles(event => fileDeletedSubscriber.handle(event));

  const fileSavedSubscriber = container.resolve(FileSavedSubscriber);
  workspace.onDidSaveTextDocument(document => fileSavedSubscriber.handle(document));

  const fileRenameHandler = container.resolve(FileRenameHandler);
  workspace.onDidRenameFiles(event => fileRenameHandler.handle(event));
}
