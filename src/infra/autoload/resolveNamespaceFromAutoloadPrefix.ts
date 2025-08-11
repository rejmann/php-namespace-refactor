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

export function resolveNamespaceFromAutoloadPrefix({
  autoload,
  workspaceRoot,
}: Props) {
  for (const prefix in autoload) {
    const src = autoload[prefix].replace(/\\/g, '/');

    if (!workspaceRoot.startsWith(src)) {
      continue;
    }

    const prefixBase = prefix.split(NAMESPACE_DIVIDER).at(0)?.replace(/\\+$/, '') || '';

    const srcReplace = src.endsWith('/') ? prefixBase + '\\' : prefixBase;

    return workspaceRoot
      .replace(src, srcReplace)
      .replace(REGEX_FORWARD_SLASH_PATTERN, '\\')
      .replace(REGEX_FINAL_BACKSLASH_SEGMENT, '');
  }

  return '';
}
