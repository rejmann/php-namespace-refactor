import { injectable } from 'tsyringe';

import { NOT_FOLLOWED_BY_NAMESPACE_CHAR, NOT_PRECEDED_BY_NAMESPACE_CHAR } from './PhpPatterns';

interface Props {
  className: string,
}

@injectable()
export class ClassNameBoundaryRegexBuilder {
  public execute({ className }: Props): RegExp {
    return new RegExp(`${NOT_PRECEDED_BY_NAMESPACE_CHAR}${className}${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`, 'g');
  }
}
