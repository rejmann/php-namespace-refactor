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
