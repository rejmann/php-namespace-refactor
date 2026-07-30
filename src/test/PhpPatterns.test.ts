import * as assert from 'assert';

import {
  NOT_FOLLOWED_BY_NAMESPACE_CHAR,
  NOT_PRECEDED_BY_NAMESPACE_CHAR,
  PHP_CLASS_DECLARATION_REGEX,
} from '../domain/namespace/PhpPatterns';

suite('PHP_CLASS_DECLARATION_REGEX', () => {
  /**
   * Scenario 3 – when renaming a class by name, the current name must be
   * found in the declaration for replacement.
   *
   * Scenario 4 – when renaming the file, the declared class name must be
   * detected so it can be updated along with its annotations and imports.
   */
  suite('Scenario 3/4 – detect class declaration for renaming', () => {
    test('captures a simple class name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('class UserService {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'UserService');
    });

    test('captures an abstract class name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('abstract class BaseRepository {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'BaseRepository');
    });

    test('captures a final class name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('final class PaymentGateway {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'PaymentGateway');
    });

    test('captures an interface name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('interface RepositoryInterface {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'RepositoryInterface');
    });

    test('captures a trait name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('trait HasTimestamps {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'HasTimestamps');
    });

    test('captures an enum name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('enum ClassEnum {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'ClassEnum');
    });

    test('captures a backed enum name', () => {
      const match = PHP_CLASS_DECLARATION_REGEX.exec('enum PaymentStatus: string {}');
      assert.ok(match);
      assert.strictEqual(match[1], 'PaymentStatus');
    });

    test('captures the class name in a full PHP file with namespace and use', () => {
      const content = [
        '<?php',
        '',
        'namespace App\\Domain;',
        '',
        'use App\\Contracts\\EntityInterface;',
        '',
        'class Order implements EntityInterface',
        '{',
        '}',
      ].join('\n');

      const match = PHP_CLASS_DECLARATION_REGEX.exec(content);
      assert.ok(match);
      assert.strictEqual(match[1], 'Order');
    });

    test('does not capture comments containing the word class before the real declaration', () => {
      const content = '// class Fake\nclass Real {}';
      const match = PHP_CLASS_DECLARATION_REGEX.exec(content);
      assert.ok(match);
      assert.strictEqual(match[1], 'Real');
    });
  });
});

suite('NOT_PRECEDED_BY_NAMESPACE_CHAR / NOT_FOLLOWED_BY_NAMESPACE_CHAR', () => {
  /**
   * Bug – a class "RevisaoCadastral" can coexist with a sibling namespace of
   * the same name (e.g. a RevisaoCadastral.php file next to a
   * RevisaoCadastral/ directory). Renaming the class to "RevisaoCadastralTeste"
   * must not corrupt aliased imports from that sibling namespace, such as
   * "use ...\RevisaoCadastral\DadosPessoais\FormType as DadosPessoaisFormType;",
   * because "RevisaoCadastral" there is a namespace segment, not the class.
   */
  function buildGuardedRegex(identifier: string): RegExp {
    return new RegExp(`${NOT_PRECEDED_BY_NAMESPACE_CHAR}${identifier}${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`, 'g');
  }

  suite('Guard against matching an identifier that is a namespace-path prefix of a longer one', () => {
    test('replaces the identifier when it stands alone as a full FQCN', () => {
      const regex = buildGuardedRegex('App\\\\Controller\\\\Atendimento\\\\RevisaoCadastral');
      const content = 'use App\\Controller\\Atendimento\\RevisaoCadastral;';

      const result = content.replace(regex, 'App\\Controller\\Atendimento\\RevisaoCadastralTeste');

      assert.strictEqual(result, 'use App\\Controller\\Atendimento\\RevisaoCadastralTeste;');
    });

    test('does not touch aliased imports from a deeper sub-namespace sharing the same prefix', () => {
      const regex = buildGuardedRegex('RevisaoCadastral');
      const content = [
        'use App\\Controller\\Atendimento\\RevisaoCadastral\\DadosPessoais\\FormType as DadosPessoaisFormType;',
        'use App\\Controller\\Atendimento\\RevisaoCadastral\\Endereco\\FormType as EnderecoFormType;',
      ].join('\n');

      const result = content.replace(regex, 'RevisaoCadastralTeste');

      assert.strictEqual(result, content, `sub-namespace imports should be left untouched, got:\n${result}`);
    });

    test('still replaces the bare identifier when it is not part of a namespace path', () => {
      const regex = buildGuardedRegex('RevisaoCadastral');
      const content = 'private RevisaoCadastral $revisaoCadastral;\n\nnew RevisaoCadastral();';

      const result = content.replace(regex, 'RevisaoCadastralTeste');

      assert.strictEqual(
        result,
        'private RevisaoCadastralTeste $revisaoCadastral;\n\nnew RevisaoCadastralTeste();',
      );
    });

    test('does not match a suffix identifier that merely starts with the same characters', () => {
      const regex = buildGuardedRegex('RevisaoCadastral');
      const content = 'use App\\Domain\\RevisaoCadastralAbstract;';

      const result = content.replace(regex, 'RevisaoCadastralTeste');

      assert.strictEqual(result, content);
    });

    test('without the guard, the old regex would corrupt the sub-namespace imports (regression check)', () => {
      const unguardedRegex = new RegExp('RevisaoCadastral', 'g');
      const content = 'use App\\Controller\\Atendimento\\RevisaoCadastral\\DadosPessoais\\FormType as DadosPessoaisFormType;';

      const result = content.replace(unguardedRegex, 'RevisaoCadastralTeste');

      assert.strictEqual(
        result,
        'use App\\Controller\\Atendimento\\RevisaoCadastralTeste\\DadosPessoais\\FormType as DadosPessoaisFormType;',
      );
    });
  });
});
