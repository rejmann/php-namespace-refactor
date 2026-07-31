const VISIBILITY = 'public|protected|private';

/**
 * Matches a class-body property declaration for `varName` - e.g.
 * `private Test $test;` or, since the type hint is optional in PHP,
 * a legacy `private $test;` typed only via a `@var Test` docblock.
 * `className` is accepted but not required, so a property whose type was
 * never declared in code (only documented) is still found once the caller
 * has already confirmed by other means (e.g. a constructor assignment)
 * that it holds an instance of that class.
 */
export function buildPropertyDeclarationPattern(className: string, varName: string): RegExp {
  return new RegExp(
    `(?:${VISIBILITY})\\s+(?:readonly\\s+)?(?:\\??\\b${className}\\b\\s+)?\\$${varName}\\s*;`,
  );
}
