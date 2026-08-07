import { WorkspaceIndex } from '@infra/index/WorkspaceIndex';
import { WorkspaceFileReader } from '@infra/vscode/WorkspaceFileReader';
import { inject, injectable } from 'tsyringe';

import { AffectedFileFinder } from './AffectedFileFinder';

/**
 * Fallback for when the index can't answer yet (see AffectedFileSearchResolver):
 * reads every workspace file's content just to check for a plain-text match.
 * Expensive, scales with project size - only meant to run when the index is
 * empty, not on every rename.
 */
@injectable()
export class WorkspaceScanAffectedFileFinder implements AffectedFileFinder {
  constructor(
    @inject(WorkspaceIndex) private workspaceFileFinder: WorkspaceIndex,
    @inject(WorkspaceFileReader) private workspaceFileReader: WorkspaceFileReader,
  ) {}

  public async find(useOldNamespace: string, ignoreFile: string): Promise<string[]> {
    const allFiles = await this.workspaceFileFinder.execute();

    const matches = await Promise.all(allFiles.map(async (file) => {
      if (file.fsPath === ignoreFile) {
        return null;
      }

      const text = await this.workspaceFileReader.readText(file);
      if (text === null || !text.includes(useOldNamespace)) {
        return null;
      }

      return file.fsPath;
    }));

    return matches.filter((fsPath): fsPath is string => fsPath !== null);
  }
}
