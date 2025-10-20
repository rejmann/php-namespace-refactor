import { Position, TextDocument } from 'vscode';
import { injectable } from 'tsyringe';
import { PHP_CLASS_DECLARATION_REGEX } from '@app/services/update/ClassNameUpdater';

interface Props {
  document: TextDocument
  position: Position
}

const NAMESPACE_REGEX = /^\s*namespace\s+([\w\\]+);/;

@injectable()
export class ExtractNameFromCursor {
  public async execute({ document, position }: Props): Promise<string|null> {
    const text = document.getText();
    const lines = text.split('\n');

    const currentLine = lines[position.line] ?? null;
    if (null === currentLine) {
      return null;
    }

    const namespaceMatch = currentLine.match(NAMESPACE_REGEX);
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
