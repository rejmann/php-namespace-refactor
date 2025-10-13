import { inject, injectable } from "tsyringe";
import { COMPOSER_FILE } from '@infra/utils/constants';
import { promises as fs } from 'fs';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface ComposerAutoload {
  autoload: Record<string, string>;
  autoloadDev: Record<string, string>;
}

const DEFAULT = {
  autoload: {},
  autoloadDev: {}
};

let composerCache: ComposerAutoload | null = null;
let cacheWorkspaceRoot: string | null = null;
let cacheModifiedTime: number | null = null;

@injectable()
export class ComposerAutoloadManager {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
  ) {}

  public async execute() {
    const workspaceRoot = this.workspacePathResolver.getRootPath();

    if (!workspaceRoot) {
      return DEFAULT;
    }

    const composerPath = `${workspaceRoot}/${COMPOSER_FILE}`;

    try {
      const stats = await fs.stat(composerPath);
      const currentModifiedTime = stats.mtimeMs;

      if (composerCache &&
        cacheWorkspaceRoot === workspaceRoot &&
        cacheModifiedTime === currentModifiedTime) {
        return composerCache;
      }

      const composerJson = await fs.readFile(composerPath, 'utf8');
      const composerConfig = JSON.parse(composerJson);

      const result = {
        autoload: composerConfig.autoload?.['psr-4'] || {},
        autoloadDev: composerConfig['autoload-dev']?.['psr-4'] || {},
      };

      composerCache = result;
      cacheWorkspaceRoot = workspaceRoot;
      cacheModifiedTime = currentModifiedTime;

      return result;
    } catch (error) {
      return DEFAULT;
    }
  }
}
