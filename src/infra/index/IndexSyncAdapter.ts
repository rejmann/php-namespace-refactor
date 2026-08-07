import { NamespaceIndexRepository } from '@infra/index/NamespaceIndexRepository';
import { NamespaceIndexStore } from '@infra/index/NamespaceIndexStore';
import { inject, injectable } from 'tsyringe';

const SAVE_DEBOUNCE_MS = 300;

/**
 * Single place where "parse/remove a file, then persist" happens - the
 * orchestration shared by FileSavedListener, FileCreatedListener,
 * FileDeletedListener and NamespaceIndexBuilder, which used to each call
 * save() individually on every single event. Debouncing here collapses
 * bursts (e.g. a batch build, or several saves in a row) into one disk write.
 */
@injectable()
export class IndexSyncAdapter {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @inject(NamespaceIndexStore) private namespaceIndexStore: NamespaceIndexStore,
    @inject(NamespaceIndexRepository) private namespaceIndexRepository: NamespaceIndexRepository,
  ) {}

  /** Forces a pending debounced save to happen now - for callers (e.g. the batch builder) that need it flushed before they return. */
  public async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.namespaceIndexRepository.save(this.namespaceIndexStore.getSnapshot());
  }

  public onFileChanged(fsPath: string, content: string): void {
    this.namespaceIndexStore.parseAndAdd(fsPath, content);
    this.scheduleSave();
  }

  public onFileRemoved(fsPath: string): void {
    this.namespaceIndexStore.removeFile(fsPath);
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.namespaceIndexRepository.save(this.namespaceIndexStore.getSnapshot());
    }, SAVE_DEBOUNCE_MS);
  }
}
