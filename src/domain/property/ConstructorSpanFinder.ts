import { injectable } from 'tsyringe';

export interface ConstructorSpan {
  constructorStart: number
  paramsStart: number
  paramsEnd: number
  bodyStart: number
  bodyEnd: number
}

@injectable()
export class ConstructorSpanFinder {
  public find(text: string): ConstructorSpan | null {
    const signatureMatch = /function\s+__construct\s*\(/.exec(text);
    if (!signatureMatch) {
      return null;
    }

    const paramsStart = signatureMatch.index + signatureMatch[0].length;
    const paramsEnd = this.findMatching(text, paramsStart - 1, '(', ')');
    if (paramsEnd === -1) {
      return null;
    }

    const bodyStart = text.indexOf('{', paramsEnd);
    if (bodyStart === -1) {
      return {
        constructorStart: signatureMatch.index,
        paramsStart,
        paramsEnd,
        bodyStart: paramsEnd + 1,
        bodyEnd: paramsEnd + 1,
      };
    }

    const bodyEnd = this.findMatching(text, bodyStart, '{', '}');

    return {
      constructorStart: signatureMatch.index,
      paramsStart,
      paramsEnd,
      bodyStart,
      bodyEnd: bodyEnd === -1 ? text.length : bodyEnd + 1,
    };
  }

  public findMatching(text: string, openIndex: number, open: string, close: string): number {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
      if (text[i] === open) {
        depth++;
      } else if (text[i] === close) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }
}
