import { RelativePattern, Uri, workspace } from 'vscode';

import { buildNamespaceFromFilePath } from '@domain/namespace/buildNamespaceFromFilePath';
import { ConfigKeys } from '@infra/workspace/configTypes';
import { getClassNameFromFilePath } from '@infra/utils/filePathUtils';
import { getDirectoryPathFromFilePath } from '@infra/utils/filePathUtils';
import { isFeatureEnabled } from '@infra/workspace/vscodeConfig';

import { openAndReadTextDocument } from '../openAndReadTextDocument';
import { removeSpecificImportStatements } from './removeSpecificImportStatements';

interface Props {
  uri: Uri
}

export async function cleanupUnusedImportsAfterMove({ uri }: Props) {
  if (!isFeatureEnabled({ key: ConfigKeys.REMOVE_UNUSED_IMPORTS })) {
    return;
  }

  const { className } = await buildNamespaceFromFilePath({
    uri: uri.fsPath,
  });

  const directoryPath = getDirectoryPathFromFilePath(uri.fsPath);

  const pattern = new RelativePattern(Uri.parse(`file://${directoryPath}`), '*.php');
  const phpFiles: Uri[] = await workspace.findFiles(pattern);

  const fileNames: string[] = phpFiles.map(uri => getClassNameFromFilePath(uri.fsPath))
    .filter(Boolean)
    .filter(name => name !== className);

  if (!fileNames.length) {
    return;
  }

  for (const file of [uri, ...phpFiles]) {
    const { document } = await openAndReadTextDocument({ uri: file });

    await removeSpecificImportStatements({
      document,
      fileNames: file === uri ? fileNames : [className],
    });
  }
}
