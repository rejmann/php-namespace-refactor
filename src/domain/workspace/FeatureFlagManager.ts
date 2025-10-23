import { injectable } from 'tsyringe';
import { workspace, WorkspaceConfiguration } from 'vscode';

import { Config } from './ConfigurationLocator';

export type Props = {
  key: string,
  defaultValue?: boolean
}

@injectable()
export class FeatureFlagManager {
  private config: WorkspaceConfiguration;

  constructor() {
    this.config = workspace.getConfiguration(Config);
  }

  public isActive({ key, defaultValue = true }: Props): boolean {
    return this.config.get<boolean>(key, defaultValue);
  }
}
