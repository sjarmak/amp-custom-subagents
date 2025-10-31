/**
 * Convert legacy subagent registry to new manifest format
 */

import type { SubagentManifest, LatencyClass } from './types.js'
import { subagents } from './subagents.js'

/**
 * Infer latency class from subagent characteristics
 */
function inferLatencyClass(name: string, system: string): LatencyClass {
  const lowerName = name.toLowerCase()
  const lowerSystem = system.toLowerCase()
  
  // Inner loop indicators (fast, focused tasks)
  if (
    lowerName.includes('search') ||
    lowerName.includes('quick') ||
    lowerName.includes('find') ||
    lowerSystem.includes('search') ||
    lowerSystem.includes('quick fix')
  ) {
    return 'inner'
  }
  
  // Outer loop indicators (planning, analysis, review)
  if (
    lowerName.includes('planner') ||
    lowerName.includes('architect') ||
    lowerName.includes('auditor') ||
    lowerName.includes('reviewer') ||
    lowerName.includes('reflector') ||
    lowerSystem.includes('plan') ||
    lowerSystem.includes('analyze') ||
    lowerSystem.includes('audit') ||
    lowerSystem.includes('review')
  ) {
    return 'outer'
  }
  
  // Default to both if unclear
  return 'both'
}

/**
 * Infer tags from subagent name and system prompt
 */
function inferTags(name: string, system: string): string[] {
  const tags: string[] = []
  const combined = `${name} ${system}`.toLowerCase()
  
  const tagPatterns: Record<string, string[]> = {
    testing: ['test', 'spec', 'jest', 'vitest'],
    security: ['security', 'audit', 'vulnerability', 'xss', 'sql injection'],
    documentation: ['doc', 'readme', 'comment'],
    refactoring: ['refactor', 'clean', 'quality'],
    migration: ['migrate', 'upgrade', 'convert'],
    'code-search': ['search', 'find code', 'locate'],
    architecture: ['architect', 'design', 'pattern'],
    debugging: ['debug', 'fix', 'diagnose'],
    devops: ['deploy', 'ci', 'cd', 'pipeline'],
    database: ['database', 'sql', 'query'],
    learning: ['reflect', 'insight', 'pattern', 'learn'],
    execution: ['execute', 'run', 'perform'],
  }
  
  for (const [tag, patterns] of Object.entries(tagPatterns)) {
    if (patterns.some(pattern => combined.includes(pattern))) {
      tags.push(tag)
    }
  }
  
  return tags.length > 0 ? tags : ['general']
}

/**
 * Extract summary from system prompt (first 1-2 sentences, max 200 chars)
 */
function extractSummary(system: string): string {
  const lines = system.split('\n').filter(line => line.trim())
  if (lines.length === 0) return ''
  
  // First line after "You are..." typically describes the role
  const firstLine = lines[0].replace(/^You are (the |a )?/, '').trim()
  
  // Limit to ~200 chars
  if (firstLine.length <= 200) return firstLine
  
  const truncated = firstLine.substring(0, 197) + '...'
  return truncated
}

/**
 * Infer capabilities from system prompt and permissions
 */
function inferCapabilities(name: string, system: string, permissions: any[]): string[] {
  const caps: string[] = []
  const combined = `${name} ${system}`.toLowerCase()
  
  // Check for specific capabilities
  if (combined.includes('read')) caps.push('read-files')
  if (combined.includes('write') || combined.includes('modify')) caps.push('write-files')
  if (combined.includes('test')) caps.push('run-tests')
  if (combined.includes('build')) caps.push('build')
  if (combined.includes('search')) caps.push('code-search')
  if (combined.includes('analyze')) caps.push('analysis')
  if (combined.includes('plan')) caps.push('planning')
  if (combined.includes('audit')) caps.push('audit')
  
  // Check permissions for CLI tools
  const hasGit = permissions.some(p => 
    JSON.stringify(p).includes('git')
  )
  if (hasGit) caps.push('git')
  
  const hasBash = permissions.some(p =>
    JSON.stringify(p).includes('Bash')
  )
  if (hasBash) caps.push('shell-commands')
  
  return caps
}

/**
 * Extract CLI allowlist from permissions
 */
function extractCliAllowlist(permissions: any[]): string[] {
  const tools = new Set<string>()
  
  for (const perm of permissions) {
    const permStr = JSON.stringify(perm)
    
    // Extract command patterns
    if (permStr.includes('"cmd"')) {
      const cmdMatch = permStr.match(/"cmd":\s*"([^"]+)"/)
      if (cmdMatch) {
        const cmd = cmdMatch[1]
        // Extract tool name (first word before * or space)
        const tool = cmd.split(/[\s*]/)[0]
        if (tool) tools.add(tool)
      }
    }
  }
  
  return Array.from(tools)
}

/**
 * Load manifests from legacy registry
 */
export async function loadManifestsFromRegistry(): Promise<SubagentManifest[]> {
  const manifests: SubagentManifest[] = []
  
  for (const [name, agent] of Object.entries(subagents)) {
    const latencyClass = inferLatencyClass(name, agent.system)
    const tags = inferTags(name, agent.system)
    const summary = agent.description || extractSummary(agent.system)
    const capabilities = inferCapabilities(name, agent.system, agent.permissions || [])
    const cliAllowlist = extractCliAllowlist(agent.permissions || [])
    
    const manifest: SubagentManifest = {
      id: name,
      aliases: [name],
      summary,
      description: agent.description || agent.system,
      tags,
      latencyClass,
      capabilities,
      systemPrompt: agent.system,
      permissions: agent.permissions,
      mcpConfig: agent.mcp,
      toolRequirements: cliAllowlist.length > 0 ? {
        cliAllowlist: cliAllowlist.map(tool => ({ name: tool })),
      } : undefined,
    }
    
    manifests.push(manifest)
  }
  
  return manifests
}
