import { NamespaceIndex } from '@infra/index/NamespaceIndex';
import { inject, injectable } from 'tsyringe';

const SAVE_DEBOUNCE_MS = 300;

/**
 * Single place where "parse/remove a file, then persist" happens - the
 * orchestration shared by FileSavedSubscriber, FileCreatedSubscriber,
 * FileDeletedSubscriber and NamespaceIndexBuilder, which used to each call
 * NamespaceIndex.save() individually on every single event. Debouncing here
 * collapses bursts (e.g. a batch build, or several saves in a row) into one
 * disk write.
 */
@injectable()
export class IndexSyncAdapter {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @inject(NamespaceIndex) private namespaceIndex: NamespaceIndex,
  ) {}

  /** Forces a pending debounced save to happen now - for callers (e.g. the batch builder) that need it flushed before they return. */
  public async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.namespaceIndex.save();
  }

  public onFileChanged(fsPath: string, content: string): void {
    this.namespaceIndex.parseAndAdd(fsPath, content);
    this.scheduleSave();
  }

  public onFileRemoved(fsPath: string): void {
    this.namespaceIndex.removeFile(fsPath);
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.namespaceIndex.save();
    }, SAVE_DEBOUNCE_MS);
  }
}
