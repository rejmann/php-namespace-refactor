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
  function escapeForRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildGuardedRegex(identifier: string): RegExp {
    return new RegExp(`${NOT_PRECEDED_BY_NAMESPACE_CHAR}${identifier}${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`, 'g');
  }

  function buildGuardedNamespaceRegex(oldNamespace: string): RegExp {
    return new RegExp(`${escapeForRegex(oldNamespace)}${NOT_FOLLOWED_BY_NAMESPACE_CHAR}`, 'g');
  }

  /**
   * Bug – a class "RenamedClass" can coexist with a sibling namespace of
   * the same name (e.g. a RenamedClass.php file next to a
   * RenamedClass/ directory). Renaming the class to "RenamedClassTeste"
   * must not corrupt aliased imports from that sibling namespace, such as
   * "use ...\RenamedClass\Foo\FormType as FooFormType;",
   * because "RenamedClass" there is a namespace segment, not the class.
   */
  suite('Guard against matching an identifier that is a namespace-path prefix of a longer one', () => {
    test('replaces the identifier when it stands alone as a full FQCN', () => {
      const regex = buildGuardedNamespaceRegex('App\\Controller\\Atendimento\\RenamedClass');
      const content = 'use App\\Controller\\Atendimento\\RenamedClass;';

      const result = content.replace(regex, 'App\\Controller\\Atendimento\\RenamedClassTeste');

      assert.strictEqual(result, 'use App\\Controller\\Atendimento\\RenamedClassTeste;');
    });

    test('does not touch aliased imports from a deeper sub-namespace sharing the same prefix', () => {
      const regex = buildGuardedRegex('RenamedClass');
      const content = [
        'use App\\Controller\\Atendimento\\RenamedClass\\Foo\\FormType as FooFormType;',
        'use App\\Controller\\Atendimento\\RenamedClass\\Bar\\FormType as BarFormType;',
      ].join('\n');

      const result = content.replace(regex, 'RenamedClassTeste');

      assert.strictEqual(result, content, `sub-namespace imports should be left untouched, got:\n${result}`);
    });

    test('still replaces the bare identifier when it is not part of a namespace path', () => {
      const regex = buildGuardedRegex('RenamedClass');
      const content = 'private RenamedClass $instance;\n\nnew RenamedClass();';

      const result = content.replace(regex, 'RenamedClassTeste');

      assert.strictEqual(
        result,
        'private RenamedClassTeste $instance;\n\nnew RenamedClassTeste();',
      );
    });

    test('does not match a suffix identifier that merely starts with the same characters', () => {
      const regex = buildGuardedRegex('RenamedClass');
      const content = 'use App\\Domain\\RenamedClassAbstract;';

      const result = content.replace(regex, 'RenamedClassTeste');

      assert.strictEqual(result, content);
    });

    test('without the guard, the old regex would corrupt the sub-namespace imports (regression check)', () => {
      const unguardedRegex = new RegExp('RenamedClass', 'g');
      const content = 'use App\\Controller\\Atendimento\\RenamedClass\\Foo\\FormType as FooFormType;';

      const result = content.replace(unguardedRegex, 'RenamedClassTeste');

      assert.strictEqual(
        result,
        'use App\\Controller\\Atendimento\\RenamedClassTeste\\Foo\\FormType as FooFormType;',
      );
    });
  });

  /**
   * Bug – renaming "DetalhePagamentoDTO" to "DetalhePagamentoDTOAbstract" was
   * corrupting an unrelated "use ...DetalhePagamentoDTOAbstract;" statement
   * already present in the same file, turning it into
   * "...DetalhePagamentoDTOAbstractAbstract" because the namespace replace
   * regex matched the old FQCN as a mere prefix of the longer one.
   */
  suite('Guard against matching a FQCN that is a prefix of a longer identifier', () => {
    test('replaces the old namespace when it is not followed by extra identifier characters', () => {
      const regex = buildGuardedNamespaceRegex('SharedBundle\\DetalhePagamentoDTO');
      const content = 'use SharedBundle\\DetalhePagamentoDTO;';

      const result = content.replace(regex, 'SharedBundle\\DetalhePagamentoDTOAbstract');

      assert.strictEqual(result, 'use SharedBundle\\DetalhePagamentoDTOAbstract;');
    });

    test('does not touch an unrelated FQCN that has the old namespace as a prefix', () => {
      const regex = buildGuardedNamespaceRegex('SharedBundle\\DetalhePagamentoDTO');
      const content = [
        'use SharedBundle\\DetalhePagamentoDTO;',
        'use SharedBundle\\DetalhePagamentoDTOAbstract;',
      ].join('\n');

      const result = content.replace(regex, 'SharedBundle\\DetalhePagamentoDTOAbstract');

      assert.strictEqual(
        result,
        [
          'use SharedBundle\\DetalhePagamentoDTOAbstract;',
          'use SharedBundle\\DetalhePagamentoDTOAbstract;',
        ].join('\n'),
      );
    });

    test('without the guard, the old regex would double the suffix (regression check)', () => {
      const unguardedRegex = new RegExp('SharedBundle\\\\DetalhePagamentoDTO', 'g');
      const content = 'use SharedBundle\\DetalhePagamentoDTOAbstract;';

      const result = content.replace(unguardedRegex, 'SharedBundle\\DetalhePagamentoDTOAbstract');

      assert.strictEqual(result, 'use SharedBundle\\DetalhePagamentoDTOAbstractAbstract;');
    });
  });
});
