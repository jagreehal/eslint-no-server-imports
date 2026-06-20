import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as fs from 'node:fs'

// Importing a server function from another module is the idiomatic TanStack
// Start pattern. The build replaces `listProjectFiles` with an RPC call, so the
// `node:fs` and `pino` it uses never reach the client bundle — and the lint rule
// correctly leaves this stub import alone.
import { listProjectFiles } from '../server/files'

// Inline server functions are recognised too: `fs` is imported at the top level
// but only ever used inside the handler, so the rule stays quiet.
const getFileCount = createServerFn({ method: 'GET' }).handler(async () => {
  const files = await fs.promises.readdir('.')
  return files.length
})

export const Route = createFileRoute('/good-example')({
  component: GoodExample,
  loader: async () => ({
    count: await getFileCount(),
    files: await listProjectFiles(),
  }),
})

function GoodExample() {
  const { count, files } = Route.useLoaderData()

  return (
    <div>
      <h1>Good Example - Server functions</h1>
      <p>
        Server-only modules (<code>node:fs</code>, <code>pino</code>) are used
        only inside <code>createServerFn</code> handlers, or behind a server
        function imported from <code>src/server/</code>. The lint rule recognises
        both patterns and reports nothing.
      </p>
      <p>Files in project root: {count}</p>
      <ul>
        {files.slice(0, 5).map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
    </div>
  )
}
