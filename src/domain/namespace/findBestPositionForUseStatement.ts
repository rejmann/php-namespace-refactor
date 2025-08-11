import { findEndOfLastUseStatement } from './findEndOfLastUseStatement';
import { findEndOfNamespaceDeclaration } from './findEndOfNamespaceDeclaration';
import { TextDocument } from 'vscode';

interface Props {
  document: TextDocument
}

export function findBestPositionForUseStatement({
  document,
}: Props): number {
  const lastUseEndIndex = findEndOfLastUseStatement({ document });

  if (lastUseEndIndex > 0) {
    return lastUseEndIndex;
  }

  return findEndOfNamespaceDeclaration({ document });
}
