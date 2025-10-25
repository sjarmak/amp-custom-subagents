import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

async function main() {
  console.log('🧪 Test Runner Example\n')

  try {
    const result = await runSubagent(
      'test-runner',
      'Run the unit tests and fix any failing tests',
      subagents,
      {
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('[Test Runner]:', msg.text)
          }
        },
      }
    )

    console.log('\n✅ Test Runner Result:')
    console.log(result)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
