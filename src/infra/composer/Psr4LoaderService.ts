import { readFileSync } from 'fs';

interface Props {
  workspacePath: string;
}

export class Psr4LoaderService {
  private workspacePath: string;

  constructor({ workspacePath }: Props) {
    this.workspacePath = workspacePath;
  }

  public getAllNamespaces() {
    const config = this.readConfig();
    return {
      autoload: config.autoload?.['psr-4'] || {},
      autoloadDev: config['autoload-dev']?.['psr-4'] || {},
    };
  }

  private readConfig() {
    const rawData = readFileSync(`${this.workspacePath}/composer.json`, 'utf-8');
    return JSON.parse(rawData);
  }
}
