import { injectable } from 'tsyringe';

const NAMESPACE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*(\\[A-Za-z_][A-Za-z0-9_]*)*$/;

@injectable()
export class RenameValidator {
  public validate(value: string): string | null {
    if (!value || value.trim() === '') {
      return 'Name cannot be empty';
    }

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
}
