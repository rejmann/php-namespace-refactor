import { NAMESPACE_DECLARATION_REGEX, PHP_CLASS_DECLARATION_REGEX } from '@domain/namespace/PhpPatterns';
import { injectable } from 'tsyringe';
import { Position, TextDocument } from 'vscode';

interface Props {
  document: TextDocument
  position: Position
}

@injectable()
export class ExtractNameFromCursor {
  public async execute({ document, position }: Props): Promise<string|null> {
    const text = document.getText();
    const lines = text.split('\n');

    const currentLine = lines[position.line] ?? null;
    if (null === currentLine) {
      return null;
    }

    const namespaceMatch = currentLine.match(NAMESPACE_DECLARATION_REGEX);
    if (namespaceMatch) {
      return namespaceMatch[1] ?? null;
    }

    const classMatch = currentLine.match(PHP_CLASS_DECLARATION_REGEX);
    if (classMatch) {
      return classMatch[1] ?? null;
    }

    return null;
  }
}
