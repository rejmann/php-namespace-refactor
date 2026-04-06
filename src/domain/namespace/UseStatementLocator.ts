import { injectable } from 'tsyringe';
import { TextDocument } from 'vscode';

interface Props {
  document: TextDocument
}

export interface UseStatementLocation {
  index: number
  isFirstUse: boolean
}

@injectable()
export class UseStatementLocator {
  public execute({ document }: Props): UseStatementLocation {
    const text = document.getText();
    const lastUseEndIndex = this.findLastUseEndIndex(text);

    if (lastUseEndIndex > 0) {
      return { index: lastUseEndIndex, isFirstUse: false };
    }

    return { index: this.findNamespaceEndIndex(text), isFirstUse: true };
  }

  private findLastUseEndIndex(contentDocument: string): number {
    const useMatches = [...contentDocument.matchAll(/^use\s+[^\n]+;/gm)];

    const lastUseMatch = useMatches[useMatches.length - 1];

    if (!lastUseMatch) {
      return 0;
    }

    return lastUseMatch.index + lastUseMatch[0].length;
  }

  private findNamespaceEndIndex(contentDocument: string): number {
    const match = contentDocument.match(/^\s*namespace\s+[\w\\]+;/m);
    if (!match) {
      return 0;
    }

    return match.index! + match[0].length;
  }
}
