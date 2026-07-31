import { UnusedUseStatementLocator } from '@domain/namespace/UnusedUseStatementLocator';
import { Config, ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';
import { Diagnostic, DiagnosticSeverity, DiagnosticTag, Range, TextDocument } from 'vscode';

export const UNUSED_IMPORT_CODE = 'unused-import';

@injectable()
export class UnusedImportDiagnosticsBuilder {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(UnusedUseStatementLocator) private unusedUseStatementLocator: UnusedUseStatementLocator,
  ) {}

  public execute(document: TextDocument): Diagnostic[] {
    if (!this.featureFlagManager.isActive({ key: ConfigKeys.HIGHLIGHT_NOT_USED })) {
      return [];
    }

    const unusedImports = this.unusedUseStatementLocator.execute(document.getText());

    return unusedImports.map(({ fullNamespace, index, length }) => {
      const range = new Range(
        document.positionAt(index),
        document.positionAt(index + length),
      );

      const diagnostic = new Diagnostic(
        range,
        `Unused import: "${fullNamespace}".`,
        DiagnosticSeverity.Hint,
      );
      diagnostic.code = UNUSED_IMPORT_CODE;
      diagnostic.source = Config;
      diagnostic.tags = [DiagnosticTag.Unnecessary];

      return diagnostic;
    });
  }
}
