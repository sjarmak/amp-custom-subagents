#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { runSubagent } from './index.js'
import { subagents } from './subagents.js'

const server = new Server(
  {
    name: 'custom-subagents',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(subagents).map(([name, config]) => ({
    name: `subagent_${name}`,
    description: config.system.split('\n')[0].replace('You are the ', '').replace(' subagent.', ''),
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The task or goal for this subagent to accomplish',
        },
        context: {
          type: 'string',
          description: 'Relevant conversation history or context for the task (optional)',
        },
        cwd: {
          type: 'string',
          description: 'Working directory (optional, defaults to current directory)',
        },
      },
      required: ['goal'],
    },
  }))

  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name
  
  if (!toolName.startsWith('subagent_')) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  const subagentName = toolName.replace('subagent_', '')
  const { goal, context, cwd } = request.params.arguments as { 
    goal: string
    context?: string
    cwd?: string 
  }

  if (!goal) {
    throw new Error('Missing required argument: goal')
  }

  try {
    const result = await runSubagent(subagentName, goal, subagents, {
      cwd: cwd || process.cwd(),
      context,
    })

    // Return structured JSON for programmatic access by main agent
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Custom Subagents MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
