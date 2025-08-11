import { Uri, WorkspaceEdit } from 'vscode';
import { addUseStatementToDocument } from '@domain/namespace/import/addUseStatementToDocument';
import { findBestPositionForUseStatement } from '@domain/namespace/findBestPositionForUseStatement';
import { getDirectoryPathFromFilePath } from '@infra/utils/filePathUtils';
import { openAndReadTextDocument } from '../openAndReadTextDocument';

interface Props {
  file: Uri
  oldDirectoryPath: string
  useImport: string
  className: string
}

export async function addImportStatementToFile({
  file,
  oldDirectoryPath,
  useImport,
  className,
}: Props) {
  const currentDir = getDirectoryPathFromFilePath(file.fsPath);
  if (oldDirectoryPath !== currentDir) {
    return;
  }

  const { document, text } = await openAndReadTextDocument({ uri: file });

  if (!text.includes(className)) {
    return;
  }

  const insertionIndex = findBestPositionForUseStatement({ document });
  if (insertionIndex === 0) {
    return;
  }

  const edit = new WorkspaceEdit();

  await addUseStatementToDocument({
    document,
    workspaceEdit: edit,
    uri: file,
    lastUseEndIndex: insertionIndex,
    useNamespace: useImport,
    flush: true,
  });
}
