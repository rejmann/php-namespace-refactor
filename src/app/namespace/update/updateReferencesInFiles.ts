import { Uri, workspace } from 'vscode';
import { CreateNamespaceService } from '@domain/namespace/CreateNamespaceService';
import { CreateUseStatementService } from '@domain/namespace/CreateUseStatementService';
import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { removeUnusedImports } from '../remove/removeUnusedImports';
import { updateInFile } from './updateInFile';
import { WorkspaceFileSearcherService } from '@app/workespace/WorkspaceFileSearcherService';

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
  const directoryPath = FilePathUtils.extractDirectoryFromPath(oldUri.fsPath);
  const className = FilePathUtils.extractClassNameFromPath(oldUri.fsPath);

  const createUseStatementService = new CreateUseStatementService(
    new CreateNamespaceService()
  );

  const useImport = createUseStatementService.execute({
    className: FilePathUtils.extractClassNameFromPath(newUri.fsPath),
    directoryPath: FilePathUtils.extractDirectoryFromPath(newUri.fsPath),
  });

  const ignoreFile = newUri.fsPath;

  const files = await new WorkspaceFileSearcherService().execute();

  for (const file of files) {
    if (ignoreFile === file.fsPath) {
      continue;
    }

    const fileStream = workspace.fs;

    const fileContent = await fileStream.readFile(file);
    let text = Buffer.from(fileContent).toString();

    await updateInFile({
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

  await removeUnusedImports({ uri: newUri });
}
