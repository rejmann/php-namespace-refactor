import { workspace } from 'vscode';

export const FILE_EXTENSION = '.php';

export const WORKSPACE_ROOT_PATH = workspace.workspaceFolders
  ? workspace.workspaceFolders[0].uri.fsPath
  : '';
