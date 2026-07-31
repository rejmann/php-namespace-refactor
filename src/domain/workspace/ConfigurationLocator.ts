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
  NAMESPACE_MISMATCH_DIAGNOSTICS: 'namespaceMismatchDiagnostics',
  HIGHLIGHT_NOT_USED: 'highlightNotUsed',
  HIGHLIGHT_NOT_IMPORTED: 'highlightNotImported',
  REMOVE_ON_SAVE: 'removeOnSave',
  SORT_ON_SAVE: 'sortOnSave',
  SORT_MODE: 'sortMode',
} as const;

export type Props<T> = {
  key: string,
  defaultValue?: T
}

export type PolymorphicFlag<ChildKey extends string> = { enabled: boolean } & Record<ChildKey, boolean>;

interface PolymorphicFlagProps<ChildKey extends string> {
  key: string
  childKeys: readonly ChildKey[]
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

  /**
   * Resolves a setting that accepts either a boolean or an object of child
   * flags (e.g. `phpNamespaceRefactor.renameProperties`) - a single
   * polymorphic key, since VS Code's settings schema doesn't allow one key
   * to be both a leaf value and the parent of another setting.
   *
   * A bare `true` (or any object, even `{}`) enables the feature and
   * defaults every child flag to `true` as well; a bare `false` disables
   * everything. The object form only exists to dial a specific child back
   * to `false` - there's no way to enable a child while leaving the parent
   * disabled.
   */
  public getPolymorphicFlag<ChildKey extends string>(
    { key, childKeys }: PolymorphicFlagProps<ChildKey>,
  ): PolymorphicFlag<ChildKey> {
    const value = this.get<boolean | Partial<Record<ChildKey, boolean>> | undefined>({ key, defaultValue: false });
    const isObject = typeof value === 'object' && value !== null;
    const enabled = isObject || value === true;

    const children = {} as Record<ChildKey, boolean>;
    for (const childKey of childKeys) {
      children[childKey] = isObject ? value[childKey] !== false : enabled;
    }

    return { enabled, ...children };
  }
}
