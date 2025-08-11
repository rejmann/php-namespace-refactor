interface Props {
  fullNamespace: string
}

export function buildUseStatementString({ fullNamespace }: Props) {
  if (!fullNamespace || typeof fullNamespace !== 'string') {
    throw new Error('O parâmetro "fullNamespace" deve ser uma string válida.');
  }

  return `\nuse ${fullNamespace};`;
}
