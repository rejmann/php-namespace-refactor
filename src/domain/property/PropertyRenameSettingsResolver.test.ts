import 'reflect-metadata';

import { ConfigurationLocator } from '@domain/config/ConfigurationLocator';
import { PropertyRenameSettingsResolver } from '@domain/property/PropertyRenameSettingsResolver';
import * as assert from 'assert';

function buildResolver(rawValue: unknown): PropertyRenameSettingsResolver {
  // A real ConfigurationLocator instance (so the resolver exercises the
  // actual getPolymorphicFlag implementation) with only the underlying
  // raw-value read stubbed out.
  const configurationLocator = Object.assign(
    Object.create(ConfigurationLocator.prototype) as ConfigurationLocator,
    { get: () => rawValue },
  );

  return new PropertyRenameSettingsResolver(configurationLocator);
}

suite('PropertyRenameSettingsResolver', () => {
  test('resolves false to disabled', () => {
    assert.deepStrictEqual(
      buildResolver(false).resolve(),
      { enabled: false, renameMismatchedNames: false },
    );
  });

  test('resolves undefined (unset) to disabled', () => {
    assert.deepStrictEqual(
      buildResolver(undefined).resolve(),
      { enabled: false, renameMismatchedNames: false },
    );
  });

  test('resolves true to enabled, with the mismatch behavior also on by default', () => {
    assert.deepStrictEqual(
      buildResolver(true).resolve(),
      { enabled: true, renameMismatchedNames: true },
    );
  });

  test('resolves an empty object to enabled, with the mismatch behavior also on by default', () => {
    assert.deepStrictEqual(
      buildResolver({}).resolve(),
      { enabled: true, renameMismatchedNames: true },
    );
  });

  test('resolves { renameMismatchedNames: true } to enabled with the mismatch behavior on', () => {
    assert.deepStrictEqual(
      buildResolver({ renameMismatchedNames: true }).resolve(),
      { enabled: true, renameMismatchedNames: true },
    );
  });

  test('resolves { renameMismatchedNames: false } to enabled with the mismatch behavior off', () => {
    assert.deepStrictEqual(
      buildResolver({ renameMismatchedNames: false }).resolve(),
      { enabled: true, renameMismatchedNames: false },
    );
  });
});
