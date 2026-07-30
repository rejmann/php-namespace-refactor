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
  // Value is boolean|object (see PropertyRenameSettingsResolver) rather than a plain
  // boolean - a single polymorphic key avoids VS Code's settings schema conflict that
  // comes from one key being both a leaf boolean and the parent of another setting.
  RENAME_PROPERTIES: 'renameProperties',
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
