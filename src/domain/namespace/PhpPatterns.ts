export const DECLARATION_MODIFIERS = [
  'abstract',
  'final',
];

export const NAMED_TYPE_KEYWORDS = [
  'class',
  'interface',
  'trait',
  'enum',
];

const DECLARATION_MODIFIER_PATTERN = DECLARATION_MODIFIERS
  .map(modifier => `(?:${modifier}\\s+)?`)
  .join('');

const NAMED_TYPE_PATTERN = NAMED_TYPE_KEYWORDS.join('|');

export const PHP_CLASS_DECLARATION_REGEX = new RegExp(
  `^\\s*${DECLARATION_MODIFIER_PATTERN}(?:${NAMED_TYPE_PATTERN})\\s+(\\w+)`,
  'm'
);

// A namespace/identifier boundary: neither an identifier character (letter,
// digit, underscore) nor a namespace separator (\) can sit on this side of a
// match, otherwise the match is actually a prefix or suffix of a longer FQCN
// rather than the identifier itself — e.g. matching "Foo" inside "FooBar" or
// inside "Foo\Bar\Baz" (a sub-namespace that merely starts with "Foo").
export const NOT_PRECEDED_BY_NAMESPACE_CHAR = '(?<![A-Za-z0-9_\\\\])';
export const NOT_FOLLOWED_BY_NAMESPACE_CHAR = '(?![A-Za-z0-9_\\\\])';

// Matches a `namespace Foo\Bar;` declaration line, capturing the declared
// namespace. Shared by everything that needs to read/replace that line,
// instead of each call site keeping its own copy of the same pattern.
export const NAMESPACE_DECLARATION_REGEX = /^\s*namespace\s+([\w\\]+);/m;

// Matches an unindented top-level `use Foo\Bar [as Alias];` import line,
// capturing the imported FQCN and its optional alias. Unindented on purpose:
// a `use SomeTrait;` inside a class body is always indented, so this never
// mistakes a trait-use for a namespace import.
export const USE_STATEMENT_REGEX = /^use\s+([\w\\]+)(?:\s+as\s+(\w+))?\s*;/gm;
