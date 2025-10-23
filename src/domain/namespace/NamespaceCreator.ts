import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { NamespaceAutoloadMapper } from '@infra/autoload/NamespaceAutoloadMapper';
import { inject, injectable } from 'tsyringe';
import { Uri } from 'vscode';

interface Props {
  uri: Uri
}

export interface Namespace {
  namespace?: string
  className: string
  fullNamespace: string
}

@injectable()
export class NamespaceCreator {
  constructor(
    @inject(NamespaceAutoloadMapper) private namespaceAutoloadMapper: NamespaceAutoloadMapper,
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
  ) {
  }

  public async execute({ uri }: Props): Promise<Namespace> {
    const { autoload, autoloadDev } = await this.namespaceAutoloadMapper.execute({
      uri: uri.fsPath
    });

    const className = this.workspacePathResolver.extractClassNameFromPath(uri.fsPath);

    for (const currentAutoload of [autoload, autoloadDev]) {
      if (null === currentAutoload) {
        continue;
      }

      return this.create(
        className,
        currentAutoload
      );
    }

    return this.create(className);
  }

  private create(className: string, namespace?: string): Namespace {
    return {
      namespace,
      className,
      fullNamespace: namespace
        ? `${namespace}\\${className}`
        : className,
    };
  }
}
