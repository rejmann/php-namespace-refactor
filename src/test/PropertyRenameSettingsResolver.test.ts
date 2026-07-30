import 'reflect-metadata';

import * as assert from 'assert';

import { PropertyRenameSettingsResolver } from '../domain/property/PropertyRenameSettingsResolver';
import { ConfigurationLocator } from '../domain/workspace/ConfigurationLocator';

function buildResolver(rawValue: unknown): PropertyRenameSettingsResolver {
  const configurationLocator = {
    get: () => rawValue,
  } as unknown as ConfigurationLocator;

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

  test('resolves true to enabled, without the mismatch behavior', () => {
    assert.deepStrictEqual(
      buildResolver(true).resolve(),
      { enabled: true, renameMismatchedNames: false },
    );
  });

  test('resolves an empty object to enabled, without the mismatch behavior', () => {
    assert.deepStrictEqual(
      buildResolver({}).resolve(),
      { enabled: true, renameMismatchedNames: false },
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
