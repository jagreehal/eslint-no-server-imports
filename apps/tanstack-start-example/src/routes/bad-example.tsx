// Every server-only import below is used directly in client component code, so
// the rule flags it in your editor — catching the leak before it ever reaches a
// build. (Contrast with good-example.tsx, where the same modules are used safely
// inside server functions.)
import fs from 'node:fs'
import pino from 'pino'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bad-example')({
  component: BadExample,
})

function BadExample() {
  const data = fs.readFileSync('package.json', 'utf-8')
  const logger = pino()
  logger.info('This would run in the client bundle — exactly what we want to prevent')

  return (
    <div>
      <h1>Bad Example - This should show ESLint errors</h1>
      <p>File content length: {data.length}</p>
    </div>
  )
}
