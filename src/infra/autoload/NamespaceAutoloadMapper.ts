import { AutoloadPathResolver } from './AutoloadPathResolver';
import { ComposerAutoloadManager } from './ComposerAutoloadManager';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface Props {
  uri: string
}

export class NamespaceAutoloadMapper {
  public async execute({ uri }: Props) {
    const { autoload, autoloadDev } = await new ComposerAutoloadManager().execute();

      if (!autoload && !autoloadDev) {
        return {
          autoload: null,
          autoloadDev: null,
        };
      }

      const newDir = new WorkspacePathResolver().removeWorkspaceRoot(uri);

      const autoloadPathResolver = new AutoloadPathResolver();

      return {
        autoload: await autoloadPathResolver.execute({
          autoload,
          workspaceRoot: newDir,
        }),
        autoloadDev: await autoloadPathResolver.execute({
          autoload: autoloadDev,
          workspaceRoot: newDir,
        })
      };
  }
}
