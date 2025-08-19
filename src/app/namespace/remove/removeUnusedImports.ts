import { extractClassNameFromPath, extractDirectoryFromPath } from '@infra/utils/filePathUtils';
import { RelativePattern, Uri, workspace } from 'vscode';
import { ConfigKeys } from '@infra/workspace/configTypes';
import { generateNamespace } from '@domain/namespace/generateNamespace';
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

  const { className } = await generateNamespace({
    uri: uri.fsPath,
  });

  const directoryPath = extractDirectoryFromPath(uri.fsPath);

  const pattern = new RelativePattern(Uri.parse(`file://${directoryPath}`), '*.php');
  const phpFiles = await workspace.findFiles(pattern);

  const fileNames = phpFiles.map(uri => extractClassNameFromPath(uri.fsPath))
    .filter(Boolean)
    .filter(name => name !== className);

  if (!fileNames.length) {
    return;
  }

  const { document } = await openTextDocument({ uri });
  await removeImports({
    document,
    fileNames,
  });

  for (const file of phpFiles) {
    if (file.fsPath === uri.fsPath) {
      continue;
    }

    const { document } = await openTextDocument({ uri: file });
    await removeImports({
      document,
      fileNames: [className],
    });
  }
}
