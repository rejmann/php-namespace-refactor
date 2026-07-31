import { singleton } from 'tsyringe';
import { Diagnostic, languages, Uri } from 'vscode';

@singleton()
export class NamespaceDiagnosticCollection {
  private readonly collection = languages.createDiagnosticCollection('phpNamespaceRefactor');

  public delete(uri: Uri): void {
    this.collection.delete(uri);
  }

  public dispose(): void {
    this.collection.dispose();
  }

  public set(uri: Uri, diagnostics: Diagnostic[]): void {
    this.collection.set(uri, diagnostics);
  }
}
