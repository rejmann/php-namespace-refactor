import { GetWorkspaceConfigProps, IsConfigEnabledProps } from './configTypes';
import { workspace } from 'vscode';

const userConfig = workspace.getConfiguration('phpNamespaceRefactor');

export const isConfigEnabled = ({
  key,
  defaultValue = true,
}: IsConfigEnabledProps): boolean => {
  return userConfig.get<boolean>(key, defaultValue);
};

export const getWorkspaceConfig = <T>({
  key,
  defaultValue,
}: GetWorkspaceConfigProps<T>) => {
  return userConfig.get<T>(key, defaultValue as T);
};
