import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
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
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(AutoloadPathResolver) private autoloadPathResolver: AutoloadPathResolver,
  ) {}

  /**
   * Namespace of the directory of `uri`, from the most specific psr-4 entry
   * of autoload and autoload-dev together (autoload wins on ties), or null
   * when no entry maps it.
   */
  public async execute({ uri }: Props): Promise<string | null> {
    const { autoload, autoloadDev } = await this.composerAutoloadManager.execute();

    return this.autoloadPathResolver.execute({
      autoloads: [autoload, autoloadDev],
      workspaceRoot: this.workspacePathResolver.removeWorkspaceRoot(uri),
    });
  }
}
