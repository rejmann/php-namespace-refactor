import { IndexSyncAdapter } from '@infra/index/IndexSyncAdapter';
import { WorkspaceFileReader } from '@infra/vscode/WorkspaceFileReader';
import { inject, injectable } from 'tsyringe';
import { FileCreateEvent } from 'vscode';

@injectable()
export class FileCreatedListener {
  constructor(
    @inject(IndexSyncAdapter) private indexSyncAdapter: IndexSyncAdapter,
    @inject(WorkspaceFileReader) private workspaceFileReader: WorkspaceFileReader,
  ) {}

  public async handle(event: FileCreateEvent): Promise<void> {
    for (const file of event.files) {
      const content = await this.workspaceFileReader.readText(file);
      if (content !== null) {
        this.indexSyncAdapter.onFileChanged(file.fsPath, content);
      }
    }
  }
}
