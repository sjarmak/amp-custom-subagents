#!/usr/bin/env node
import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

/**
 * Example: Using the code-search-agent to search Azure DevOps repositories
 * 
 * This demonstrates how to use the specialized code search subagent to:
 * 1. Search for code patterns across multiple Azure DevOps repositories
 * 2. Find security vulnerabilities (e.g., SQL injection, hardcoded secrets)
 * 3. Locate specific functions or code patterns
 * 4. Get structured JSON results with file paths and line numbers
 */

async function main() {
  console.log('🔍 Code Search Agent Example\n')
  console.log('This example searches Azure DevOps repositories for SQL injection vulnerabilities\n')

  try {
    // Example 1: Search for SQL injection vulnerabilities
    console.log('Example 1: Searching for SQL injection vulnerabilities...\n')
    
    const context = `
Organization: https://dev.azure.com/sjarmak
Project: accumed-demo
Repositories: claims-api, patient-portal, medical-coding-ml, infrastructure

The user wants to find potential SQL injection vulnerabilities across all repositories.
Focus on: string concatenation in SQL queries, missing parameterization, unsafe query building.
`

    const result1 = await runSubagent(
      'code-search-agent',
      'Search for SQL injection vulnerabilities across all repositories in the accumed-demo project',
      subagents,
      {
        context,
        cwd: process.cwd(),
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('  [Search Agent]:', msg.text)
          }
        },
        timeout: 60000,
      }
    )

    console.log('\n📊 Results:')
    console.log('Summary:', result1.summary)
    console.log('Files changed:', result1.filesChanged.length)
    console.log('Duration:', result1.metadata.duration, 'ms\n')

    // Example 2: Search for hardcoded secrets
    console.log('\nExample 2: Searching for hardcoded secrets...\n')
    
    const context2 = `
Organization: https://dev.azure.com/sjarmak
Project: accumed-demo
Repositories: claims-api, patient-portal, medical-coding-ml

Search for hardcoded API keys, passwords, or tokens.
Patterns: API_KEY, password, token, secret, credentials
`

    const result2 = await runSubagent(
      'code-search-agent',
      'Find hardcoded secrets and API keys in source code',
      subagents,
      {
        context: context2,
        cwd: process.cwd(),
        timeout: 60000,
      }
    )

    console.log('\n📊 Results:')
    console.log('Summary:', result2.summary)
    console.log('\n')

    // Example 3: Search for specific function usage
    console.log('\nExample 3: Finding usage of a specific function...\n')
    
    const context3 = `
Organization: https://dev.azure.com/sjarmak
Project: accumed-demo
Repository: claims-api

Find all usages of the processPayment function.
`

    const result3 = await runSubagent(
      'code-search-agent',
      'Find all calls to processPayment function in claims-api',
      subagents,
      {
        context: context3,
        cwd: process.cwd(),
        timeout: 30000,
      }
    )

    console.log('\n📊 Results:')
    console.log('Summary:', result3.summary)

    console.log('\n✅ All search examples completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Error running code search agent:', error)
    process.exit(1)
  }
}

main()
