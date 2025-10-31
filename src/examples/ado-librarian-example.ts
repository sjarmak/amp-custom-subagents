#!/usr/bin/env node
import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

/**
 * Example: Using the ado-librarian subagent to search Azure DevOps repositories
 *
 * The ado-librarian specializes in:
 * - Multi-repository code search across Azure DevOps
 * - Finding cross-repository integrations
 * - Security vulnerability scanning
 * - Understanding code patterns at scale
 */

async function main() {
  console.log('🔍 Azure DevOps Librarian Example\n')

  // Example 1: Find cross-repository integrations
  console.log('Example 1: Finding how services integrate\n')
  const integrationResult = await runSubagent(
    'ado_librarian',
    'Find how the patient-portal, claims-api, and medical-coding-ml services integrate with each other. Show me the API calls, shared data structures, and integration points.',
    subagents,
    {
      cwd: process.cwd(),
      timeout: 60000,
      onMessage: (msg) => {
        if (msg.type === 'text') {
          console.log(msg.text)
        }
      },
    }
  )

  console.log('\n' + '='.repeat(80))
  console.log('📊 Integration Analysis Result:')
  console.log('='.repeat(80))
  console.log(integrationResult)

  // Example 2: Security scan across all repos
  console.log('\n\nExample 2: Security vulnerability scan\n')
  const securityResult = await runSubagent(
    'ado_librarian',
    'Scan all repositories for security issues: hardcoded secrets, SQL injection patterns, XSS vulnerabilities, and insecure authentication. Prioritize by severity.',
    subagents,
    {
      cwd: process.cwd(),
      timeout: 90000,
    }
  )

  console.log('\n' + '='.repeat(80))
  console.log('🔒 Security Scan Result:')
  console.log('='.repeat(80))
  console.log(securityResult)

  // Example 3: Find specific function usage across repos
  console.log('\n\nExample 3: Finding function usage patterns\n')
  const functionUsageResult = await runSubagent(
    'ado_librarian',
    'Find all places where authentication tokens are validated across the codebase. Show me the different validation approaches used in each service.',
    subagents,
    {
      cwd: process.cwd(),
      timeout: 60000,
    }
  )

  console.log('\n' + '='.repeat(80))
  console.log('🔑 Authentication Patterns Result:')
  console.log('='.repeat(80))
  console.log(functionUsageResult)
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
