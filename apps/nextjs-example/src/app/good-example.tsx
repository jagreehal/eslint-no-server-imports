// This file should NOT trigger ESLint errors - using type-only imports
import type { Logger } from 'pino';

export default function GoodExample() {
  // Type-only imports are safe
  const logger: Logger | null = null;

  return (
    <div>
      <h1>Good Example - Type-only imports are allowed</h1>
      <p>Logger type: {logger ? 'defined' : 'null'}</p>
    </div>
  );
}



