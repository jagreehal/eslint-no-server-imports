// GOOD EXAMPLE: Server Component under directiveAware mode
// This file has NO 'use client' directive, so with directiveAware enabled the
// rule treats it as a React Server Component and skips it — Server Components
// may legitimately import server-only modules.
import fs from 'node:fs';

export default function ServerComponentExample() {
  const pkg = fs.readFileSync('package.json', 'utf-8');

  return (
    <div>
      <h1>Server Component - server-only imports are allowed here</h1>
      <p>package.json is {pkg.length} bytes</p>
    </div>
  );
}
