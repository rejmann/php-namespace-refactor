import { Uri, WorkspaceEdit } from 'vscode';
import { promises as fs } from 'fs';
import { PHP_EXTENSION } from '@infra/utils/constants';
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

export class MissingClassImporter {
  private workspacePathResolver: WorkspacePathResolver;

  constructor() {
    this.workspacePathResolver = new WorkspacePathResolver();
  }

  public async execute({ oldUri, newUri }: Props) {
    const directoryPath = this.workspacePathResolver.extractDirectoryFromPath(oldUri.fsPath);
    const classes = await this.getClassesNamesInDirectory(directoryPath);

    if (classes.length < 1) {
      return;
    }

    try {
      const { document, text } = await new TextDocumentOpener().execute({ uri: newUri });

      const imports = await new UseStatementCreator().multiple({
        classesUsed: new UnusedImportDetector().execute({
          contentDocument: text,
          classes,
        }),
        directoryPath,
      });

      if (!imports || (directoryPath === this.workspacePathResolver.extractDirectoryFromPath(newUri.fsPath))) {
        return;
      }

      const insertionIndex = new UseStatementLocator().execute({ document });
      if (insertionIndex === 0) {
        return;
      }

      const edit = new WorkspaceEdit();

      const useStatementInjector = new UseStatementInjector();
      for (const use of imports) {
        await useStatementInjector.save({
          document,
          workspaceEdit: edit,
          uri: newUri,
          lastUseEndIndex: insertionIndex,
          useNamespace: use,
          flush: false,
        });
      }

      if (imports.length > 0) {
        await useStatementInjector.flush(edit);
      }
    } catch (_) {
      return;
    }
  }

  private async getClassesNamesInDirectory(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files.filter(file => file.endsWith(PHP_EXTENSION))
        .map(file => this.workspacePathResolver.extractClassNameFromPath(file))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }
}
