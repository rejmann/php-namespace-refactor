import { ConfigKeys } from '@domain/workspace/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/workspace/FeatureFlagManager';
import { inject, injectable } from 'tsyringe';
import { TabInputText, Uri, window, workspace, WorkspaceEdit } from 'vscode';

@injectable()
export class FileEditApplier {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
  ) {}

  public async apply(edit: WorkspaceEdit): Promise<boolean> {
    const editFilesInBackground = this.featureFlagManager.isActive({
      key: ConfigKeys.EDIT_FILES_IN_BACKGROUND,
    });

    const openFsPaths = this.getOpenFsPaths();

    const result = await workspace.applyEdit(edit);

    for (const [uri] of edit.entries()) {
      if (openFsPaths.has(uri.fsPath)) {
        continue;
      }

      if (editFilesInBackground) {
        await this.saveInBackground(uri);
      } else {
        await window.showTextDocument(uri, { preview: false, preserveFocus: true });
      }
    }

    return result;
  }

  private getOpenFsPaths(): Set<string> {
    return new Set(
      window.tabGroups.all
        .flatMap(group => group.tabs)
        .map(tab => tab.input)
        .filter((input): input is TabInputText => input instanceof TabInputText)
        .map(input => input.uri.fsPath),
    );
  }

  /**
   * Files that weren't already open before the refactor are edited straight
   * through, without ever surfacing an editor tab: https://github.com/rejmann/php-namespace-refactor/issues/73
   */
  private async saveInBackground(uri: Uri): Promise<void> {
    const document = workspace.textDocuments.find(doc => doc.uri.fsPath === uri.fsPath);
    if (document?.isDirty) {
      await document.save();
    }
  }
}
