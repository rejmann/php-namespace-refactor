import { inject, injectable, injectAll } from 'tsyringe';

import { DirectoryRenameExpander } from './DirectoryRenameExpander';
import type { FileMove } from './FileMove';
import { RenamePropagator } from './RenamePropagator';
import type { RenameFileStep } from './steps/RenameFileStep';

@injectable()
export class RenameFileUseCase {
  constructor(
    @inject(DirectoryRenameExpander) private directoryRenameExpander: DirectoryRenameExpander,
    @inject(RenamePropagator) private renamePropagator: RenamePropagator,
    @injectAll('RenameFileStep') private features: RenameFileStep[],
  ) {}

  public async execute(files: ReadonlyArray<FileMove>): Promise<void> {
    const resolvedFiles = await this.directoryRenameExpander.execute(files);

    for (const { oldUri, newUri } of resolvedFiles) {
      if (!newUri.fsPath.endsWith('.php') || !oldUri.fsPath.endsWith('.php')) {
        continue;
      }

      try {
        // Property renaming for affected files now happens inside
        // RenamePropagator/ReferenceRewriter, folded into the
        // same per-file WorkspaceEdit as the class rename itself, rather
        // than as a separate pass here that re-opened every file again.
        await this.renamePropagator.execute({ newUri, oldUri });

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
