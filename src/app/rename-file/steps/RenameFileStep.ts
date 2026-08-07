import { Uri } from 'vscode';

export interface RenameFileStepContext {
  oldUri: Uri
  newUri: Uri
}

export interface RenameFileStep {
  isEnabled(): boolean
  apply(ctx: RenameFileStepContext): Promise<void>
}
