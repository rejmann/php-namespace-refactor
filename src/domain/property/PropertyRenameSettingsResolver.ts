import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { inject, injectable } from 'tsyringe';

export interface PropertyRenameSettings {
  enabled: boolean
  renameMismatchedNames: boolean
}

/**
 * `phpNamespaceRefactor.renameProperties` is a single setting that accepts
 * either a boolean or an object (`{ renameMismatchedNames: boolean }`) -
 * see `ConfigurationLocator.getPolymorphicFlag` for how turning the feature
 * on (bare `true` or any object) defaults every child behavior to `true`
 * too, with the object form only used to dial a specific child back to
 * `false`.
 */
@injectable()
export class PropertyRenameSettingsResolver {
  constructor(
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
  ) {}

  public resolve(): PropertyRenameSettings {
    return this.configurationLocator.getPolymorphicFlag({
      key: ConfigKeys.RENAME_PROPERTIES,
      childKeys: ['renameMismatchedNames'] as const,
    });
  }
}
