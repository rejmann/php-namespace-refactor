import { workspace } from 'vscode';

export const COMPOSER_FILE = 'composer.json';

export const WORKSPACE_PATH = workspace.workspaceFolders
  ? workspace.workspaceFolders[0].uri.fsPath
  : '';

export const PHP_EXTENSION = '.php';
