import { TextDocument } from 'vscode';

interface Props {
  document: TextDocument
}

const REGEX = /^use\s+[^\n]+;/gm;

export function findEndOfLastUseStatement({
  document,
}: Props): number {
  const text = document.getText();

  const useMatches = [...text.matchAll(REGEX)];

  const lastUseMatch = useMatches[useMatches.length - 1];

  if (!lastUseMatch) {
    return 0;
  }

  return lastUseMatch.index + lastUseMatch[0].length;
}
