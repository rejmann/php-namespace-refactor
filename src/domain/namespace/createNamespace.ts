interface Props {
  namespace?: string
  className: string
}

export interface Namespace {
  namespace?: string
  className: string
  fullNamespace: string
}

export function createNamespaceObject({
  namespace,
  className,
}: Props): Namespace {
  return {
    namespace,
    className,
    fullNamespace: namespace ? `${namespace}\\${className}` : className,
  };
}
