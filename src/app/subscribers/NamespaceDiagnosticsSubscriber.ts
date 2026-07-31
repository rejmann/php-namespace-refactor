import { MissingImportDiagnosticsBuilder } from '@app/services/MissingImportDiagnosticsBuilder';
import { NamespaceDiagnosticsBuilder } from '@app/services/NamespaceDiagnosticsBuilder';
import { UnusedImportDiagnosticsBuilder } from '@app/services/UnusedImportDiagnosticsBuilder';
import { FILE_EXTENSION } from '@infra/utils/constants';
import { NamespaceDiagnosticCollection } from '@infra/vscode/NamespaceDiagnosticCollection';
import { inject, injectable } from 'tsyringe';
import { TextDocument } from 'vscode';

@injectable()
export class NamespaceDiagnosticsSubscriber {
  constructor(
    @inject(NamespaceDiagnosticsBuilder) private namespaceDiagnosticsBuilder: NamespaceDiagnosticsBuilder,
    @inject(UnusedImportDiagnosticsBuilder) private unusedImportDiagnosticsBuilder: UnusedImportDiagnosticsBuilder,
    @inject(MissingImportDiagnosticsBuilder) private missingImportDiagnosticsBuilder: MissingImportDiagnosticsBuilder,
    @inject(NamespaceDiagnosticCollection) private namespaceDiagnosticCollection: NamespaceDiagnosticCollection,
  ) {}

  public clear(document: TextDocument): void {
    this.namespaceDiagnosticCollection.delete(document.uri);
  }

  public async handle(document: TextDocument): Promise<void> {
    if (!document.fileName.endsWith(FILE_EXTENSION)) {
      return;
    }

    const diagnostics = [
      ...await this.namespaceDiagnosticsBuilder.execute(document),
      ...this.unusedImportDiagnosticsBuilder.execute(document),
      ...this.missingImportDiagnosticsBuilder.execute(document),
    ];
    this.namespaceDiagnosticCollection.set(document.uri, diagnostics);
  }
}
