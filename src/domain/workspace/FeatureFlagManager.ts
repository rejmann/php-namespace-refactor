import { workspace, WorkspaceConfiguration } from 'vscode';

export type Props = {
  key: string,
  defaultValue?: boolean
}

export class FeatureFlagManager {
  private config: WorkspaceConfiguration;

  constructor() {
    this.config = workspace.getConfiguration('phpNamespaceRefactor');
  }

  public isActive({ key, defaultValue = true }: Props): boolean {
    return this.config.get<boolean>(key, defaultValue);
  }
}
