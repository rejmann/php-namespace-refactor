import { inject, injectable } from 'tsyringe';
import { Position, TextDocument, Uri, window } from 'vscode';
import { ExtractNameFromCursor } from '@app/services/rename/ExctratNameFromCursor';
import { FileRenameResolver } from '@app/services/rename/FileRenameResolver';
import { RenameValidator } from '@app/services/rename/RenameValidator';

interface Props {
  document: TextDocument
  position: Position
}

@injectable()
export class RenameFeature {
  constructor(
    @inject(ExtractNameFromCursor) private extractNameFromCursor: ExtractNameFromCursor,
    @inject(RenameValidator) private renameValidator: RenameValidator,
    @inject(FileRenameResolver) private fileRenameResolver: FileRenameResolver,
  ) {
  }

  public async execute({ document, position }: Props): Promise<void> {
    const value = await this.extractNameFromCursor.execute({ document, position });
    if (!value) {
      return;
    }

    const newName = await window.showInputBox({
      value,
      title: '',
      prompt: '',
      validateInput: (value: string) => this.renameValidator.validate(value)
    });

    if (!newName || newName.trim() === '') {
      return;
    }

    this.fileRenameResolver.execute({ document, position, newName });
  }
}
