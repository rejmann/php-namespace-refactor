import { PhpFilePathResolver } from '@domain/path/PhpFilePathResolver';
import { ClassTypedPropertyLocator, PropertyMatch } from '@domain/property/ClassTypedPropertyLocator';
import { ConstructorSpanFinder } from '@domain/property/ConstructorSpanFinder';
import { buildPropertyDeclarationPattern } from '@domain/property/PropertyDeclarationPattern';
import { PropertyNameResolver } from '@domain/property/PropertyNameResolver';
import { inject, injectable } from 'tsyringe';
import { Range, TextDocument, Uri, WorkspaceEdit } from 'vscode';

export interface PropertyRenameNames {
  oldClassName: string
  newClassName: string
  expectedOldName: string
  expectedNewName: string
}

@injectable()
export class PropertyRenamePlanner {
  constructor(
    @inject(PhpFilePathResolver) private phpFilePathResolver: PhpFilePathResolver,
    @inject(ClassTypedPropertyLocator) private classTypedPropertyLocator: ClassTypedPropertyLocator,
    @inject(PropertyNameResolver) private propertyNameResolver: PropertyNameResolver,
    @inject(ConstructorSpanFinder) private constructorSpanFinder: ConstructorSpanFinder,
  ) {}

  public collectEdits(
    edit: WorkspaceEdit,
    uri: Uri,
    document: TextDocument,
    text: string,
    names: PropertyRenameNames,
    renameMismatchedNames: boolean,
  ): void {
    const { oldClassName, newClassName, expectedOldName, expectedNewName } = names;

    // The property's declared type still reads as whichever class name is
    // actually present in this text: the new one when called after that
    // rename has already landed in the document, or still the old one when
    // called from ReferenceRewriter's per-file loop, where the class-name
    // replacement has only been queued into the shared edit, not yet
    // applied to the buffer.
    const searchClassName = text.includes(newClassName) ? newClassName : oldClassName;
    if (!text.includes(searchClassName)) {
      return;
    }

    const match = this.classTypedPropertyLocator.execute({ text, className: searchClassName });
    if (!match || match.propertyName === expectedNewName) {
      return;
    }

    const matchesOldConvention = match.propertyName === expectedOldName;
    if (!matchesOldConvention && !renameMismatchedNames) {
      return;
    }

    this.addPropertyRenameEdits(edit, uri, document, text, searchClassName, match, expectedNewName);
  }

  /**
   * Resolves the old/new property-name convention for a class rename, so a
   * caller that already has a file's document open (e.g. ReferenceRewriter,
   * mid class-rename) can fold property renaming into that same pass and
   * WorkspaceEdit instead of re-opening every affected file in a second,
   * later one.
   */
  public resolveNames(oldUri: Uri, newUri: Uri): PropertyRenameNames | null {
    const oldClassName = this.phpFilePathResolver.extractClassNameFromPath(oldUri.fsPath);
    const newClassName = this.phpFilePathResolver.extractClassNameFromPath(newUri.fsPath);

    if (!oldClassName || !newClassName || oldClassName === newClassName) {
      return null;
    }

    return {
      oldClassName,
      newClassName,
      expectedOldName: this.propertyNameResolver.resolve(oldClassName),
      expectedNewName: this.propertyNameResolver.resolve(newClassName),
    };
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
