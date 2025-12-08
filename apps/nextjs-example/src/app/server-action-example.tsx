// GOOD EXAMPLE: Server Actions in Next.js
// This file demonstrates the CORRECT way to use server-only modules

// Type-only imports are always safe
import type { Logger } from 'pino';

// Client component that calls server actions
export default function ServerActionExample() {
  async function handleSubmit(formData: FormData) {
    'use server';
    // Server-only code goes here - this runs on the server
    // In a real app, you'd import and use server modules here
    const name = formData.get('name');
    console.log('Server received:', name);
  }

  return (
    <div>
      <h1>Server Action Example</h1>
      <p>This demonstrates the correct pattern for Next.js Server Actions.</p>

      <form action={handleSubmit}>
        <input type="text" name="name" placeholder="Enter name" />
        <button type="submit">Submit (Server Action)</button>
      </form>

      <h2>Why this works:</h2>
      <ul>
        <li>Server Actions (with &apos;use server&apos;) run only on the server</li>
        <li>Type-only imports are erased at compile time</li>
        <li>No server modules are imported at the component level</li>
      </ul>
    </div>
  );
}
