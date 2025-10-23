import { ImportRemover } from '@app/services/remove/ImportRemover';
import { TextDocumentOpener } from '@app/services/TextDocumentOpener';
import { WorkspaceFileFinder } from '@app/services/workspace/WorkspaceFileFinder';
import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
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
    @inject(WorkspaceFileFinder) private workspaceFileFinder: WorkspaceFileFinder,
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

    const useImport = this.useStatementCreator.single({ fullNamespace: useNewNamespace });

    const ignoreFile = newUri.fsPath;

    const files = await this.workspaceFileFinder.execute();

    const filesToProcess = files.filter(file => ignoreFile !== file.fsPath);

    await Promise.all(filesToProcess.map(async (file) => {
      try {
        const fileStream = workspace.fs;

        await fileStream.stat(file);

        const fileContent = await fileStream.readFile(file);
        let text = Buffer.from(fileContent).toString();

        if (!text.includes(useOldNamespace)) {
          await this.updateInFile(
            file,
            directoryPath,
            useImport,
            className,
          );

          return;
        }

        text = text.replace(useOldNamespace, useNewNamespace);
        await fileStream.writeFile(file, Buffer.from(text));

        await this.updateInFile(
          file,
          directoryPath,
          useImport,
          className,
        );
      } catch (_) {
        return;
      }
    }));

    await this.importRemover.execute({ uri: newUri });
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

      const insertionIndex = this.useStatementLocator.execute({ document });
      if (insertionIndex === 0) {
        return;
      }

      const edit = new WorkspaceEdit();

      await this.useStatementInjector.save({
        document,
        workspaceEdit: edit,
        uri: file,
        lastUseEndIndex: insertionIndex,
        useNamespace: useImport,
        flush: true,
      });
    } catch (_) {
      return;
    }
  }
}
