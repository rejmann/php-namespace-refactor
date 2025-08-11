import { getRelativePathFromWorkspace } from '@infra/utils/filePathUtils';
import { readComposerAutoloadConfig } from './readComposerAutoloadConfig';
import { resolveNamespaceFromAutoloadPrefix } from './resolveNamespaceFromAutoloadPrefix';
import { WORKSPACE_ROOT } from '@infra/utils/constants';

interface Props {
  uri: string
}

export async function mapFilePathToNamespace({
  uri,
}: Props) {
  const { autoload, autoloadDev } = await readComposerAutoloadConfig({
    workspaceRoot: WORKSPACE_ROOT,
  });

  if (!autoload && !autoloadDev) {
    return {
      autoload: null,
      autoloadDev: null,
    };
  }

  const newDir = getRelativePathFromWorkspace(uri);

  return {
    autoload: resolveNamespaceFromAutoloadPrefix({
      autoload,
      workspaceRoot: newDir,
    }),
    autoloadDev: resolveNamespaceFromAutoloadPrefix({
      autoload: autoloadDev,
      workspaceRoot: newDir,
    })
  };
}

