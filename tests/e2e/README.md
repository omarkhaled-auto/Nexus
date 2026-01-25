# Nexus E2E Validation Tests

This directory contains end-to-end tests that validate the complete Nexus workflow by building real applications through the Nexus backend.

## Todo App E2E Test

The primary E2E test builds a simple todo app through the complete Nexus workflow:

1. **Setup** - Initialize Nexus backend, create project directory
2. **Project Creation** - Create project record in database
3. **Interview** - Send predefined messages to capture requirements
4. **Planning** - Wait for task decomposition to complete
5. **Execution** - Execute tasks with agents
6. **Verification** - Check that expected files were generated

## Running the Test

### Prerequisites

- Node.js 20+
- Either `ANTHROPIC_API_KEY` environment variable OR `USE_CLAUDE_CLI=true`

### Via npm script

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-key-here

# Run the test
pnpm test:e2e:nexus
```

### Via CLI directly

```bash
npx tsx tests/e2e/run-e2e.ts
```

### Using Claude CLI

```bash
export USE_CLAUDE_CLI=true
pnpm test:e2e:nexus
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `USE_CLAUDE_CLI` | No | Set to `true` to use Claude CLI instead of API |
| `GOOGLE_AI_API_KEY` | No | Gemini API key (optional) |
| `USE_GEMINI_CLI` | No | Set to `true` to use Gemini CLI |
| `OPENAI_API_KEY` | No | OpenAI API key (optional) |

\* Required unless `USE_CLAUDE_CLI=true`

## Test Output

The test generates:

- **Console output** - Detailed progress for each phase
- **`todo-app/`** - The generated todo application
- **`.nexus-e2e-data/`** - Test database and state

## Expected Todo App Structure

After a successful run, the `todo-app/` directory should contain:

```
todo-app/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types/
│   │   └── Task.ts
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   └── components/
│       ├── TaskCard.tsx
│       ├── TaskList.tsx
│       ├── AddTaskForm.tsx
│       └── FilterBar.tsx
└── ...
```

## Verification Checklist

After the test completes:

- [ ] Project created in database
- [ ] Interview session completed
- [ ] Requirements captured (8+ requirements)
- [ ] Planning completed (10+ tasks)
- [ ] Execution started
- [ ] All/most tasks completed
- [ ] `todo-app/` directory created with React app
- [ ] `npm install` in todo-app succeeds
- [ ] `npm run dev` in todo-app starts the app
- [ ] Can add a task
- [ ] Can mark task complete
- [ ] Can delete task
- [ ] Filter buttons work
- [ ] Tasks persist after refresh

## Troubleshooting

### "ANTHROPIC_API_KEY is required"

Set your API key or enable CLI mode:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
export USE_CLAUDE_CLI=true
```

### Timeout waiting for planning:completed

The LLM may be slow or rate-limited. Try:
- Check your API key/rate limits
- Increase `PLANNING_TIMEOUT_MS` in `todo-app-e2e.ts`

### Timeout waiting for project:completed

Execution may be taking longer than expected. Try:
- Increase `EXECUTION_TIMEOUT_MS` in `todo-app-e2e.ts`
- Check logs for task failures/escalations

### Missing native modules

If you see errors about `better-sqlite3`:
```bash
pnpm rebuild better-sqlite3
```

## Files

| File | Purpose |
|------|---------|
| `run-e2e.ts` | Entry point - preflight checks and main runner |
| `todo-app-e2e.ts` | Main E2E test implementation |
| `test-bootstrap.ts` | Electron-free Nexus bootstrap for testing |
| `interview-messages.json` | Predefined interview messages and expectations |
