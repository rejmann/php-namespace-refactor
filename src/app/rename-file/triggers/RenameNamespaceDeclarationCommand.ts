import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { NamespaceDirectoryResolver } from '@infra/autoload/NamespaceDirectoryResolver';
import { inject, injectable } from 'tsyringe';
import { TextDocument, Uri, window } from 'vscode';

import { applyFileRenameEdit } from './ApplyFileRenameEdit';

interface Props {
  document: TextDocument
  newNamespace: string
}

@injectable()
export class RenameNamespaceDeclarationCommand {
  constructor(
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
    @inject(NamespaceDirectoryResolver) private namespaceDirectoryResolver: NamespaceDirectoryResolver,
  ) {}

  public async execute({ document, newNamespace }: Props): Promise<void> {
    try {
      const oldPath = document.uri.fsPath;
      const fileName = this.phpFilePathResolver.extractClassNameFromPath(oldPath);
      const newDirectoryPath = await this.namespaceDirectoryResolver.execute(newNamespace);

      applyFileRenameEdit({
        oldUri: document.uri,
        newUri: Uri.file(`${newDirectoryPath}/${fileName}.php`),
      });
    } catch (error) {
      window.showErrorMessage(`Error renaming namespace: ${error}`);
    }
  }
}
