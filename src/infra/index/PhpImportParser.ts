import { injectable } from 'tsyringe';

export interface PhpFileImports {
  declares: string | null
  imports: string[]
}

@injectable()
export class PhpImportParser {
  public parse(content: string): PhpFileImports {
    return {
      declares: this.extractNamespace(content),
      imports: this.extractImports(content),
    };
  }

  private extractImports(content: string): string[] {
    const matches = [...content.matchAll(/^use\s+([\w\\]+)(?:\s+as\s+\w+)?;/gm)];
    return matches.map(m => m[1]);
  }

  private extractNamespace(content: string): string | null {
    const match = content.match(/^\s*namespace\s+([\w\\]+);/m);
    return match ? match[1] : null;
  }
}
