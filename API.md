# API Reference

Complete API documentation for the custom subagent system.

## Core API

### `runSubagent()`

Execute a named subagent with a specific goal.

```typescript
async function runSubagent(
  name: string,
  userGoal: string,
  registry: SubagentRegistry,
  options?: RunSubagentOptions
): Promise<string>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Subagent identifier from the registry |
| `userGoal` | `string` | Yes | Task description for the subagent to accomplish |
| `registry` | `SubagentRegistry` | Yes | Registry object containing subagent definitions |
| `options` | `RunSubagentOptions` | No | Configuration options for execution |

#### Options

```typescript
interface RunSubagentOptions {
  cwd?: string                  // Working directory (default: process.cwd())
  onMessage?: (msg: any) => void // Message streaming callback
  timeout?: number               // Execution timeout in milliseconds
}
```

#### Returns

`Promise<string>` - The final result message from the subagent

#### Throws

- `Error` - If the subagent name is not found in the registry
- `Error` - If no result is received from the subagent
- `Error` - If execution times out (when timeout is set)

#### Examples

**Basic usage:**
```typescript
import { runSubagent } from './index.js'
import { subagents } from './subagents.js'

const result = await runSubagent(
  'test-runner',
  'Run all unit tests',
  subagents
)
console.log(result)
```

**With options:**
```typescript
const result = await runSubagent(
  'migration-planner',
  'Plan migration from CommonJS to ESM',
  subagents,
  {
    cwd: '/path/to/project',
    timeout: 120000, // 2 minutes
    onMessage: (msg) => {
      if (msg.type === 'text') {
        console.log('[Subagent]:', msg.text)
      }
    }
  }
)
```

**Error handling:**
```typescript
try {
  const result = await runSubagent('unknown-agent', 'task', subagents)
} catch (error) {
  console.error('Subagent failed:', error.message)
  // Error: Unknown subagent: unknown-agent. Available: test-runner, migration-planner, ...
}
```

---

### `createPermission()`

Create a permission rule for tool access control.

```typescript
function createPermission(
  tool: string,
  action: 'allow' | 'deny' | 'ask' | 'reject',
  options?: PermissionOptions
): Permission
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool` | `string` | Yes | Tool name (e.g., 'Read', 'Write', 'Bash') |
| `action` | `'allow' \| 'deny' \| 'ask' \| 'reject'` | Yes | Permission action |
| `options` | `PermissionOptions` | No | Pattern matching options |

#### Permission Actions

- `'allow'` - Allow the tool without asking
- `'deny'` - Deny the tool silently
- `'ask'` - Ask for user approval before allowing
- `'reject'` - Reject the tool with an error

#### Options

```typescript
interface PermissionOptions {
  matches?: {
    path?: string   // Glob pattern for file paths (Read/Write)
    cmd?: string    // Pattern for commands (Bash)
  }
}
```

#### Pattern Matching

**Glob patterns for paths:**
- `**/*.ts` - All TypeScript files
- `src/**` - All files in src directory
- `**/*.{test,spec}.*` - All test files
- `**/secrets/**` - All files in secrets directories

**Patterns for commands:**
- `npm test*` - Commands starting with "npm test"
- `git*` - All git commands
- `npm audit*` - npm audit commands

#### Examples

**Allow all Read operations:**
```typescript
createPermission('Read', 'allow')
```

**Ask before writing to source files:**
```typescript
createPermission('Write', 'ask', { 
  matches: { path: 'src/**' } 
})
```

**Deny all Write operations:**
```typescript
createPermission('Write', 'deny')
```

**Allow specific bash commands:**
```typescript
createPermission('Bash', 'allow', { 
  matches: { cmd: 'npm test*' } 
})
```

**Multiple file patterns:**
```typescript
createPermission('Write', 'ask', { 
  matches: { path: '**/*.{md,txt,json}' } 
})
```

---

## Types

### `NamedSubagent`

Defines a subagent configuration.

```typescript
type NamedSubagent = {
  system: string                                    // System prompt with role and rules
  mcp?: MCPConfig                                   // Optional MCP server configuration
  permissions?: ReturnType<typeof createPermission>[] // Tool access permissions
}
```

#### Example

```typescript
const mySubagent: NamedSubagent = {
  system: `You are a specialized subagent for testing.
Rules:
- Run tests only
- Report all results
- Fix failures when possible`,
  permissions: [
    createPermission('Read', 'allow'),
    createPermission('Write', 'ask'),
    createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } }),
  ],
  mcp: {
    servers: {
      'test-server': {
        command: 'npx',
        args: ['-y', 'test-mcp-server'],
      }
    }
  }
}
```

---

### `SubagentRegistry`

A collection of named subagents.

```typescript
type SubagentRegistry = Record<string, NamedSubagent>
```

#### Example

```typescript
const registry: SubagentRegistry = {
  'test-runner': {
    system: 'You run tests...',
    permissions: [...]
  },
  'code-reviewer': {
    system: 'You review code...',
    permissions: [...]
  }
}
```

---

### `RunSubagentOptions`

Configuration options for subagent execution.

```typescript
interface RunSubagentOptions {
  cwd?: string                  // Working directory
  onMessage?: (msg: any) => void // Message handler
  timeout?: number               // Timeout in milliseconds
}
```

---

## Message Types

Messages received via `onMessage` callback:

### Text Message

```typescript
{
  type: 'text',
  text: string
}
```

### Result Message

```typescript
{
  type: 'result',
  result: string
}
```

### Tool Use Message

```typescript
{
  type: 'tool_use',
  tool: string,
  input: any
}
```

---

## MCP Server API

When running as an MCP server, the following tools are exposed:

### Tool Format

Each subagent is exposed as `subagent_<name>`:

```json
{
  "name": "subagent_test-runner",
  "description": "Test Runner",
  "inputSchema": {
    "type": "object",
    "properties": {
      "goal": {
        "type": "string",
        "description": "The task or goal for this subagent to accomplish"
      },
      "cwd": {
        "type": "string",
        "description": "Working directory (optional)"
      }
    },
    "required": ["goal"]
  }
}
```

### Tool Invocation

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "subagent_test-runner",
    "arguments": {
      "goal": "Run all tests and fix failures",
      "cwd": "/path/to/project"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "All tests passed successfully."
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error: Unknown subagent: invalid-name"
      }
    ],
    "isError": true
  }
}
```

---

## CLI Usage

### Command Format

```bash
npm run dev <subagent-name> "<goal>" [cwd]
```

### Arguments

- `subagent-name` - Name of the subagent from the registry
- `goal` - Task description (quoted if contains spaces)
- `cwd` - Optional working directory (defaults to current directory)

### Examples

```bash
# Run test-runner
npm run dev test-runner "Run all unit tests"

# Run in specific directory
npm run dev migration-planner "Create migration plan" /path/to/project

# Run security audit
npm run dev security-auditor "Scan for vulnerabilities"
```

### Output

```
🤖 Running subagent: test-runner
📋 Goal: Run all unit tests
📁 Working directory: /path/to/project
────────────────────────────────────────────────────────────────────────────────
[streaming messages...]
────────────────────────────────────────────────────────────────────────────────
Subagent completed

📊 Result:
All tests passed successfully.
```

---

## Best Practices

### Permission Design

1. **Principle of Least Privilege**
   ```typescript
   // Start restrictive, then allow specific operations
   permissions: [
     createPermission('Read', 'allow'),           // Safe
     createPermission('Write', 'ask'),            // Controlled
     createPermission('Bash', 'deny')             // Restricted
   ]
   ```

2. **Specific Over General**
   ```typescript
   // Good: Specific patterns
   createPermission('Write', 'allow', { matches: { path: '**/*.test.*' } })
   
   // Avoid: Overly broad permissions
   createPermission('Write', 'allow')
   ```

3. **Order Matters**
   ```typescript
   // More specific rules first
   permissions: [
     createPermission('Write', 'deny', { matches: { path: 'config/prod.json' } }),
     createPermission('Write', 'ask', { matches: { path: 'config/**' } }),
     createPermission('Write', 'allow')
   ]
   ```

### Error Handling

```typescript
try {
  const result = await runSubagent(name, goal, registry, {
    timeout: 60000,
    onMessage: (msg) => {
      // Handle streaming messages
      if (msg.type === 'text') {
        console.log(msg.text)
      }
    }
  })
  return result
} catch (error) {
  if (error.message.includes('Unknown subagent')) {
    console.error('Subagent not found:', name)
  } else if (error.message.includes('aborted')) {
    console.error('Subagent timed out')
  } else {
    console.error('Execution failed:', error)
  }
  throw error
}
```

### Timeout Management

```typescript
// Short timeout for quick tasks
await runSubagent('quick-check', goal, registry, {
  timeout: 30000  // 30 seconds
})

// Longer timeout for complex analysis
await runSubagent('migration-planner', goal, registry, {
  timeout: 300000  // 5 minutes
})

// No timeout for user-supervised tasks
await runSubagent('interactive-agent', goal, registry)
```
