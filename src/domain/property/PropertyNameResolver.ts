import { injectable } from 'tsyringe';

@injectable()
export class PropertyNameResolver {
  public resolve(className: string): string {
    return className.charAt(0).toLowerCase() + className.slice(1);
  }
}
