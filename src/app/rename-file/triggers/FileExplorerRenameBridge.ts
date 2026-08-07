import { RenameFileUseCase } from '@app/rename-file/RenameFileUseCase';
import { inject, injectable } from 'tsyringe';
import { FileRenameEvent } from 'vscode';

@injectable()
export class FileExplorerRenameBridge {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    @inject(RenameFileUseCase) private renameFileUseCase: RenameFileUseCase,
  ) {}

  public handle(event: FileRenameEvent): void {
    this.queue = this.queue
      .then(() => this.renameFileUseCase.execute(event.files))
      .catch(() => {});
  }
}
