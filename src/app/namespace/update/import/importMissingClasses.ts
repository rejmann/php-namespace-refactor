import { Uri, WorkspaceEdit } from 'vscode';
import { extractDirectoryFromPath } from '@infra/utils/filePathUtils';
import { findUnimportedClasses } from './findUnimportedClasses';
import { generateUseStatementsForClasses } from '@domain/namespace/generateUseStatementsForClasses';
import { getClassesNamesInDirectory } from './getClassesNamesInDirectory';
import { insertUseStatement } from '@domain/namespace/import/insertUseStatement';
import { openTextDocument } from '@app/namespace/openTextDocument';
import { UseStatementAnalyzerService } from '@domain/namespace/UseStatementAnalyzerService';

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

  const useStatementAnalyzerService = new UseStatementAnalyzerService();
  const lastUseEndIndex = useStatementAnalyzerService.execute({ document });
  if (0 === lastUseEndIndex) {
    return;
  }

  const edit = new WorkspaceEdit();

  const total = imports.length;
  let row = 1;

  for (const use of imports) {
    await insertUseStatement({
      document,
      workspaceEdit: edit,
      uri: newUri,
      lastUseEndIndex,
      useNamespace: use,
      flush: total === row,
    });

    row++;
  }
}
