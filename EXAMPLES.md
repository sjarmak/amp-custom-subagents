# Practical Examples

This document provides real-world examples of using custom subagents in various scenarios.

## Table of Contents

1. [Parallel Execution](#parallel-execution)
2. [Conditional Chains](#conditional-chains)
3. [Progress Tracking](#progress-tracking)
4. [Retry Logic](#retry-logic)
5. [Build Validation](#build-validation)
6. [CI/CD Integration](#cicd-integration)
7. [Development Workflows](#development-workflows)

---

## Parallel Execution

Run multiple subagents concurrently for faster results:

```typescript
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

async function parallelAnalysis() {
  console.log('Running parallel analysis...\n')

  const [securityReport, migrationPlan, testResults] = await Promise.all([
    runSubagent('security-auditor', 'Scan for vulnerabilities', subagents),
    runSubagent('migration-planner', 'Plan React 18 upgrade', subagents),
    runSubagent('test-runner', 'Run full test suite', subagents),
  ])

  return {
    security: securityReport,
    migration: migrationPlan,
    tests: testResults,
  }
}

// Usage
const results = await parallelAnalysis()
console.log('All analyses complete:', results)
```

---

## Conditional Chains

Execute subagents conditionally based on results:

```typescript
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

async function ciPipeline() {
  console.log('Starting CI pipeline...\n')

  // Step 1: Run tests
  console.log('Step 1: Running tests...')
  const testResult = await runSubagent(
    'test-runner',
    'Run all tests',
    subagents
  )

  if (testResult.includes('failed')) {
    console.error('❌ Tests failed, aborting pipeline')
    return { success: false, stage: 'tests' }
  }
  console.log('✓ Tests passed')

  // Step 2: Security audit
  console.log('Step 2: Security audit...')
  const securityResult = await runSubagent(
    'security-auditor',
    'Check for vulnerabilities',
    subagents
  )

  if (securityResult.includes('CRITICAL')) {
    console.error('❌ Critical security issues found')
    return { success: false, stage: 'security', details: securityResult }
  }
  console.log('✓ Security audit passed')

  // Step 3: Generate documentation
  console.log('Step 3: Updating documentation...')
  await runSubagent(
    'documentation-writer',
    'Update API documentation',
    subagents
  )
  console.log('✓ Documentation updated')

  console.log('\n✅ Pipeline completed successfully')
  return { success: true }
}

// Usage
const result = await ciPipeline()
console.log('Pipeline result:', result)
```

---

## Progress Tracking

Track progress for long-running subagent tasks:

```typescript
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

async function longRunningTask() {
  let progress = 0
  const steps = ['Analyzing', 'Planning', 'Validating', 'Complete']

  console.log('Starting migration analysis...\n')

  const result = await runSubagent(
    'migration-planner',
    'Analyze codebase for TypeScript migration',
    subagents,
    {
      timeout: 180000, // 3 minutes
      onMessage: (msg) => {
        if (msg.type === 'text') {
          // Log all messages
          console.log(`[Agent]: ${msg.text}`)

          // Track progress
          for (const step of steps) {
            if (msg.text.includes(step)) {
              const newProgress = steps.indexOf(step) + 1
              if (newProgress > progress) {
                progress = newProgress
                console.log(`\n📊 Progress: ${progress}/${steps.length} - ${step}\n`)
              }
            }
          }
        }
      },
    }
  )

  console.log('\n✅ Analysis complete')
  return result
}

// Usage
const report = await longRunningTask()
console.log('\nMigration Plan:')
console.log(report)
```

---

## Retry Logic

Implement retry logic for unreliable operations:

```typescript
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

async function runWithRetry(
  name: string,
  goal: string,
  maxRetries = 3,
  delayMs = 2000
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`)
      
      const result = await runSubagent(name, goal, subagents, {
        timeout: 60000,
      })
      
      console.log(`✅ Succeeded on attempt ${attempt}`)
      return result
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error}`)
      }
      
      console.log(`❌ Attempt ${attempt} failed, retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  throw new Error('Retry logic failed unexpectedly')
}

// Usage
try {
  const result = await runWithRetry(
    'test-runner',
    'Run flaky integration tests',
    3,
    3000
  )
  console.log('Result:', result)
} catch (error) {
  console.error('All retries failed:', error)
}
```

---

## Build Validation

Complete build validation workflow:

```typescript
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

async function validateBuild() {
  console.log('🔨 Starting build validation...\n')

  const results = {
    lint: '',
    types: '',
    tests: '',
    security: '',
    passed: false
  }

  try {
    // Step 1: Run linter
    console.log('1️⃣ Running linter...')
    results.lint = await runSubagent(
      'refactor-assistant',
      'Run linter and report issues',
      subagents,
      { timeout: 30000 }
    )
    console.log(results.lint.includes('error') ? '❌ Lint errors' : '✅ Lint passed\n')

    // Step 2: Type checking
    console.log('2️⃣ Type checking...')
    results.types = await runSubagent(
      'test-runner',
      'Run TypeScript type check',
      subagents,
      { timeout: 45000 }
    )
    console.log(results.types.includes('error') ? '❌ Type errors' : '✅ Types valid\n')

    // Step 3: Run tests
    console.log('3️⃣ Running tests...')
    results.tests = await runSubagent(
      'test-runner',
      'Run all tests',
      subagents,
      { timeout: 120000 }
    )
    console.log(results.tests.includes('failed') ? '❌ Tests failed' : '✅ Tests passed\n')

    // Step 4: Security audit
    console.log('4️⃣ Security audit...')
    results.security = await runSubagent(
      'security-auditor',
      'Check for security issues',
      subagents,
      { timeout: 60000 }
    )
    console.log(results.security.includes('CRITICAL') ? '❌ Security issues' : '✅ Security OK\n')

    // Determine overall status
    results.passed = !results.lint.includes('error') &&
                     !results.types.includes('error') &&
                     !results.tests.includes('failed') &&
                     !results.security.includes('CRITICAL')

    console.log(results.passed ? '✅ BUILD PASSED' : '❌ BUILD FAILED')
    return results
  } catch (error) {
    console.error('❌ Build validation error:', error)
    throw error
  }
}

// Usage
const buildResults = await validateBuild()
if (!buildResults.passed) {
  process.exit(1)
}
```

---

## CI/CD Integration

### Pre-commit Hook

```typescript
// scripts/pre-commit.ts
import { runSubagent } from 'amp-custom-subagents'
import { subagents } from 'amp-custom-subagents/subagents'

async function preCommitCheck() {
  console.log('Running pre-commit checks...\n')

  const result = await runSubagent(
    'test-runner',
    'Run tests on staged files',
    subagents,
    { timeout: 60000 }
  )

  if (result.includes('failed')) {
    console.error('❌ Tests failed. Commit aborted.')
    process.exit(1)
  }

  console.log('✅ Pre-commit checks passed')
}

preCommitCheck()
```

```json
// package.json
{
  "scripts": {
    "pre-commit": "tsx scripts/pre-commit.ts"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run pre-commit"
    }
  }
}
```

### GitHub Actions

```yaml
# .github/workflows/validate-pr.yml
name: Validate PR
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g amp-custom-subagents
      - run: npx tsx scripts/validate-pr.ts
```

```typescript
// scripts/validate-pr.ts
import { runSubagent } from 'amp-custom-subagents'
import { subagents } from 'amp-custom-subagents/subagents'

async function validatePR() {
  console.log('Validating PR...\n')

  const [security, tests] = await Promise.all([
    runSubagent('security-auditor', 'Audit PR changes', subagents, {
      timeout: 120000
    }),
    runSubagent('test-runner', 'Run affected tests', subagents, {
      timeout: 180000
    }),
  ])

  let failed = false

  if (security.includes('CRITICAL')) {
    console.error('❌ Critical security issues found')
    console.error(security)
    failed = true
  }

  if (tests.includes('failed')) {
    console.error('❌ Tests failed')
    console.error(tests)
    failed = true
  }

  if (failed) {
    process.exit(1)
  }

  console.log('✅ PR validation passed')
}

validatePR()
```

---

## Development Workflows

### Watch Mode for Continuous Testing

```typescript
// scripts/watch-tests.ts
import { watch } from 'fs'
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

console.log('👀 Watching for file changes...\n')

const debounce = new Map<string, NodeJS.Timeout>()

watch('./src', { recursive: true }, async (event, filename) => {
  if (!filename?.endsWith('.ts')) return

  // Debounce multiple rapid changes
  if (debounce.has(filename)) {
    clearTimeout(debounce.get(filename)!)
  }

  debounce.set(filename, setTimeout(async () => {
    console.log(`\n📝 File changed: ${filename}`)
    console.log('Running tests...')
    
    try {
      const result = await runSubagent(
        'test-runner',
        `Run tests related to ${filename}`,
        subagents,
        { 
          timeout: 30000,
          onMessage: (msg) => {
            if (msg.type === 'text') {
              console.log(msg.text)
            }
          }
        }
      )
      
      console.log(result.includes('passed') ? '✅ Tests passed' : '❌ Tests failed')
    } catch (error) {
      console.error('Error running tests:', error)
    }
    
    debounce.delete(filename)
  }, 500))
})

// Keep process alive
process.stdin.resume()
```

### Interactive Development Assistant

```typescript
// scripts/dev-assistant.ts
import * as readline from 'readline'
import { runSubagent } from './src/index.js'
import { subagents } from './src/subagents.js'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function prompt() {
  rl.question('\n🤖 Which subagent? (test-runner/security-auditor/migration-planner): ', 
    async (agentName) => {
      if (!agentName || agentName === 'exit') {
        console.log('Goodbye!')
        rl.close()
        return
      }

      rl.question('📋 What should it do? ', async (goal) => {
        if (!goal) {
          prompt()
          return
        }

        console.log(`\n🚀 Running ${agentName}...\n`)

        try {
          const result = await runSubagent(
            agentName,
            goal,
            subagents,
            {
              onMessage: (msg) => {
                if (msg.type === 'text') {
                  console.log(msg.text)
                }
              }
            }
          )

          console.log('\n✅ Result:')
          console.log(result)
        } catch (error) {
          console.error('\n❌ Error:', error)
        }

        prompt()
      })
    }
  )
}

console.log('🎯 Development Assistant')
console.log('Available agents:', Object.keys(subagents).join(', '))
console.log('Type "exit" to quit\n')
prompt()
```

---

## Advanced Patterns

### Creating a Custom Subagent Registry

```typescript
// custom-registry.ts
import { createPermission, type SubagentRegistry } from './src/index.js'

export const customSubagents: SubagentRegistry = {
  'api-tester': {
    system: `You test API endpoints.
Rules:
- Run API integration tests
- Validate response schemas
- Check error handling
- Report performance metrics`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Bash', 'allow', { matches: { cmd: 'curl*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'npm run test:api*' } }),
      createPermission('Write', 'ask', { matches: { path: '**/test/api/**' } }),
    ],
  },

  'performance-analyzer': {
    system: `You analyze application performance.
Rules:
- Run performance benchmarks
- Identify bottlenecks
- Suggest optimizations
- Never modify production code`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Bash', 'allow', { matches: { cmd: 'npm run bench*' } }),
      createPermission('Write', 'deny'),
    ],
  },
}

// Usage
import { runSubagent } from './src/index.js'

const result = await runSubagent(
  'api-tester',
  'Test all authentication endpoints',
  customSubagents
)
```

### Combining Multiple Registries

```typescript
import { subagents as defaultSubagents } from './src/subagents.js'
import { customSubagents } from './custom-registry.js'

// Merge registries
const allSubagents = {
  ...defaultSubagents,
  ...customSubagents,
}

// Use any subagent from either registry
await runSubagent('test-runner', 'Run tests', allSubagents)
await runSubagent('api-tester', 'Test APIs', allSubagents)
```

---

## Tips & Best Practices

1. **Use Parallel Execution** when tasks are independent
2. **Implement Retry Logic** for flaky operations
3. **Add Progress Tracking** for long-running tasks
4. **Set Appropriate Timeouts** based on task complexity
5. **Handle Errors Gracefully** with try-catch and logging
6. **Chain Conditionally** to abort on failures
7. **Stream Messages** for real-time feedback
8. **Create Custom Registries** for project-specific needs

---

For more information, see:
- [API Documentation](API.md)
- [Architecture Guide](ARCHITECTURE.md)
- [Setup Instructions](SETUP.md)
