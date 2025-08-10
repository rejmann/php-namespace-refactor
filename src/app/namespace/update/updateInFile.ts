import { Uri, WorkspaceEdit } from 'vscode';
import { extractDirectoryFromPath } from '@infra/utils/filePathUtils';
import { findLastUseEndIndex } from '@domain/namespace/findLastUseEndIndex';
import { findNamespaceEndIndex } from '@domain/namespace/findNamespaceEndIndex';
import { insertUseStatement } from '@domain/namespace/import/insertUseStatement';
import { openTextDocument } from '../openTextDocument';

interface Props {
  file: Uri
  oldDirectoryPath: string
  useImport: string
  className: string
}

export async function updateInFile({
  file,
  oldDirectoryPath,
  useImport,
  className,
}: Props) {
  const currentDir = extractDirectoryFromPath(file.fsPath);
  if (oldDirectoryPath !== currentDir) {
    return;
  }

  const { document, text } = await openTextDocument({ uri: file });

  if (!text.includes(className)) {
    return;
  }

  const lastUseEndIndex = findLastUseEndIndex({ document });

  // Se não há use statements existentes, insere após o namespace
  let insertionIndex = lastUseEndIndex;
  if (insertionIndex === 0) {
    insertionIndex = findNamespaceEndIndex({ document });
    if (insertionIndex === 0) {
      return; // Não há namespace, não podemos inserir use statements
    }
  }

  const edit = new WorkspaceEdit();

  await insertUseStatement({
    document,
    workspaceEdit: edit,
    uri: file,
    lastUseEndIndex: insertionIndex,
    useNamespace: useImport,
    flush: true,
  });
}
