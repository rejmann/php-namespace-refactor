import { MISSING_IMPORT_CODE } from '@app/services/MissingImportDiagnosticsBuilder';
import { MissingImportResolver } from '@app/services/MissingImportResolver';
import { inject, injectable } from 'tsyringe';
import { CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Range, TextDocument } from 'vscode';

export const INSERT_MISSING_IMPORT_COMMAND = 'phpNamespaceRefactor.insertMissingImport';

@injectable()
export class MissingImportCodeActionProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  constructor(
    @inject(MissingImportResolver) private missingImportResolver: MissingImportResolver,
  ) {}

  public provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext): CodeAction[] {
    const diagnostics = context.diagnostics.filter(diagnostic => diagnostic.code === MISSING_IMPORT_CODE);
    if (diagnostics.length === 0) {
      return [];
    }

    const resolved = this.missingImportResolver.resolve(document);

    return diagnostics.flatMap((diagnostic) => {
      const identifier = document.getText(diagnostic.range);
      const match = resolved.find(candidate => candidate.identifier === identifier);
      if (!match) {
        return [];
      }

      const action = new CodeAction(`Import "${match.fullNamespace}"`, CodeActionKind.QuickFix);
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      action.command = {
        command: INSERT_MISSING_IMPORT_COMMAND,
        title: 'Import class',
        arguments: [document.uri, match.fullNamespace],
      };

      return [action];
    });
  }
}
