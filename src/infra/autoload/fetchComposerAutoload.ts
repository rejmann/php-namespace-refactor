import { COMPOSER_FILE } from '@infra/utils/constants';
import { promises as fs } from 'fs';

interface Props {
  workspaceRoot?: string
}

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

export async function fetchComposerAutoload({
  workspaceRoot,
}: Props): Promise<ComposerAutoload> {
  if (!workspaceRoot) {
    return DEFAULT;
  }

  if (composerCache && cacheWorkspaceRoot === workspaceRoot) {
    return composerCache;
  }

  try {
    const composerPath = `${workspaceRoot}/${COMPOSER_FILE}`;
    const composerJson = await fs.readFile(composerPath, 'utf8');
    const composerConfig = JSON.parse(composerJson);

    const result = {
      autoload: composerConfig.autoload?.['psr-4'] || {},
      autoloadDev: composerConfig['autoload-dev']?.['psr-4'] || {},
    };

    composerCache = result;
    cacheWorkspaceRoot = workspaceRoot;

    return result;
  } catch (error) {
    return DEFAULT;
  }
}
