import { PHP_CLASS_DECLARATION_REGEX } from '@domain/namespace/PhpPatterns';
import { injectable } from 'tsyringe';
import { Position, TextDocument } from 'vscode';

interface Props {
  document: TextDocument
  position: Position
}

export const NamespaceType = 'namespace';
export const ClassType = 'class';

type TypeRename = typeof NamespaceType | typeof ClassType;

@injectable()
export class RenameTypeDetector {
  public execute({ document, position }: Props): TypeRename {
    const text = document.getText();
    const lines = text.split('\n');
    const currentLine = lines[position.line] ?? '';

    if (currentLine.match(/^\s*namespace\s+/)) {
      return NamespaceType;
    }

    // Same declarations ExtractNameFromCursor reads the name from, enums included.
    if (PHP_CLASS_DECLARATION_REGEX.test(currentLine)) {
      return ClassType;
    }

    throw new Error('Type rename not identified');
  }
}
