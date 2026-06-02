import { join, relative } from 'path';
import { injectable } from 'tsyringe';
import { FileType, Uri, workspace } from 'vscode';

import type { FileMove } from '../operations/FileMove';

@injectable()
export class DirectoryMovedFilesResolver {
  public async execute(files: ReadonlyArray<FileMove>): Promise<FileMove[]> {
    const resolvedGroups = await Promise.all(files.map(file => this.resolveMove(file)));
    const expanded: FileMove[] = [];
    let hasExpandedDirectoryMove = false;

    for (const { moves, expandedDirectory } of resolvedGroups) {
      expanded.push(...moves);
      hasExpandedDirectoryMove ||= expandedDirectory;
    }

    if (!hasExpandedDirectoryMove) {
      return expanded;
    }

    return this.removeDuplicates(expanded);
  }

  private async collectMovedFilesFromDirectory({
    oldDirectoryUri,
    newDirectoryUri,
  }: {
    oldDirectoryUri: Uri,
    newDirectoryUri: Uri,
  }): Promise<FileMove[]> {
    const movedFiles: FileMove[] = [];
    const pendingDirectories: Uri[] = [newDirectoryUri];

    while (pendingDirectories.length > 0) {
      const currentDirectoryUri = pendingDirectories.pop()!;
      const entries = await workspace.fs.readDirectory(currentDirectoryUri);

      for (const [name, type] of entries) {
        const entryUri = Uri.joinPath(currentDirectoryUri, name);

        if (type === FileType.Directory) {
          pendingDirectories.push(entryUri);
          continue;
        }

        if (type === FileType.File) {
          const relativeFilePath = relative(newDirectoryUri.fsPath, entryUri.fsPath);
          const oldFilePath = join(oldDirectoryUri.fsPath, relativeFilePath);

          movedFiles.push({
            oldUri: Uri.file(oldFilePath),
            newUri: entryUri,
          });
        }
      }
    }

    return movedFiles;
  }

  private async isDirectory(uri: Uri): Promise<boolean> {
    try {
      const stat = await workspace.fs.stat(uri);
      return stat.type === FileType.Directory;
    } catch {
      return false;
    }
  }

  private removeDuplicates(files: ReadonlyArray<FileMove>): FileMove[] {
    const uniqueFiles = new Map<string, FileMove>();

    for (const file of files) {
      uniqueFiles.set(`${file.oldUri.fsPath}->${file.newUri.fsPath}`, file);
    }

    return [...uniqueFiles.values()];
  }

  private async resolveMove(file: FileMove): Promise<{ moves: FileMove[], expandedDirectory: boolean }> {
    if (!await this.isDirectory(file.newUri)) {
      return { moves: [file], expandedDirectory: false };
    }

    const moves = await this.collectMovedFilesFromDirectory({
      oldDirectoryUri: file.oldUri,
      newDirectoryUri: file.newUri,
    });

    return { moves, expandedDirectory: true };
  }
}
