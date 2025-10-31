/**
 * Subagent Registry with capsule-based lazy discovery
 */

import type {
  SubagentCapsule,
  SubagentManifest,
  SearchSubagentsRequest,
  SearchSubagentsResponse,
  GetManifestRequest,
  ListSubagentsRequest,
  ListSubagentsResponse,
} from './types.js'

/**
 * In-memory registry that stores manifests and provides search capabilities
 */
export class SubagentRegistry {
  private manifests = new Map<string, SubagentManifest>()
  private capsules = new Map<string, SubagentCapsule>()
  private aliasMap = new Map<string, string>() // alias -> id
  private sessionCache = new Map<string, { capsules: SubagentCapsule[]; timestamp: number }>()
  private manifestCache = new Map<string, { manifest: SubagentManifest; timestamp: number }>()
  
  /** Cache TTL in milliseconds */
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  /** Maximum cached search results */
  private readonly MAX_SEARCH_CACHE = 20
  /** Maximum cached manifests */
  private readonly MAX_MANIFEST_CACHE = 5

  constructor(manifests: SubagentManifest[] = []) {
    for (const manifest of manifests) {
      this.register(manifest)
    }
  }

  /**
   * Register a new subagent manifest
   */
  register(manifest: SubagentManifest): void {
    this.manifests.set(manifest.id, manifest)
    
    // Create and cache capsule
    const capsule: SubagentCapsule = {
      id: manifest.id,
      aliases: manifest.aliases,
      summary: manifest.summary,
      tags: manifest.tags,
      latencyClass: manifest.latencyClass,
      capabilities: manifest.capabilities,
    }
    this.capsules.set(manifest.id, capsule)
    
    // Register aliases
    if (manifest.aliases) {
      for (const alias of manifest.aliases) {
        this.aliasMap.set(alias.toLowerCase(), manifest.id)
      }
    }
    // Also register id as alias
    this.aliasMap.set(manifest.id.toLowerCase(), manifest.id)
  }

  /**
   * Resolve alias or ID to canonical ID
   */
  private resolveId(idOrAlias: string): string | undefined {
    return this.aliasMap.get(idOrAlias.toLowerCase())
  }

  /**
   * Search for relevant subagents using keyword and tag matching
   */
  search(request: SearchSubagentsRequest): SearchSubagentsResponse {
    const startTime = Date.now()
    const k = request.k ?? 5
    const query = request.query.toLowerCase()
    const queryWords = query.split(/\s+/).filter(w => w.length > 2)
    
    // Check cache
    const cacheKey = JSON.stringify({
      query: request.query,
      k,
      tags: request.tags,
      latencyClass: request.latencyClass,
    })
    const cached = this.sessionCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        capsules: cached.capsules.slice(0, k),
        total: cached.capsules.length,
        diagnostics: {
          searchMethod: 'keyword',
          durationMs: Date.now() - startTime,
          cacheHit: true,
        },
      }
    }

    // Score all capsules
    const scored: Array<{ capsule: SubagentCapsule; score: number }> = []
    
    for (const capsule of this.capsules.values()) {
      // Filter by latency class if specified
      if (request.latencyClass && capsule.latencyClass !== 'both' && 
          capsule.latencyClass !== request.latencyClass) {
        continue
      }
      
      // Filter by tags if specified
      if (request.tags && request.tags.length > 0) {
        const hasTag = request.tags.some(tag => capsule.tags.includes(tag))
        if (!hasTag) continue
      }
      
      // Filter by host compatibility
      if (request.hostCaps) {
        const manifest = this.manifests.get(capsule.id)
        if (manifest?.hostCompatibility) {
          // Check SCM compatibility
          if (request.hostCaps.scm && manifest.hostCompatibility.scm) {
            const hasCompatibleScm = request.hostCaps.scm.some(scm =>
              manifest.hostCompatibility!.scm!.includes(scm)
            )
            if (!hasCompatibleScm) continue
          }
          
          // Check OS compatibility
          if (request.hostCaps.os && manifest.hostCompatibility.os) {
            if (!manifest.hostCompatibility.os.includes(request.hostCaps.os as any)) {
              continue
            }
          }
          
          // Check GUI requirement
          if (!request.hostCaps.hasGui && manifest.hostCompatibility.needsGui) {
            continue
          }
        }
      }
      
      // Calculate relevance score
      let score = 0
      
      // Exact ID or alias match (highest priority)
      if (capsule.id.toLowerCase() === query || 
          capsule.aliases?.some(a => a.toLowerCase() === query)) {
        score += 100
      }
      
      // Tag matching
      for (const tag of capsule.tags) {
        if (query.includes(tag.toLowerCase())) {
          score += 20
        }
        for (const word of queryWords) {
          if (tag.toLowerCase().includes(word)) {
            score += 5
          }
        }
      }
      
      // Summary keyword matching
      const summaryLower = capsule.summary.toLowerCase()
      for (const word of queryWords) {
        if (summaryLower.includes(word)) {
          score += 10
        }
      }
      
      // Capability matching
      if (capsule.capabilities) {
        for (const cap of capsule.capabilities) {
          if (query.includes(cap.toLowerCase())) {
            score += 15
          }
        }
      }
      
      // Boost by telemetry if available
      const manifest = this.manifests.get(capsule.id)
      if (manifest?.telemetry?.successScore) {
        score *= (0.8 + 0.2 * manifest.telemetry.successScore)
      }
      
      if (score > 0) {
        scored.push({ capsule, score })
      }
    }
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)
    
    // Take top K
    const topCapsules = scored.slice(0, k).map(s => s.capsule)
    
    // Cache results
    this.pruneCache(this.sessionCache, this.MAX_SEARCH_CACHE)
    this.sessionCache.set(cacheKey, {
      capsules: topCapsules,
      timestamp: Date.now(),
    })
    
    return {
      capsules: topCapsules,
      total: scored.length,
      diagnostics: {
        searchMethod: 'keyword',
        durationMs: Date.now() - startTime,
        cacheHit: false,
      },
    }
  }

  /**
   * Get full manifest by ID or alias
   */
  getManifest(request: GetManifestRequest): SubagentManifest | undefined {
    const id = this.resolveId(request.id)
    if (!id) return undefined
    
    // Check cache
    const cached = this.manifestCache.get(id)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.manifest
    }
    
    const manifest = this.manifests.get(id)
    if (manifest) {
      // Cache the manifest
      this.pruneCache(this.manifestCache, this.MAX_MANIFEST_CACHE)
      this.manifestCache.set(id, {
        manifest,
        timestamp: Date.now(),
      })
    }
    
    return manifest
  }

  /**
   * List all subagents with pagination
   */
  list(request: ListSubagentsRequest = {}): ListSubagentsResponse {
    const pageSize = request.pageSize ?? 50
    const offset = request.offset ?? 0
    
    let capsules = Array.from(this.capsules.values())
    
    // Filter by tags if specified
    if (request.tags && request.tags.length > 0) {
      capsules = capsules.filter(capsule =>
        request.tags!.some(tag => capsule.tags.includes(tag))
      )
    }
    
    const total = capsules.length
    const paginated = capsules.slice(offset, offset + pageSize)
    
    return {
      capsules: paginated,
      total,
      hasMore: offset + pageSize < total,
    }
  }

  /**
   * Get all capsules (for debugging/admin)
   */
  getAllCapsules(): SubagentCapsule[] {
    return Array.from(this.capsules.values())
  }

  /**
   * Get all manifests (for debugging/admin)
   */
  getAllManifests(): SubagentManifest[] {
    return Array.from(this.manifests.values())
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.sessionCache.clear()
    this.manifestCache.clear()
  }

  /**
   * Prune cache to max size (LRU eviction)
   */
  private pruneCache<T>(cache: Map<string, { timestamp: number } & T>, maxSize: number): void {
    if (cache.size >= maxSize) {
      // Find oldest entry
      let oldestKey: string | undefined
      let oldestTime = Infinity
      
      for (const [key, value] of cache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp
          oldestKey = key
        }
      }
      
      if (oldestKey) {
        cache.delete(oldestKey)
      }
    }
  }

  /**
   * Update telemetry data for a subagent
   */
  updateTelemetry(id: string, success: boolean, latencyMs: number): void {
    const manifest = this.manifests.get(id)
    if (!manifest) return
    
    if (!manifest.telemetry) {
      manifest.telemetry = {
        successScore: success ? 1 : 0,
        typicalLatencyMs: latencyMs,
        invocationCount: 1,
        lastInvoked: new Date().toISOString(),
      }
    } else {
      const count = (manifest.telemetry.invocationCount ?? 0) + 1
      const prevSuccess = manifest.telemetry.successScore ?? 0.5
      
      // Exponential moving average
      manifest.telemetry.successScore = prevSuccess * 0.9 + (success ? 1 : 0) * 0.1
      manifest.telemetry.typicalLatencyMs = 
        ((manifest.telemetry.typicalLatencyMs ?? latencyMs) * 0.9) + (latencyMs * 0.1)
      manifest.telemetry.invocationCount = count
      manifest.telemetry.lastInvoked = new Date().toISOString()
    }
  }
}
