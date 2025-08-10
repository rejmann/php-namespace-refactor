import { findLastUseEndIndex } from './findLastUseEndIndex';
import { findNamespaceEndIndex } from './findNamespaceEndIndex';
import { TextDocument } from 'vscode';

interface Props {
  document: TextDocument
}

export function findUseInsertionIndex({
  document,
}: Props): number {
  const lastUseEndIndex = findLastUseEndIndex({ document });

  if (lastUseEndIndex > 0) {
    return lastUseEndIndex;
  }

  return findNamespaceEndIndex({ document });
}
