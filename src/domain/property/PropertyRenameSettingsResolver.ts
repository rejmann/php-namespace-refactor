import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { inject, injectable } from 'tsyringe';

export interface PropertyRenameSettings {
  enabled: boolean
  renameMismatchedNames: boolean
}

type RenamePropertiesValue = boolean | { renameMismatchedNames?: boolean };

/**
 * `phpNamespaceRefactor.renameProperties` is a single setting that accepts
 * either a boolean or an object (`{ renameMismatchedNames: boolean }`) -
 * any object value implies the feature is enabled, since a bare boolean
 * `false` is the only way to turn it off. Turning the feature on - whether
 * via a bare `true` or an object - defaults every child behavior
 * (currently just `renameMismatchedNames`) to `true` as well; the object
 * form only exists to let a specific child be dialed back to `false`.
 */
@injectable()
export class PropertyRenameSettingsResolver {
  constructor(
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
  ) {}

  public resolve(): PropertyRenameSettings {
    const value = this.configurationLocator.get<RenamePropertiesValue>({
      key: ConfigKeys.RENAME_PROPERTIES,
      defaultValue: false,
    });

    if (typeof value === 'object' && value !== null) {
      return { enabled: true, renameMismatchedNames: value.renameMismatchedNames !== false };
    }

    return { enabled: value === true, renameMismatchedNames: value === true };
  }
}
