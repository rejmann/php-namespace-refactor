import { FileExtensionResolver } from '@domain/config/FileExtensionResolver';
import { WORKSPACE_ROOT_PATH } from '@infra/utils/constants';
import { basename, dirname } from 'path';
import { inject, injectable } from 'tsyringe';

type AbsolutePath = string | null | undefined

@injectable()
export class PhpFilePathResolver {
  constructor(
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

  public removeWorkspaceRoot(filePath: AbsolutePath) {
    return filePath
      ?.replace(WORKSPACE_ROOT_PATH, '')
      .replace(/^\/|\\/g, '') || '';
  }
}
