// This file should trigger ESLint errors - importing server-only modules in client code
import fs from 'fs'
import pino from 'pino'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bad-example')({
  component: BadExample,
})

function BadExample() {
  const data = fs.readFileSync('package.json', 'utf-8')
  const logger = pino()
  logger.info('This should not work in client code')

  return (
    <div>
      <h1>Bad Example - This should show ESLint errors</h1>
      <p>File content length: {data.length}</p>
    </div>
  )
}
