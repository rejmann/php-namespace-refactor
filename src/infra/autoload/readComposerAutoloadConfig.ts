import { COMPOSER_FILE } from '@infra/utils/constants';
import { readFileSync } from 'fs';

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

export async function readComposerAutoloadConfig({
  workspaceRoot,
}: Props): Promise<ComposerAutoload> {
  if (!workspaceRoot) {
    return DEFAULT;
  }

  try {
    const composerPath = `${workspaceRoot}/${COMPOSER_FILE}`;
    const composerJson = await readFileSync(composerPath, 'utf8');
    const composerConfig = JSON.parse(composerJson);

    return {
      autoload: composerConfig.autoload?.['psr-4'] || {},
      autoloadDev: composerConfig['autoload-dev']?.['psr-4'] || {},
    };
  } catch (error) {
    return DEFAULT;
  }
}
