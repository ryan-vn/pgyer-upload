#!/usr/bin/env node
import {execute} from '@oclif/core'
import {fileURLToPath} from 'url'
import {dirname, resolve} from 'path'

process.env.NODE_ENV ??= 'development'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

await execute({
  development: true,
  // project root
  dir: resolve(__dirname, '..'),
})


