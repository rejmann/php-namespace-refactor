import { buildNamespaceFromFilePath } from './buildNamespaceFromFilePath';
import { buildUseStatementString } from './buildUseStatementString';

interface Props {
  classesUsed: string[]
  directoryPath: string
}

export async function buildUseStatementsForClassList({
  classesUsed,
  directoryPath,
}: Props): Promise<string> {
  const useStatements = await Promise.all(
    classesUsed.map(async (className) => {
      const uri = `${directoryPath}/${className}.php`;

      const { fullNamespace } = await buildNamespaceFromFilePath({ uri });

      return buildUseStatementString({ fullNamespace });
    })
  );

  return useStatements.join('');
}
