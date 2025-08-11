import { Uri, WorkspaceEdit } from 'vscode';
import { addUseStatementToDocument } from '@domain/namespace/import/addUseStatementToDocument';
import { buildUseStatementsForClassList } from '@domain/namespace/buildUseStatementsForClassList';
import { findBestPositionForUseStatement } from '@domain/namespace/findBestPositionForUseStatement';
import { findClassesUsedButNotImported } from './findClassesUsedButNotImported';
import { getDirectoryPathFromFilePath } from '@infra/utils/filePathUtils';
import { getPhpClassNamesFromDirectory } from './getPhpClassNamesFromDirectory';
import { openAndReadTextDocument } from '@app/namespace/openAndReadTextDocument';

interface Props {
  oldFileName: string
  newUri: Uri
}

export async function autoImportClassesFromOldDirectory({
  oldFileName,
  newUri,
}: Props) {
  const directoryPath = getDirectoryPathFromFilePath(oldFileName);
  const classes: string[] = await getPhpClassNamesFromDirectory({
    directory: directoryPath,
  });

  if (classes.length < 1) {
    return;
  }

  const { document, text } = await openAndReadTextDocument({ uri: newUri });

  const imports = await buildUseStatementsForClassList({
    classesUsed: findClassesUsedButNotImported({
      text,
      classes,
    }),
    directoryPath,
  });

  if (!imports || (directoryPath === getDirectoryPathFromFilePath(newUri.fsPath))) {
    return;
  }

  const insertionIndex = findBestPositionForUseStatement({ document });
  if (insertionIndex === 0) {
    return;
  }

  const edit = new WorkspaceEdit();

  const total = imports.length;
  let row = 1;

  for (const use of imports) {
    await addUseStatementToDocument({
      document,
      workspaceEdit: edit,
      uri: newUri,
      lastUseEndIndex: insertionIndex,
      useNamespace: use,
      flush: total === row,
    });

    row++;
  }
}
