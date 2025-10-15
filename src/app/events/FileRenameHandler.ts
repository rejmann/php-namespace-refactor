import { inject, injectable } from 'tsyringe';
import { FileRenameEvent } from 'vscode';
import { FileRenameFeature } from '@app/features/FileRenameFeature';

@injectable()
export class FileRenameHandler {
  constructor(
    @inject(FileRenameFeature) private fileRenameFeature: FileRenameFeature,
  ) {}

  public async handle(event: FileRenameEvent) {
    await this.fileRenameFeature.execute(event.files);
  }
}
