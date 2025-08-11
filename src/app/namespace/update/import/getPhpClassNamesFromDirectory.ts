import { getClassNameFromFilePath } from '@infra/utils/filePathUtils';
import { readdirSync } from 'fs';

interface Props {
  directory: string
}

export async function getPhpClassNamesFromDirectory({ directory }: Props) {
  const files = await readdirSync(directory);
  return files.filter(file => file.endsWith('.php'))
    .map(file => getClassNameFromFilePath(file));
}
