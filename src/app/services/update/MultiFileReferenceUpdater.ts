import { ImportRemover } from '@app/services/remove/ImportRemover';
import { TextDocumentOpener } from '@app/services/TextDocumentOpener';
import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { inject, injectable } from 'tsyringe';
import { RelativePattern, Uri, workspace, WorkspaceEdit } from 'vscode';

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

    await this.updateNamespaceReferences(useOldNamespace, useNewNamespace, newUri);
    await this.addUseStatementsToSameDirectory(directoryPath, newUri, useImport, className);
    await this.importRemover.execute({ uri: newUri });
  }

  private async updateNamespaceReferences(
    useOldNamespace: string,
    useNewNamespace: string,
    newUri: Uri,
  ): Promise<void> {
    const filesWithOldNamespace = await workspace.findFiles('**/*.php', '**/vendor/**');

    await Promise.all(filesWithOldNamespace.map(async (file) => {
      if (file.fsPath === newUri.fsPath) {
        return;
      }

      try {
        const fileContent = await workspace.fs.readFile(file);
        let text = Buffer.from(fileContent).toString();

        if (!text.includes(useOldNamespace)) {
          return;
        }

        text = text.replace(useOldNamespace, useNewNamespace);
        await workspace.fs.writeFile(file, Buffer.from(text));
      } catch (_) {
        return;
      }
    }));
  }

  private async addUseStatementsToSameDirectory(
    directoryPath: string,
    newUri: Uri,
    useImport: string,
    className: string,
  ): Promise<void> {
    const pattern = new RelativePattern(Uri.file(directoryPath), '*.php');
    const sameDirectoryFiles = await workspace.findFiles(pattern);

    await Promise.all(sameDirectoryFiles.map(async (file) => {
      if (file.fsPath === newUri.fsPath) {
        return;
      }

      await this.addUseStatementToFile(file, useImport, className);
    }));
  }

  private async addUseStatementToFile(
    file: Uri,
    useImport: string,
    className: string,
  ): Promise<void> {
    try {
      const { document, text } = await this.textDocumentOpener.execute({ uri: file, useCache: true });

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
