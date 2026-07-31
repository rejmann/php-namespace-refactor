import { injectable } from 'tsyringe';

interface Props {
  declaredNamespace: string | null
  expectedNamespace?: string
}

@injectable()
export class NamespaceMismatchDetector {
  /**
   * Only flags a mismatch when both sides are known: a declared namespace
   * line must exist (no guessing where to insert one) and PSR-4 must resolve
   * an expected namespace for the file's path (otherwise there's nothing to
   * compare against, e.g. files outside any autoload/autoload-dev prefix).
   */
  public execute({ declaredNamespace, expectedNamespace }: Props): boolean {
    if (!expectedNamespace || declaredNamespace === null) {
      return false;
    }

    return declaredNamespace !== expectedNamespace;
  }
}
