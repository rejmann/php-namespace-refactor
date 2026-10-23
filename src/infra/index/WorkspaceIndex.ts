import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { DEFAULT_EXTENSION, normalizeExtensions } from '@infra/utils/extensions';
import { inject, injectable } from 'tsyringe';
import { Uri, workspace } from 'vscode';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];

const SECONDS_IN_AN_HOUR = 60 * 60;

/**
 * Matches ignored directories against the path relative to the workspace
 * folder (with a leading `/`), never the absolute path: a project living
 * under e.g. /var/www would otherwise have every file ignored by `/var/`.
 */
export function isIgnoredPath(relativePath: string, ignoredDirectories: string[]): boolean {
  const candidate = `/${relativePath.replace(/\\/g, '/').replace(/^\/+/, '')}`;
  return ignoredDirectories.some(dir => candidate.includes(dir));
}

@injectable()
export class WorkspaceIndex {
  private cachedFiles: Uri[] | null = null;
  private cacheDuration: number = 0;
  private cacheTimestamp: number = 0;

  constructor(
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
  ) {
  }

  clearCache() {
    this.cachedFiles = null;
    this.cacheTimestamp = 0;
  }

  async execute(duration: number = 4): Promise<Uri[]> {
    const now = Date.now();
    if (this.cachedFiles && (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.cachedFiles;
    }

    const extensions = normalizeExtensions(this.configurationLocator.get<string[]>({
      key: ConfigKeys.ADDITIONAL_EXTENSIONS,
      defaultValue: [DEFAULT_EXTENSION],
    }));

    const pattern = `**/*.{${extensions.join(',')}}`;
    const files = await workspace.findFiles(pattern);

    const ignoredDirectories = this.configurationLocator.get<string[]>({
      key: ConfigKeys.IGNORED_DIRECTORIES,
      defaultValue: DEFAULT_DIRECTORIES,
    });

    const filteredFiles = files.filter(file => !isIgnoredPath(
      workspace.asRelativePath(file, false),
      [...DEFAULT_DIRECTORIES, ...ignoredDirectories],
    ));

    this.cachedFiles = filteredFiles;
    this.cacheTimestamp = now;
    this.cacheDuration = SECONDS_IN_AN_HOUR * duration;

    return filteredFiles;
  }
}
