import { execute, createPermission, type MCPConfig } from '@sourcegraph/amp-sdk'

export type NamedSubagent = {
  system: string
  mcp?: MCPConfig
  permissions?: ReturnType<typeof createPermission>[]
}

export type SubagentRegistry = Record<string, NamedSubagent>

export interface RunSubagentOptions {
  cwd?: string
  onMessage?: (msg: any) => void
  timeout?: number
}

export async function runSubagent(
  name: string,
  userGoal: string,
  registry: SubagentRegistry,
  options: RunSubagentOptions = {}
): Promise<string> {
  const agent = registry[name]
  if (!agent) {
    throw new Error(`Unknown subagent: ${name}. Available: ${Object.keys(registry).join(', ')}`)
  }

  const prompt =
    `${agent.system}\n\n` +
    `Main agent: spawn a subagent with this system role and have it complete the goal:\n` +
    `GOAL: ${userGoal}\n\n` +
    `Return a compact result to the main thread.`

  const { cwd = process.cwd(), onMessage, timeout } = options

  const controller = new AbortController()
  let timeoutId: NodeJS.Timeout | undefined

  if (timeout) {
    timeoutId = setTimeout(() => controller.abort(), timeout)
  }

  try {
    for await (const msg of execute({
      prompt,
      options: {
        cwd,
        permissions: agent.permissions,
        mcpConfig: agent.mcp,
        dangerouslyAllowAll: false,
      },
      signal: controller.signal,
    })) {
      if (onMessage) {
        onMessage(msg)
      }

      if (msg.type === 'result') {
        return msg.result
      }
    }

    throw new Error('No result received from subagent')
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export { createPermission } from '@sourcegraph/amp-sdk'
