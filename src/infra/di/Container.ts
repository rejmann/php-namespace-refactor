import "reflect-metadata";
import * as path from "path";
import console from "console";
import { glob } from "glob";

type Constructor<T = any> = new (...args: any[]) => T;

export class Container {
  private singletons = new Map<string, unknown>();
  private suffixes: string[];

  constructor(suffixes: string[] = ["Service"]) {
    this.suffixes = suffixes;
  }

  async addSingleton<T>(service: Constructor<T>): Promise<T> {
    const paramTypes: Constructor[] = Reflect.getMetadata("design:paramtypes", service) || [];
    const instance = new service(...paramTypes.map(dep => this.get(dep)));
    this.singletons.set(service.name, instance);
    return instance;
  }

  get<T>(service: Constructor<T>): T {
    const instance = this.singletons.get(service.name);
    if (!instance) {
      throw new Error(`Service ${service.name} not found in container`);
    }
    return instance as T;
  }

  async loadServicesFrom(dir: string) {
    const pattern = path.join(dir, `**/*.ts`);
    const files = await glob(pattern);

    if (files.length === 0) {
      console.debug(`No TypeScript files found in ${dir}`);
      return;
    }

    console.debug(`Found ${files.length} TypeScript files in ${dir}`);
    const loadPromises = files.map(file => this.loadServiceFromFile(file));

    const results = await Promise.allSettled(loadPromises);

    let loadedCount = 0;
    let errorCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        loadedCount += result.value;
        continue;
      }

      errorCount++;
      console.error(`Failed to load services from file: ${result.reason}`);
    }

    console.debug(`Successfully loaded ${loadedCount} services from ${dir}${errorCount > 0 ? ` (${errorCount} files had errors)` : ''}`);
  }

  private async loadServiceFromFile(file: string): Promise<number> {
    try {
      const module = await import(path.resolve(file));
      let servicesLoaded = 0;

      for (const [exportName, exported] of Object.entries(module)) {
        if (!this.isValidService(exported, exportName)) {
          continue;
        }

        await this.addSingleton(exported as Constructor);
        servicesLoaded++;
        console.debug(`Loaded service: ${exportName} from ${path.basename(file)}`);
      }

      return servicesLoaded;
    } catch (error) {
      throw new Error(`Failed to import ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private isValidService(exported: unknown, exportName: string): exported is Constructor {
    return (
      typeof exported === "function" &&
      exported.prototype &&
      exportName !== 'default' && // Skip default exports that might not be services
      this.suffixes.some(suffix => exportName.endsWith(suffix))
    );
  }
}
