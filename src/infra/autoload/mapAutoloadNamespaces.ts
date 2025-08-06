import { Psr4LoaderService } from '../composer/Psr4LoaderService';
import { removeWorkspaceRoot } from '@infra/utils/filePathUtils';
import { resolvePathFromPrefix } from './resolvePathFromPrefix';
import { WORKSPACE_PATH } from '@infra/utils/constants';

interface Props {
  uri: string
}

export function mapAutoloadNamespaces({
  uri,
}: Props) {
  const psr4LoaderService = new Psr4LoaderService({ workspacePath: WORKSPACE_PATH });
  const { autoload, autoloadDev } = psr4LoaderService.getAllNamespaces();

  if (!autoload && !autoloadDev) {
    return {
      autoload: null,
      autoloadDev: null,
    };
  }

  const newDir = removeWorkspaceRoot(uri);

  return {
    autoload: resolvePathFromPrefix({
      autoload,
      workspaceRoot: newDir,
    }),
    autoloadDev: resolvePathFromPrefix({
      autoload: autoloadDev,
      workspaceRoot: newDir,
    })
  };
}

