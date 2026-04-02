import { ClassRenameOperation } from '@app/operations/ClassRenameOperation';
import { NamespaceRenameOperation } from '@app/operations/NamespaceRenameOperation';
import { ExtractNameFromCursor } from '@app/services/rename/ExctratNameFromCursor';
import { NamespaceType, RenameTypeDetector } from '@app/services/rename/RenameTypeDetector';
import { RenameValidator } from '@app/services/rename/RenameValidator';
import { inject, injectable } from 'tsyringe';
import { Position, TextDocument, window } from 'vscode';

interface Props {
  document: TextDocument
  position: Position
}

@injectable()
export class RenameFeature {
  constructor(
    @inject(ExtractNameFromCursor) private extractNameFromCursor: ExtractNameFromCursor,
    @inject(RenameValidator) private renameValidator: RenameValidator,
    @inject(RenameTypeDetector) private renameTypeDetector: RenameTypeDetector,
    @inject(NamespaceRenameOperation) private namespaceRenameOperation: NamespaceRenameOperation,
    @inject(ClassRenameOperation) private classRenameOperation: ClassRenameOperation,
  ) {}

  public async execute({ document, position }: Props): Promise<void> {
    const value = await this.extractNameFromCursor.execute({ document, position });
    if (!value) {
      return;
    }

    const newName = await window.showInputBox({
      value,
      title: '',
      prompt: '',
      validateInput: (value: string) => this.renameValidator.validate({ value, document, position }),
    });

    if (!newName || newName.trim() === '') {
      return;
    }

    const type = this.renameTypeDetector.execute({ document, position });

    if (type === NamespaceType) {
      await this.namespaceRenameOperation.execute({ document, newNamespace: newName });
    } else {
      this.classRenameOperation.execute({ document, newClassName: newName });
    }
  }
}
