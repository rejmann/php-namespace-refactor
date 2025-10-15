import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { inject, injectable } from "tsyringe";
import { Uri, workspace } from 'vscode';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];
const DEFAULT_EXTENSION_PHP = 'php';

const SECONDS_IN_AN_HOUR = 60 * 60;

@injectable()
export class WorkspaceFileFinder {
  private cachedFiles: Uri[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration: number = 0;

  constructor(
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
  ) {
  }

  async execute(duration: number = 4): Promise<Uri[]> {
    const now = Date.now();
    if (this.cachedFiles && (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.cachedFiles;
    }

    const extensions = this.configurationLocator.get<string[]>({
      key: ConfigKeys.ADDITIONAL_EXTENSIONS,
      defaultValue: [DEFAULT_EXTENSION_PHP],
    });

    const pattern = `**/*.{${[DEFAULT_EXTENSION_PHP, ...extensions].join(',')}}`;
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

  clearCache() {
    this.cachedFiles = null;
    this.cacheTimestamp = 0;
  }
}
