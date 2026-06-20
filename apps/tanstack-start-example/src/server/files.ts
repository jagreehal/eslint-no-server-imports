// Server-only module.
//
// It lives under `src/server/**`, which the lint rule is configured to treat as
// server code (see `serverFilePatterns` in eslint.config.mjs). That means it may
// freely import Node-only dependencies like `node:fs` and `pino`.
//
// TanStack Start compiles the body of each `createServerFn` out of the client
// bundle and replaces calls with an RPC request. So client routes can import the
// server functions exported below to get a typed stub — and the lint rule does
// NOT flag those imports.
import { createServerFn } from '@tanstack/react-start'
import { readdir } from 'node:fs/promises'
import pino from 'pino'

const logger = pino()

export const listProjectFiles = createServerFn({ method: 'GET' }).handler(
  async () => {
    logger.info('reading project files on the server')
    return readdir(process.cwd())
  },
)
