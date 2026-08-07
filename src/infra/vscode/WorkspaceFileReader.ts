import { injectable } from 'tsyringe';
import { Uri, workspace } from 'vscode';

@injectable()
export class WorkspaceFileReader {
  public async readText(uri: Uri): Promise<string | null> {
    try {
      const content = await workspace.fs.readFile(uri);
      return Buffer.from(content).toString();
    } catch {
      return null;
    }
  }
}
