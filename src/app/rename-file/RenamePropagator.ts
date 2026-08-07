import { Namespace, PhpFileNamespaceResolver } from '@infra/autoload/PhpFileNamespaceResolver';
import { inject, injectable } from 'tsyringe';
import { Uri } from 'vscode';

import { ClassDeclarationRewriter } from './ClassDeclarationRewriter';
import { NamespaceDeclarationRewriter } from './NamespaceDeclarationRewriter';
import { ReferenceRewriter } from './ReferenceRewriter';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

@injectable()
export class RenamePropagator {
  constructor(
    @inject(NamespaceDeclarationRewriter) private namespaceDeclarationRewriter: NamespaceDeclarationRewriter,
    @inject(ReferenceRewriter) private referenceRewriter: ReferenceRewriter,
    @inject(PhpFileNamespaceResolver) private phpFileNamespaceResolver: PhpFileNamespaceResolver,
    @inject(ClassDeclarationRewriter) private classDeclarationRewriter: ClassDeclarationRewriter,
  ) {}

  public async execute({ newUri, oldUri }: Props): Promise<Uri[]> {
    const { namespace, fullNamespace } = await this.getNamespace(newUri);

    if (!namespace) {
      return [];
    }

    const { namespace: old, fullNamespace: oldFullNamespace } = await this.getNamespace(oldUri);

    if (namespace === old && fullNamespace !== oldFullNamespace) {
      await this.classDeclarationRewriter.execute({ newUri });
    }

    const isUpdated = await this.namespaceDeclarationRewriter.execute({
      newNamespace: namespace,
      newUri,
    });

    if (!isUpdated) {
      return [];
    }

    return await this.referenceRewriter.execute({
      useOldNamespace: oldFullNamespace,
      useNewNamespace: fullNamespace,
      newUri,
      oldUri,
    });
  }

  private async getNamespace(uri: Uri): Promise<Namespace> {
    return await this.phpFileNamespaceResolver.execute({ uri });
  }
}
