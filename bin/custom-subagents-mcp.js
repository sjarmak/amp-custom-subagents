#!/usr/bin/env node
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use registry MCP server instead of legacy mcp-server
const serverPath = join(__dirname, '..', 'src', 'registry-mcp-server.ts')

// Run the TypeScript MCP server using tsx
const child = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: process.env
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
