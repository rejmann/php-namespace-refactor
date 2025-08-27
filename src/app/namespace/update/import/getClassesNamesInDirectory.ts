import { extractClassNameFromPath } from '@infra/utils/filePathUtils';
import { promises as fs } from 'fs';
import { PHP_EXTENSION } from '@infra/utils/constants';

interface Props {
  directory: string
}

export async function getClassesNamesInDirectory({ directory }: Props) {
  try {
    const files = await fs.readdir(directory);
    return files.filter(file => file.endsWith(PHP_EXTENSION))
      .map(file => extractClassNameFromPath(file))
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}
