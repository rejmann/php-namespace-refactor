import { CreateNamespaceService } from './CreateNamespaceService';
import { generateUseStatement } from './generateUseStatement';

interface Props {
  classesUsed: string[]
  directoryPath: string
}

export async function generateUseStatementsForClasses({
  classesUsed,
  directoryPath,
}: Props): Promise<string> {
  const createNamespaceService = new CreateNamespaceService();

  const useStatements = await Promise.all(
    classesUsed.map(async (className) => {
      const uri = `${directoryPath}/${className}.php`;

      const { fullNamespace } = createNamespaceService.execute({ uri });

      return generateUseStatement({ fullNamespace });
    })
  );

  return useStatements.join('');
}
