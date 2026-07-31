import { USE_STATEMENT_REGEX } from '@domain/namespace/PhpPatterns';
import { UnusedUseStatementLocator } from '@domain/namespace/UnusedUseStatementLocator';
import { UseStatementSorter, UseStatementSortMode } from '@domain/namespace/UseStatementSorter';
import { ConfigKeys, ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { FILE_EXTENSION } from '@infra/utils/constants';
import { inject, injectable } from 'tsyringe';
import { Position, Range, TextDocument, TextEdit } from 'vscode';

interface Statement {
  fullNamespace: string
  line: string
}

@injectable()
export class UseStatementBlockEditsBuilder {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
    @inject(UnusedUseStatementLocator) private unusedUseStatementLocator: UnusedUseStatementLocator,
    @inject(UseStatementSorter) private useStatementSorter: UseStatementSorter,
  ) {}

  /**
   * Removing unused imports and sorting the remaining ones both act on the
   * same contiguous block of `use` lines, so they're combined into a single
   * replace edit here instead of two independent subscribers - two separate
   * edits touching the same lines in the same onWillSaveTextDocument pass
   * would overlap and VS Code rejects overlapping edits.
   */
  public execute(document: TextDocument): TextEdit[] {
    if (!document.fileName.endsWith(FILE_EXTENSION)) {
      return [];
    }

    const removeUnused = this.featureFlagManager.isActive({ key: ConfigKeys.REMOVE_ON_SAVE, defaultValue: false });
    const sort = this.featureFlagManager.isActive({ key: ConfigKeys.SORT_ON_SAVE, defaultValue: false });

    if (!removeUnused && !sort) {
      return [];
    }

    const text = document.getText();
    const matches = [...text.matchAll(USE_STATEMENT_REGEX)];
    if (matches.length === 0) {
      return [];
    }

    const lineNumbers = matches.map(match => document.positionAt(match.index!).line);
    const isContiguous = lineNumbers.every((line, i) => i === 0 || line === lineNumbers[i - 1] + 1);
    if (!isContiguous) {
      // Something else (a comment, blank line, etc.) sits between two `use`
      // lines - skip rather than risk reordering across it and corrupting it.
      return [];
    }

    let statements: Statement[] = matches.map(match => ({ fullNamespace: match[1], line: match[0] }));

    if (removeUnused) {
      const unusedFullNamespaces = new Set(
        this.unusedUseStatementLocator.execute(text).map(unused => unused.fullNamespace),
      );
      statements = statements.filter(statement => !unusedFullNamespaces.has(statement.fullNamespace));
    }

    if (sort) {
      const mode = this.configurationLocator.get<UseStatementSortMode>({ key: ConfigKeys.SORT_MODE, defaultValue: 'natural' });
      statements = this.useStatementSorter.sort(statements, mode);
    }

    const originalLines = matches.map(match => match[0]);
    const finalLines = statements.map(statement => statement.line);
    if (finalLines.join('\n') === originalLines.join('\n')) {
      return [];
    }

    const startLine = lineNumbers[0];
    const endLine = lineNumbers[lineNumbers.length - 1];
    const range = new Range(
      new Position(startLine, 0),
      new Position(endLine, document.lineAt(endLine).text.length),
    );

    return [TextEdit.replace(range, finalLines.join('\n'))];
  }
}
