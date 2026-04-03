import { inject, singleton } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';

interface FileEntry {
  declares: string | null
  imports: string[]
}

interface IndexData {
  files: Record<string, FileEntry>
  usages: Record<string, string[]>
}

const INDEX_FILENAME = 'namespace-index.json';

@singleton()
export class NamespaceIndex {
  private data: IndexData = { files: {}, usages: {} };
  private readonly indexPath: string;

  constructor(
    @inject('StorageUri') storagePath: string,
  ) {
    this.indexPath = path.join(storagePath, INDEX_FILENAME);
  }

  public parseAndAdd(fsPath: string, content: string): void {
    this.removeFile(fsPath);

    const declares = this.extractNamespace(content);
    const imports = this.extractImports(content);

    this.data.files[fsPath] = { declares, imports };

    for (const ns of imports) {
      if (!this.data.usages[ns]) {
        this.data.usages[ns] = [];
      }
      if (!this.data.usages[ns].includes(fsPath)) {
        this.data.usages[ns].push(fsPath);
      }
    }
  }

  public removeFile(fsPath: string): void {
    const entry = this.data.files[fsPath];
    if (!entry) {
      return;
    }

    for (const ns of entry.imports) {
      const usages = this.data.usages[ns];
      if (usages) {
        this.data.usages[ns] = usages.filter(f => f !== fsPath);
        if (this.data.usages[ns].length === 0) {
          delete this.data.usages[ns];
        }
      }
    }

    delete this.data.files[fsPath];
  }

  public getFilesUsing(namespace: string): string[] {
    return this.data.usages[namespace] ?? [];
  }

  public async save(): Promise<void> {
    await fs.promises.writeFile(this.indexPath, JSON.stringify(this.data));
  }

  private extractNamespace(content: string): string | null {
    const match = content.match(/^\s*namespace\s+([\w\\]+);/m);
    return match ? match[1] : null;
  }

  private extractImports(content: string): string[] {
    const matches = [...content.matchAll(/^use\s+([\w\\]+)(?:\s+as\s+\w+)?;/gm)];
    return matches.map(m => m[1]);
  }
}