import { basename, dirname } from 'path';
import { WORKSPACE_ROOT } from './constants';

type AbsolutePath = string | null | undefined

export const getRelativePathFromWorkspace = (filePath: AbsolutePath) =>
  filePath
    ?.replace(WORKSPACE_ROOT, '')
    .replace(/^\/|\\/g, '') || '';

export const getDirectoryPathFromFilePath = (filePath: AbsolutePath) =>
  dirname(filePath || '');

export const getClassNameFromFilePath = (filePath: AbsolutePath) =>
  basename(filePath || '', '.php') || '';
