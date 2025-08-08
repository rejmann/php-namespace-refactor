import { ConfigKeys } from '@infra/workspace/configTypes';
import { injectable } from 'tsyringe';
import { isConfigEnabled } from '@infra/workspace/vscodeConfig';
import { RemoveUnusedImportsService } from './RemoveUnusedImportsService';
import { Uri } from 'vscode';

interface Props {
  uri: Uri
}

@injectable()
export class RemoveUnusedImportsFeature {
  constructor(
    private readonly removeUnusedImportsService: RemoveUnusedImportsService
  ) {
  }

  async execute({ uri }: Props) {
    if (!isConfigEnabled({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS })) {
      return;
    }

    this.removeUnusedImportsService.execute({ uri });
  }
}
