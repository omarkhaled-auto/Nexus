# Nexus

> Transform ideas into production-quality applications using natural language

Nexus is an AI-powered desktop application that builds software autonomously. Describe what you want, and Nexus orchestrates multiple AI agents to plan, code, test, and review your application.

## Features

- **Genesis Mode**: Start with an idea. Nexus interviews you to understand requirements, then builds your application from scratch.
- **Evolution Mode**: Import an existing codebase. Add features via a Kanban board with drag-and-drop prioritization.
- **Multi-Agent Orchestration**: Coder, Tester, Reviewer, and Merger agents work in parallel with QA loops.
- **Human Checkpoints**: Review and approve at key milestones. You're always in control.
- **Real-time Dashboard**: Monitor agent activity, task progress, and cost tracking.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- API keys for Claude (Anthropic) or Gemini (Google)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nexus.git
cd nexus

# Install dependencies
pnpm install

# Start in development mode
pnpm dev:electron
```

### First Run

1. Launch Nexus
2. Open Settings (Cmd/Ctrl + ,)
3. Enter your API key in the LLM tab
4. Choose Genesis Mode to start a new project, or Evolution Mode to work on existing code

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + N | New project |
| Cmd/Ctrl + S | Create checkpoint |
| Cmd/Ctrl + , | Open settings |
| Cmd/Ctrl + K | Command palette |
| ? | Show all shortcuts |
| Esc | Close modal |

## Configuration

Settings are stored locally and encrypted. API keys use OS-level secure storage (Keychain on macOS, DPAPI on Windows).

### Settings Categories

- **LLM Providers**: API keys, default model, fallback order
- **Agent Behavior**: Max parallel agents, timeouts, retries
- **Checkpoints**: Auto-checkpoint interval, retention
- **UI Preferences**: Theme (light/dark/system), notifications
- **Project Defaults**: Language, test framework, output directory

## Building for Production

```bash
# Build the application
pnpm build:electron

# Package for distribution
npx electron-builder --win --dir
```

Installers are created in the `dist/` directory.

## Development

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Architecture

Nexus uses a multi-process Electron architecture:

- **Main Process**: Orchestration, LLM clients, file system, settings (electron-store + safeStorage)
- **Renderer Process**: React UI with Zustand state management
- **Preload**: Secure IPC bridge between main and renderer

## License

MIT

## Contributing

See CONTRIBUTING.md for development guidelines.
