import { AutoloadType } from './Psr4LoaderService';

interface Props {
  autoload: AutoloadType,
  pathFull: string,
}

export class PathToNamespaceService {
  private static readonly NAMESPACE_DIVIDER = '\\":';
  private static readonly REGEX_FORWARD_SLASH_PATTERN = /\//g;
  private static readonly REGEX_FINAL_BACKSLASH_SEGMENT = /\\[^\\]+$/;
  private static readonly REGEX_BACKSLASH_PATTERN = /\\/g;
  private static readonly REGEX_TRAILING_BACKSLASH = /\\+$/;

  public resolve({ autoload, pathFull }: Props): string {
    for (const prefix in autoload) {
      const src = autoload[prefix].replace(PathToNamespaceService.REGEX_BACKSLASH_PATTERN, '/');

      if (!pathFull.startsWith(src)) {
        continue;
      }

      const prefixBase = this.extractPrefixBase(prefix);
      const srcReplace = src.endsWith('/') ? prefixBase + '\\' : prefixBase;

      return pathFull
        .replace(src, srcReplace)
        .replace(PathToNamespaceService.REGEX_FORWARD_SLASH_PATTERN, '\\')
        .replace(PathToNamespaceService.REGEX_FINAL_BACKSLASH_SEGMENT, '');
    }

    return '';
  }

  private extractPrefixBase(prefix: string): string {
    return prefix.split(PathToNamespaceService.NAMESPACE_DIVIDER)
      .at(0)
      ?.replace(PathToNamespaceService.REGEX_TRAILING_BACKSLASH, '')
      || '';
  }
}
