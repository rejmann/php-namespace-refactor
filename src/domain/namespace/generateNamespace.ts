import { createNamespace, Namespace } from './createNamespace';
import { extractClassNameFromPath } from '@infra/utils/filePathUtils';
import { NamespaceMapperService } from './../../infra/composer/NamespaceMapperService';

interface Props {
  uri: string
}

export async function generateNamespace({
  uri,
}: Props): Promise<Namespace> {
  const namespaceMapperService = new NamespaceMapperService();
  const { autoload, autoloadDev } = namespaceMapperService.execute(uri);

  const className = extractClassNameFromPath(uri);

  for (const currentAutoload of [autoload, autoloadDev]) {
    if (null === currentAutoload) {
      continue;
    }

    return createNamespace({
      namespace: currentAutoload,
      className
    });
  }

  return createNamespace({ className });
}
