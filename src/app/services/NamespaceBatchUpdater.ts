import { DocumentCache } from '@app/services/cache/DocumentCache';
import { Namespace, NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { inject, injectable } from 'tsyringe';
import { Uri } from 'vscode';

import { ClassNameUpdater } from './update/ClassNameUpdater';
import { MovedFileNamespaceUpdater } from './update/MovedFileNamespaceUpdater';
import { MultiFileReferenceUpdater } from './update/MultiFileReferenceUpdater';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

@injectable()
export class NamespaceBatchUpdater {
  constructor(
    @inject(DocumentCache) private documentCache: DocumentCache,
    @inject(MovedFileNamespaceUpdater) private movedFileNamespaceUpdater: MovedFileNamespaceUpdater,
    @inject(MultiFileReferenceUpdater) private multiFileReferenceUpdater: MultiFileReferenceUpdater,
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator,
    @inject(ClassNameUpdater) private classNameUpdater: ClassNameUpdater,
  ) {}

  public async execute({ newUri, oldUri }: Props) {
    try {
      const { namespace, fullNamespace } = await this.getNamespace(newUri);

      if (!namespace) {
        return;
      }

      const { namespace: old, fullNamespace: oldFullNamespace } = await this.getNamespace(oldUri);

      if (namespace === old && fullNamespace !== oldFullNamespace) {
        this.classNameUpdater.execute({ newUri });
      }

      const isUpdated = await this.movedFileNamespaceUpdater.execute({
        newNamespace: namespace,
        newUri,
      });

      if (!isUpdated) {
        return;
      }

      await this.multiFileReferenceUpdater.execute({
        useOldNamespace: oldFullNamespace,
        useNewNamespace: fullNamespace,
        newUri,
        oldUri,
      });
    } finally {
      this.documentCache.clear();
    }
  }

  private async getNamespace(uri: Uri): Promise<Namespace> {
    return await this.namespaceCreator.execute({ uri });
  }
}
