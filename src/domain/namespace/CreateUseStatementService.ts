import { CreateNamespaceService } from './CreateNamespaceService';
import { injectable } from 'tsyringe';

interface Props {
  className: string,
  directoryPath: string
}

@injectable()
export class CreateUseStatementService {
  constructor(
    private readonly createNamespaceService: CreateNamespaceService
  ) {
  }

  public execute({ className, directoryPath }: Props) {
    const uri = `${directoryPath}/${className}.php`;
    const { fullNamespace } = this.createNamespaceService.execute({ uri });
    return `\nuse ${fullNamespace};`;
  }
}
