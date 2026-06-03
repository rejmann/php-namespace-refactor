import { ImportRemover } from '@app/services/remove/ImportRemover';
import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { WorkspaceIndex } from '@infra/index/WorkspaceIndex';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Uri, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  useOldNamespace: string
  useNewNamespace: string
  newUri: Uri
  oldUri: Uri
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
    const fileStream = workspace.fs;

    const classNameRegex = className !== newClassName
      ? new RegExp(`\\b${className}\\b`, 'g')
      : null;

    // Files that import the old namespace — O(1) lookup via index
    let affectedPaths = this.namespaceIndex
      .getFilesUsing(useOldNamespace)
      .filter(fsPath => fsPath !== ignoreFile);

    if (affectedPaths.length === 0) {
      affectedPaths = await this.findAffectedPathsByScan({
        ignoreFile,
        useOldNamespace,
      });
    }

    await Promise.all(affectedPaths.map(async (fsPath) => {
      const file = Uri.file(fsPath);
      try {
        await fileStream.stat(file);
        const fileContent = await fileStream.readFile(file);
        let text = Buffer.from(fileContent).toString().replace(useOldNamespace, useNewNamespace);
        if (classNameRegex) {
          text = text.replace(classNameRegex, newClassName);
        }
        await fileStream.writeFile(file, Buffer.from(text));
        await this.updateInFile(file, directoryPath, useImport, className);
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
        await fileStream.stat(file);
        if (classNameRegex) {
          const fileContent = await fileStream.readFile(file);
          const text = Buffer.from(fileContent).toString();
          if (text.includes(className)) {
            await fileStream.writeFile(file, Buffer.from(text.replace(new RegExp(`\\b${className}\\b`, 'g'), newClassName)));
          }
        } else {
          await this.updateInFile(file, directoryPath, useImport, className);
        }
      } catch (_) {
        return;
      }
    }));

    await this.importRemover.execute({ uri: newUri });
  }

  private async findAffectedPathsByScan({
    useOldNamespace,
    ignoreFile,
  }: {
    useOldNamespace: string,
    ignoreFile: string,
  }): Promise<string[]> {
    const allFiles = await this.workspaceFileFinder.execute();
    const escapedNamespace = useOldNamespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`^use\\s+${escapedNamespace}(?:\\s+as\\s+\\w+)?;`, 'm');

    const matches = await Promise.all(allFiles.map(async (file) => {
      if (file.fsPath === ignoreFile) {
        return null;
      }

      try {
        const fileContent = await workspace.fs.readFile(file);
        const text = Buffer.from(fileContent).toString();

        if (!importRegex.test(text)) {
          return null;
        }

        return file.fsPath;
      } catch {
        return null;
      }
    }));

    return matches.filter((fsPath): fsPath is string => fsPath !== null);
  }

  private async updateInFile(
    file: Uri,
    oldDirectoryPath: string,
    useImport: string,
    className: string,
  ): Promise<void> {
    const currentDir = this.workspacePathResolver.extractDirectoryFromPath(file.fsPath);
    if (oldDirectoryPath !== currentDir) {
      return;
    }

    try {
      const { document, text } = await this.textDocumentOpener.execute({ uri: file });

      if (!text.includes(className)) {
        return;
      }

      const location = this.useStatementLocator.execute({ document });
      if (location.index === 0) {
        return;
      }

      const edit = new WorkspaceEdit();

      await this.useStatementInjector.save({
        document,
        workspaceEdit: edit,
        uri: file,
        lastUseEndIndex: location.index,
        useNamespace: useImport,
        isFirstUse: location.isFirstUse,
        flush: true,
      });
    } catch (_) {
      return;
    }
  }
}
