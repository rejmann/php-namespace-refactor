import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { inject, injectable } from 'tsyringe';
import { FileDeleteEvent } from 'vscode';

@injectable()
export class FileDeletedSubscriber {
  constructor(
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  public async handle(event: FileDeleteEvent): Promise<void> {
    for (const file of event.files) {
      this.namespaceIndex.removeFile(file.fsPath);
    }
    await this.namespaceIndex.save();
  }
}
