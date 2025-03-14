interface Props {
  text: string,
  classes: string[],
}

export function findUnimportedClasses({
  text,
  classes,
}: Props): string[] {
  const classesUsed: string[] = [];

  classes.forEach(className => {
    const regex = new RegExp(`\\b${className}\\b`, 'g');
    if (regex.test(text) && !classesUsed.includes(className)) {
      classesUsed.push(className);
    }
  });

  const existingImports: string[] = extractClassesExistingImports(text);

  return classesUsed.filter(className => !existingImports.includes(className));
}

function extractClassesExistingImports(text: string): string[] {
  const regex = /use\s+([a-zA-Z0-9\\]+)/g;
  const imports: string[] = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    imports.push(match[1]);
  }

  return imports.map(namespace => {
    const parts = namespace.split('\\');
    return parts[parts.length - 1];
  });
}
