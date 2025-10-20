import { inject, injectable } from 'tsyringe';
import { PHP_EXTENSION } from '@infra/utils/constants';
import { RenameFeature } from '@app/features/RenameFeature';
import { TextEditor } from 'vscode';

interface Props {
  activeEditor?: TextEditor;
}

@injectable()
export class RenameHandler {
  constructor(
    @inject(RenameFeature) private readonly renameFeature: RenameFeature
  ) {}

  public async handle({ activeEditor }: Props) {
    if (!activeEditor) {
      return;
    }

    const document = activeEditor.document;
    if (!document.fileName.endsWith(PHP_EXTENSION)) {
      return;
    }

    await this.renameFeature.execute({
      document,
      position: activeEditor.selection.active,
    });
  }
}
