import { injectable } from 'tsyringe';
import { readFileSync } from 'fs';

interface Props {
  workspacePath: string;
}

export type AutoloadType = {
  [key: string]: string
}

type AllNamespaceType = {
  autoload: AutoloadType,
  autoloadDev: AutoloadType,
}

@injectable()
export class Psr4LoaderService {
  public getAllNamespaces(props: Props): AllNamespaceType {
    const config = this.readConfig(props);
    return {
      autoload: config.autoload?.['psr-4'] || {},
      autoloadDev: config['autoload-dev']?.['psr-4'] || {},
    };
  }

  private readConfig(props: Props) {
    const rawData = readFileSync(`${props.workspacePath}/composer.json`, 'utf-8');
    return JSON.parse(rawData);
  }
}
