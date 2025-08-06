import { extractClassNameFromPath } from '@infra/utils/filePathUtils';
import { NamespaceMapperService } from '@infra/composer/NamespaceMapperService';

interface Props {
  uri: string;
}

interface CreateNamespaceProps {
  namespace?: string;
  className: string;
}

export class CreateNamespaceService {
  public execute({ uri }: Props) {
    const namespaceMapperService = new NamespaceMapperService();
    const { autoload, autoloadDev } = namespaceMapperService.execute(uri);

    const className = extractClassNameFromPath(uri);

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
