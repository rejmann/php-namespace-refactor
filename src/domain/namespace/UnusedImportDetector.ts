import { injectable } from 'tsyringe';

import { NOT_FOLLOWED_BY_NAMESPACE_CHAR, NOT_PRECEDED_BY_NAMESPACE_CHAR } from './PhpPatterns';

interface Props {
  contentDocument: string,
  classes: string[],
}

@injectable()
export class UnusedImportDetector {
  public execute({ contentDocument, classes }: Props): string[] {
    const classesUsed: string[] = [];

    classes.forEach(className => {
      const regex = new RegExp(`${NOT_PRECEDED_BY_NAMESPACE_CHAR}${className}${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`, 'g');
      if (regex.test(contentDocument) && !classesUsed.includes(className)) {
        classesUsed.push(className);
      }
    });

    const existingImports: string[] = this.extractClassesExistingImports(contentDocument);

    return classesUsed.filter(className => !existingImports.includes(className));
  }

  private extractClassesExistingImports(text: string): string[] {
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
}
