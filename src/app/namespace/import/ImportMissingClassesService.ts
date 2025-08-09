import { Uri, WorkspaceEdit } from 'vscode';
import { ApplyUseStatementService } from '@domain/namespace/ApplyUseStatementService';
import { CreateUseStatementService } from '@domain/namespace/CreateUseStatementService';
import { DocumentReaderService } from '@app/workspace/DocumentReaderService';
import { FilePathUtils } from '@infra/utils/FilePathUtils';
import { injectable } from 'tsyringe';
import { readdirSync } from 'fs';
import { UseStatementAnalyzerService } from '@domain/namespace/UseStatementAnalyzerService';


interface Props {
  oldFileName: string
  newUri: Uri
}

@injectable()
export class ImportMissingClassesService {
  constructor(
    private readonly createUseStatementService: CreateUseStatementService,
    private readonly useStatementAnalyzerService: UseStatementAnalyzerService,
    private readonly documentReaderService: DocumentReaderService,
    private readonly applyUseStatementService: ApplyUseStatementService,
  ) {
  }

  public async execute({ oldFileName, newUri }: Props) {
    const directoryPath = FilePathUtils.extractDirectoryFromPath(oldFileName);

    const classes = this.getClassesNamesInDirectory(directoryPath);
    if (classes.length < 1) {
      return;
    }

    const { document, text } = await this.documentReaderService.execute({ uri: newUri });

    const classesUsed = this.findUnimportedClasses(text, classes);

    const imports = classesUsed
      .map((className) => this.createUseStatementService.execute({ className, directoryPath }))
      .join('');

    if (!imports || (directoryPath === FilePathUtils.extractDirectoryFromPath(newUri.fsPath))) {
      return;
    }

    const lastUseEndIndex = this.useStatementAnalyzerService.execute({ document });
    if (0 === lastUseEndIndex) {
      return;
    }

    const edit = new WorkspaceEdit();

    const total = imports.length;
    let row = 1;

    for (const use of imports) {
      this.applyUseStatementService.execute({
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

  public getClassesNamesInDirectory(directory: string): string[] {
    const files = readdirSync(directory);
    return files.filter(file => file.endsWith('.php'))
      .map(file => FilePathUtils.extractClassNameFromPath(file));
  }

  private findUnimportedClasses(
    text: string,
    classes: string[],
  ): string[] {
    const classesUsed: string[] = [];

    classes.forEach(className => {
      const regex = new RegExp(`\\b${className}\\b`, 'g');
      if (regex.test(text) && !classesUsed.includes(className)) {
        classesUsed.push(className);
      }
    });

    const existingImports: string[] = this.extractClassesExistingImports(text);

    return classesUsed.filter(className => !existingImports.includes(className));
  }

  private extractClassesExistingImports(text: string): string[] {
    const regex = /use\s+([a-zA-Z0-9\\]+)/g;
    const imports: string[] = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      imports.push(match[1]);
    }

    return imports.map(namespace => {
      const parts = namespace.split('\\');
      return parts[parts.length - 1];
    });
  }
}
