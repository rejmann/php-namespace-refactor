import 'reflect-metadata';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Psr4LoaderService } from '@infra/composer/Psr4LoaderService';

suite('Psr4LoaderService Test Suite', () => {
  let tempDir: string;
  let composerPath: string;

  const service = new Psr4LoaderService();

  // Helper to create temporary directory
  const createTempDir = (): string => {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'psr4-test-'));
  };

  // Helper to create composer.json file
  const createComposerFile = (content: any): void => {
    fs.writeFileSync(composerPath, JSON.stringify(content, null, 2));
  };

  // Helper to cleanup temporary directory
  const cleanup = (): void => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };

  test('composer not found', () => {
    tempDir = createTempDir();
    // Don't create composer.json, so the file doesn't exist

    assert.throws(() => {
      service.getAllNamespaces({ workspacePath: tempDir });
    }, /ENOENT/);

    cleanup();
  });

  test('invalid composer', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    // Create invalid JSON
    fs.writeFileSync(composerPath, '{ invalid json content }');

    assert.throws(() => {
      service.getAllNamespaces({ workspacePath: tempDir });
    }, /SyntaxError|Unexpected token/);

    cleanup();
  });

  test('composer without autoload and autoload-dev', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    const composerContent = {
      "name": "test/project",
      "description": "Test project",
      "require": {
        "php": "^8.0"
      }
    };

    createComposerFile(composerContent);

    const result = service.getAllNamespaces({ workspacePath: tempDir });

    assert.deepStrictEqual(result.autoload, {});
    assert.deepStrictEqual(result.autoloadDev, {});

    cleanup();
  });

  test('composer with autoload and autoload-dev', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    const composerContent = {
      "autoload": {
        "psr-4": {
          "App\\": "src/",
          "Domain\\": "src/Domain/"
        }
      },
      "autoload-dev": {
        "psr-4": {
          "Tests\\": "tests/",
          "Fixtures\\": "tests/fixtures/"
        }
      }
    };

    createComposerFile(composerContent);

    const result = service.getAllNamespaces({ workspacePath: tempDir });

    assert.deepStrictEqual(result.autoload, {
      "App\\": "src/",
      "Domain\\": "src/Domain/"
    });

    assert.deepStrictEqual(result.autoloadDev, {
      "Tests\\": "tests/",
      "Fixtures\\": "tests/fixtures/"
    });

    cleanup();
  });

  test('autoload and autoload-dev with compound namespaces (multiple prefixes)', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    const composerContent = {
      "autoload": {
        "psr-4": {
          "App\\Domain\\": "src/App/Domain/"
        }
      },
      "autoload-dev": {
        "psr-4": {
          "Tests\\App\\Domain\\": "tests/App/Domain/"
        }
      }
    };

    createComposerFile(composerContent);

    const result = service.getAllNamespaces({ workspacePath: tempDir });

    assert.deepStrictEqual(result.autoload, {
      "App\\Domain\\": "src/App/Domain/",
    });

    assert.deepStrictEqual(result.autoloadDev, {
      "Tests\\App\\Domain\\": "tests/App/Domain/"
    });

    cleanup();
  });

  test('autoload and autoload-dev with paths ending with slash', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    const composerContent = {
      "autoload": {
        "psr-4": {
          "App\\": "src/",
          "Services\\": "src/Services/",
          "Models\\": "src/Models/"
        }
      },
      "autoload-dev": {
        "psr-4": {
          "Tests\\": "tests/",
          "Fixtures\\": "tests/fixtures/"
        }
      }
    };

    createComposerFile(composerContent);

    const result = service.getAllNamespaces({ workspacePath: tempDir });

    // Verify that paths ending with slash are preserved
    assert.strictEqual(result.autoload["App\\"], "src/");
    assert.strictEqual(result.autoload["Services\\"], "src/Services/");
    assert.strictEqual(result.autoload["Models\\"], "src/Models/");

    assert.strictEqual(result.autoloadDev["Tests\\"], "tests/");
    assert.strictEqual(result.autoloadDev["Fixtures\\"], "tests/fixtures/");

    cleanup();
  });

  test('autoload and autoload-dev with paths not ending with slash', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    const composerContent = {
      "autoload": {
        "psr-4": {
          "App\\": "src",
          "Services\\": "src/Services",
          "Models\\": "src/Models"
        }
      },
      "autoload-dev": {
        "psr-4": {
          "Tests\\": "tests",
          "Fixtures\\": "tests/fixtures"
        }
      }
    };

    createComposerFile(composerContent);

    const result = service.getAllNamespaces({ workspacePath: tempDir });
    // Verify that paths without trailing slash are preserved as is
    assert.strictEqual(result.autoload["App\\"], "src");
    assert.strictEqual(result.autoload["Services\\"], "src/Services");
    assert.strictEqual(result.autoload["Models\\"], "src/Models");

    assert.strictEqual(result.autoloadDev["Tests\\"], "tests");
    assert.strictEqual(result.autoloadDev["Fixtures\\"], "tests/fixtures");

    cleanup();
  });

  test('real scenario - complex structure as in provided example', () => {
    tempDir = createTempDir();
    composerPath = path.join(tempDir, 'composer.json');

    const composerContent = {
      "autoload": {
        "psr-4": {
          "ApiBundle\\": "src/ApiBundle",
          "AppBundle\\": "src/AppBundle",
          "OAuth\\": "src/OAuth"
        }
      },
      "autoload-dev": {
        "psr-4": {
          "ClassesTest\\": "tests/ClassesTest",
          "OAuthTest\\": "tests/OAuthTest",
        }
      }
    };

    createComposerFile(composerContent);

    const result = service.getAllNamespaces({ workspacePath: tempDir });
    // Test some specific namespaces
    assert.strictEqual(result.autoload["ApiBundle\\"], "src/ApiBundle");
    assert.strictEqual(result.autoloadDev["ClassesTest\\"], "tests/ClassesTest");

    // Verify that all namespaces were loaded
    assert.strictEqual(Object.keys(result.autoload).length, 3);
    assert.strictEqual(Object.keys(result.autoloadDev).length, 2);

    cleanup();
  });
});
