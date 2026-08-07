import { IndexSyncAdapter } from '@infra/index/IndexSyncAdapter';
import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { WorkspaceIndex } from '@infra/index/WorkspaceIndex';
import { WorkspaceFileReader } from '@infra/vscode/WorkspaceFileReader';
import { inject, injectable } from 'tsyringe';

@injectable()
export class NamespaceIndexBuilder {
  constructor(
    @inject(WorkspaceIndex) private workspaceIndex: WorkspaceIndex,
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
    @inject(WorkspaceFileReader) private workspaceFileReader: WorkspaceFileReader,
    @inject(IndexSyncAdapter) private indexSyncAdapter: IndexSyncAdapter,
  ) {}

  public async build(): Promise<void> {
    const files = await this.workspaceIndex.execute();

    this.namespaceIndex.pruneMissing(new Set(files.map(f => f.fsPath)));

    await Promise.all(files.map(async (file) => {
      const text = await this.workspaceFileReader.readText(file);
      if (text !== null) {
        this.indexSyncAdapter.onFileChanged(file.fsPath, text);
      }
    }));

    await this.indexSyncAdapter.flush();
  }
}