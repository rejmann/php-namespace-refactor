import { basename, dirname } from 'path';
import { WORKSPACE_PATH } from '../../shared/constants';

type AbsolutePath = string | null | undefined;

const LEADING_SLASH_OR_BACKSLASH_REGEX = /^\/|\\/g;

export class FilePathUtils {
  static removeWorkspaceRoot(filePath: AbsolutePath): string {
    return filePath
      ?.replace(WORKSPACE_PATH, '')
      .replace(LEADING_SLASH_OR_BACKSLASH_REGEX, '') || '';
  }

  static extractDirectoryFromPath(filePath: AbsolutePath) {
    return dirname(filePath || '');
  }

  static extractClassNameFromPath(filePath: AbsolutePath): string {
    return basename(filePath || '', '.php') || '';
  }
}
