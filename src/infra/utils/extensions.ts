export const DEFAULT_EXTENSION = 'php';

export function normalizeExtensions(extensions: string[]): string[] {
  const normalized = extensions
    .map(extension => extension.trim().toLowerCase())
    .map(extension => extension.replace(/^\.+/, ''))
    .filter(Boolean);

  return [...new Set([DEFAULT_EXTENSION, ...normalized])];
}
