import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { FILE_EXTENSION } from '@infra/utils/constants';
import { inject, injectable } from 'tsyringe';
import { TextDocument } from 'vscode';

@injectable()
export class FileSavedSubscriber {
  constructor(
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  public async handle(document: TextDocument): Promise<void> {
    if (!document.fileName.endsWith(FILE_EXTENSION)) {
      return;
    }
    this.namespaceIndex.parseAndAdd(document.fileName, document.getText());
    await this.namespaceIndex.save();
  }
}
