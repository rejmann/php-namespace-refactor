import { IndexSyncAdapter } from '@infra/index/IndexSyncAdapter';
import { FILE_EXTENSION } from '@infra/utils/constants';
import { inject, injectable } from 'tsyringe';
import { TextDocument } from 'vscode';

@injectable()
export class FileSavedListener {
  constructor(
    @inject(IndexSyncAdapter) private indexSyncAdapter: IndexSyncAdapter,
  ) {}

  public async handle(document: TextDocument): Promise<void> {
    if (!document.fileName.endsWith(FILE_EXTENSION)) {
      return;
    }
    this.indexSyncAdapter.onFileChanged(document.fileName, document.getText());
  }
}
