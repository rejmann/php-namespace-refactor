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
