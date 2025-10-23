import { ClassType, RenameTypeDetector } from './RenameTypeDetector';
import { inject, injectable } from 'tsyringe';
import { Position, TextDocument } from 'vscode';

const NAMESPACE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*(\\[A-Za-z_][A-Za-z0-9_]*)*$/;
const CLASS_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface Props {
  value: string
  document: TextDocument
  position: Position
}

@injectable()
export class RenameValidator {
  constructor(
    @inject(RenameTypeDetector) private renameTypeDetector: RenameTypeDetector,
  ) {}

  public validate({ value, document, position }: Props): string | null {
    if (!value || value.trim() === '') {
      return 'Name cannot be empty';
    }

    if (this.isClassType(document, position)) {
      return this.validateClassName(value);
    }

    return this.validateNamespace(value);
  }

  private validateClassName(value: string): string | null {
    if (/^[0-9]/.test(value)) {
      return 'Class name cannot start with a number';
    }

    if (value.includes('-')) {
      return 'Class name cannot contain hyphens (-)';
    }

    if (/\s/.test(value)) {
      return 'Class name cannot contain spaces';
    }

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
      return 'Class name must start with a letter or underscore';
    }

    if (!CLASS_NAME_REGEX.test(value)) {
      return 'Invalid class name format';
    }

    return null;
  }

  private validateNamespace(value: string): string | null {
    if (value.startsWith('\\')) {
      return 'Cannot start with \\';
    }

    if (value.endsWith('\\')) {
      return 'Cannot end with \\';
    }

    if (value.includes('\\\\')) {
      return 'Cannot contain double \\\\';
    }

    if (!/^[A-Za-z]/.test(value)) {
      return 'Must start with a letter';
    }

    if (!NAMESPACE_REGEX.test(value)) {
      return 'Invalid format. Use: Foo\\Bar';
    }

    return null;
  }

  private isClassType(document: TextDocument, position: Position): boolean {
    return ClassType === this.renameTypeDetector.execute({ document, position });
  }
}
