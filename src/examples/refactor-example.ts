import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

async function main() {
  console.log('🔧 Refactor Assistant Example\n')

  try {
    const result = await runSubagent(
      'refactor-assistant',
      'Review src/index.ts and suggest improvements for code quality without changing behavior',
      subagents,
      {
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('[Refactor Assistant]:', msg.text)
          }
        },
        timeout: 180000, // 3 minutes
      }
    )

    console.log('\nRefactor Suggestions:')
    console.log(result)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
