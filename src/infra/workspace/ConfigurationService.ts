import { workspace, WorkspaceConfiguration } from 'vscode';
import { injectable } from 'tsyringe';

export const Config = {
  AUTO_IMPORT_NAMESPACE: 'autoImportNamespace',
  REMOVE_UNUSED_IMPORTS: 'removeUnusedImports',
  IGNORED_DIRECTORIES: 'ignoredDirectories',
  ADDITIONAL_EXTENSIONS: 'additionalExtensions',
} as const;

interface IsConfigEnabledProps {
  key: string
  defaultValue?: boolean
}

interface GetWorkspaceConfigProps<T> {
  key: string
  defaultValue?: T
}

@injectable()
export class ConfigurationService {
  private config: WorkspaceConfiguration;

  constructor() {
    this.config = workspace.getConfiguration('phpNamespaceRefactor');
  }

  public isConfigEnabled = ({
    key,
    defaultValue = true,
  }: IsConfigEnabledProps): boolean => {
    return this.config.get<boolean>(key, defaultValue);
  };

  public getWorkspaceConfig = <T>({
    key,
    defaultValue,
  }: GetWorkspaceConfigProps<T>) => {
    return this.config.get<T>(key, defaultValue as T);
  };
}
