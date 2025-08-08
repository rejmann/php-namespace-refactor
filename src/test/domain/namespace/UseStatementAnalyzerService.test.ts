import 'reflect-metadata';
import * as assert from 'assert';
import { TextDocument } from 'vscode';
import { UseStatementAnalyzerService } from '../../../domain/namespace/UseStatementAnalyzerService';

function createMockTextDocument(content: string): TextDocument {
  return {
    getText: () => content
  } as TextDocument;
}

suite('UseStatementAnalyzerService Test Suite', () => {
  const service = new UseStatementAnalyzerService();

  test('file without use statements - returns 0', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

class UserController {
    public function index() {
        return 'Hello World';
    }
}`);

    const result = service.execute({ document });

    assert.strictEqual(result, 0);
  });

  test('file with single use statement', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController {
    public function index() {
        return User::all();
    }
}`);

    const result = service.execute({ document });

    const expectedPosition = document.getText().indexOf('use App\\Models\\User;') + 'use App\\Models\\User;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with multiple use statements', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User;
use App\\Services\\EmailService;
use Illuminate\\Http\\Request;

class UserController {
    // class code
}`);

    const result = service.execute({ document });

    // Should return position after the last use statement
    const expectedPosition = document.getText().indexOf('use Illuminate\\Http\\Request;') + 'use Illuminate\\Http\\Request;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with uses and interspersed comments', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User;
// Comment here
use App\\Services\\EmailService;
/* Block comment */
use Illuminate\\Http\\Request;

class UserController {
    // code
}`);

    const result = service.execute({ document });

    // Should ignore comments and get the last valid use statement
    const expectedPosition = document.getText().indexOf('use Illuminate\\Http\\Request;') + 'use Illuminate\\Http\\Request;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with aliased use statements', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User as UserModel;
use App\\Services\\EmailService as Email;

class UserController {
    // code
}`);

    const result = service.execute({ document });

    const expectedPosition = document.getText().indexOf('use App\\Services\\EmailService as Email;') + 'use App\\Services\\EmailService as Email;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with grouped use statements', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\{User, Post, Comment};
use App\\Services\\EmailService;

class UserController {
    // code
}`);

    const result = service.execute({ document });

    const expectedPosition = document.getText().indexOf('use App\\Services\\EmailService;') + 'use App\\Services\\EmailService;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with use function and use const', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Utils;

use function array_map;
use const PHP_VERSION;
use App\\Models\\User;

class Helper {
    // code
}`);

    const result = service.execute({ document });

    // Should only capture normal use statements (not function/const)
    const expectedPosition = document.getText().indexOf('use App\\Models\\User;') + 'use App\\Models\\User;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with use statements with extra spaces', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use    App\\Models\\User   ;
use  App\\Services\\EmailService  ;

class UserController {
    // code
}`);

    const result = service.execute({ document });

    // Should work even with extra spaces
    const expectedPosition = document.getText().indexOf('use  App\\Services\\EmailService  ;') + 'use  App\\Services\\EmailService  ;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('file with use in the middle of code - should not capture', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController {
    public function someMethod() {
        // This line should not be captured by regex
        $this->use = 'some value';
        return 'use this string';
    }
}`);

    const result = service.execute({ document });

    // Should return only the position of valid use statement at the top
    const expectedPosition = document.getText().indexOf('use App\\Models\\User;') + 'use App\\Models\\User;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('empty file - returns 0', () => {
    const document = createMockTextDocument('') as unknown as TextDocument;

    const result = service.execute({ document });

    assert.strictEqual(result, 0);
  });

  test('file with only namespace - no uses', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

// Only namespace, no uses`) as unknown as TextDocument;

    const result = service.execute({ document });

    assert.strictEqual(result, 0);
  });

  test('real scenario - complex file with multiple uses', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Http\\Controllers\\Api;

use App\\Models\\User;
use App\\Services\\UserService;
use App\\Http\\Requests\\CreateUserRequest;
use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Database\\Eloquent\\ModelNotFoundException;

class UserController extends BaseController
{
    private UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index(): JsonResponse
    {
        return response()->json(User::all());
    }
}`);

    const result = service.execute({ document });

    // Should return position after the last use statement
    const expectedPosition = document.getText().indexOf('use Illuminate\\Database\\Eloquent\\ModelNotFoundException;') + 'use Illuminate\\Database\\Eloquent\\ModelNotFoundException;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('use statements with different formatting patterns', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User;
use App\\Services\\{EmailService, SmsService};
use Illuminate\\Http\\Request as HttpRequest;
use function array_map;
use const PHP_VERSION;
use App\\Contracts\\ServiceInterface;

class UserController {
    // code
}`);

    const result = service.execute({ document });

    // Should return position after the last valid class use statement
    const expectedPosition = document.getText().indexOf('use App\\Contracts\\ServiceInterface;') + 'use App\\Contracts\\ServiceInterface;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('edge case - use statement at the very end of file', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use App\\Models\\User;`);

    const result = service.execute({ document });

    const expectedPosition = document.getText().indexOf('use App\\Models\\User;') + 'use App\\Models\\User;'.length;
    assert.strictEqual(result, expectedPosition);
  });

  test('use statements with line breaks and tabs', () => {
    const document = createMockTextDocument(`<?php

namespace App\\Controllers;

use\tApp\\Models\\User;
use\t\tApp\\Services\\EmailService\t;
use   App\\Http\\Request   ;

class UserController {
    // code
}`);

    const result = service.execute({ document });

    // Should handle tabs and extra spaces correctly
    const expectedPosition = document.getText().indexOf('use   App\\Http\\Request   ;') + 'use   App\\Http\\Request   ;'.length;
    assert.strictEqual(result, expectedPosition);
  });
});
