import { MissingImportCandidateLocator } from '@domain/namespace/MissingImportCandidateLocator';
import { NAMESPACE_DECLARATION_REGEX } from '@domain/namespace/PhpPatterns';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { inject, injectable } from 'tsyringe';
import { TextDocument } from 'vscode';

export interface ResolvedMissingImport {
  identifier: string
  fullNamespace: string
  index: number
  length: number
}

@injectable()
export class MissingImportResolver {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(MissingImportCandidateLocator) private missingImportCandidateLocator: MissingImportCandidateLocator,
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  /**
   * Only resolves a candidate identifier when the workspace index locates
   * exactly one class by that name outside of the current file and outside
   * the file's own declared namespace (already in scope, no import needed).
   * Zero matches (unresolved) or more than one (ambiguous) are skipped
   * rather than guessed - same "skip rather than guess" rule this extension
   * already applies to ambiguous property renames.
   */
  public resolve(document: TextDocument): ResolvedMissingImport[] {
    const text = document.getText();
    const ownClassName = this.workspacePathResolver.extractClassNameFromPath(document.uri.fsPath);
    const declaredNamespace = text.match(NAMESPACE_DECLARATION_REGEX)?.[1] ?? null;

    const candidates = this.missingImportCandidateLocator.execute(text, ownClassName);

    const resolved: ResolvedMissingImport[] = [];
    for (const candidate of candidates) {
      const locations = this.namespaceIndex.findClassLocations(candidate.identifier)
        .filter(location => location.fsPath !== document.uri.fsPath);

      if (locations.length !== 1) {
        continue;
      }

      const [location] = locations;
      if (location.namespace === declaredNamespace) {
        continue;
      }

      resolved.push({
        identifier: candidate.identifier,
        fullNamespace: `${location.namespace}\\${candidate.identifier}`,
        index: candidate.index,
        length: candidate.length,
      });
    }

    return resolved;
  }
}
