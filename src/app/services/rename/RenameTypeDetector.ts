import { Position, TextDocument } from 'vscode';
import { injectable } from 'tsyringe';

interface Props {
  document: TextDocument
  position: Position
}

type TypeRename = 'namespace' | 'class';

@injectable()
export class RenameTypeDetector {
  public execute({ document, position }: Props): TypeRename {
    const text = document.getText();
    const lines = text.split('\n');
    const currentLine = lines[position.line] ?? '';

    if (currentLine.match(/^\s*namespace\s+/)) {
      return 'namespace';
    }

    if (currentLine.match(/^\s*(?:abstract\s+)?(?:final\s+)?(?:class|interface|trait)\s+/)) {
      return 'class';
    }

    throw new Error('Type rename not identified');
  }
}
