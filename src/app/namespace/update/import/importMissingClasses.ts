import { Uri, workspace, WorkspaceEdit } from 'vscode';
import { extractDirectoryFromPath } from '@infra/utils/filePathUtils';
import { findUnimportedClasses } from './findUnimportedClasses';
import { findUseInsertionIndex } from '@domain/namespace/findUseInsertionIndex';
import { generateUseStatementsForClasses } from '@domain/namespace/generateUseStatementsForClasses';
import { getClassesNamesInDirectory } from './getClassesNamesInDirectory';
import { insertUseStatement } from '@domain/namespace/import/insertUseStatement';
import { openTextDocument } from '@app/namespace/openTextDocument';

interface Props {
  oldFileName: string
  newUri: Uri
}

export async function importMissingClasses({
  oldFileName,
  newUri,
}: Props) {
  const directoryPath = extractDirectoryFromPath(oldFileName);
  const classes: string[] = await getClassesNamesInDirectory({
    directory: directoryPath,
  });

  if (classes.length < 1) {
    return;
  }

  try {
    const { document, text } = await openTextDocument({ uri: newUri });

    const imports = await generateUseStatementsForClasses({
      classesUsed: findUnimportedClasses({
        text,
        classes,
      }),
      directoryPath,
    });

    if (!imports || (directoryPath === extractDirectoryFromPath(newUri.fsPath))) {
      return;
    }

    const insertionIndex = findUseInsertionIndex({ document });
    if (insertionIndex === 0) {
      return;
    }

    const edit = new WorkspaceEdit();

    for (const use of imports) {
      await insertUseStatement({
        document,
        workspaceEdit: edit,
        uri: newUri,
        lastUseEndIndex: insertionIndex,
        useNamespace: use,
        flush: false,
      });
    }

    if (imports.length > 0) {
      await workspace.applyEdit(edit);
    }
  } catch (_) {
    return;
  }
}
