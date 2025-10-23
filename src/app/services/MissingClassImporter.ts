import { inject, injectable } from "tsyringe";
import { Uri, WorkspaceEdit } from 'vscode';
import { promises as fs } from 'fs';
import { TextDocumentOpener } from '@app/services/TextDocumentOpener';
import { UnusedImportDetector } from './import/UnusedImportDetector';
import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class MissingClassImporter {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(UseStatementCreator) private useStatementCreator: UseStatementCreator,
    @inject(UnusedImportDetector) private unusedImportDetector: UnusedImportDetector,
    @inject(UseStatementLocator) private useStatementLocator: UseStatementLocator,
    @inject(UseStatementInjector) private useStatementInjector: UseStatementInjector,
  ) {
  }

  public async execute({ oldUri, newUri }: Props) {
    const directoryPath = this.workspacePathResolver.extractDirectoryFromPath(oldUri.fsPath);
    const classes = await this.getClassesNamesInDirectory(directoryPath);

    if (classes.length < 1) {
      return;
    }

    try {
      const { document, text } = await this.textDocumentOpener.execute({ uri: newUri });

      const imports = await this.useStatementCreator.multiple({
        classesUsed: this.unusedImportDetector.execute({
          contentDocument: text,
          classes,
        }),
        directoryPath,
      });

      if (!imports || (directoryPath === this.workspacePathResolver.extractDirectoryFromPath(newUri.fsPath))) {
        return;
      }

      const insertionIndex = this.useStatementLocator.execute({ document });
      if (insertionIndex === 0) {
        return;
      }

      const edit = new WorkspaceEdit();

      for (const use of imports) {
        await this.useStatementInjector.save({
          document,
          workspaceEdit: edit,
          uri: newUri,
          lastUseEndIndex: insertionIndex,
          useNamespace: use,
          flush: false,
        });
      }

      if (imports.length > 0) {
        await this.useStatementInjector.flush(edit);
      }
    } catch (_) {
      return;
    }
  }

  private async getClassesNamesInDirectory(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files.filter(file => file.endsWith('.php'))
        .map(file => this.workspacePathResolver.extractClassNameFromPath(file))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }
}
