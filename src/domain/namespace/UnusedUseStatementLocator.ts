import { inject, injectable } from 'tsyringe';

import { ClassNameBoundaryRegexBuilder } from './ClassNameBoundaryRegexBuilder';
import { USE_STATEMENT_REGEX } from './PhpPatterns';

export interface UnusedUseStatement {
  fullNamespace: string
  index: number
  length: number
}

@injectable()
export class UnusedUseStatementLocator {
  constructor(
    @inject(ClassNameBoundaryRegexBuilder) private classNameBoundaryRegexBuilder: ClassNameBoundaryRegexBuilder,
  ) {}

  public execute(contentDocument: string): UnusedUseStatement[] {
    const useMatches = [...contentDocument.matchAll(USE_STATEMENT_REGEX)];
    if (useMatches.length === 0) {
      return [];
    }

    // The imported identifier also appears on its own `use` line, so that
    // line is stripped out of the body before checking for real usages.
    const bodyWithoutImports = contentDocument.replace(USE_STATEMENT_REGEX, '');

    const unused: UnusedUseStatement[] = [];
    for (const match of useMatches) {
      const [fullMatch, fullNamespace, alias] = match;
      const identifier = alias ?? fullNamespace.split('\\').pop()!;

      const isUsed = this.classNameBoundaryRegexBuilder.execute({ className: identifier }).test(bodyWithoutImports);
      if (isUsed) {
        continue;
      }

      unused.push({
        fullNamespace,
        index: match.index!,
        length: fullMatch.length,
      });
    }

    return unused;
  }
}
