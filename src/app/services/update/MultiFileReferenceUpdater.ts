import { ImportRemover } from '@app/services/remove/ImportRemover';
import { NOT_FOLLOWED_BY_IDENTIFIER_CHAR } from '@domain/namespace/PhpPatterns';
import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { WorkspaceIndex } from '@infra/index/WorkspaceIndex';
import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';

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
export class MultiFileReferenceUpdater {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(ImportRemover) private importRemover: ImportRemover,
    @inject(UseStatementCreator) private useStatementCreator: UseStatementCreator,
    @inject(WorkspaceIndex) private workspaceFileFinder: WorkspaceIndex,
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(UseStatementLocator) private useStatementLocator: UseStatementLocator,
    @inject(UseStatementInjector) private useStatementInjector: UseStatementInjector,
    @inject(FileEditApplier) private fileEditApplier: FileEditApplier,
  ) {}

  public async execute({
    useOldNamespace,
    useNewNamespace,
    newUri,
    oldUri,
  }: Props) {
    const directoryPath = this.workspacePathResolver.extractDirectoryFromPath(oldUri.fsPath);
    const className = this.workspacePathResolver.extractClassNameFromPath(oldUri.fsPath);
    const newClassName = this.workspacePathResolver.extractClassNameFromPath(newUri.fsPath);
    const useImport = this.useStatementCreator.single({ fullNamespace: useNewNamespace });
    const ignoreFile = newUri.fsPath;
    const namespaceRegex = new RegExp(`${this.escapeRegex(useOldNamespace)}${NOT_FOLLOWED_BY_IDENTIFIER_CHAR}`, 'g');

    const classNameRegex = className !== newClassName
      ? new RegExp(`\\b${className}\\b`, 'g')
      : null;

    // Files that import/use the old namespace.
    const indexedPaths = this.namespaceIndex
      .getFilesUsing(useOldNamespace)
      .filter(fsPath => fsPath !== ignoreFile);

    const scannedPaths = await this.findAffectedPathsByScan({
      ignoreFile,
      useOldNamespace,
    });

    const affectedPaths = [...new Set([...indexedPaths, ...scannedPaths])];

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
      this.workspacePathResolver.extractDirectoryFromPath(file.fsPath) === directoryPath,
    );

    await Promise.all(sameDirectoryFiles.map(async (file) => {
      try {
        const { document, text } = await this.textDocumentOpener.execute({ uri: file });

        if (classNameRegex) {
          this.addRegexReplacements(edit, file, document, text, classNameRegex, newClassName);
        } else {
          await this.appendUseStatement(edit, file, document, text, directoryPath, useImport, className);
        }
      } catch (_) {
        return;
      }
    }));

    await this.fileEditApplier.apply(edit);
    await this.importRemover.execute({ uri: newUri });
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
    const currentDir = this.workspacePathResolver.extractDirectoryFromPath(file.fsPath);
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

  private async findAffectedPathsByScan({
    useOldNamespace,
    ignoreFile,
  }: {
    useOldNamespace: string,
    ignoreFile: string,
  }): Promise<string[]> {
    const allFiles = await this.workspaceFileFinder.execute();

    const matches = await Promise.all(allFiles.map(async (file) => {
      if (file.fsPath === ignoreFile) {
        return null;
      }

      try {
        const fileContent = await workspace.fs.readFile(file);
        const text = Buffer.from(fileContent).toString();

        if (!text.includes(useOldNamespace)) {
          return null;
        }

        return file.fsPath;
      } catch {
        return null;
      }
    }));

    return matches.filter((fsPath): fsPath is string => fsPath !== null);
  }
}
