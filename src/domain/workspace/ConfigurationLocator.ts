import { injectable } from 'tsyringe';
import { workspace, WorkspaceConfiguration } from 'vscode';

export const Config = 'phpNamespaceRefactor';

export const ConfigKeys = {
  AUTO_IMPORT_NAMESPACE: 'autoImportNamespace',
  REMOVE_UNUSED_IMPORTS: 'removeUnusedImports',
  IGNORED_DIRECTORIES: 'ignoredDirectories',
  ADDITIONAL_EXTENSIONS: 'additionalExtensions',
  RENAME: 'rename',
  EDIT_FILES_IN_BACKGROUND: 'editFilesInBackground',
  // Namespaced under "renameProperties.*" (not the bare "renameProperties") because
  // VS Code's settings schema can't have a key be both a leaf boolean and the parent
  // of another setting (PropertyRenameConfigKeys.RENAME_MISMATCHED_NAMES) at once -
  // doing so silently drops both values instead of erroring.
  RENAME_PROPERTIES: 'renameProperties.enabled',
} as const;

export type Props<T> = {
  key: string,
  defaultValue?: T
}

@injectable()
export class ConfigurationLocator {
  private config: WorkspaceConfiguration;

  constructor() {
    this.config = workspace.getConfiguration(Config);
  }

  public get<T>({ key, defaultValue }: Props<T>): T {
    return this.config.get<T>(key, defaultValue as T);
  }

  public static getConfigKey(key: string): string {
    return `${Config}.${key}`;
  }
}
