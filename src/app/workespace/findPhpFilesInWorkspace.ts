import { Uri, workspace } from 'vscode';
import { ConfigKeys } from '@infra/workspace/configTypes';
import { getWorkspaceConfig } from '@infra/workspace/vscodeConfig';

const DEFAULT_DIRECTORIES = ['/vendor/', '/var/', '/cache/'];
const DEFAULT_EXTENSION_PHP = 'php';

// Cache for PHP files to avoid repeated workspace scans
let cachedPhpFiles: Uri[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

export async function findPhpFilesInWorkspace(): Promise<Uri[]> {
  const now = Date.now();
  
  // Return cached result if still valid
  if (cachedPhpFiles && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPhpFiles;
  }

  const extensions = getWorkspaceConfig<string[]>({
    key: ConfigKeys.ADDITIONAL_EXTENSIONS,
    defaultValue: [DEFAULT_EXTENSION_PHP],
  });

  const pattern = `**/*.{${[DEFAULT_EXTENSION_PHP, ...extensions].join(',')}}`;
  const phpFiles: Uri[] = await workspace.findFiles(pattern);

  const ignoredDirectories = getWorkspaceConfig<string[]>({
    key: ConfigKeys.IGNORED_DIRECTORIES,
    defaultValue: DEFAULT_DIRECTORIES,
  });

  const filteredFiles = phpFiles.filter(file => ![
    ...DEFAULT_DIRECTORIES,
    ...ignoredDirectories,
  ].some(dir => file.fsPath.includes(dir)));

  // Cache the result
  cachedPhpFiles = filteredFiles;
  cacheTimestamp = now;

  return filteredFiles;
}
