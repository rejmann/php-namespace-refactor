import { Config, ConfigurationService } from '@infra/workspace/ConfigurationService';
import { Uri, workspace } from 'vscode';
import { injectable } from 'tsyringe';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];

@injectable()
export class WorkspaceFileSearcherService {
  constructor(
    private readonly configurationService: ConfigurationService,
  ) {
  }

  public async execute(): Promise<Uri[]> {
    const files = await this.getFileByExtensions();

    const ignoredDirectories = this.getIgnoredDirectories();

    return files.filter(file => ![
      ...DEFAULT_DIRECTORIES,
      ...ignoredDirectories,
    ].some(dir => file.fsPath.includes(dir)));
  }

  private async getFileByExtensions(): Promise<Uri[]> {
    const DEFAULT_EXTENSION_PHP = 'php';

    const extensions = this.configurationService.getWorkspaceConfig<string[]>({
      key: Config.ADDITIONAL_EXTENSIONS,
      defaultValue: [DEFAULT_EXTENSION_PHP],
    });

    return workspace.findFiles(
      `**/*.{${[DEFAULT_EXTENSION_PHP, ...extensions].join(',')}}`
    );
  }

  private getIgnoredDirectories(): string[] {
    return this.configurationService.getWorkspaceConfig<string[]>({
      key: Config.IGNORED_DIRECTORIES,
      defaultValue: DEFAULT_DIRECTORIES,
    });
  }
}
