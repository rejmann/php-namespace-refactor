import { NAMESPACE_DECLARATION_REGEX, USE_STATEMENT_REGEX } from '@domain/namespace/PhpPatterns';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import * as fs from 'fs';
import * as path from 'path';
import { inject, singleton } from 'tsyringe';

interface FileEntry {
  declares: string | null
  imports: string[]
}

interface IndexData {
  files: Record<string, FileEntry>
  usages: Record<string, string[]>
}

export interface ClassLocation {
  fsPath: string
  namespace: string
}

const INDEX_FILENAME = 'namespace-index.json';

@singleton()
export class NamespaceIndex {
  private data: IndexData = { files: {}, usages: {} };
  private readonly indexPath: string;

  constructor(
    @inject('StorageUri') storagePath: string,
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
  ) {
    this.indexPath = path.join(storagePath, INDEX_FILENAME);
  }

  /**
   * Every indexed file whose class name (derived from its file name, same
   * convention as WorkspacePathResolver.extractClassNameFromPath) matches
   * `className`. Used to resolve a bare identifier used in a file to the
   * one place in the workspace that declares it - callers decide what to
   * do when this returns zero (unresolved) or more than one (ambiguous)
   * result, rather than guessing.
   */
  public findClassLocations(className: string): ClassLocation[] {
    const locations: ClassLocation[] = [];

    for (const [fsPath, entry] of Object.entries(this.data.files)) {
      if (!entry.declares) {
        continue;
      }

      if (this.workspacePathResolver.extractClassNameFromPath(fsPath) !== className) {
        continue;
      }

      locations.push({ fsPath, namespace: entry.declares });
    }

    return locations;
  }

  public getFilesUsing(namespace: string): string[] {
    return this.data.usages[namespace] ?? [];
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

  public async save(): Promise<void> {
    await fs.promises.writeFile(this.indexPath, JSON.stringify(this.data));
  }

  private extractImports(content: string): string[] {
    const matches = [...content.matchAll(USE_STATEMENT_REGEX)];
    return matches.map(m => m[1]);
  }

  private extractNamespace(content: string): string | null {
    const match = content.match(NAMESPACE_DECLARATION_REGEX);
    return match ? match[1] : null;
  }
}
