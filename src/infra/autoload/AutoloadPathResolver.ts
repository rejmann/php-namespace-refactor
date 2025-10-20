import { injectable } from "tsyringe";

type AutoloadType = {
  [key: string]: string
}

interface Props {
  autoload: AutoloadType,
  workspaceRoot: string,
}

export const BACKSLASH_RE = /\\/g;
export const TRAILING_BACKSLASHES_RE = /\\+$/;

@injectable()
export class AutoloadPathResolver {
  public async execute({ autoload, workspaceRoot }: Props) {
    for (const prefix in autoload) {
      const src = autoload[prefix].replace(BACKSLASH_RE, '/');

      if (!workspaceRoot.startsWith(src)) {
        continue;
      }

      const prefixBase = prefix.split('\\":').at(0)?.replace(TRAILING_BACKSLASHES_RE, '') || '';

      const srcReplace = src.endsWith('/') ? prefixBase + '\\' : prefixBase;

      return workspaceRoot
        .replace(src, srcReplace)
        .replace(/\//g, '\\')
        .replace(/\\[^\\]+$/, '');
    }

    return '';
  }
}
