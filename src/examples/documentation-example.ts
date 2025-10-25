import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

async function main() {
  console.log('📝 Documentation Writer Example\n')

  try {
    const result = await runSubagent(
      'documentation-writer',
      'Review and improve the API documentation in API.md',
      subagents,
      {
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('[Documentation Writer]:', msg.text)
          }
        },
      }
    )

    console.log('\nDocumentation Update Result:')
    console.log(result)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
