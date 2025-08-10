import { TextDocument } from 'vscode';

interface Props {
  document: TextDocument
}

export function findNamespaceEndIndex({
  document,
}: Props): number {
  const text = document.getText();

  const namespaceRegex = /^\s*namespace\s+[\w\\]+;/m;
  const match = text.match(namespaceRegex);

  if (!match) {
    return 0;
  }

  return match.index! + match[0].length;
}
