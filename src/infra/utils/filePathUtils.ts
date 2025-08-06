import { basename, dirname } from 'path';
import { WORKSPACE_PATH } from './constants';

type AbsolutePath = string | null | undefined

const LEADING_SLASH_OR_BACKSLASH_REGEX = /^\/|\\/g;

export const removeWorkspaceRoot = (filePath: AbsolutePath) =>
  filePath
    ?.replace(WORKSPACE_PATH, '')
    .replace(LEADING_SLASH_OR_BACKSLASH_REGEX, '') || '';

export const extractDirectoryFromPath = (filePath: AbsolutePath) =>
  dirname(filePath || '');

export const extractClassNameFromPath = (filePath: AbsolutePath) =>
  basename(filePath || '', '.php') || '';
