# Setup Guide: Using Subagents in Amp Conversations

This guide explains how to configure and use custom subagents in Amp conversations via the MCP (Model Context Protocol) server.

## Quick Setup

### Option 1: Global Installation (Recommended)

```bash
# Install globally
npm install -g .

# Add to Amp settings (VS Code)
# Open settings.json and add:
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "custom-subagents-mcp"
    }
  }
}
```

### Option 2: Local Development

```bash
# From this directory
npm install

# Add to Amp settings (VS Code)
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "node",
      "args": [
        "--loader",
        "tsx",
        "/Users/sjarmak/custom-subagent/src/mcp-server.ts"
      ]
    }
  }
}
```

### Option 3: Using npx

```bash
# No installation needed
# Add to Amp settings:
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "npx",
      "args": ["-y", "custom-subagents-mcp"],
      "cwd": "/Users/sjarmak/custom-subagent"
    }
  }
}
```

## Using in Amp Conversations

Once configured, you can invoke subagents directly in Amp:

```
You: Use the documentation-writer subagent to create API docs for src/index.ts

Amp: [invokes subagent_documentation-writer tool]
```

### Available Subagent Tools

- `subagent_test-runner` - Run and stabilize tests
- `subagent_migration-planner` - Create migration plans
- `subagent_security-auditor` - Security vulnerability scanning
- `subagent_documentation-writer` - Generate documentation
- `subagent_refactor-assistant` - Code quality improvements

## CLI Configuration

### VS Code Settings

```json
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "custom-subagents-mcp"
    }
  }
}
```

### Cursor Settings

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "custom-subagents": {
      "command": "custom-subagents-mcp"
    }
  }
}
```

### Amp CLI

```bash
# Add MCP server
amp mcp add custom-subagents --command custom-subagents-mcp

# List available servers
amp mcp list

# Test the server
amp mcp test custom-subagents
```

## Verification

Test that it's working:

```bash
# Start Amp and ask:
"List available MCP tools"

# You should see:
# - subagent_test-runner
# - subagent_migration-planner
# - subagent_security-auditor
# - subagent_documentation-writer
# - subagent_refactor-assistant
```

## Example Conversations

### Test Runner
```
You: Run the tests and fix any failures using the test-runner subagent

Amp: I'll use the test-runner subagent to run tests and fix failures.
[calls subagent_test-runner with goal: "Run all tests and fix failures"]
```

### Documentation
```
You: Generate README documentation for this project using the documentation-writer

Amp: [calls subagent_documentation-writer with goal: "Generate comprehensive README"]
```

### Security Audit
```
You: Audit this codebase for security issues

Amp: [calls subagent_security-auditor with goal: "Perform security audit"]
```

## Troubleshooting

### MCP server not showing up
```bash
# Check Amp logs
amp logs

# Verify server is executable
npm run mcp

# Test manually
echo '{"method":"tools/list"}' | npm run mcp
```

### Permission errors
```bash
# Make script executable
chmod +x src/mcp-server.ts
```

### TypeScript errors
```bash
# Install dependencies
npm install

# Verify TypeScript setup
npx tsc --noEmit
```

### Module not found errors
```bash
# Ensure you're using Node.js 18+ with ESM support
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Advanced Configuration

### Custom Working Directory

```json
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "custom-subagents-mcp",
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Environment Variables

```json
{
  "amp.mcpServers": {
    "custom-subagents": {
      "command": "custom-subagents-mcp",
      "env": {
        "DEBUG": "true",
        "LOG_LEVEL": "verbose"
      }
    }
  }
}
```

## Testing Your Setup

### Verify MCP Server is Running

```bash
# Test the MCP server directly
npm run mcp

# In another terminal, send a test request
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm run mcp
```

Expected output should include all subagent tools:
```json
{
  "tools": [
    {"name": "subagent_test-runner", ...},
    {"name": "subagent_migration-planner", ...},
    ...
  ]
}
```

### Verify in Amp

1. Open Amp and start a new conversation
2. Ask Amp: "What MCP tools are available?"
3. Confirm you see the custom subagent tools listed
4. Try invoking one: "Use the documentation-writer to analyze this project"

## Next Steps

1. Restart Amp/VS Code after configuration
2. Try invoking a subagent in conversation
3. Create custom subagents in `src/subagents.ts`
4. Share your subagent registry with your team
5. Read [ARCHITECTURE.md](ARCHITECTURE.md) for design patterns
6. Explore examples in `src/examples/`
