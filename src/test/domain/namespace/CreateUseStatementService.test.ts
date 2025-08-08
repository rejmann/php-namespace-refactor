import 'reflect-metadata';
import * as assert from 'assert';
import { CreateNamespaceService } from '@domain/namespace/CreateNamespaceService';
import { CreateUseStatementService } from '@domain/namespace/CreateUseStatementService';

suite('CreateUseStatementService Test Suite', () => {

  test('should generate correct use statement with prefix and semicolon', () => {
    // Mock do CreateNamespaceService
    const mockCreateNamespaceService = {
      execute: () => ({
        namespace: 'App\\Controllers',
        className: 'UserController',
        fullNamespace: 'App\\Controllers\\UserController'
      })
    } as unknown as CreateNamespaceService;

    const service = new CreateUseStatementService(mockCreateNamespaceService);

    const result = service.execute({
      className: 'UserController',
      directoryPath: 'src/App/Controllers'
    });

    assert.strictEqual(result, '\nuse App\\Controllers\\UserController;');
  });
});
