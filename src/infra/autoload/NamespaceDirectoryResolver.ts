import { BACKSLASH_RE, TRAILING_BACKSLASHES_RE } from '@infra/autoload/AutoloadPathResolver';
import { ComposerAutoloadManager } from '@infra/autoload/ComposerAutoloadManager';
import { WORKSPACE_ROOT_PATH } from '@infra/utils/constants';
import { inject, injectable } from 'tsyringe';

@injectable()
export class NamespaceDirectoryResolver {
  constructor(
    @inject(ComposerAutoloadManager) private composerAutoloadManager: ComposerAutoloadManager,
  ) {
  }

  public async execute(namespace: string): Promise<string> {
    const { autoload, autoloadDev } = await this.composerAutoloadManager.execute();

    const workspaceRoot = WORKSPACE_ROOT_PATH;

    for (const currentAutoload of [autoload, autoloadDev]) {
      if (!currentAutoload || Object.keys(currentAutoload).length === 0) {
        continue;
      }

      const sortedPrefixes = Object.keys(currentAutoload).sort((a, b) => b.length - a.length);

      for (const prefix of sortedPrefixes) {
        const cleanPrefix = prefix.replace(TRAILING_BACKSLASHES_RE, '');
        if (!namespace.startsWith(cleanPrefix)) {
          continue;
        }

        const relativePart = namespace.substring(cleanPrefix.length);
        const relativePath = relativePart.replace(/^\\+/, '').replace(BACKSLASH_RE, '/');

        const baseDirectory = currentAutoload[prefix].replace(/\/$/, '');

        const fullPath = relativePath
          ? `${workspaceRoot}/${baseDirectory}/${relativePath}`
          : `${workspaceRoot}/${baseDirectory}`;

        return fullPath;
      }
    }

    throw new Error(`No autoload mapping found for namespace: ${namespace}`);
  }
}
