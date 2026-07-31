import { UseStatementCreator } from '@domain/namespace/UseStatementCreator';
import { UseStatementInjector } from '@domain/namespace/UseStatementInjector';
import { UseStatementLocator } from '@domain/namespace/UseStatementLocator';
import { inject, injectable } from 'tsyringe';
import { TextDocument, WorkspaceEdit } from 'vscode';

interface Props {
  document: TextDocument
  fullNamespace: string
}

@injectable()
export class SingleImportInserter {
  constructor(
    @inject(UseStatementLocator) private useStatementLocator: UseStatementLocator,
    @inject(UseStatementCreator) private useStatementCreator: UseStatementCreator,
    @inject(UseStatementInjector) private useStatementInjector: UseStatementInjector,
  ) {}

  public async execute({ document, fullNamespace }: Props): Promise<void> {
    const location = this.useStatementLocator.execute({ document });
    const useNamespace = this.useStatementCreator.single({ fullNamespace });

    await this.useStatementInjector.save({
      document,
      workspaceEdit: new WorkspaceEdit(),
      uri: document.uri,
      useNamespace,
      lastUseEndIndex: location.index,
      isFirstUse: location.isFirstUse,
      flush: true,
    });
  }
}
