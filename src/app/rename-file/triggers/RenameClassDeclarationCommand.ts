import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { inject, injectable } from 'tsyringe';
import { TextDocument, Uri } from 'vscode';

import { applyFileRenameEdit } from './ApplyFileRenameEdit';

interface Props {
  document: TextDocument
  newClassName: string
}

@injectable()
export class RenameClassDeclarationCommand {
  constructor(
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
  ) {}

  public execute({ document, newClassName }: Props): void {
    const oldPath = document.uri.fsPath;
    const directory = this.phpFilePathResolver.extractDirectoryFromPath(oldPath);
    const extension = this.phpFilePathResolver.extractExtensionFromPath(oldPath);

    applyFileRenameEdit({
      oldUri: document.uri,
      newUri: Uri.file(`${directory}/${newClassName}${extension}`),
    });
  }
}
