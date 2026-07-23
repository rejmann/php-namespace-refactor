import { FileExtensionResolver } from '@domain/workspace/FileExtensionResolver';
import { BACKSLASH_RE, TRAILING_BACKSLASHES_RE } from '@infra/autoload/AutoloadPathResolver';
import { ComposerAutoloadManager } from '@infra/autoload/ComposerAutoloadManager';
import { WORKSPACE_ROOT_PATH } from '@infra/utils/constants';
import { basename, dirname } from 'path';
import { inject, injectable } from 'tsyringe';

type AbsolutePath = string | null | undefined

@injectable()
export class WorkspacePathResolver {
  constructor(
    @inject(ComposerAutoloadManager) private composerAutoloadManager: ComposerAutoloadManager,
    @inject(FileExtensionResolver) private fileExtensionResolver: FileExtensionResolver,
  ) {
  }

  public extractClassNameFromPath(filePath: AbsolutePath): string {
    const fileName = basename(filePath || '');
    const extension = this.fileExtensionResolver.match(fileName);

    if (extension === null) {
      return fileName;
    }

    return fileName.slice(0, fileName.length - extension.length);
  }

  public extractDirectoryFromPath(filePath: AbsolutePath) {
    return dirname(filePath || '');
  }

  public extractExtensionFromPath(filePath: AbsolutePath): string {
    const fileName = basename(filePath || '');
    const matched = this.fileExtensionResolver.match(fileName);

    if (matched !== null) {
      return matched;
    }

    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';
  }

  public async getDirectoryFromNamespace(namespace: string): Promise<string> {
    const { autoload, autoloadDev } = await this.composerAutoloadManager.execute();

    const workspaceRoot = WORKSPACE_ROOT_PATH;

    for (const currentAutoload of [autoload, autoloadDev]) {
      if (!currentAutoload || Object.keys(currentAutoload).length === 0) {
        continue;
      }

      const sortedPrefixes = Object.keys(currentAutoload).sort((a, b) => b.length - a.length);

      for (const prefix of sortedPrefixes) {
        const cleanPrefix = prefix.replace(TRAILING_BACKSLASHES_RE, '');
        if (!namespace.startsWith(cleanPrefix)) {
          continue;
        }

        const relativePart = namespace.substring(cleanPrefix.length);
        const relativePath = relativePart.replace(/^\\+/, '').replace(BACKSLASH_RE, '/');

        const baseDirectory = currentAutoload[prefix].replace(/\/$/, '');

        const fullPath = relativePath
          ? `${workspaceRoot}/${baseDirectory}/${relativePath}`
          : `${workspaceRoot}/${baseDirectory}`;

        return fullPath;
      }
    }

    throw new Error(`No autoload mapping found for namespace: ${namespace}`);
  }

  public removeWorkspaceRoot(filePath: AbsolutePath) {
    return filePath
      ?.replace(WORKSPACE_ROOT_PATH, '')
      .replace(/^\/|\\/g, '') || '';
  }
}
