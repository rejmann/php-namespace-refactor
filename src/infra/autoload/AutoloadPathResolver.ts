import { injectable } from 'tsyringe';

/** The `psr-4` section of composer.json: prefix → directory (or directories). */
export type Psr4Map = Record<string, string | string[]>;

export interface Psr4Entry {
  /** Namespace prefix without trailing backslashes, e.g. `App\Domain` ('' for the global namespace). */
  prefix: string
  /** Directory relative to the project root, without `./` or a trailing slash ('' for the root itself). */
  directory: string
}

interface Props {
  autoloads: Array<Psr4Map | null | undefined>,
  workspaceRoot: string,
}

export const BACKSLASH_RE = /\\/g;
export const TRAILING_BACKSLASHES_RE = /\\+$/;

function normalizeDirectory(directory: string): string {
  const normalized = directory
    .replace(BACKSLASH_RE, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');

  return normalized === '.' ? '' : normalized;
}

/**
 * Flattens psr-4 maps into entries, earlier maps first (e.g. autoload
 * before autoload-dev), expanding prefixes mapped to several directories.
 */
export function psr4Entries(autoloads: Array<Psr4Map | null | undefined>): Psr4Entry[] {
  return autoloads.flatMap(autoload => Object.entries(autoload ?? {}).flatMap(([prefix, directories]) =>
    (Array.isArray(directories) ? directories : [directories])
      .filter((directory): directory is string => typeof directory === 'string')
      .map(directory => ({
        prefix: prefix.replace(TRAILING_BACKSLASHES_RE, ''),
        directory: normalizeDirectory(directory),
      })),
  ));
}

/**
 * Sorts entries by a key's length, longest first, so the most specific
 * mapping wins. The sort is stable, so earlier maps keep priority on ties.
 */
export function mostSpecificFirst(entries: Psr4Entry[], key: keyof Psr4Entry): Psr4Entry[] {
  return [...entries].sort((a, b) => b[key].length - a[key].length);
}

@injectable()
export class AutoloadPathResolver {
  /**
   * Namespace of the directory of `workspaceRoot` (a file path relative to
   * the project root), from the psr-4 entry with the longest directory that
   * contains it on whole path segments (`src` never matches `srcfoo/`).
   * Returns null when no entry applies, '' for the global namespace.
   */
  public async execute({ autoloads, workspaceRoot }: Props): Promise<string | null> {
    const relativeFile = workspaceRoot.replace(BACKSLASH_RE, '/').replace(/^\/+/, '');

    for (const { prefix, directory } of mostSpecificFirst(psr4Entries(autoloads), 'directory')) {
      if (directory !== '' && !relativeFile.startsWith(`${directory}/`)) {
        continue;
      }

      const rest = directory === '' ? relativeFile : relativeFile.slice(directory.length + 1);
      const directorySegments = rest.split('/').slice(0, -1);

      return [prefix, ...directorySegments].filter(Boolean).join('\\');
    }

    return null;
  }
}
