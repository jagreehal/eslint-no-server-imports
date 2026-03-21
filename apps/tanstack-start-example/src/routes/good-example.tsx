import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as fs from 'node:fs'

const getFileCount = createServerFn({ method: 'GET' }).handler(async () => {
  const files = await fs.promises.readdir('.')
  return files.length
})

export const Route = createFileRoute('/good-example')({
  component: GoodExample,
  loader: async () => await getFileCount(),
})

function GoodExample() {
  const count = Route.useLoaderData()

  return (
    <div>
      <h1>Good Example - Server function usage</h1>
      <p>
        Server-only modules (fs) are imported at the top level but used only
        inside createServerFn handlers. The ESLint rule recognizes this pattern
        and does not report an error.
      </p>
      <p>Files in project root: {count}</p>
    </div>
  )
}
