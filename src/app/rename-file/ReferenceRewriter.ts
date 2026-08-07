import { PropertyRenameNames,PropertyRenamePlanner } from '@app/property-rename/PropertyRenamePlanner';
import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { ClassNameBoundaryRegexBuilder } from '@domain/php/ClassNameBoundaryRegexBuilder';
import { NOT_FOLLOWED_BY_NAMESPACE_CHAR } from '@domain/php/PhpPatterns';
import { UseStatementLocator } from '@domain/php/UseStatementLocator';
import { PropertyRenameSettingsResolver } from '@domain/property/PropertyRenameSettingsResolver';
import { WorkspaceIndex } from '@infra/index/WorkspaceIndex';
import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Range, TextDocument, Uri, WorkspaceEdit } from 'vscode';

import { AffectedFileSearchResolver } from './finder/AffectedFileSearchResolver';
import { UseStatementCreator } from './UseStatementCreator';
import { UseStatementInjector } from './UseStatementInjector';

interface Props {
  useOldNamespace: string
  useNewNamespace: string
  newUri: Uri
  oldUri: Uri
}

interface MatchRange {
  start: number
  end: number
}

@injectable()
export class ReferenceRewriter {
  constructor(
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
    @inject(UseStatementCreator) private useStatementCreator: UseStatementCreator,
    @inject(WorkspaceIndex) private workspaceFileFinder: WorkspaceIndex,
    @inject(AffectedFileSearchResolver) private affectedFileSearchResolver: AffectedFileSearchResolver,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(UseStatementLocator) private useStatementLocator: UseStatementLocator,
    @inject(UseStatementInjector) private useStatementInjector: UseStatementInjector,
    @inject(FileEditApplier) private fileEditApplier: FileEditApplier,
    @inject(ClassNameBoundaryRegexBuilder) private classNameBoundaryRegexBuilder: ClassNameBoundaryRegexBuilder,
    @inject(PropertyRenamePlanner) private propertyRenamePlanner: PropertyRenamePlanner,
    @inject(PropertyRenameSettingsResolver) private propertyRenameSettingsResolver: PropertyRenameSettingsResolver,
  ) {}

  public async execute({
    useOldNamespace,
    useNewNamespace,
    newUri,
    oldUri,
  }: Props): Promise<Uri[]> {
    const directoryPath = this.phpFilePathResolver.extractDirectoryFromPath(oldUri.fsPath);
    const className = this.phpFilePathResolver.extractClassNameFromPath(oldUri.fsPath);
    const newClassName = this.phpFilePathResolver.extractClassNameFromPath(newUri.fsPath);
    const useImport = this.useStatementCreator.single({ fullNamespace: useNewNamespace });
    const ignoreFile = newUri.fsPath;
    const namespaceRegex = new RegExp(`${this.escapeRegex(useOldNamespace)}${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`, 'g');

    const classNameRegex = className !== newClassName
      ? this.classNameBoundaryRegexBuilder.execute({ className })
      : null;

    // Resolved once so property renaming can be folded into the very same
    // per-file loop (and WorkspaceEdit) as the class-name replacement below,
    // instead of a second pass that reopens every affected file after this
    // one has already applied and saved.
    const propertyRenameSettings = this.propertyRenameSettingsResolver.resolve();
    const propertyNames = propertyRenameSettings.enabled
      ? this.propertyRenamePlanner.resolveNames(oldUri, newUri)
      : null;

    // Files that import/use the old namespace.
    const affectedPaths = await this.affectedFileSearchResolver.find(useOldNamespace, ignoreFile);

    // A single WorkspaceEdit shared by every file touched below, so the
    // whole multi-file refactor lands on VS Code's undo stack as one atomic
    // operation instead of a raw disk write plus a handful of unrelated
    // undo stops: https://github.com/rejmann/php-namespace-refactor/issues/72
    const edit = new WorkspaceEdit();

    await Promise.all(affectedPaths.map(async (fsPath) => {
      const file = Uri.file(fsPath);
      try {
        const { document, text } = await this.textDocumentOpener.execute({ uri: file });

        const namespaceMatches = this.addRegexReplacements(edit, file, document, text, namespaceRegex, useNewNamespace);
        if (classNameRegex) {
          this.addRegexReplacements(edit, file, document, text, classNameRegex, newClassName, namespaceMatches);
        }

        if (propertyNames) {
          this.propertyRenamePlanner.collectEdits(
            edit, file, document, text, propertyNames, propertyRenameSettings.renameMismatchedNames,
          );
        }

        // A file affected here already references useOldNamespace (that's how it
        // landed in affectedPaths), so the substitution above already turns its
        // own `use` line into the new one. Appending another would duplicate it.
        if (namespaceMatches.length === 0) {
          await this.appendUseStatement(edit, file, document, text, directoryPath, useImport, className);
        }
      } catch (_) {
        return;
      }
    }));

    // Files in the same directory that might need the new use statement.
    const affectedSet = new Set(affectedPaths);
    const allFiles = await this.workspaceFileFinder.execute();
    const sameDirectoryFiles = allFiles.filter(file =>
      file.fsPath !== ignoreFile &&
      !affectedSet.has(file.fsPath) &&
      this.phpFilePathResolver.extractDirectoryFromPath(file.fsPath) === directoryPath,
    );

    await Promise.all(sameDirectoryFiles.map(async (file) => {
      try {
        const { document, text } = await this.textDocumentOpener.execute({ uri: file });

        if (classNameRegex) {
          this.addRegexReplacements(edit, file, document, text, classNameRegex, newClassName);
        } else {
          await this.appendUseStatement(edit, file, document, text, directoryPath, useImport, className);
        }

        if (propertyNames) {
          this.propertyRenamePlanner.collectEdits(
            edit, file, document, text, propertyNames, propertyRenameSettings.renameMismatchedNames,
          );
        }
      } catch (_) {
        return;
      }
    }));

    if (propertyNames) {
      // The renamed class's own file: covers a class that holds a
      // self-typed property (e.g. a linked-list node), which is never part
      // of affectedPaths/sameDirectoryFiles since newUri is always excluded there.
      try {
        const { document, text } = await this.textDocumentOpener.execute({ uri: newUri });
        this.propertyRenamePlanner.collectEdits(
          edit, newUri, document, text, propertyNames, propertyRenameSettings.renameMismatchedNames,
        );
      } catch (_) {
        // ignore
      }
    }

    await this.fileEditApplier.apply(edit);

    return [...affectedPaths.map(fsPath => Uri.file(fsPath)), ...sameDirectoryFiles];
  }

  /**
   * Adds one Range replacement per regex match, computed against the
   * document's original text so it can be combined with other edits to the
   * same file in a single WorkspaceEdit. `excludeWithin` lets a narrower
   * regex (e.g. the bare class name) skip matches that fall inside a
   * broader one already being replaced (e.g. that class name's own FQCN),
   * which would otherwise register as an overlapping range.
   */
  private addRegexReplacements(
    edit: WorkspaceEdit,
    uri: Uri,
    document: TextDocument,
    text: string,
    regex: RegExp,
    replacement: string,
    excludeWithin: MatchRange[] = [],
  ): MatchRange[] {
    const ranges: MatchRange[] = [];

    for (const match of text.matchAll(regex)) {
      const start = match.index;
      const end = start + match[0].length;

      if (excludeWithin.some(range => start >= range.start && end <= range.end)) {
        continue;
      }

      edit.replace(uri, new Range(document.positionAt(start), document.positionAt(end)), replacement);
      ranges.push({ start, end });
    }

    return ranges;
  }

  private async appendUseStatement(
    edit: WorkspaceEdit,
    file: Uri,
    document: TextDocument,
    text: string,
    oldDirectoryPath: string,
    useImport: string,
    className: string,
  ): Promise<void> {
    const currentDir = this.phpFilePathResolver.extractDirectoryFromPath(file.fsPath);
    if (oldDirectoryPath !== currentDir || !text.includes(className)) {
      return;
    }

    const location = this.useStatementLocator.execute({ document });
    if (location.index === 0) {
      return;
    }

    await this.useStatementInjector.save({
      document,
      workspaceEdit: edit,
      uri: file,
      lastUseEndIndex: location.index,
      useNamespace: useImport,
      isFirstUse: location.isFirstUse,
      flush: false,
    });
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
