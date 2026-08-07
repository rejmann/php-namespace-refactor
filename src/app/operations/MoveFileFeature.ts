import { Uri } from 'vscode';

export interface MoveFileFeatureContext {
  oldUri: Uri
  newUri: Uri
}

export interface MoveFileFeature {
  isEnabled(): boolean
  apply(ctx: MoveFileFeatureContext): Promise<void>
}
