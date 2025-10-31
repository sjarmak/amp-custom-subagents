/**
 * Type definitions for the subagent registry system with lazy discovery
 */

import type { MCPConfig } from '@sourcegraph/amp-sdk'

/**
 * Latency classification for routing decisions
 */
export type LatencyClass = 'inner' | 'outer' | 'both'

/**
 * Host compatibility specification
 */
export interface HostCompatibility {
  /** Supported source control management systems */
  scm?: ('github' | 'gitlab' | 'azure' | 'bitbucket')[]
  /** Supported operating systems */
  os?: ('linux' | 'darwin' | 'windows')[]
  /** Requires GUI/display server */
  needsGui?: boolean
}

/**
 * CLI tool specification
 */
export interface CLIToolSpec {
  /** Tool name (e.g., 'gh', 'az', 'src') */
  name: string
  /** Required version or version range (optional) */
  version?: string
  /** Installation command suggestion (optional) */
  installHint?: string
}

/**
 * MCP server requirement specification
 */
export interface MCPServerRequirement {
  /** MCP server identifier */
  id: string
  /** Required capabilities */
  capabilities?: string[]
  /** Whether this server is optional */
  optional?: boolean
}

/**
 * Required tools and resources for a subagent
 */
export interface ToolRequirements {
  /** CLI tools that must be available */
  cliAllowlist?: CLIToolSpec[]
  /** MCP servers needed by this subagent */
  mcpServers?: MCPServerRequirement[]
}

/**
 * Safety and permission policies
 */
export interface SafetyPolicy {
  /** How to handle destructive commands */
  destructiveCmdPolicy?: 'deny' | 'ask' | 'allow'
  /** Require confirmation before execution */
  confirmationRequired?: boolean
  /** Custom safety rules (natural language) */
  customRules?: string[]
}

/**
 * Context budget constraints
 */
export interface ContextBudget {
  /** Maximum tokens for system prompt */
  maxSystemTokens?: number
  /** Maximum conversation history messages */
  maxHistoryMessages?: number
  /** Maximum total context tokens */
  maxTotalTokens?: number
}

/**
 * Telemetry and performance data
 */
export interface TelemetryData {
  /** Success rate (0-1) */
  successScore?: number
  /** Typical execution time in milliseconds */
  typicalLatencyMs?: number
  /** Total invocation count */
  invocationCount?: number
  /** Last invocation timestamp */
  lastInvoked?: string
}

/**
 * Small capsule for discovery without full manifest loading
 * Kept minimal to avoid context pollution
 */
export interface SubagentCapsule {
  /** Unique identifier */
  id: string
  /** Alternative names/aliases */
  aliases?: string[]
  /** Very brief 1-2 line summary (<=200 tokens) */
  summary: string
  /** Categorization tags */
  tags: string[]
  /** Latency classification for routing */
  latencyClass: LatencyClass
  /** Capabilities keywords */
  capabilities?: string[]
}

/**
 * Full subagent manifest (loaded only when selected)
 */
export interface SubagentManifest {
  /** Unique identifier */
  id: string
  /** Alternative names/aliases for invocation */
  aliases?: string[]
  /** Owning team or individual */
  owner?: string
  /** Manifest version */
  version?: string
  
  /** Very brief summary (<=200 tokens) for capsule */
  summary: string
  /** Detailed description (<=800 tokens) */
  description: string
  /** Categorization and search tags */
  tags: string[]
  /** Latency class for routing decisions */
  latencyClass: LatencyClass
  /** Capability keywords */
  capabilities?: string[]
  
  /** System prompt snippet (role and rules) */
  systemPrompt: string
  /** Required tools and CLIs */
  toolRequirements?: ToolRequirements
  /** MCP configuration for this subagent */
  mcpConfig?: MCPConfig
  /** Permission rules (legacy amp-sdk format) */
  permissions?: any[]
  
  /** Context budget constraints */
  contextBudget?: ContextBudget
  /** Safety policies */
  safety?: SafetyPolicy
  /** Host compatibility requirements */
  hostCompatibility?: HostCompatibility
  /** Telemetry data */
  telemetry?: TelemetryData
}

/**
 * Search request for finding relevant subagents
 */
export interface SearchSubagentsRequest {
  /** Natural language query or task description */
  query: string
  /** Maximum number of results to return */
  k?: number
  /** Filter by tags */
  tags?: string[]
  /** Filter by available host capabilities */
  hostCaps?: {
    scm?: ('github' | 'gitlab' | 'azure' | 'bitbucket')[]
    availableTokens?: Record<string, boolean>
    os?: string
    hasGui?: boolean
  }
  /** Filter by latency class */
  latencyClass?: LatencyClass
}

/**
 * Search response containing capsules
 */
export interface SearchSubagentsResponse {
  /** Matching subagent capsules */
  capsules: SubagentCapsule[]
  /** Total results available */
  total: number
  /** Search diagnostics */
  diagnostics?: {
    searchMethod: 'embedding' | 'keyword' | 'hybrid'
    durationMs: number
    cacheHit: boolean
  }
}

/**
 * Request to get full manifest
 */
export interface GetManifestRequest {
  /** Subagent ID or alias */
  id: string
}

/**
 * List subagents request with pagination
 */
export interface ListSubagentsRequest {
  /** Filter by tags */
  tags?: string[]
  /** Page size */
  pageSize?: number
  /** Page offset */
  offset?: number
}

/**
 * List subagents response
 */
export interface ListSubagentsResponse {
  /** List of capsules */
  capsules: SubagentCapsule[]
  /** Total count */
  total: number
  /** Whether there are more results */
  hasMore: boolean
}
