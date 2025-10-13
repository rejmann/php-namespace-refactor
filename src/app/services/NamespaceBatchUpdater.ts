import { inject, injectable } from "tsyringe";
import { MovedFileNamespaceUpdater } from './update/MovedFileNamespaceUpdater';
import { MultiFileReferenceUpdater } from './update/MultiFileReferenceUpdater';
import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { Uri } from 'vscode';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

@injectable()
export class NamespaceBatchUpdater {
  constructor(
    @inject(MovedFileNamespaceUpdater) private movedFileNamespaceUpdater: MovedFileNamespaceUpdater,
    @inject(MultiFileReferenceUpdater) private multiFileReferenceUpdater: MultiFileReferenceUpdater,
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator,
  ) {}

  public async execute({ newUri, oldUri }: Props) {
    const {
      namespace: newNamespace,
      fullNamespace: useNewNamespace,
    } = await this.namespaceCreator.execute({
      uri: newUri,
    });

    if (!newNamespace) {
      return;
    }

    const { fullNamespace: useOldNamespace } = await this.namespaceCreator.execute({
      uri: oldUri,
    });

    const updated = await this.movedFileNamespaceUpdater.execute({
      newNamespace,
      newUri,
    });

    if (!updated) {
      return;
    }

    await this.multiFileReferenceUpdater.execute({
      useOldNamespace,
      useNewNamespace,
      newUri,
      oldUri,
    });
  }
}
