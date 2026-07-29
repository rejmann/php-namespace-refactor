import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { DEFAULT_EXTENSION, normalizeExtensions } from '@infra/utils/extensions';
import { inject, injectable } from 'tsyringe';
import { Uri, workspace } from 'vscode';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];

const SECONDS_IN_AN_HOUR = 60 * 60;

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

    const filteredFiles = files.filter(file => ![
      ...DEFAULT_DIRECTORIES,
      ...ignoredDirectories,
    ].some(dir => file.fsPath.includes(dir)));

    this.cachedFiles = filteredFiles;
    this.cacheTimestamp = now;
    this.cacheDuration = SECONDS_IN_AN_HOUR * duration;

    return filteredFiles;
  }
}
