# Custom Named Subagents with Amp SDK

This project demonstrates how to emulate **named custom subagents** (similar to Claude's subagent feature) using Amp's SDK. Instead of pre-registering subagents, this pattern allows you to dynamically define and invoke specialized AI agents with their own system prompts, tool permissions, and MCP configurations.

## Overview

Custom subagents let you:
- **Define specialized roles** with specific system prompts
- **Control tool access** via fine-grained permission scoping
- **Isolate context** for focused task execution
- **Reuse agent patterns** across different projects

## Installation

```bash
# Clone the repository
git clone https://github.com/sjarmak/amp-custom-subagents
cd custom-subagent

# Install dependencies
npm install

# Optional: Install globally to use as MCP server
npm install -g .
```

## Prerequisites

- **Node.js** 18+ or 20+ (recommended)
- **Amp SDK** (installed automatically as dependency)
- **TypeScript** 5.0+ (for development)
- **MCP SDK** (for MCP server functionality)

## Quick Start

### Using in Amp Conversations (MCP Server)

The easiest way to use these subagents is directly in Amp conversations:

```bash
# Install globally
npm install -g .

# Configure Amp (add to VS Code settings.json)
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "custom-subagents-mcp"
    }
  }
}

# Restart Amp, then in any conversation:
"Use the test-runner subagent to run my tests"
"Ask the documentation-writer to create API docs"
"Have the security-auditor scan this code"
```

See [SETUP.md](SETUP.md) for detailed configuration options.

### Using the CLI

```bash
# Run the test-runner subagent
npm run dev test-runner "Run unit tests and fix any failures"

# Run the migration-planner subagent
npm run dev migration-planner "Plan migration from CommonJS to ESM"

# Run the security-auditor subagent
npm run dev security-auditor "Audit codebase for security issues"
```

### Programmatic Usage

```typescript
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

const result = await runSubagent(
  'test-runner',
  'Run all tests and report results',
  subagents,
  {
    cwd: process.cwd(),
    onMessage: (msg) => console.log(msg),
    timeout: 60000,
  }
)

console.log(result)
```

## How It Works

### 1. Define Subagent Registry

Each subagent has:
- **system**: Role description and behavioral rules
- **permissions**: Tool access controls (allow/deny/ask)
- **mcp**: Optional MCP server configurations

```typescript
import { createPermission, type SubagentRegistry } from './index.js'

export const subagents: SubagentRegistry = {
  'my-subagent': {
    system: `You are a specialized subagent. Your rules: ...`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Write', 'ask', { matches: { path: '**/*.test.*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } }),
    ],
  },
}
```

### 2. Run Subagent

The `runSubagent` function:
1. Validates the subagent exists
2. Constructs a prompt with system role + user goal + optional conversation context
3. Executes via Amp SDK with scoped permissions
4. Returns structured result with summary, transcript, file changes, and metadata

```typescript
export async function runSubagent(
  name: string,
  userGoal: string,
  registry: SubagentRegistry,
  options?: RunSubagentOptions
): Promise<SubagentResult>
```

### 3. Permission Scoping

Permissions control tool access:

```typescript
// Allow all Read operations
createPermission('Read', 'allow')

// Ask before writing to source files
createPermission('Write', 'ask', { matches: { path: '**/src/**' } })

// Deny all Write operations
createPermission('Write', 'deny')

// Allow specific bash commands
createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } })
```

## MCP Integration

This project includes an MCP server that exposes all subagents as tools Amp can use directly.

### Available MCP Tools

When configured, Amp can access:
- `subagent_test-runner`
- `subagent_migration-planner`
- `subagent_security-auditor`
- `subagent_documentation-writer`
- `subagent_refactor-assistant`

### MCP Response Format

Subagents return structured JSON through MCP:

```json
{
  "summary": "Task completion summary",
  "filesChanged": ["path/to/file1.ts", "path/to/file2.ts"],
  "transcript": ["execution log line 1", "line 2"],
  "metadata": {
    "subagentName": "test-runner",
    "goal": "Run unit tests",
    "startTime": "2025-10-27T03:00:00.000Z",
    "endTime": "2025-10-27T03:01:00.000Z",
    "duration": 60000
  }
}
```

The main agent can parse this JSON to programmatically access results.

### Example Amp Conversations

```
You: Use the test-runner subagent to fix failing tests
Amp: [invokes subagent_test-runner tool, receives JSON response]
     [parses result.filesChanged to see what was modified]

You: Create migration plan with migration-planner
Amp: [invokes subagent_migration-planner tool]
     [reads result.summary for the plan]
```

## Built-in Subagents

### test-runner
Runs tests and stabilizes failures without refactoring.

**Permissions:**
- Run test commands (npm/yarn/pnpm/bun test)
- Read all files
- Ask before modifying test files or source code

**Example:**
```bash
npm run example:test-runner
```

### migration-planner
Analyzes codebases and produces detailed migration plans (read-only).

**Permissions:**
- Read all files
- Run git commands
- **Deny** all write operations

**Example:**
```bash
npm run example:migration
```

### security-auditor
Scans for vulnerabilities and compliance issues (read-only).

**Permissions:**
- Read all files
- Run npm audit and git log
- **Deny** all write operations

**Example:**
```bash
npm run example:security
```

### documentation-writer
Generates and updates technical documentation.

**Permissions:**
- Read all files
- Ask before modifying markdown and docs
- **Deny** modifying source code

### refactor-assistant
Improves code quality without changing behavior.

**Permissions:**
- Read all files
- Ask before any write operation
- Run tests and build commands

## Creating Custom Subagents

### Step 1: Define Your Subagent

Add to `src/subagents.ts`:

```typescript
export const subagents: SubagentRegistry = {
  'my-custom-agent': {
    system: `You are a specialized agent for [purpose].
Rules:
- [Rule 1]
- [Rule 2]
- [Rule 3]`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Write', 'ask'),
    ],
    mcp: {
      // Optional MCP server configuration
      servers: {
        'my-mcp-server': {
          command: 'npx',
          args: ['-y', 'my-mcp-server'],
        },
      },
    },
  },
}
```

### Step 2: Invoke Your Subagent

```typescript
const result = await runSubagent(
  'my-custom-agent',
  'Your task description',
  subagents
)
```

## Advanced Configuration

### MCP Integration

Connect MCP servers to subagents:

```typescript
{
  'database-agent': {
    system: 'You query databases and generate reports.',
    mcp: {
      servers: {
        'postgres-mcp': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-postgres'],
          env: {
            DATABASE_URL: process.env.DATABASE_URL,
          },
        },
      },
    },
  },
}
```

### Timeout Control

```typescript
await runSubagent('my-agent', 'task', subagents, {
  timeout: 120000, // 2 minutes
})
```

### Message Streaming

```typescript
await runSubagent('my-agent', 'task', subagents, {
  onMessage: (msg) => {
    if (msg.type === 'text') {
      console.log(msg.text)
    }
  },
})
```

## Permission Patterns

### Read-Only Analyst
```typescript
permissions: [
  createPermission('Read', 'allow'),
  createPermission('Bash', 'allow', { matches: { cmd: 'git*' } }),
  createPermission('Write', 'deny'),
]
```

### Cautious Writer
```typescript
permissions: [
  createPermission('Read', 'allow'),
  createPermission('Write', 'ask'),
  createPermission('Bash', 'deny'),
]
```

### Test Runner
```typescript
permissions: [
  createPermission('Read', 'allow'),
  createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } }),
  createPermission('Write', 'ask', { matches: { path: '**/*.test.*' } }),
]
```

## API Reference

### `runSubagent(name, userGoal, registry, options?)`

Executes a named subagent with the specified goal.

**Parameters:**
- `name`: Subagent identifier from registry
- `userGoal`: Task description for the subagent
- `registry`: SubagentRegistry object
- `options`:
  - `cwd`: Working directory (default: `process.cwd()`)
  - `onMessage`: Message handler callback
  - `timeout`: Execution timeout in milliseconds

**Returns:** `Promise<string>` - Subagent result

### `createPermission(tool, action, options?)`

Creates a permission rule for tool access control.

**Parameters:**
- `tool`: Tool name (`'Read'`, `'Write'`, `'Bash'`, etc.)
- `action`: `'allow'` | `'deny'` | `'ask'`
- `options`:
  - `matches`: Pattern matching rules
    - `path`: File path pattern (for Read/Write)
    - `cmd`: Command pattern (for Bash)

## Compatibility

This implementation aligns with:
- [Amp SDK Documentation](https://ampcode.com/manual)
- Amp's permission system
- MCP configuration standards
- Amp's subagent execution model

## Examples

### Programmatic Examples

Run pre-built examples:

```bash
npm run example:test-runner      # Test execution agent
npm run example:migration        # Migration planning agent
npm run example:security         # Security audit agent
npm run example:documentation    # Documentation writer
npm run example:refactor         # Refactor assistant
npm run example:custom           # Custom subagent creation
```

See [EXAMPLES.md](EXAMPLES.md) for detailed usage examples and patterns.

### MCP Server Examples

```bash
# Test the MCP server
npm run mcp

# In another terminal, send a test request:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run mcp
```

## Contributing

To add new subagents:
1. Define in `src/subagents.ts`
2. Create example in `src/examples/`
3. Add npm script to `package.json`
4. Update documentation as needed

## Troubleshooting

### Common Issues

**Problem: Subagent not found**
```bash
Error: Unknown subagent: my-agent
```
Solution: Check spelling and verify the subagent exists in `src/subagents.ts`

**Problem: Permission denied**
```bash
Error: Permission denied for tool Write
```
Solution: Check the subagent's permissions array. You may need to approve the action or adjust permissions.

**Problem: Timeout errors**
```bash
Error: Operation aborted
```
Solution: Increase timeout in `runSubagent()` options: `{ timeout: 120000 }`

**Problem: MCP server not loading**
```bash
MCP server failed to start
```
Solution: 
- Verify installation: `npm run mcp`
- Check Amp settings.json configuration
- Ensure Node.js and dependencies are installed

## Quick Reference

### Command Summary

```bash
# Install globally
npm install -g .

# Run subagent via CLI
npm run dev <subagent-name> "<goal>"

# Run examples
npm run example:test-runner
npm run example:migration
npm run example:security

# Start MCP server
npm run mcp
```

### Available Subagents

| Subagent | Purpose | Permissions |
|----------|---------|-------------|
| `test-runner` | Run and fix tests | Read, ask before write, test commands only |
| `migration-planner` | Create migration plans | Read-only, no code changes |
| `security-auditor` | Security vulnerability scanning | Read-only, audit commands only |
| `documentation-writer` | Generate/update docs | Read, ask before writing docs |
| `refactor-assistant` | Improve code quality | Read, ask before write, build/test commands |

### Permission Patterns

```typescript
// Allow unrestricted
createPermission('Read', 'allow')

// Ask before allowing
createPermission('Write', 'ask')

// Deny silently
createPermission('Bash', 'deny')

// Pattern matching
createPermission('Write', 'ask', { matches: { path: '**/*.test.*' } })
createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } })
```

## Documentation

- [Setup Guide](SETUP.md) - Installation and configuration
- [API Reference](API.md) - Complete API documentation
- [Architecture Guide](ARCHITECTURE.md) - Technical design and patterns
- [Usage Examples](EXAMPLES.md) - Practical examples and use cases

## External Resources

- [Amp SDK Documentation](https://ampcode.com/manual)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Contributing

Contributions welcome! To add new subagents:

1. Define in [src/subagents.ts](src/subagents.ts)
2. Create example in `src/examples/`
3. Add npm script to [package.json](package.json)
4. Update [EXAMPLES.md](EXAMPLES.md) with usage patterns

## License

MIT
