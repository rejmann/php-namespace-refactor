const IMPORT_LINE_REGEX = /^use\s+\\?([\w\\]+)\s*;\s*$/;

export interface ImportLineRange {
  start: number
  end: number
}

interface Props {
  text: string
  namespace: string
  classNames: string[]
}

/**
 * Finds the line-leading `use` statements that import one of `classNames`
 * from `namespace` itself — the file's own namespace, where such imports are
 * redundant. Only an exact namespace match counts: an import of a same-named
 * class from another namespace changes which class the short name refers to,
 * and an aliased import (`use Foo\Bar as Baz;`) is referenced by its alias,
 * so neither may be removed.
 *
 * Returns each line's range including its trailing newline.
 */
export function findRedundantImports({ text, namespace, classNames }: Props): ImportLineRange[] {
  const names = new Set(classNames);
  const ranges: ImportLineRange[] = [];

  let offset = 0;
  for (const line of text.split('\n')) {
    const lineEnd = offset + line.length;
    const match = IMPORT_LINE_REGEX.exec(line);

    if (match) {
      const separator = match[1].lastIndexOf('\\');
      const importNamespace = separator === -1 ? '' : match[1].slice(0, separator);
      const importedClass = match[1].slice(separator + 1);

      if (importNamespace === namespace && names.has(importedClass)) {
        ranges.push({ start: offset, end: Math.min(lineEnd + 1, text.length) });
      }
    }

    offset = lineEnd + 1;
  }

  return ranges;
}
