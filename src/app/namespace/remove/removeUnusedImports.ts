import { RelativePattern, Uri, workspace } from 'vscode';
import { ConfigKeys } from '@infra/workspace/configTypes';
import { CreateNamespaceService } from '@domain/namespace/CreateNamespaceService';
import { FilePathUtils } from './../../../infra/utils/FilePathUtils';
import { isConfigEnabled } from '@infra/workspace/vscodeConfig';
import { openTextDocument } from '../openTextDocument';
import { removeImports } from './removeImports';

interface Props {
  uri: Uri
}

export async function removeUnusedImports({ uri }: Props) {
  if (!isConfigEnabled({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS })) {
    return;
  }

  const createNamespaceService = new CreateNamespaceService();

  const { className } = createNamespaceService.execute({
    uri: uri.fsPath,
  });

  const directoryPath = FilePathUtils.extractDirectoryFromPath(uri.fsPath);

  const pattern = new RelativePattern(Uri.parse(`file://${directoryPath}`), '*.php');
  const phpFiles: Uri[] = await workspace.findFiles(pattern);

  const fileNames: string[] = phpFiles.map(uri => FilePathUtils.extractClassNameFromPath(uri.fsPath))
    .filter(Boolean)
    .filter(name => name !== className);

  if (!fileNames.length) {
    return;
  }

  for (const file of [uri, ...phpFiles]) {
    const { document } = await openTextDocument({ uri: file });

    await removeImports({
      document,
      fileNames: file === uri ? fileNames : [className],
    });
  }
}
