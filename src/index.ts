import { execute, createPermission, type MCPConfig } from '@sourcegraph/amp-sdk'

export type NamedSubagent = {
  system: string
  mcp?: MCPConfig
  permissions?: ReturnType<typeof createPermission>[]
}

export type SubagentRegistry = Record<string, NamedSubagent>

export interface RunSubagentOptions {
  cwd?: string
  context?: string
  onMessage?: (msg: any) => void
  timeout?: number
}

export interface SubagentResult {
  summary: string
  transcript: string[]
  filesChanged: string[]
  metadata: {
    subagentName: string
    goal: string
    startTime: string
    endTime: string
    duration: number
  }
}

export async function runSubagent(
  name: string,
  userGoal: string,
  registry: SubagentRegistry,
  options: RunSubagentOptions = {}
): Promise<SubagentResult> {
  const agent = registry[name]
  if (!agent) {
    throw new Error(`Unknown subagent: ${name}. Available: ${Object.keys(registry).join(', ')}`)
  }

  const { cwd = process.cwd(), context, onMessage, timeout } = options
  const startTime = new Date()
  const transcript: string[] = []
  const filesChanged = new Set<string>()

  let prompt = agent.system + '\n\n'
  
  if (context) {
    prompt += `CONVERSATION CONTEXT:\n${context}\n\n`
  }
  
  prompt +=
    `Main agent: spawn a subagent with this system role and have it complete the goal:\n` +
    `GOAL: ${userGoal}\n\n` +
    `When complete, provide:\n` +
    `1. A concise summary of what you accomplished\n` +
    `2. A list of files you modified (if any)\n` +
    `3. Any important notes for the main agent`

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
      // Track transcript and file changes
      if ('text' in msg) {
        transcript.push((msg as any).text)
      }
      
      // Track file changes from tool use
      if ('tool' in msg) {
        const toolMsg = msg as any
        if (toolMsg.tool === 'edit_file' || toolMsg.tool === 'create_file') {
          filesChanged.add(toolMsg.input?.path)
        }
      }

      if (onMessage) {
        onMessage(msg)
      }

      if (msg.type === 'result') {
        const endTime = new Date()
        const resultMsg = msg as any
        return {
          summary: resultMsg.result || resultMsg.error || 'Task completed',
          transcript,
          filesChanged: Array.from(filesChanged).filter(Boolean),
          metadata: {
            subagentName: name,
            goal: userGoal,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: endTime.getTime() - startTime.getTime(),
          },
        }
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
