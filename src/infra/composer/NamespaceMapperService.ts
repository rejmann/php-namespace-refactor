import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { PathToNamespaceService } from './PathToNamespaceService';
import { Psr4LoaderService } from './Psr4LoaderService';
import { WORKSPACE_PATH } from '@infra/utils/constants';

interface NamespaceMapping {
  autoload: string | null;
  autoloadDev: string | null;
}

export class NamespaceMapperService {
  public execute(uri: string): NamespaceMapping {
    const psr4LoaderService = new Psr4LoaderService();
    const { autoload, autoloadDev } = psr4LoaderService.getAllNamespaces({ workspacePath: WORKSPACE_PATH });

    if (!autoload && !autoloadDev) {
      return {
        autoload: null,
        autoloadDev: null,
      };
    }

    const pathToNamespaceService = new PathToNamespaceService();
    const pathFull = FilePathUtils.removeWorkspaceRoot(uri);

    return {
      autoload: pathToNamespaceService.resolve({ autoload, pathFull }),
      autoloadDev: pathToNamespaceService.resolve({ autoload: autoloadDev, pathFull })
    };
  }
}
