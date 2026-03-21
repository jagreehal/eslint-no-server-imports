import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>ESLint No Server Imports - TanStack Start Example</h1>
      <p>This example demonstrates the eslint-plugin-no-server-imports rule with TanStack Start.</p>
      <nav>
        <ul>
          <li>
            <Link to="/good-example">Good Example</Link> - Uses createServerFn correctly
          </li>
          <li>
            <Link to="/bad-example">Bad Example</Link> - Imports server modules in client code (lint errors)
          </li>
        </ul>
      </nav>
    </div>
  )
}
