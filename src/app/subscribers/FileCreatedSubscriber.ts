import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { inject, injectable } from 'tsyringe';
import { FileCreateEvent, workspace } from 'vscode';

@injectable()
export class FileCreatedSubscriber {
  constructor(
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  public async handle(event: FileCreateEvent): Promise<void> {
    for (const file of event.files) {
      try {
        const content = Buffer.from(await workspace.fs.readFile(file)).toString();
        this.namespaceIndex.parseAndAdd(file.fsPath, content);
      } catch {
        // skip unreadable files
      }
    }
    await this.namespaceIndex.save();
  }
}
