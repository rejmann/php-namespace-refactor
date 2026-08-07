import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { inject, injectable } from 'tsyringe';

import { AutoloadPathResolver } from './AutoloadPathResolver';
import { ComposerAutoloadManager } from './ComposerAutoloadManager';

interface Props {
  uri: string
}

@injectable()
export class NamespaceAutoloadMapper {
  constructor (
    @inject(ComposerAutoloadManager) private composerAutoloadManager: ComposerAutoloadManager,
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
    @inject(AutoloadPathResolver) private autoloadPathResolver: AutoloadPathResolver,
  ) {}

  public async execute({ uri }: Props) {
    const { autoload, autoloadDev } = await this.composerAutoloadManager.execute();

    if (!autoload && !autoloadDev) {
      return {
        autoload: null,
        autoloadDev: null,
      };
    }

    const newDir = this.phpFilePathResolver.removeWorkspaceRoot(uri);

    return {
      autoload: await this.autoloadPathResolver.execute({
        autoload,
        workspaceRoot: newDir,
      }),
      autoloadDev: await this.autoloadPathResolver.execute({
        autoload: autoloadDev,
        workspaceRoot: newDir,
      })
    };
  }
}
