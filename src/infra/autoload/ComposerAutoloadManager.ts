import { COMPOSER_FILE, WORKSPACE_ROOT_PATH } from '@infra/utils/constants';
import { promises as fs } from 'fs';
import { injectable } from "tsyringe";

interface ComposerAutoload {
  autoload: Record<string, string>;
  autoloadDev: Record<string, string>;
}

const DEFAULT = {
  autoload: {},
  autoloadDev: {}
};

let composerCache: ComposerAutoload | null = null;
let cacheModifiedTime: number | null = null;

@injectable()
export class ComposerAutoloadManager {
  public async execute() {
    if (!WORKSPACE_ROOT_PATH) {
      return DEFAULT;
    }

    try {
      const composerPath = `${WORKSPACE_ROOT_PATH}/${COMPOSER_FILE}`;

      const stats = await fs.stat(composerPath);
      const currentModifiedTime = stats.mtimeMs;

      if (composerCache && cacheModifiedTime === currentModifiedTime) {
        return composerCache;
      }

      const composerJson = await fs.readFile(composerPath, 'utf8');
      const composerConfig = JSON.parse(composerJson);

      const result = {
        autoload: composerConfig.autoload?.['psr-4'] || {},
        autoloadDev: composerConfig['autoload-dev']?.['psr-4'] || {},
      };

      composerCache = result;
      cacheModifiedTime = currentModifiedTime;

      return result;
    } catch (error) {
      return DEFAULT;
    }
  }
}
