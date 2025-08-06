type AutoloadType = {
  [key: string]: string
}

interface Props {
  autoload: AutoloadType,
  workspaceRoot: string,
}

const NAMESPACE_DIVIDER = '\\":';

const REGEX_FORWARD_SLASH_PATTERN = /\//g;
const REGEX_FINAL_BACKSLASH_SEGMENT = /\\[^\\]+$/;
const REGEX_BACKSLASH_PATTERN = /\\/g;
const REGEX_TRAILING_BACKSLASH = /\\+$/;

export function resolvePathFromPrefix({
  autoload,
  workspaceRoot,
}: Props) {
  for (const prefix in autoload) {
    const src = autoload[prefix].replace(REGEX_BACKSLASH_PATTERN, '/');

    if (!workspaceRoot.startsWith(src)) {
      continue;
    }

    const prefixBase = prefix.split(NAMESPACE_DIVIDER).at(0)?.replace(REGEX_TRAILING_BACKSLASH, '') || '';

    const srcReplace = src.endsWith('/') ? prefixBase + '\\' : prefixBase;

    return workspaceRoot
      .replace(src, srcReplace)
      .replace(REGEX_FORWARD_SLASH_PATTERN, '\\')
      .replace(REGEX_FINAL_BACKSLASH_SEGMENT, '');
  }

  return '';
}
