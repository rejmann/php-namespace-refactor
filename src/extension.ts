import "reflect-metadata";
import * as fs from 'fs';
import { FileRenameEvent, workspace } from 'vscode';
import { COMPOSER_FILE } from '@infra/utils/constants';
import { container } from "tsyringe";
import { FileRenameHandler } from '@app/events/FileRenameHandler';
import { WorkspacePathResolver } from './domain/workspace/WorkspacePathResolver';

export function activate() {
  const workspacePathResolver = container.resolve(WorkspacePathResolver);
  const files = fs.readdirSync(workspacePathResolver.getRootPath());
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  const handler = container.resolve(FileRenameHandler);
  workspace.onDidRenameFiles(async (event: FileRenameEvent) => {
    await handler.handle(event);
  });
}
