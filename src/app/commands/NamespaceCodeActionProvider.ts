import { NAMESPACE_MISMATCH_CODE } from '@app/services/NamespaceDiagnosticsBuilder';
import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { inject, injectable } from 'tsyringe';
import {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionProvider,
  Range,
  TextDocument,
  WorkspaceEdit,
} from 'vscode';

@injectable()
export class NamespaceCodeActionProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  constructor(
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator,
  ) {}

  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext): Promise<CodeAction[]> {
    const diagnostic = context.diagnostics.find(d => d.code === NAMESPACE_MISMATCH_CODE);
    if (!diagnostic) {
      return [];
    }

    const { namespace: expectedNamespace } = await this.namespaceCreator.execute({ uri: document.uri });
    if (!expectedNamespace) {
      return [];
    }

    const action = new CodeAction('Fix namespace to match file location', CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const edit = new WorkspaceEdit();
    edit.replace(document.uri, diagnostic.range, `namespace ${expectedNamespace};`);
    action.edit = edit;

    return [action];
  }
}
