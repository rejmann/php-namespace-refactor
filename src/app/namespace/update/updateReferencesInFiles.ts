import { extractClassNameFromPath, extractDirectoryFromPath } from '@infra/utils/filePathUtils';
import { Uri, workspace } from 'vscode';
import { findPhpFilesInWorkspace } from '../../workespace/findPhpFilesInWorkspace';
import { generateUseStatement } from '@domain/namespace/generateUseStatement';
import { removeUnusedImports } from '../remove/removeUnusedImports';
import { updateInFile } from './updateInFile';

interface Props {
  useOldNamespace: string
  useNewNamespace: string
  newUri: Uri
  oldUri: Uri
}

export async function updateReferencesInFiles({
  useOldNamespace,
  useNewNamespace,
  newUri,
  oldUri,
}: Props) {
  const directoryPath = extractDirectoryFromPath(oldUri.fsPath);
  const className = extractClassNameFromPath(oldUri.fsPath);

  const useImport = generateUseStatement({ fullNamespace: useNewNamespace });

  const ignoreFile = newUri.fsPath;

  const files = await findPhpFilesInWorkspace();

  const filesToProcess = files.filter(file => ignoreFile !== file.fsPath);

  for (const file of filesToProcess) {
    const fileStream = workspace.fs;

    const fileContent = await fileStream.readFile(file);
    let text = Buffer.from(fileContent).toString();

    if (!text.includes(useOldNamespace)) {
      await updateInFile({
        file,
        oldDirectoryPath: directoryPath,
        useImport,
        className,
      });
      continue;
    }

    text = text.replace(useOldNamespace, useNewNamespace);
    await fileStream.writeFile(file, Buffer.from(text));

    await updateInFile({
      file,
      oldDirectoryPath: directoryPath,
      useImport,
      className,
    });
  }

  await removeUnusedImports({ uri: newUri });
}
