import { workspace } from 'vscode';

export const COMPOSER_FILE = 'composer.json';

export const WORKSPACE_ROOT_PATH = workspace.workspaceFolders
  ? workspace.workspaceFolders[0].uri.fsPath
  : '';
