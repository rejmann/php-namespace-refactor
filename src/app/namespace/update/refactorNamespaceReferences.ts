import { buildNamespaceFromFilePath } from '@domain/namespace/buildNamespaceFromFilePath';
import { updateNamespaceInMovedFile } from './updateNamespaceInMovedFile';
import { updateNamespaceReferencesInAllFiles } from './updateNamespaceReferencesInAllFiles';
import { Uri } from 'vscode';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

export async function refactorNamespaceReferences({
  newUri,
  oldUri,
}: Props) {
  const {
    namespace: newNamespace,
    fullNamespace: useNewNamespace,
  } = await buildNamespaceFromFilePath({
    uri: newUri.fsPath,
  });

  if (!newNamespace) {
    return;
  }

  const { fullNamespace: useOldNamespace } = await buildNamespaceFromFilePath({
    uri: oldUri.fsPath,
  });

  const updated = await updateNamespaceInMovedFile({
    newNamespace,
    newUri,
  });

  if (!updated) {
    return;
  }

  await updateNamespaceReferencesInAllFiles({
    useOldNamespace,
    useNewNamespace,
    newUri,
    oldUri,
  });
}
