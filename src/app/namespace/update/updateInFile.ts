import { ApplyUseStatementService } from '@domain/namespace/ApplyUseStatementService';
import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { openTextDocument } from '../openTextDocument';
import { Uri } from 'vscode';
import { UseStatementAnalyzerService } from '@domain/namespace/UseStatementAnalyzerService';

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
  const currentDir = FilePathUtils.extractDirectoryFromPath(file.fsPath);
  if (oldDirectoryPath !== currentDir) {
    return;
  }

  const { document, text } = await openTextDocument({ uri: file });

  if (!text.includes(className)) {
    return;
  }

  const useStatementAnalyzerService = new UseStatementAnalyzerService();
  const lastUseEndIndex = useStatementAnalyzerService.execute({ document });

  const applyUseStatementService = new ApplyUseStatementService();
  applyUseStatementService.execute({
    document,
    uri: file,
    lastUseEndIndex,
    useNamespace: useImport,
    flush: true,
  });
}
