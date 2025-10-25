import { runSubagent } from '../index.js'
import { subagents } from '../subagents.js'

async function main() {
  console.log('🔒 Security Auditor Example\n')

  try {
    const result = await runSubagent(
      'security-auditor',
      'Perform a security audit of this codebase and report any vulnerabilities',
      subagents,
      {
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('[Security Auditor]:', msg.text)
          }
        },
        timeout: 120000,
      }
    )

    console.log('\n🔍 Security Report:')
    console.log(result)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
