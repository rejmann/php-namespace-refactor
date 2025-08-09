import { CreateNamespaceService } from '@domain/namespace/CreateNamespaceService';
import { injectable } from 'tsyringe';
import { UpdateAllUseStatementForMovedClassService } from './update/UpdateAllUseStatementForMovedClassService';
import { UpdateNamespaceForMovedFileService } from './update/UpdateNamespaceForMovedFileService';
import { Uri } from 'vscode';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

@injectable()
export class UpdateUserStatementFeature {
  constructor(
    private readonly createNamespaceService: CreateNamespaceService,
    private readonly updateAllUseStatementForMovedClassService: UpdateAllUseStatementForMovedClassService,
    private readonly updateNamespaceForMovedFileService: UpdateNamespaceForMovedFileService
  ) {
  }

  public async execute({ newUri, oldUri }: Props) {
    const { namespace, fullNamespace } = this.createNamespaceService.execute({
      uri: newUri.fsPath,
    });

    if (!namespace) {
      return;
    }

    const { fullNamespace: useOldNamespace } = this.createNamespaceService.execute({
      uri: oldUri.fsPath,
    });

    const updated = await this.updateNamespaceForMovedFileService.execute({
      newNamespace: namespace,
      newUri,
    });

    if (!updated) {
      return;
    }

    await this.updateAllUseStatementForMovedClassService.execute({
      useOldNamespace,
      useNewNamespace: fullNamespace,
      newUri,
      oldUri,
    });
  }
}
