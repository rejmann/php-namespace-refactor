import { Uri, workspace } from 'vscode';
import { ApplyUseStatementService } from '@domain/namespace/ApplyUseStatementService';
import { CreateUseStatementService } from '@domain/namespace/CreateUseStatementService';
import { DocumentReaderService } from '@app/file/DocumentReaderService';
import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { injectable } from 'tsyringe';
import { RemoveUnusedImportsService } from './../remove/RemoveUnusedImportsService';
import { UseStatementAnalyzerService } from '@domain/namespace/UseStatementAnalyzerService';
import { WorkspaceFileSearcherService } from '@app/workespace/WorkspaceFileSearcherService';

interface Props {
  useOldNamespace: string
  useNewNamespace: string
  newUri: Uri
  oldUri: Uri
}

interface UpdateUseStatementForMovedClassProps {
  file: Uri
  oldDirectoryPath: string
  useImport: string
  className: string
}

@injectable()
export class UpdateAllUseStatementForMovedClassService {
  constructor(
    private readonly createUseStatementService: CreateUseStatementService,
    private readonly workspaceFileSearcherService: WorkspaceFileSearcherService,
    private readonly useStatementAnalyzerService: UseStatementAnalyzerService,
    private readonly applyUseStatementService: ApplyUseStatementService,
    private readonly temoveUnusedImportsService: RemoveUnusedImportsService,
    private readonly documentReaderService: DocumentReaderService,
  ) {
  }

  public async execute({
    useOldNamespace,
    useNewNamespace,
    newUri,
    oldUri,
  }: Props) {
    const directoryPath = FilePathUtils.extractDirectoryFromPath(oldUri.fsPath);
    const className = FilePathUtils.extractClassNameFromPath(oldUri.fsPath);

    const useImport = this.createUseStatementService.execute({
      className: FilePathUtils.extractClassNameFromPath(newUri.fsPath),
      directoryPath: FilePathUtils.extractDirectoryFromPath(newUri.fsPath),
    });

    const ignoreFile = newUri.fsPath;

    const files = await this.workspaceFileSearcherService.execute();

    for (const file of files) {
      if (ignoreFile === file.fsPath) {
        continue;
      }

      const fileStream = workspace.fs;

      const fileContent = await fileStream.readFile(file);
      let text = Buffer.from(fileContent).toString();

      await this.updateUseStatementForMovedClass({
        file,
        oldDirectoryPath: directoryPath,
        useImport,
        className,
      });

      if (!text.includes(useOldNamespace)) {
        continue;
      }

      text = text.replace(useOldNamespace, useNewNamespace);

      await fileStream.writeFile(file, Buffer.from(text));
    }

    await this.temoveUnusedImportsService.execute({ uri: newUri });
  }

  private async updateUseStatementForMovedClass({
    file,
    oldDirectoryPath,
    useImport,
    className,
  }: UpdateUseStatementForMovedClassProps) {
    const currentDir = FilePathUtils.extractDirectoryFromPath(file.fsPath);

    if (oldDirectoryPath !== currentDir) {
      return;
    }

    const { document, text } = await this.documentReaderService.execute({ uri: file });

    if (!text.includes(className)) {
      return;
    }

    const lastUseEndIndex = this.useStatementAnalyzerService.execute({ document });

    this.applyUseStatementService.execute({
      document,
      uri: file,
      lastUseEndIndex,
      useNamespace: useImport,
      flush: true,
    });
  }
}
