import { injectable } from 'tsyringe';
import { Uri, window, workspace } from 'vscode';

export interface EditApplyStrategy {
  apply(uri: Uri): Promise<void>;
}

/**
 * Files that weren't already open before the refactor are edited straight
 * through, without ever surfacing an editor tab: https://github.com/rejmann/php-namespace-refactor/issues/73
 */
@injectable()
export class BackgroundSaveStrategy implements EditApplyStrategy {
  public async apply(uri: Uri): Promise<void> {
    const document = workspace.textDocuments.find(doc => doc.uri.fsPath === uri.fsPath);
    if (document?.isDirty) {
      await document.save();
    }
  }
}

@injectable()
export class ShowEditorSaveStrategy implements EditApplyStrategy {
  public async apply(uri: Uri): Promise<void> {
    await window.showTextDocument(uri, { preview: false, preserveFocus: true });
  }
}
