import { FileRenameEvent, Uri } from 'vscode';
import { ImportMissingClassesFeature } from '@app/namespace/ImportMissingClassesFeature';
import { PHP_EXTENSION } from '@shared/constants';
import { RemoveUnusedImportsFeature } from '@app/namespace/RemoveUnusedImportsFeature';
import { UpdateUserStatementFeature } from '@app/namespace/UpdateUseStatementFeature';

export class FileRenameEventHandler {
  constructor(
    private readonly updateUserStatementFeature: UpdateUserStatementFeature,
    private readonly removeUnusedImportsFeature: RemoveUnusedImportsFeature,
    private readonly importMissingClassesFeature: ImportMissingClassesFeature,
  ) {
  }

  public async handle(event: FileRenameEvent) {
    const promises = event.files.map(async ({ oldUri, newUri }) => {

      if (!this.isPhpFile(oldUri) || !this.isPhpFile(newUri)) {
        return;
      }

      this.updateUserStatementFeature.execute({ newUri, oldUri });
      this.importMissingClassesFeature.execute({ oldUri, newUri });
      this.removeUnusedImportsFeature.execute({ uri: newUri });
    });

    await Promise.all(promises);
  }

  private isPhpFile(uri: Uri): boolean {
    return uri.fsPath.endsWith(PHP_EXTENSION);
  }
}
