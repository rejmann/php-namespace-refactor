import { injectable } from 'tsyringe';

import {
  NAMESPACE_DECLARATION_REGEX,
  NOT_FOLLOWED_BY_NAMESPACE_CHAR,
  NOT_PRECEDED_BY_NAMESPACE_CHAR,
  USE_STATEMENT_REGEX,
} from './PhpPatterns';

export interface MissingImportCandidate {
  identifier: string
  index: number
  length: number
}

// A bare capitalized identifier, not already namespace-qualified on either
// side (so multi-segment FQCNs and already-imported paths are left alone),
// and not immediately after "::" or "->" (a static/instance member access,
// never itself a class name to import).
const CANDIDATE_IDENTIFIER_REGEX = new RegExp(
  `(?<!::)(?<!->)${NOT_PRECEDED_BY_NAMESPACE_CHAR}[A-Z]\\w*${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`,
  'g',
);

@injectable()
export class MissingImportCandidateLocator {
  /**
   * Returns one entry per distinct capitalized identifier used in the file
   * that isn't already imported, aliased, or the file's own class name.
   * Whether it actually resolves to a real class anywhere in the workspace
   * is decided later (see MissingImportResolver) - this only narrows down
   * candidates from raw text.
   */
  public execute(contentDocument: string, ownClassName: string): MissingImportCandidate[] {
    const importedIdentifiers = this.extractImportedIdentifiers(contentDocument);

    // Blanked out (same length, so every other match's index stays correct)
    // rather than excluded by position - "namespace App;" would otherwise
    // have its own bare segment ("App") mistaken for a used identifier.
    const contentWithoutNamespaceDeclaration = contentDocument.replace(
      NAMESPACE_DECLARATION_REGEX,
      match => ' '.repeat(match.length),
    );

    const seen = new Set<string>();
    const candidates: MissingImportCandidate[] = [];

    for (const match of contentWithoutNamespaceDeclaration.matchAll(CANDIDATE_IDENTIFIER_REGEX)) {
      const identifier = match[0];

      if (identifier === ownClassName || importedIdentifiers.has(identifier) || seen.has(identifier)) {
        continue;
      }

      seen.add(identifier);
      candidates.push({
        identifier,
        index: match.index!,
        length: identifier.length,
      });
    }

    return candidates;
  }

  private extractImportedIdentifiers(contentDocument: string): Set<string> {
    const identifiers = new Set<string>();

    for (const match of contentDocument.matchAll(USE_STATEMENT_REGEX)) {
      const [, fullNamespace, alias] = match;
      identifiers.add(alias ?? fullNamespace.split('\\').pop()!);
    }

    return identifiers;
  }
}
