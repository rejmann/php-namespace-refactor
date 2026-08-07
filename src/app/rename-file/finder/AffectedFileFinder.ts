export interface AffectedFileFinder {
  find(useOldNamespace: string, ignoreFile: string): Promise<string[]>;
}
