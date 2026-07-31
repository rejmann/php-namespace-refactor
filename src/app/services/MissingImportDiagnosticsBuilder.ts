import { MissingImportResolver } from '@app/services/MissingImportResolver';
import { Config, ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';
import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from 'vscode';

export const MISSING_IMPORT_CODE = 'missing-import';

@injectable()
export class MissingImportDiagnosticsBuilder {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(MissingImportResolver) private missingImportResolver: MissingImportResolver,
  ) {}

  public execute(document: TextDocument): Diagnostic[] {
    if (!this.featureFlagManager.isActive({ key: ConfigKeys.HIGHLIGHT_NOT_IMPORTED })) {
      return [];
    }

    const resolved = this.missingImportResolver.resolve(document);

    return resolved.map(({ identifier, fullNamespace, index, length }) => {
      const range = new Range(
        document.positionAt(index),
        document.positionAt(index + length),
      );

      const diagnostic = new Diagnostic(
        range,
        `Class "${identifier}" is not imported (found at "${fullNamespace}").`,
        DiagnosticSeverity.Warning,
      );
      diagnostic.code = MISSING_IMPORT_CODE;
      diagnostic.source = Config;

      return diagnostic;
    });
  }
}
