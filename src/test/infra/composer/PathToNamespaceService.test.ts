import 'reflect-metadata';
import * as assert from 'assert';
import { PathToNamespaceService } from '@infra/composer/PathToNamespaceService';

suite('PathToNamespaceService Test Suite', () => {
  const service = new PathToNamespaceService();

  test('simple namespace - finds match', () => {
    const result = service.resolve({
      autoload: {
        "App\\": "src/App"
      },
      pathFull: "src/App/Controllers/UserController"
    });

    assert.strictEqual(result, "App\\Controllers");
  });

  test('compound namespace - multiple levels', () => {
    const result = service.resolve({
      autoload: {
        "App\\Services\\": "src/App/Services"
      },
      pathFull: "src/App/Services/Contracts/PaymentInterface"
    });

    assert.strictEqual(result, "App\\Services\\Contracts");
  });

  test('source path with trailing slash', () => {
    const result = service.resolve({
      autoload: {
        "ApiBundle\\": "src/ApiBundle/"
      },
      pathFull: "src/ApiBundle/Services/PaymentService"
    });

    assert.strictEqual(result, "ApiBundle\\Services");
  });

  test('source path without trailing slash', () => {
    const result = service.resolve({
      autoload: {
        "Domain\\": "src/Domain"
      },
      pathFull: "src/Domain/Entities/User"
    });

    assert.strictEqual(result, "Domain\\Entities");
  });

  test('multiple namespaces - first match wins', () => {
    const result = service.resolve({
      autoload: {
        "App\\": "src/App",
        "App\\Controllers\\": "src/App/Controllers", // More specific, but comes later
        "Domain\\": "src/Domain"
      },
      pathFull: "src/App/Controllers/UserController"
    });

    assert.strictEqual(result, "App\\Controllers");
  });

  test('no match found', () => {
    const result = service.resolve({
      autoload: {
        "App\\": "src/App",
        "Domain\\": "src/Domain"
      },
      pathFull: "tests/Unit/SomeTest"
    });

    assert.strictEqual(result, "");
  });

  test('namespace with backslashes in autoload', () => {
    const result = service.resolve({
      autoload: {
        "App\\Controllers\\": "src\\App\\Controllers"
      },
      pathFull: "src/App/Controllers/Admin/UserController"
    });

    assert.strictEqual(result, "App\\Controllers\\Admin");
  });

  test('deep path - multiple directory levels', () => {
    const result = service.resolve({
      autoload: {
        "App\\": "src/App"
      },
      pathFull: "src/App/Utils/Helpers/StringHelper"
    });

    assert.strictEqual(result, "App\\Utils\\Helpers");
  });

  test('root namespace - single level only', () => {
    const result = service.resolve({
      autoload: {
        "App\\": "src/App"
      },
      pathFull: "src/App/Helper"
    });

    assert.strictEqual(result, "App");
  });

  test('real scenario - complex composer structure', () => {
    const autoload = {
      "ApiBundle\\": "src/ApiBundle",
      "AppBundle\\": "src/AppBundle"
    };

    const result1 = service.resolve({
      autoload,
      pathFull: "src/ApiBundle/Controllers/Payment/CreditCardController"
    });
    assert.strictEqual(result1, "ApiBundle\\Controllers\\Payment");

    const result2 = service.resolve({
      autoload,
      pathFull: "src/AppBundle/Controllers/Payment/CreditCardController"
    });
    assert.strictEqual(result2, "AppBundle\\Controllers\\Payment");
  });

  test('empty autoload - returns empty string', () => {
    const result = service.resolve({
      autoload: {},
      pathFull: "src/App/Controllers/UserController"
    });

    assert.strictEqual(result, "");
  });

  test('empty pathFull - returns empty string', () => {
    const result = service.resolve({
      autoload: {
        "App\\": "src/App"
      },
      pathFull: ""
    });

    assert.strictEqual(result, "");
  });

  test('namespace with multiple trailing backslashes', () => {
    const result = service.resolve({
      autoload: {
        "App\\\\\\": "src/App" // Multiple trailing backslashes
      },
      pathFull: "src/App/Services/UserService",
    });

    assert.strictEqual(result, "App\\Services");
  });
});
