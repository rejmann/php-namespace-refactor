import { injectable } from 'tsyringe';

export type UseStatementSortMode = 'natural' | 'length' | 'alphabetical';

export interface SortableUseStatement {
  fullNamespace: string
  line: string
}

@injectable()
export class UseStatementSorter {
  public sort<T extends SortableUseStatement>(statements: T[], mode: UseStatementSortMode): T[] {
    const sorted = [...statements];

    switch (mode) {
    case 'length':
      sorted.sort((a, b) => a.line.length - b.line.length || a.fullNamespace.localeCompare(b.fullNamespace));
      break;
    case 'alphabetical':
      sorted.sort((a, b) => a.fullNamespace.localeCompare(b.fullNamespace));
      break;
    case 'natural':
    default:
      sorted.sort((a, b) => a.fullNamespace.localeCompare(b.fullNamespace, undefined, { numeric: true, sensitivity: 'base' }));
      break;
    }

    return sorted;
  }
}
