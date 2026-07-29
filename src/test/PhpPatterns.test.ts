import * as assert from 'assert';

import { NOT_FOLLOWED_BY_IDENTIFIER_CHAR, PHP_CLASS_DECLARATION_REGEX } from '../domain/namespace/PhpPatterns';

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

suite('NOT_FOLLOWED_BY_IDENTIFIER_CHAR', () => {
  /**
   * Bug – renaming "DetalhePagamentoDTO" to "DetalhePagamentoDTOAbstract" was
   * corrupting an unrelated "use ...DetalhePagamentoDTOAbstract;" statement
   * already present in the same file, turning it into
   * "...DetalhePagamentoDTOAbstractAbstract" because the namespace replace
   * regex matched the old FQCN as a mere prefix of the longer one.
   */
  suite('Guard against matching a FQCN that is a prefix of a longer one', () => {
    function buildNamespaceRegex(oldNamespace: string): RegExp {
      const escaped = oldNamespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`${escaped}${NOT_FOLLOWED_BY_IDENTIFIER_CHAR}`, 'g');
    }

    test('replaces the old namespace when it is not followed by extra identifier characters', () => {
      const regex = buildNamespaceRegex('SharedBundle\\DetalhePagamentoDTO');
      const content = 'use SharedBundle\\DetalhePagamentoDTO;';

      const result = content.replace(regex, 'SharedBundle\\DetalhePagamentoDTOAbstract');

      assert.strictEqual(result, 'use SharedBundle\\DetalhePagamentoDTOAbstract;');
    });

    test('does not touch an unrelated FQCN that has the old namespace as a prefix', () => {
      const regex = buildNamespaceRegex('SharedBundle\\DetalhePagamentoDTO');
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
