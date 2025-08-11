import { Uri, workspace } from 'vscode';

import { addImportStatementToFile } from './addImportStatementToFile';
import { buildUseStatementString } from '@domain/namespace/buildUseStatementString';
import { cleanupUnusedImportsAfterMove } from '../remove/cleanupUnusedImportsAfterMove';
import { getAllPhpFilesExcludingIgnoredDirs } from '../../workespace/getAllPhpFilesExcludingIgnoredDirs';
import { getClassNameFromFilePath } from '@infra/utils/filePathUtils';
import { getDirectoryPathFromFilePath } from '@infra/utils/filePathUtils';

interface Props {
  useOldNamespace: string
  useNewNamespace: string
  newUri: Uri
  oldUri: Uri
}

export async function updateNamespaceReferencesInAllFiles({
  useOldNamespace,
  useNewNamespace,
  newUri,
  oldUri,
}: Props) {
  const directoryPath = getDirectoryPathFromFilePath(oldUri.fsPath);
  const className = getClassNameFromFilePath(oldUri.fsPath);

  const useImport = buildUseStatementString({ fullNamespace: useNewNamespace });

  const ignoreFile = newUri.fsPath;

  const files = await getAllPhpFilesExcludingIgnoredDirs();

  for (const file of files) {
    if (ignoreFile === file.fsPath) {
      continue;
    }

    const fileStream = workspace.fs;

    const fileContent = await fileStream.readFile(file);
    let text = Buffer.from(fileContent).toString();

    await addImportStatementToFile({
      file,
      oldDirectoryPath: directoryPath,
      useImport,
      className,
    });

    if (!text.includes(useOldNamespace)) {
      continue;
    }

    text = text.replace(useOldNamespace, useNewNamespace);

    await fileStream.writeFile(file, Buffer.from(text));
  }

  await cleanupUnusedImportsAfterMove({ uri: newUri });
}
