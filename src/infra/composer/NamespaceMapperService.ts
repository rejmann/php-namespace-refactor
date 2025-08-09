import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { injectable } from 'tsyringe';
import { PathToNamespaceService } from './PathToNamespaceService';
import { Psr4LoaderService } from './Psr4LoaderService';
import { WORKSPACE_PATH } from '@shared/constants';

interface NamespaceMapping {
  autoload: string | null;
  autoloadDev: string | null;
}

@injectable()
export class NamespaceMapperService {
  constructor(
    private readonly psr4LoaderService: Psr4LoaderService,
    private readonly pathToNamespaceService: PathToNamespaceService
  ) {
  }

  public execute(uri: string): NamespaceMapping {
    const { autoload, autoloadDev } = this.psr4LoaderService.getAllNamespaces({ workspacePath: WORKSPACE_PATH });

    if (!autoload && !autoloadDev) {
      return {
        autoload: null,
        autoloadDev: null,
      };
    }

    const pathFull = FilePathUtils.removeWorkspaceRoot(uri);

    return {
      autoload: this.pathToNamespaceService.resolve({ autoload, pathFull }),
      autoloadDev: this.pathToNamespaceService.resolve({ autoload: autoloadDev, pathFull })
    };
  }
}
