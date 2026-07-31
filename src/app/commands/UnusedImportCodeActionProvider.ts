import { UNUSED_IMPORT_CODE } from '@app/services/UnusedImportDiagnosticsBuilder';
import { injectable } from 'tsyringe';
import {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  Range,
  TextDocument,
  WorkspaceEdit,
} from 'vscode';

@injectable()
export class UnusedImportCodeActionProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  public provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext): CodeAction[] {
    return context.diagnostics
      .filter(diagnostic => diagnostic.code === UNUSED_IMPORT_CODE)
      .map(diagnostic => this.buildRemoveAction(document, diagnostic));
  }

  private buildRemoveAction(document: TextDocument, diagnostic: Diagnostic): CodeAction {
    const action = new CodeAction('Remove unused import', CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const line = document.lineAt(diagnostic.range.start.line);
    const edit = new WorkspaceEdit();
    edit.delete(document.uri, line.rangeIncludingLineBreak);
    action.edit = edit;

    return action;
  }
}
