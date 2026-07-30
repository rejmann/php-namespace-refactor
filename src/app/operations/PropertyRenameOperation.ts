import { ClassTypedPropertyLocator, PropertyMatch } from '@domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '@domain/property/ConstructorSpanFinder';
import { buildPropertyDeclarationPattern } from '@domain/property/PropertyDeclarationPattern';
import { PropertyNameResolver } from '@domain/property/PropertyNameResolver';
import { PropertyRenameConfigKeys } from '@domain/property/PropertyRenameConfigKeys';
import { ConfigurationLocator } from '@domain/workspace/ConfigurationLocator';
import { WorkspacePathResolver } from '@domain/workspace/WorkspacePathResolver';
import { FileEditApplier } from '@infra/vscode/FileEditApplier';
import { TextDocumentOpener } from '@infra/vscode/TextDocumentOpener';
import { inject, injectable } from 'tsyringe';
import { Range, TextDocument, Uri, WorkspaceEdit } from 'vscode';

interface Props {
  oldUri: Uri
  newUri: Uri
  affectedFiles: Uri[]
}

@injectable()
export class PropertyRenameOperation {
  constructor(
    @inject(WorkspacePathResolver) private workspacePathResolver: WorkspacePathResolver,
    @inject(TextDocumentOpener) private textDocumentOpener: TextDocumentOpener,
    @inject(FileEditApplier) private fileEditApplier: FileEditApplier,
    @inject(ConfigurationLocator) private configurationLocator: ConfigurationLocator,
    @inject(ClassTypedPropertyLocator) private classTypedPropertyLocator: ClassTypedPropertyLocator,
    @inject(PropertyNameResolver) private propertyNameResolver: PropertyNameResolver,
    @inject(ConstructorSpanFinder) private constructorSpanFinder: ConstructorSpanFinder,
  ) {}

  public async execute({ oldUri, newUri, affectedFiles }: Props): Promise<void> {
    const oldClassName = this.workspacePathResolver.extractClassNameFromPath(oldUri.fsPath);
    const newClassName = this.workspacePathResolver.extractClassNameFromPath(newUri.fsPath);

    if (!oldClassName || !newClassName || oldClassName === newClassName) {
      return;
    }

    const expectedOldName = this.propertyNameResolver.resolve(oldClassName);
    const expectedNewName = this.propertyNameResolver.resolve(newClassName);

    const renameMismatched = this.configurationLocator.get<boolean>({
      key: PropertyRenameConfigKeys.RENAME_MISMATCHED_NAMES,
      defaultValue: false,
    });

    const files = this.getCandidateFiles(newUri, affectedFiles);
    const edit = new WorkspaceEdit();

    await Promise.all(files.map(async (file) => {
      try {
        const { document, text } = await this.textDocumentOpener.execute({ uri: file });
        if (!text.includes(newClassName)) {
          return;
        }

        const match = this.classTypedPropertyLocator.execute({ text, className: newClassName });
        if (!match || match.propertyName === expectedNewName) {
          return;
        }

        const matchesOldConvention = match.propertyName === expectedOldName;
        if (!matchesOldConvention && !renameMismatched) {
          return;
        }

        this.addPropertyRenameEdits(edit, file, document, text, newClassName, match, expectedNewName);
      } catch (_) {
        return;
      }
    }));

    await this.fileEditApplier.apply(edit);
  }

  private addPropertyRenameEdits(
    edit: WorkspaceEdit,
    uri: Uri,
    document: TextDocument,
    text: string,
    className: string,
    match: PropertyMatch,
    newName: string,
  ): void {
    const oldName = match.propertyName;

    const variableSpans = this.buildVariableRenameSpans(text, className, match);
    for (const [start, end] of variableSpans) {
      this.replaceInRange(edit, uri, document, text, start, end, new RegExp(`\\$${oldName}\\b`, 'g'), `$${newName}`);
    }

    this.replaceInRange(
      edit, uri, document, text, 0, text.length,
      new RegExp(`\\$this->${oldName}\\b`, 'g'), `$this->${newName}`,
    );
  }

  private buildVariableRenameSpans(text: string, className: string, match: PropertyMatch): [number, number][] {
    const spans: [number, number][] = [];

    const constructorSpan = this.findConstructorSpan(text);
    if (constructorSpan) {
      spans.push(constructorSpan);
    }

    if (match.hasSeparateDeclaration) {
      const declarationSpan = this.findDeclarationSpan(text, className, match.propertyName);
      if (declarationSpan) {
        spans.push(declarationSpan);
      }
    }

    return spans;
  }

  private findConstructorSpan(text: string): [number, number] | null {
    const span = this.constructorSpanFinder.find(text);
    return span ? [span.constructorStart, span.bodyEnd] : null;
  }

  private findDeclarationSpan(text: string, className: string, propertyName: string): [number, number] | null {
    const match = buildPropertyDeclarationPattern(className, propertyName).exec(text);
    return match ? [match.index, match.index + match[0].length] : null;
  }

  /**
   * Only the files MultiFileReferenceUpdater already determined were
   * affected by this exact class rename (plus the renamed file itself) -
   * never a broader workspace scan, so a differently-namespaced class that
   * happens to share a short name is never touched.
   */
  private getCandidateFiles(newUri: Uri, affectedFiles: Uri[]): Uri[] {
    const files = [newUri, ...affectedFiles];
    const seen = new Set<string>();

    return files.filter((file) => {
      if (seen.has(file.fsPath)) {
        return false;
      }
      seen.add(file.fsPath);
      return true;
    });
  }

  private replaceInRange(
    edit: WorkspaceEdit,
    uri: Uri,
    document: TextDocument,
    text: string,
    rangeStart: number,
    rangeEnd: number,
    regex: RegExp,
    replacement: string,
  ): void {
    const scoped = text.slice(rangeStart, rangeEnd);

    for (const match of scoped.matchAll(regex)) {
      const start = rangeStart + (match.index as number);
      const end = start + match[0].length;
      edit.replace(uri, new Range(document.positionAt(start), document.positionAt(end)), replacement);
    }
  }
}
