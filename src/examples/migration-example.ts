import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

async function main() {
  console.log('📦 Migration Planner Example\n')

  try {
    const result = await runSubagent(
      'migration-planner',
      'Analyze this project and create a plan to migrate from CommonJS to ES modules',
      subagents,
      {
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('[Migration Planner]:', msg.text)
          }
        },
      }
    )

    console.log('\n📋 Migration Plan:')
    console.log(result)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
