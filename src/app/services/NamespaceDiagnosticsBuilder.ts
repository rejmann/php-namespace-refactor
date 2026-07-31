import { NamespaceCreator } from '@domain/namespace/NamespaceCreator';
import { NamespaceMismatchDetector } from '@domain/namespace/NamespaceMismatchDetector';
import { NAMESPACE_DECLARATION_REGEX } from '@domain/namespace/PhpPatterns';
import { Config, ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';
import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from 'vscode';

export const NAMESPACE_MISMATCH_CODE = 'namespace-mismatch';

@injectable()
export class NamespaceDiagnosticsBuilder {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator,
    @inject(NamespaceMismatchDetector) private namespaceMismatchDetector: NamespaceMismatchDetector,
  ) {}

  public async execute(document: TextDocument): Promise<Diagnostic[]> {
    if (!this.featureFlagManager.isActive({ key: ConfigKeys.NAMESPACE_MISMATCH_DIAGNOSTICS })) {
      return [];
    }

    const text = document.getText();
    const match = text.match(NAMESPACE_DECLARATION_REGEX);
    if (!match) {
      return [];
    }

    const declaredNamespace = match[1];
    const { namespace: expectedNamespace } = await this.namespaceCreator.execute({ uri: document.uri });

    const isMismatched = this.namespaceMismatchDetector.execute({ declaredNamespace, expectedNamespace });
    if (!isMismatched) {
      return [];
    }

    // NAMESPACE_DECLARATION_REGEX allows leading blank lines via `\s*` (other
    // call sites rely on that to normalize spacing on replace) - trim it here
    // so the diagnostic/quick-fix range covers only the "namespace ...;" line.
    const leadingWhitespaceLength = match[0].match(/^\s*/)![0].length;
    const startIndex = match.index! + leadingWhitespaceLength;
    const range = new Range(
      document.positionAt(startIndex),
      document.positionAt(match.index! + match[0].length),
    );

    const diagnostic = new Diagnostic(
      range,
      `Namespace does not match the file's location. Expected "${expectedNamespace}".`,
      DiagnosticSeverity.Warning,
    );
    diagnostic.code = NAMESPACE_MISMATCH_CODE;
    diagnostic.source = Config;

    return [diagnostic];
  }
}
