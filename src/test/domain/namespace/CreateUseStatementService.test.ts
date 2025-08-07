import * as assert from 'assert';
import { CreateNamespaceService } from '../../../domain/namespace/CreateNamespaceService';
import { CreateUseStatementService } from '../../../domain/namespace/CreateUseStatementService';

// Mock simples do CreateNamespaceService
const mockCreateNamespaceService = {
  execute: ({ uri }: { uri: string }) => ({
    namespace: 'App\\Controllers',
    className: 'UserController',
    fullNamespace: 'App\\Controllers\\UserController'
  })
} as unknown as CreateNamespaceService;

suite('CreateUseStatementService Test Suite', () => {

  test('should generate correct use statement with prefix and semicolon', () => {
    const service = new CreateUseStatementService(mockCreateNamespaceService);

    const result = service.execute({
      className: 'UserController',
      directoryPath: 'src/App/Controllers'
    });

    assert.strictEqual(result, '\nuse App\\Controllers\\UserController;');
  });
});
