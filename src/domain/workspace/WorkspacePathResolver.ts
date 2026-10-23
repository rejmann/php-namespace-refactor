import { FileExtensionResolver } from '@domain/workspace/FileExtensionResolver';
import {
  BACKSLASH_RE,
  mostSpecificFirst,
  psr4Entries,
  TRAILING_BACKSLASHES_RE,
} from '@infra/autoload/AutoloadPathResolver';
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

  /**
   * Directory where the classes of `namespace` live, from the psr-4 entry
   * (autoload and autoload-dev together, autoload winning ties) with the
   * longest prefix that contains it on whole segments: `App` never matches
   * `Application\Foo`, and `App\Tests\` in autoload-dev beats `App\` in
   * autoload for `App\Tests\Unit`.
   */
  public async getDirectoryFromNamespace(namespace: string): Promise<string> {
    const { autoload, autoloadDev } = await this.composerAutoloadManager.execute();
    const target = namespace.replace(/^\\+/, '').replace(TRAILING_BACKSLASHES_RE, '');

    for (const { prefix, directory } of mostSpecificFirst(psr4Entries([autoload, autoloadDev]), 'prefix')) {
      if (prefix !== '' && target !== prefix && !target.startsWith(`${prefix}\\`)) {
        continue;
      }

      const relativePath = target
        .slice(prefix.length)
        .replace(/^\\+/, '')
        .replace(BACKSLASH_RE, '/');

      return [WORKSPACE_ROOT_PATH, directory, relativePath].filter(Boolean).join('/');
    }

    throw new Error(`No autoload mapping found for namespace: ${namespace}`);
  }

  public removeWorkspaceRoot(filePath: AbsolutePath) {
    return filePath
      ?.replace(WORKSPACE_ROOT_PATH, '')
      .replace(/^\/|\\/g, '') || '';
  }
}
