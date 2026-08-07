import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { UnusedImportDetector } from '@domain/php/UnusedImportDetector';
import { UseStatementLocator } from '@domain/php/UseStatementLocator';
import { FILE_EXTENSION } from '@infra/utils/constants';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { promises as fs } from 'fs';
import { inject, injectable } from 'tsyringe';
import { Uri, WorkspaceEdit } from 'vscode';

import { UseStatementCreator } from './UseStatementCreator';
import { UseStatementInjector } from './UseStatementInjector';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class MissingImportInserter {
  constructor(
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(UseStatementCreator) private useStatementCreator: UseStatementCreator,
    @inject(UnusedImportDetector) private unusedImportDetector: UnusedImportDetector,
    @inject(UseStatementLocator) private useStatementLocator: UseStatementLocator,
    @inject(UseStatementInjector) private useStatementInjector: UseStatementInjector,
  ) {
  }

  public async execute({ oldUri, newUri }: Props) {
    const directoryPath = this.phpFilePathResolver.extractDirectoryFromPath(oldUri.fsPath);
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

      if (!imports || (directoryPath === this.phpFilePathResolver.extractDirectoryFromPath(newUri.fsPath))) {
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
        uri: newUri,
        lastUseEndIndex: location.index,
        useNamespace: imports,
        isFirstUse: location.isFirstUse,
        flush: true,
      });
    } catch (_) {
      return;
    }
  }

  private async getClassesNamesInDirectory(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files.filter(file => file.endsWith(FILE_EXTENSION))
        .map(file => this.phpFilePathResolver.extractClassNameFromPath(file))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }
}
