import { MovedFileNamespaceUpdater } from './update/MovedFileNamespaceUpdater';
import { MultiFileReferenceUpdater } from './update/MultiFileReferenceUpdater';
import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { Uri } from 'vscode';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

export class NamespaceBatchUpdater {
  public async execute({ newUri, oldUri }: Props) {
    const namespaceCreator = new NamespaceCreator();
    const {
      namespace: newNamespace,
      fullNamespace: useNewNamespace,
    } = await namespaceCreator.execute({
      uri: newUri,
    });

    if (!newNamespace) {
      return;
    }

    const { fullNamespace: useOldNamespace } = await namespaceCreator.execute({
      uri: oldUri,
    });

    const updated = await new MovedFileNamespaceUpdater().execute({
      newNamespace,
      newUri,
    });

    if (!updated) {
      return;
    }

    await new MultiFileReferenceUpdater().execute({
      useOldNamespace,
      useNewNamespace,
      newUri,
      oldUri,
    });
  }
}
