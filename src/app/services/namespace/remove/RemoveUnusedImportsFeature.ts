import { Config, ConfigurationService } from '@infra/workspace/ConfigurationService';
import { injectable } from 'tsyringe';
import { RemoveUnusedImportsService } from './RemoveUnusedImportsService';
import { Uri } from 'vscode';

interface Props {
  uri: Uri
}

@injectable()
export class RemoveUnusedImportsFeature {
  constructor(
    private readonly removeUnusedImportsService: RemoveUnusedImportsService,
    private readonly configurationService: ConfigurationService
  ) {
  }

  async execute({ uri }: Props) {
    if (!this.configurationService.isConfigEnabled({ key: Config.REMOVE_UNUSED_IMPORTS })) {
      return;
    }

    this.removeUnusedImportsService.execute({ uri });
  }
}
