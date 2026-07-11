'use client';

// BAD EXAMPLE: Client Component under directiveAware mode
// The 'use client' directive marks this file as client code, so the rule
// checks it and flags the server-only import below.
import fs from 'node:fs';

export default function ClientComponentExample() {
  return (
    <div>
      <h1>Client Component - this should show an ESLint error</h1>
      <p>fs is {typeof fs}</p>
    </div>
  );
}
