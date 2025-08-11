import { Range, TextDocument, workspace, WorkspaceEdit } from 'vscode';

interface Props {
  document: TextDocument
  fileNames: string[]
}

export async function removeSpecificImportStatements({
  document,
  fileNames,
}: Props) {
  const text = document.getText();

  const edit = new WorkspaceEdit();
  let isEdit = false;

  const importLines = text.split('\n').filter(line => line.startsWith('use '));
  for (const line of importLines) {
    const parts = line.split(' ');
    if (parts.length < 2) {
      continue;
    }

    const importedClass = parts[1].replace(';', '').split('\\').pop() || '';
    if (!fileNames.includes(importedClass)) {
      continue;
    }

    isEdit = true;

    const lineIndex = text.indexOf(line);
    edit.delete(document.uri, new Range(
      document.positionAt(lineIndex),
      document.positionAt((lineIndex + line.length) + 1)
    ));
  }

  if (false === isEdit) {
    return;
  }

  await workspace.applyEdit(edit);
}
