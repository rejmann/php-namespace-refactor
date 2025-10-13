import { Uri, workspace, WorkspaceEdit } from 'vscode';
import { ImportRemover } from '@app/services/remove/ImportRemover';
import { TextDocumentOpener } from '@app/services/TextDocumentOpener';
import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { WorkspaceFileFinder } from '@app/services/workspace/WorkspaceFileFinder';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface Props {
  useOldNamespace: string
  useNewNamespace: string
  newUri: Uri
  oldUri: Uri
}

export class MultiFileReferenceUpdater {
  private workspacePathResolver: WorkspacePathResolver;

  constructor() {
    this.workspacePathResolver = new WorkspacePathResolver();
  }

  public async execute({
    useOldNamespace,
    useNewNamespace,
    newUri,
    oldUri,
  }: Props) {
    const directoryPath = this.workspacePathResolver.extractDirectoryFromPath(oldUri.fsPath);
    const className = this.workspacePathResolver.extractClassNameFromPath(oldUri.fsPath);

    const useImport = new UseStatementCreator().single({ fullNamespace: useNewNamespace });

    const ignoreFile = newUri.fsPath;

    const files = await new WorkspaceFileFinder().execute();

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

    await new ImportRemover().execute({ uri: newUri });
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
        const { document, text } = await new TextDocumentOpener().execute({ uri: file });

        if (!text.includes(className)) {
          return;
        }

        const insertionIndex = new UseStatementLocator().execute({ document });
        if (insertionIndex === 0) {
          return;
        }

        const edit = new WorkspaceEdit();

        await new UseStatementInjector().save({
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
