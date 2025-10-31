#!/usr/bin/env node

/**
 * MCP Server for Subagent Registry
 * 
 * Exposes three main tools:
 * - search_subagents: Find relevant subagents by natural language query
 * - get_subagent_manifest: Get full manifest for a selected subagent
 * - list_subagents: Browse all available subagents with pagination
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SubagentRegistry } from './registry.js'
import { loadManifestsFromRegistry } from './manifest-loader.js'

async function main() {
  const server = new Server(
    {
      name: 'subagent-registry',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Load manifests from the legacy subagents.ts registry
  const manifests = await loadManifestsFromRegistry()
  const registry = new SubagentRegistry(manifests)

  // Define available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_subagents',
        description: 
          'Search for relevant subagents using natural language. ' +
          'Returns small capsules (1-2 line summaries) of matching subagents. ' +
          'Use this when the user request maps to a specialized task but you need to find the right subagent. ' +
          'After getting results, use get_subagent_manifest to load the full details of the selected subagent(s).',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language description of the task or capability needed',
            },
            k: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5 for outer loop, 3 for inner loop)',
              default: 5,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific tags (e.g., ["security", "testing"])',
            },
            latencyClass: {
              type: 'string',
              enum: ['inner', 'outer', 'both'],
              description: 'Filter by latency class: inner (fast, <5s), outer (thorough, >5s), or both',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_subagent_manifest',
        description:
          'Get the full manifest for a specific subagent by ID or alias. ' +
          'Use this after search_subagents to load complete details including system prompt, ' +
          'permissions, tool requirements, and configuration. ' +
          'Only call this for subagents you plan to invoke.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Subagent ID or alias (from search_subagents results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_subagents',
        description:
          'List all available subagents with pagination. ' +
          'Returns capsules without full manifests. ' +
          'Useful for browsing or when you want to see all options.',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
              default: 50,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
              default: 0,
            },
          },
        },
      },
      {
        name: 'invoke_subagent',
        description:
          'Invoke a subagent to perform a specialized task. ' +
          'Use this after you have identified the right subagent (via search or explicit user request). ' +
          'The subagent will execute with its own system prompt, tools, and permissions. ' +
          'Returns structured result with summary, transcript, and file changes.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Subagent ID or alias to invoke',
            },
            goal: {
              type: 'string',
              description: 'Task description for the subagent to accomplish',
            },
            context: {
              type: 'string',
              description: 'Optional context from the conversation to pass to the subagent',
            },
            cwd: {
              type: 'string',
              description: 'Working directory (defaults to current directory)',
            },
            timeoutMs: {
              type: 'number',
              description: 'Timeout in milliseconds (optional)',
            },
          },
          required: ['id', 'goal'],
        },
      },
    ],
  }))

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      if (name === 'search_subagents') {
        const result = registry.search(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      if (name === 'get_subagent_manifest') {
        const manifest = registry.getManifest(args as any)
        if (!manifest) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Subagent not found: ${(args as any).id}`,
                  available: registry.getAllCapsules().map(c => ({
                    id: c.id,
                    aliases: c.aliases,
                  })),
                }),
              },
            ],
            isError: true,
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(manifest, null, 2),
            },
          ],
        }
      }

      if (name === 'list_subagents') {
        const result = registry.list(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      if (name === 'invoke_subagent') {
        // Import dynamically to avoid circular dependencies
        const { runSubagentFromManifest } = await import('./runner.js')
        const manifest = registry.getManifest({ id: (args as any).id })
        
        if (!manifest) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Subagent not found: ${(args as any).id}`,
                }),
              },
            ],
            isError: true,
          }
        }

        const startTime = Date.now()
        try {
          const result = await runSubagentFromManifest(manifest, (args as any).goal, {
            context: (args as any).context,
            cwd: (args as any).cwd,
            timeout: (args as any).timeoutMs,
          })
          
          const latencyMs = Date.now() - startTime
          registry.updateTelemetry(manifest.id, true, latencyMs)
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        } catch (error) {
          const latencyMs = Date.now() - startTime
          registry.updateTelemetry(manifest.id, false, latencyMs)
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                  subagentId: manifest.id,
                }),
              },
            ],
            isError: true,
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      }
    }
  })

  // Start server
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Log startup to stderr (stdout is reserved for MCP protocol)
  console.error('Subagent Registry MCP Server started')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
