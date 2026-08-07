import { IndexSyncAdapter } from '@infra/index/IndexSyncAdapter';
import { inject, injectable } from 'tsyringe';
import { FileDeleteEvent } from 'vscode';

@injectable()
export class FileDeletedSubscriber {
  constructor(
    @inject(IndexSyncAdapter) private indexSyncAdapter: IndexSyncAdapter,
  ) {}

  public async handle(event: FileDeleteEvent): Promise<void> {
    for (const file of event.files) {
      this.indexSyncAdapter.onFileRemoved(file.fsPath);
    }
  }
}
