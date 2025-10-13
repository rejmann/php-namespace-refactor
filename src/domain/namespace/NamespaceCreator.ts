import { NamespaceAutoloadMapper } from '@infra/autoload/NamespaceAutoloadMapper';
import { Uri } from 'vscode';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface Props {
  uri: Uri
}

export interface Namespace {
  namespace?: string
  className: string
  fullNamespace: string
}

export class NamespaceCreator {
  public async execute({ uri }: Props): Promise<Namespace> {
    const { autoload, autoloadDev } = await new NamespaceAutoloadMapper().execute({
      uri: uri.fsPath
    });

    const className = new WorkspacePathResolver().extractClassNameFromPath(uri.fsPath);

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
