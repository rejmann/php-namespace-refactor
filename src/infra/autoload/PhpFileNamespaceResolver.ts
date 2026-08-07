import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
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
export class PhpFileNamespaceResolver {
  constructor(
    @inject(NamespaceAutoloadMapper) private namespaceAutoloadMapper: NamespaceAutoloadMapper,
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
  ) {
  }

  public async execute({ uri }: Props): Promise<Namespace> {
    const { autoload, autoloadDev } = await this.namespaceAutoloadMapper.execute({
      uri: uri.fsPath
    });

    const className = this.phpFilePathResolver.extractClassNameFromPath(uri.fsPath);

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
