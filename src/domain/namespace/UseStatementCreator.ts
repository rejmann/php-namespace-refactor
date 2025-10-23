import { inject, injectable } from 'tsyringe';
import { Uri } from 'vscode';

import { NamespaceCreator } from './NamespaceCreator';

interface MultipleProps {
  classesUsed: string[],
  directoryPath: string
}

interface SingleProps {
  fullNamespace: string
}

@injectable()
export class UseStatementCreator {
  constructor (
    @inject(NamespaceCreator) private namespaceCreator: NamespaceCreator
  ) {}

  public async multiple({ classesUsed, directoryPath }: MultipleProps): Promise<string> {
    const useStatements = await Promise.all(
      classesUsed.map(async (className) => {
        const { fullNamespace } = await this.namespaceCreator.execute({
          uri: Uri.file(`${directoryPath}/${className}.php`)
        });

        return this.single({ fullNamespace});
      })
    );

    return useStatements.join('');
  }

  public single({ fullNamespace }: SingleProps): string {
    if (fullNamespace.length > 0) {
      return `\nuse ${fullNamespace};`;
    }

    throw new Error('O parâmetro "fullNamespace" deve ser uma string válida.');
  }
}
