import { inject, injectable } from 'tsyringe';

import { ConstructorSpanFinder } from './ConstructorSpanFinder';

const VISIBILITY = 'public|protected|private';

interface Props {
  text: string
  className: string
}

export interface PropertyMatch {
  propertyName: string
  isPromoted: boolean
  hasSeparateDeclaration: boolean
}

/**
 * Locates the single constructor property that represents an instance of
 * `className` in a PHP file's source text - promoted or not, readonly or
 * not. Returns null when there's no such property, or when more than one
 * parameter shares that type (renaming either would be a guess that risks
 * a variable-name collision).
 */
@injectable()
export class ClassTypedPropertyLocator {
  constructor(
    @inject(ConstructorSpanFinder) private constructorSpanFinder: ConstructorSpanFinder,
  ) {}

  public execute({ text, className }: Props): PropertyMatch | null {
    const span = this.constructorSpanFinder.find(text);
    if (!span) {
      return null;
    }

    const params = text.slice(span.paramsStart, span.paramsEnd);
    const body = text.slice(span.bodyStart, span.bodyEnd);

    const candidates = this.splitParams(params)
      .map(param => this.matchParam(param, body, text, className))
      .filter((match): match is PropertyMatch => match !== null);

    return candidates.length === 1 ? candidates[0] : null;
  }

  private hasPropertyDeclaration(text: string, className: string, varName: string): boolean {
    const pattern = new RegExp(
      `(?:${VISIBILITY})\\s+(?:readonly\\s+)?\\??\\b${className}\\b\\s+\\$${varName}\\s*;`,
    );
    return pattern.test(text);
  }

  private isAssignedToThis(constructorBody: string, varName: string): boolean {
    const pattern = new RegExp(`\\$this->${varName}\\s*=\\s*\\$${varName}\\s*;`);
    return pattern.test(constructorBody);
  }

  private matchParam(param: string, constructorBody: string, text: string, className: string): PropertyMatch | null {
    const cleanedParam = this.stripAttributes(param);

    const promotedName = this.matchPromoted(cleanedParam, className);
    if (promotedName) {
      return { propertyName: promotedName, isPromoted: true, hasSeparateDeclaration: false };
    }

    const plainName = this.matchPlain(cleanedParam, className);
    if (!plainName || !this.isAssignedToThis(constructorBody, plainName)) {
      return null;
    }

    return {
      propertyName: plainName,
      isPromoted: false,
      hasSeparateDeclaration: this.hasPropertyDeclaration(text, className, plainName),
    };
  }

  private matchPlain(cleanedParam: string, className: string): string | null {
    if (new RegExp(`\\b(?:${VISIBILITY}|readonly)\\b`).test(cleanedParam)) {
      return null;
    }

    const pattern = new RegExp(`\\??\\b${className}\\b\\s+\\$(\\w+)`);
    return pattern.exec(cleanedParam)?.[1] ?? null;
  }

  private matchPromoted(cleanedParam: string, className: string): string | null {
    const pattern = new RegExp(
      `(?:(?:${VISIBILITY})\\s+(?:readonly\\s+)?|readonly\\s+(?:${VISIBILITY})\\s+)\\??\\b${className}\\b\\s+\\$(\\w+)`,
    );
    return pattern.exec(cleanedParam)?.[1] ?? null;
  }

  private splitParams(params: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of params) {
      if (char === '(' || char === '[' || char === '{') {
        depth++;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
      }

      if (char === ',' && depth === 0) {
        result.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      result.push(current);
    }

    return result;
  }

  private stripAttributes(param: string): string {
    return param.replace(/#\[[^\]]*\]/g, ' ').trim();
  }
}
