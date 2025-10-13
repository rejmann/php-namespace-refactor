import { workspace, WorkspaceConfiguration } from 'vscode';
import { injectable } from "tsyringe";

export const ConfigKeys = {
  AUTO_IMPORT_NAMESPACE: 'autoImportNamespace',
  REMOVE_UNUSED_IMPORTS: 'removeUnusedImports',
  IGNORED_DIRECTORIES: 'ignoredDirectories',
  ADDITIONAL_EXTENSIONS: 'additionalExtensions',
} as const;

export type Props<T> = {
  key: string,
  defaultValue?: T
}

@injectable()
export class ConfigurationLocator {
    private config: WorkspaceConfiguration;

    constructor() {
      this.config = workspace.getConfiguration('phpNamespaceRefactor');
    }

  public get<T>({ key, defaultValue }: Props<T>): T {
    return this.config.get<T>(key, defaultValue as T);
  }
}
