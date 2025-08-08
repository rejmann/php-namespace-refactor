import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { readdirSync } from 'fs';

interface Props {
  directory: string
}

export async function getClassesNamesInDirectory({ directory }: Props) {
  const files = await readdirSync(directory);
  return files.filter(file => file.endsWith('.php'))
    .map(file => FilePathUtils.extractClassNameFromPath(file));
}
