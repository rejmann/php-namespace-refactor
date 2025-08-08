import { Uri, workspace } from 'vscode';
import { ConfigKeys } from '@infra/workspace/configTypes';
import { getWorkspaceConfig } from '@infra/workspace/vscodeConfig';
import { injectable } from 'tsyringe';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];

@injectable()
export class WorkspaceFileSearcherService {
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

    const extensions = getWorkspaceConfig<string[]>({
      key: ConfigKeys.ADDITIONAL_EXTENSIONS,
      defaultValue: [DEFAULT_EXTENSION_PHP],
    });

    return workspace.findFiles(
      `**/*.{${[DEFAULT_EXTENSION_PHP, ...extensions].join(',')}}`
    );
  }

  private getIgnoredDirectories(): string[] {
    return getWorkspaceConfig<string[]>({
      key: ConfigKeys.IGNORED_DIRECTORIES,
      defaultValue: DEFAULT_DIRECTORIES,
    });
  }
}
