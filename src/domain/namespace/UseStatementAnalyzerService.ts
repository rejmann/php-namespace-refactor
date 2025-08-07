import { TextDocument } from 'vscode';

interface Props {
  document: TextDocument;
}

export class UseStatementAnalyzerService {
  private static readonly USE_STATEMENT_REGEX = /^use\s+[^\n]+;/gm;

  public execute({ document }: Props) {
    const useMatches = [
      ...document
        .getText()
        .matchAll(UseStatementAnalyzerService.USE_STATEMENT_REGEX)
    ];

    const lastUseMatch = useMatches[useMatches.length - 1];

    return !lastUseMatch
      ? 0
      : lastUseMatch.index + lastUseMatch[0].length;
  }
}
