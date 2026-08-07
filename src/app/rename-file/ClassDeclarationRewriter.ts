import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { ClassNameBoundaryRegexBuilder } from '@domain/php/ClassNameBoundaryRegexBuilder';
import { PHP_CLASS_DECLARATION_REGEX } from '@domain/php/PhpPatterns';
import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Range, Uri, WorkspaceEdit } from 'vscode';

interface Props {
  newUri: Uri,
}

@injectable()
export class ClassDeclarationRewriter {
  constructor(
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
    @inject(FileEditApplier) private fileEditApplier: FileEditApplier,
    @inject(ClassNameBoundaryRegexBuilder) private classNameBoundaryRegexBuilder: ClassNameBoundaryRegexBuilder,
  ) {}

  public async execute({ newUri }: Props): Promise<void> {
    const { document, text } = await this.textDocumentOpener.execute({ uri: newUri });

    const match = PHP_CLASS_DECLARATION_REGEX.exec(text);
    if (!match) {
      return;
    }
    const currentName = match[1];

    const expectedName = this.phpFilePathResolver.extractClassNameFromPath(newUri.fsPath);

    if (currentName === expectedName) {
      return;
    }

    const newText = text.replace(
      this.classNameBoundaryRegexBuilder.execute({ className: currentName }),
      expectedName,
    );

    const edit = new WorkspaceEdit();
    edit.replace(
      newUri,
      new Range(
        document.positionAt(0),
        document.positionAt(text.length)
      ),
      newText
    );

    await this.fileEditApplier.apply(edit);
  }
}
