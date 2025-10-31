/**
 * Enhanced subagent runner with manifest support and tool wiring
 */

import { execute, type MCPConfig } from '@sourcegraph/amp-sdk'
import type { SubagentManifest } from './types.js'

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
    subagentId: string
    goal: string
    startTime: string
    endTime: string
    duration: number
  }
}

/**
 * Run a subagent from its manifest
 */
export async function runSubagentFromManifest(
  manifest: SubagentManifest,
  userGoal: string,
  options: RunSubagentOptions = {}
): Promise<SubagentResult> {
  const { cwd = process.cwd(), context, onMessage, timeout } = options
  const startTime = new Date()
  const transcript: string[] = []
  const filesChanged = new Set<string>()

  // Construct prompt with context budget awareness
  let prompt = manifest.systemPrompt + '\n\n'
  
  if (context) {
    const maxContextTokens = manifest.contextBudget?.maxSystemTokens ?? 2000
    // Rough token estimation: 1 token ≈ 4 chars
    const maxContextChars = maxContextTokens * 4
    const truncatedContext = context.length > maxContextChars 
      ? context.substring(0, maxContextChars) + '\n...(truncated)'
      : context
    
    prompt += `CONVERSATION CONTEXT:\n${truncatedContext}\n\n`
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
    // Wire up MCP config
    const mcpConfig = manifest.mcpConfig

    for await (const msg of execute({
      prompt,
      options: {
        cwd,
        permissions: manifest.permissions,
        mcpConfig,
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
            subagentId: manifest.id,
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

/**
 * Validate CLI tool availability (for future enforcement)
 */
export async function validateToolRequirements(manifest: SubagentManifest): Promise<{
  valid: boolean
  missing: string[]
  warnings: string[]
}> {
  const missing: string[] = []
  const warnings: string[] = []
  
  if (!manifest.toolRequirements?.cliAllowlist) {
    return { valid: true, missing, warnings }
  }
  
  // Check each required CLI tool
  for (const tool of manifest.toolRequirements.cliAllowlist) {
    try {
      const { execSync } = await import('child_process')
      execSync(`which ${tool.name}`, { stdio: 'ignore' })
    } catch {
      if (tool.installHint) {
        warnings.push(`${tool.name} not found. Install: ${tool.installHint}`)
      } else {
        missing.push(tool.name)
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}
