import 'reflect-metadata';
import * as fs from 'fs';
import { COMPOSER_FILE, WORKSPACE_PATH } from '@shared/constants';
import { container } from 'tsyringe';
import { FileRenameEventHandler } from '@domain/events/handlers/FileRenameEventHandler';
import { workspace } from 'vscode';

export function activate() {
  const files: string[] = fs.readdirSync(WORKSPACE_PATH);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  const handler = container.resolve(FileRenameEventHandler);

  workspace.onDidRenameFiles((event) => handler.handle(event));
}
