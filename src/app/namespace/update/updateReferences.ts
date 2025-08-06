import { CreateNamespaceService } from './../../../domain/namespace/CreateNamespaceService';
import { updateInCurrentFile } from './updateInCurrentFile';
import { updateReferencesInFiles } from './updateReferencesInFiles';
import { Uri } from 'vscode';

interface Props {
  newUri: Uri,
  oldUri: Uri,
}

export async function updateReferences({
  newUri,
  oldUri,
}: Props) {
  const createNamespaceService = new CreateNamespaceService();

  const {
    namespace: newNamespace,
    fullNamespace: useNewNamespace,
  } = createNamespaceService.execute({
    uri: newUri.fsPath,
  });

  if (!newNamespace) {
    return;
  }

  const { fullNamespace: useOldNamespace } = createNamespaceService.execute({
    uri: oldUri.fsPath,
  });

  const updated = await updateInCurrentFile({
    newNamespace,
    newUri,
  });

  if (!updated) {
    return;
  }

  await updateReferencesInFiles({
    useOldNamespace,
    useNewNamespace,
    newUri,
    oldUri,
  });
}
