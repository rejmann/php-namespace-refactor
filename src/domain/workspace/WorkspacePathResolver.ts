import { basename, dirname } from 'path';
import { injectable } from "tsyringe";
import { workspace } from 'vscode';

type AbsolutePath = string | null | undefined

@injectable()
export class WorkspacePathResolver {
  public removeWorkspaceRoot(filePath: AbsolutePath) {
    return filePath
      ?.replace(this.getRootPath(), '')
      .replace(/^\/|\\/g, '') || '';
  }

  public extractDirectoryFromPath(filePath: AbsolutePath) {
    return dirname(filePath || '');
  }

  public extractClassNameFromPath(filePath: AbsolutePath) {
    return basename(filePath || '', '.php') || '';
  }

  public getRootPath() {
    return workspace.workspaceFolders
      ? workspace.workspaceFolders[0].uri.fsPath
      : '';
  }
}
