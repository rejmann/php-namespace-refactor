import { inject, singleton } from 'tsyringe';

import { PhpImportParser } from './PhpImportParser';

export interface FileEntry {
  declares: string | null
  imports: string[]
}

export interface IndexData {
  files: Record<string, FileEntry>
  usages: Record<string, string[]>
}

@singleton()
export class NamespaceIndexStore {
  private data: IndexData = { files: {}, usages: {} };

  constructor(
    @inject(PhpImportParser) private phpImportParser: PhpImportParser,
  ) {}

  public getFilesUsing(namespace: string): string[] {
    return this.data.usages[namespace] ?? [];
  }

  public getSnapshot(): IndexData {
    return this.data;
  }

  public hydrate(data: IndexData): void {
    this.data = data;
  }

  public isEmpty(): boolean {
    return Object.keys(this.data.files).length === 0;
  }

  public parseAndAdd(fsPath: string, content: string): void {
    this.removeFile(fsPath);

    const { declares, imports } = this.phpImportParser.parse(content);

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

  public pruneMissing(currentPaths: Set<string>): void {
    for (const fsPath of Object.keys(this.data.files)) {
      if (!currentPaths.has(fsPath)) {
        this.removeFile(fsPath);
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
}
