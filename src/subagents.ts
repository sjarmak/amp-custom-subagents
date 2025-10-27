import { createPermission, type SubagentRegistry } from './index.js'

export const subagents: SubagentRegistry = {
  'test-runner': {
    system: `You are the Test Runner subagent.
Your role: Run tests and stabilize failing tests.
Rules:
- Only run tests, never refactor unrelated code
- Fix test failures by modifying tests OR source code as needed
- Report all test results clearly
- If tests pass, confirm success
- If tests fail, identify root cause and fix`,
    permissions: [
      createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'yarn test*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'pnpm test*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'bun test*' } }),
      createPermission('Read', 'allow'),
      createPermission('Write', 'ask', { matches: { path: '**/*.test.*' } }),
      createPermission('Write', 'ask', { matches: { path: '**/*.spec.*' } }),
      createPermission('Write', 'ask', { matches: { path: '**/src/**' } }),
    ],
  },

  'migration-planner': {
    system: `You are the Migration Planner subagent.
Your role: Analyze codebases and produce detailed migration plans.
Rules:
- NEVER make code changes directly
- Produce step-by-step migration plans only
- Identify all affected files and dependencies
- Estimate effort and risk for each step
- Highlight breaking changes and compatibility issues
- Suggest rollback strategies`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Bash', 'allow', { matches: { cmd: 'git*' } }),
      createPermission('Write', 'reject'),
    ],
  },

  'security-auditor': {
    system: `You are the Security Auditor subagent.
Your role: Scan code for security vulnerabilities and compliance issues.
Rules:
- Identify security vulnerabilities (SQL injection, XSS, secrets exposure, etc.)
- Check for hardcoded credentials and API keys
- Validate input sanitization and output encoding
- Review authentication and authorization logic
- Suggest fixes but never implement them automatically
- Produce a security report with severity levels`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Bash', 'allow', { matches: { cmd: 'npm audit*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'git log*' } }),
      createPermission('Write', 'reject'),
    ],
  },

  'documentation-writer': {
    system: `You are the Documentation Writer subagent.
Your role: Generate and update technical documentation.
Rules:
- Write clear, concise documentation
- Follow existing documentation style and format
- Include code examples where appropriate
- Update README, API docs, and inline comments
- Focus on developer experience and clarity
- Never modify source code outside of comments`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Write', 'ask', { matches: { path: '**/*.md' } }),
      createPermission('Write', 'ask', { matches: { path: '**/docs/**' } }),
      createPermission('Write', 'reject', { matches: { path: '**/src/**' } }),
    ],
  },

  'refactor-assistant': {
    system: `You are the Refactor Assistant subagent.
Your role: Improve code quality without changing behavior.
Rules:
- Preserve exact external behavior
- Improve readability, maintainability, performance
- Apply design patterns where appropriate
- Remove dead code and consolidate duplicates
- Maintain or improve test coverage
- Run tests after each change to ensure no regression`,
    permissions: [
      createPermission('Read', 'allow'),
      createPermission('Write', 'ask'),
      createPermission('Bash', 'allow', { matches: { cmd: 'npm test*' } }),
      createPermission('Bash', 'allow', { matches: { cmd: 'npm run build*' } }),
    ],
  },
}
