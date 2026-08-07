import { DirectoryMovedFilesResolver } from '@app/services/DirectoryMovedFilesResolver';
import { NamespaceBatchUpdater } from '@app/services/NamespaceBatchUpdater';
import { inject, injectable,injectAll } from 'tsyringe';

import type { FileMove } from './FileMove';
import type { MoveFileFeature } from './MoveFileFeature';

@injectable()
export class FileMoveOperation {
  constructor(
    @inject(DirectoryMovedFilesResolver) private directoryMovedFilesResolver: DirectoryMovedFilesResolver,
    @inject(NamespaceBatchUpdater) private namespaceBatchUpdater: NamespaceBatchUpdater,
    @injectAll('MoveFileFeature') private features: MoveFileFeature[],
  ) {}

  public async execute(files: ReadonlyArray<FileMove>): Promise<void> {
    const resolvedFiles = await this.directoryMovedFilesResolver.execute(files);

    for (const { oldUri, newUri } of resolvedFiles) {
      if (!newUri.fsPath.endsWith('.php') || !oldUri.fsPath.endsWith('.php')) {
        continue;
      }

      try {
        // Property renaming for affected files now happens inside
        // NamespaceBatchUpdater/MultiFileReferenceUpdater, folded into the
        // same per-file WorkspaceEdit as the class rename itself, rather
        // than as a separate pass here that re-opened every file again.
        await this.namespaceBatchUpdater.execute({ newUri, oldUri });

        for (const feature of this.features) {
          if (feature.isEnabled()) {
            await feature.apply({ oldUri, newUri });
          }
        }
      } catch (error) {
        console.error('Error processing file move:', error); // eslint-disable-line
        throw error;
      }
    }
  }
}
