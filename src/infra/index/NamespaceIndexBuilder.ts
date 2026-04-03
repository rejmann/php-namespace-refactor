import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { WorkspaceIndex } from '@infra/index/WorkspaceIndex';
import { inject, injectable } from 'tsyringe';
import { workspace } from 'vscode';

@injectable()
export class NamespaceIndexBuilder {
  constructor(
    @inject(WorkspaceIndex) private workspaceIndex: WorkspaceIndex,
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  public async build(): Promise<void> {
    const files = await this.workspaceIndex.execute();

    await Promise.all(files.map(async (file) => {
      try {
        const fileContent = await workspace.fs.readFile(file);
        const text = Buffer.from(fileContent).toString();
        this.namespaceIndex.parseAndAdd(file.fsPath, text);
      } catch {
        // skip unreadable files
      }
    }));

    await this.namespaceIndex.save();
  }
}