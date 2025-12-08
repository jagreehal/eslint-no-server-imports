// GOOD EXAMPLE: Database Access Pattern
// This demonstrates the CORRECT way to access databases in Next.js

// Type imports are safe - they're erased at compile time
import type { User } from '@prisma/client';

// This is a Server Component by default in Next.js App Router
// Server Components CAN use server-only modules, but this file
// is in src/app which our rule treats as client code for safety.

// For database access, use Server Actions or API routes:

interface UserListProps {
  initialUsers: User[];
}

export default function DatabaseExample({ initialUsers }: UserListProps) {
  // Server Action for creating a user
  async function createUser(formData: FormData) {
    'use server';
    // In a real app, you'd do:
    // const { PrismaClient } = await import('@prisma/client');
    // const prisma = new PrismaClient();
    // await prisma.user.create({ data: { name: formData.get('name') } });
    console.log('Would create user:', formData.get('name'));
  }

  // Server Action for deleting a user
  async function deleteUser(formData: FormData) {
    'use server';
    const userId = formData.get('userId');
    // In a real app: await prisma.user.delete({ where: { id: userId } });
    console.log('Would delete user:', userId);
  }

  return (
    <div>
      <h1>Database Access Example</h1>
      <p>This shows the correct pattern for database operations.</p>

      <h2>Current Users:</h2>
      <ul>
        {initialUsers.map((user) => (
          <li key={user.id}>
            {user.name}
            <form action={deleteUser} style={{ display: 'inline' }}>
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <h2>Add User:</h2>
      <form action={createUser}>
        <input type="text" name="name" placeholder="User name" required />
        <button type="submit">Create User</button>
      </form>

      <h2>Key Points:</h2>
      <ul>
        <li>Type imports (import type) are always safe</li>
        <li>Database operations happen in Server Actions</li>
        <li>Use dynamic imports inside &apos;use server&apos; blocks</li>
        <li>Pass data to client via props, not direct DB access</li>
      </ul>
    </div>
  );
}
