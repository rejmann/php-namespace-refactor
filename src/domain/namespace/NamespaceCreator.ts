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
    const namespace = await this.namespaceAutoloadMapper.execute({
      uri: uri.fsPath
    });

    const className = this.workspacePathResolver.extractClassNameFromPath(uri.fsPath);

    // null (no psr-4 mapping) and '' (global namespace) both mean "no namespace".
    return this.create(className, namespace || undefined);
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
