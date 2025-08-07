import { Uri, WorkspaceEdit } from 'vscode';
import { ApplyUseStatementService } from '@domain/namespace/ApplyUseStatementService';
import { CreateNamespaceService } from '@domain/namespace/CreateNamespaceService';
import { CreateUseStatementService } from '@domain/namespace/CreateUseStatementService';
import { extractDirectoryFromPath } from '@infra/utils/filePathUtils';
import { findUnimportedClasses } from './findUnimportedClasses';
import { getClassesNamesInDirectory } from './getClassesNamesInDirectory';
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

  const classesUsed = findUnimportedClasses({
    text,
    classes,
  });

  const createUseStatementService = new CreateUseStatementService(
    new CreateNamespaceService()
  );

  const imports = classesUsed
    .map((className) => createUseStatementService.execute({ className, directoryPath }))
    .join('');

  if (!imports || (directoryPath === extractDirectoryFromPath(newUri.fsPath))) {
    return;
  }

  const useStatementAnalyzerService = new UseStatementAnalyzerService();
  const lastUseEndIndex = useStatementAnalyzerService.execute({ document });
  if (0 === lastUseEndIndex) {
    return;
  }

  const edit = new WorkspaceEdit();
  const applyUseStatementService = new ApplyUseStatementService();

  const total = imports.length;
  let row = 1;

  for (const use of imports) {
    applyUseStatementService.execute({
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
