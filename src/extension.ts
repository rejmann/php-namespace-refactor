import * as fs from 'fs';
import { COMPOSER_FILE, WORKSPACE_PATH } from '@infra/utils/constants';
import { container } from 'tsyringe';
import { FileRenameEventHandler } from '@app/events/FileRenameEventHandler';
import { workspace } from 'vscode';

export function activate() {
  const files: string[] = fs.readdirSync(WORKSPACE_PATH);
  if (!files.includes(COMPOSER_FILE)) {
    return;
  }

  const fileRenameEventHandler = container.resolve(FileRenameEventHandler);

  workspace.onDidRenameFiles((event) => {
    fileRenameEventHandler.handle(event);
  });
}
