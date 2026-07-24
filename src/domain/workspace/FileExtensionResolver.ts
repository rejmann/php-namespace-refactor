import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { DEFAULT_EXTENSION, normalizeExtensions } from '@infra/utils/extensions';
import { inject, injectable } from 'tsyringe';

@injectable()
export class FileExtensionResolver {
  constructor(
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
  ) {}

  /**
   * Returns the configured extension (including the leading dot) that
   * `fileName` ends with, matching the longest configured suffix first so a
   * compound extension like `class.php` is never shadowed by the plain
   * `php` entry. Returns null when no configured extension matches.
   */
  public match(fileName: string): string | null {
    const lowerFileName = fileName.toLowerCase();

    for (const extension of this.getConfiguredExtensions()) {
      const suffix = `.${extension}`;
      if (lowerFileName.endsWith(suffix)) {
        return fileName.slice(fileName.length - suffix.length);
      }
    }

    return null;
  }

  private getConfiguredExtensions(): string[] {
    const extensions = this.configurationLocator.get<string[]>({
      key: ConfigKeys.ADDITIONAL_EXTENSIONS,
      defaultValue: [DEFAULT_EXTENSION],
    });

    return normalizeExtensions(extensions).sort((a, b) => b.length - a.length);
  }
}
