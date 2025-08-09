import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { injectable } from 'tsyringe';
import { NamespaceMapperService } from '@infra/composer/NamespaceMapperService';

interface Props {
  uri: string;
}

interface CreateNamespaceProps {
  namespace?: string;
  className: string;
}

@injectable()
export class CreateNamespaceService {
  constructor(
    private readonly namespaceMapperService: NamespaceMapperService
  ) {
  }

  public execute({ uri }: Props) {
    const { autoload, autoloadDev } = this.namespaceMapperService.execute(uri);

    const className = FilePathUtils.extractClassNameFromPath(uri);

    for (const currentAutoload of [autoload, autoloadDev]) {
      if (null === currentAutoload) {
        continue;
      }

      return this.create({
        namespace: currentAutoload,
        className
      });
    }

    return this.create({ className });
  }

  private create({
    namespace,
    className,
  }: CreateNamespaceProps) {
    return {
      namespace,
      className,
      fullNamespace: namespace
        ? `${namespace}\\${className}`
        : className,
    };
  }
}
