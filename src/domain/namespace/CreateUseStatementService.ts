import { CreateNamespaceService } from './CreateNamespaceService';

interface Props {
  className: string,
  directoryPath: string
}

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
