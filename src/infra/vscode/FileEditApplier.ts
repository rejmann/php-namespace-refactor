import { ConfigKeys } from '@domain/config/ConfigurationLocator';
import { FeatureFlagManager } from '@domain/config/FeatureFlagManager';
import { BackgroundSaveStrategy, EditApplyStrategy, ShowEditorSaveStrategy } from '@infra/vscode/EditApplyStrategy';
import { inject, injectable } from 'tsyringe';
import { TabInputText, window, workspace, WorkspaceEdit } from 'vscode';

@injectable()
export class FileEditApplier {
  constructor(
    @inject(FeatureFlagManager) private featureFlagManager: FeatureFlagManager,
    @inject(BackgroundSaveStrategy) private backgroundSaveStrategy: BackgroundSaveStrategy,
    @inject(ShowEditorSaveStrategy) private showEditorSaveStrategy: ShowEditorSaveStrategy,
  ) {}

  public async apply(edit: WorkspaceEdit): Promise<boolean> {
    const strategy = this.resolveStrategy();
    const openFsPaths = this.getOpenFsPaths();

    const result = await workspace.applyEdit(edit);

    for (const [uri] of edit.entries()) {
      if (openFsPaths.has(uri.fsPath)) {
        continue;
      }

      await strategy.apply(uri);
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

  private resolveStrategy(): EditApplyStrategy {
    const editFilesInBackground = this.featureFlagManager.isActive({
      key: ConfigKeys.EDIT_FILES_IN_BACKGROUND,
    });

    return editFilesInBackground ? this.backgroundSaveStrategy : this.showEditorSaveStrategy;
  }
}
