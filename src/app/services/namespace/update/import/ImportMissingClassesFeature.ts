import { Config, ConfigurationService } from '@infra/workspace/ConfigurationService';
import { ImportMissingClassesService } from './ImportMissingClassesService';
import { injectable } from 'tsyringe';
import { Uri } from 'vscode';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class ImportMissingClassesFeature {
  constructor(
    private readonly importMissingClassesService: ImportMissingClassesService,
    private readonly configurationService: ConfigurationService,
  ) {
  }

  async execute({ oldUri, newUri }: Props): Promise<void> {
    if (!this.configurationService.isConfigEnabled({ key: Config.AUTO_IMPORT_NAMESPACE })) {
      return;
    }

    this.importMissingClassesService.execute({
      oldFileName: oldUri.fsPath,
      newUri,
    });
  }
}
