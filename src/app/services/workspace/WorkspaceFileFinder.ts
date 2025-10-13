import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { Uri, workspace } from 'vscode';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];
const DEFAULT_EXTENSION_PHP = 'php';

export class WorkspaceFileFinder {
  private cachedFiles: Uri[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheDuration: number;

  constructor(cacheDuration: number = 4) {
    this.cacheDuration = 60 * 60 * cacheDuration;
  }

  async execute(): Promise<Uri[]> {
    const now = Date.now();
    if (this.cachedFiles && (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.cachedFiles;
    }

    const configurationLocator = new ConfigurationLocator();

    const extensions = configurationLocator.get<string[]>({
      key: ConfigKeys.ADDITIONAL_EXTENSIONS,
      defaultValue: [DEFAULT_EXTENSION_PHP],
    });

    const pattern = `**/*.{${[DEFAULT_EXTENSION_PHP, ...extensions].join(',')}}`;
    const files = await workspace.findFiles(pattern);

    const ignoredDirectories = configurationLocator.get<string[]>({
      key: ConfigKeys.IGNORED_DIRECTORIES,
      defaultValue: DEFAULT_DIRECTORIES,
    });

    const filteredFiles = files.filter(file => ![
      ...DEFAULT_DIRECTORIES,
      ...ignoredDirectories,
    ].some(dir => file.fsPath.includes(dir)));

    this.cachedFiles = filteredFiles;
    this.cacheTimestamp = now;

    return filteredFiles;
  }

  clearCache() {
    this.cachedFiles = null;
    this.cacheTimestamp = 0;
  }
}
