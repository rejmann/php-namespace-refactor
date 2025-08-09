import { ConfigKeys } from '@infra/workspace/configTypes';
import { ImportMissingClassesService } from './ImportMissingClassesService';
import { injectable } from 'tsyringe';
import { isConfigEnabled } from '@infra/workspace/vscodeConfig';
import { Uri } from 'vscode';

interface Props {
  oldUri: Uri
  newUri: Uri
}

@injectable()
export class ImportMissingClassesFeature {
  constructor(
    private readonly importMissingClassesService: ImportMissingClassesService
  ) {
  }

  async execute({ oldUri, newUri }: Props): Promise<void> {
    if (!isConfigEnabled({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
      return;
    }

    this.importMissingClassesService.execute({
      oldFileName: oldUri.fsPath,
      newUri,
    });
  }
}
