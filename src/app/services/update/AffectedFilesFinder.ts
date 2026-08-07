export interface AffectedFilesFinder {
  find(useOldNamespace: string, ignoreFile: string): Promise<string[]>;
}
