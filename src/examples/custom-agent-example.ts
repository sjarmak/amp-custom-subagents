import { runSubagent, createPermission, type SubagentRegistry } from '../index.js'

// Example: Create a custom subagent on the fly
async function main() {
  console.log('🎨 Custom Subagent Example\n')

  // Define a custom subagent registry
  const customRegistry: SubagentRegistry = {
    'code-reviewer': {
      system: `You are a Code Reviewer subagent.
Your role: Review code for best practices and potential issues.
Rules:
- Analyze code structure and organization
- Check for performance issues and anti-patterns
- Suggest improvements for readability and maintainability
- Highlight potential bugs or edge cases
- NEVER modify code, only provide feedback`,
      permissions: [
        createPermission('Read', 'allow'),
        createPermission('Bash', 'allow', { matches: { cmd: 'git diff*' } }),
        createPermission('Write', 'reject'),
      ],
    },
  }

  try {
    const result = await runSubagent(
      'code-reviewer',
      'Review the code in src/index.ts and provide detailed feedback',
      customRegistry,
      {
        onMessage: (msg) => {
          if (msg.type === 'text') {
            console.log('[Code Reviewer]:', msg.text)
          }
        },
      }
    )

    console.log('\nCode Review Result:')
    console.log(result)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
