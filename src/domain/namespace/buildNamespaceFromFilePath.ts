import { createNamespaceObject, Namespace } from './createNamespace';
import { getClassNameFromFilePath } from '@infra/utils/filePathUtils';
import { mapFilePathToNamespace } from '@infra/autoload/mapFilePathToNamespace';

interface Props {
  uri: string
}

export async function buildNamespaceFromFilePath({
  uri,
}: Props): Promise<Namespace> {
  const { autoload, autoloadDev } = await mapFilePathToNamespace({
    uri
  });

  const className = getClassNameFromFilePath(uri);

  for (const currentAutoload of [autoload, autoloadDev]) {
    if (null === currentAutoload) {
      continue;
    }

    return createNamespaceObject({
      namespace: currentAutoload,
      className
    });
  }

  return createNamespaceObject({ className });
}
