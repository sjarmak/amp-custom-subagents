#!/usr/bin/env node
import { runSubagent } from './index.js'
import { subagents } from './subagents.js'

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: npm run dev <subagent-name> "<goal>"')
  console.error('\nAvailable subagents:')
  Object.keys(subagents).forEach(name => {
    console.error(`  - ${name}`)
  })
  process.exit(1)
}

const [name, goal] = args
const cwd = args[2] || process.cwd()

console.log(`Running subagent: ${name}`)
console.log(`Goal: ${goal}`)
console.log(`Working directory: ${cwd}`)
console.log('─'.repeat(80))

try {
  const result = await runSubagent(name, goal, subagents, {
    cwd,
    onMessage: (msg) => {
      if (msg.type === 'text') {
        console.log(msg.text)
      }
    },
  })

  console.log('─'.repeat(80))
  console.log('✅ Subagent completed')
  console.log('\n📋 Summary:')
  console.log(result.summary)
  
  if (result.filesChanged.length > 0) {
    console.log('\n📝 Files Modified:')
    result.filesChanged.forEach(file => console.log(`  - ${file}`))
  }
  
  console.log('\n⏱️  Duration:', (result.metadata.duration / 1000).toFixed(2), 's')
  
  if (result.transcript.length > 0) {
    console.log('\n📜 Full Transcript:')
    result.transcript.forEach(line => console.log(line))
  }
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error)
  process.exit(1)
}
