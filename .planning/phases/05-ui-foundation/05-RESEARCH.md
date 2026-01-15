# Phase 5: UI Foundation - Research

**Researched:** 2026-01-15
**Domain:** Electron + React 19 + Vite desktop application foundation
**Confidence:** HIGH

<research_summary>
## Summary

Researched the modern Electron + React 19 + Vite ecosystem for building a desktop application with Zustand state management and shadcn/ui components. The standard approach uses **electron-vite** as the build tooling layer, which provides pre-configured Electron support with separate configurations for main, preload, and renderer processes.

Key findings:
1. **electron-vite** is the recommended build tool for Electron + React + Vite projects, offering HMR for both main and renderer processes
2. **Electron IPC security** requires strict contextBridge patterns — never expose raw ipcRenderer, always wrap specific methods
3. **Zustand v5** uses `useSyncExternalStore` for React 18/19 compatibility with concurrent rendering
4. **React Router v7** with `createBrowserRouter` is the current standard for SPA routing
5. **shadcn/ui** with CSS variables provides easy dark theme implementation

**Primary recommendation:** Use electron-vite for build tooling, strict contextBridge IPC patterns, Zustand v5 with TypeScript interfaces, React Router v7 with lazy loading, and shadcn/ui with dark theme default.

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron | 28+ | Desktop runtime | Cross-platform desktop apps |
| electron-vite | 2.x | Build tooling | Pre-configured Electron + Vite integration |
| @electron-toolkit/preload | latest | Preload helpers | Safe IPC exposure patterns |
| react | 19.x | UI framework | Latest stable with concurrent features |
| react-dom | 19.x | React DOM renderer | Required for React 19 |
| vite | 5.x | Bundler | Fast HMR, ESM-native |
| typescript | 5.3+ | Type safety | Strict mode required |

### State & Routing
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.x | State management | Minimal API, useSyncExternalStore, TypeScript-friendly |
| react-router | 7.x | Client routing | Data loaders, lazy routes, type-safe |

### UI & Styling
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 3.4+ | Utility CSS | Rapid styling, dark mode support |
| shadcn/ui | latest | Component library | Accessible, customizable, Radix-based |
| lucide-react | latest | Icons | Default icon library for shadcn/ui |
| clsx | latest | Class merging | Used by shadcn/ui utilities |
| tailwind-merge | latest | Tailwind class merging | Conflict resolution for Tailwind classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-vite | Electron Forge + Vite | Forge is more mature but Vite support still experimental |
| Zustand | Redux Toolkit | Redux has more ecosystem but Zustand is simpler |
| React Router | TanStack Router | TanStack newer but React Router more established |
| shadcn/ui | Radix UI directly | shadcn provides pre-styled components |

**Installation:**
```bash
npm create @quick-start/electron@latest nexus-ui -- --template react-ts
npm install zustand react-router
npx shadcn@latest init
```

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── main.ts              # Electron main process
│   └── ipc/                  # IPC handlers
│       └── handlers.ts
├── preload/
│   └── index.ts              # contextBridge exposure
├── renderer/
│   ├── src/
│   │   ├── App.tsx           # Root with RouterProvider
│   │   ├── main.tsx          # React entry point
│   │   ├── pages/            # Route pages
│   │   ├── components/       # Shared components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── stores/           # Zustand stores
│   │   │   ├── projectStore.ts
│   │   │   ├── taskStore.ts
│   │   │   ├── agentStore.ts
│   │   │   └── uiStore.ts
│   │   ├── lib/              # Utilities
│   │   └── hooks/            # Custom hooks
│   └── index.html
└── bridges/
    └── UIBackendBridge.ts    # UI ↔ Orchestration connection
```

### Pattern 1: Secure IPC with contextBridge
**What:** Expose specific IPC methods, never raw ipcRenderer
**When to use:** Always for Electron IPC
**Example:**
```typescript
// preload/index.ts - CORRECT pattern
import { contextBridge, ipcRenderer } from 'electron'

// Good: Expose specific methods only
contextBridge.exposeInMainWorld('nexusAPI', {
  // Project operations
  getProject: (id: string) => ipcRenderer.invoke('project:get', id),
  createProject: (input: ProjectInput) => ipcRenderer.invoke('project:create', input),

  // Task operations
  getTasks: () => ipcRenderer.invoke('tasks:list'),
  updateTask: (id: string, update: Partial<Task>) =>
    ipcRenderer.invoke('task:update', id, update),

  // Agent operations
  getAgentStatus: () => ipcRenderer.invoke('agents:status'),

  // Event subscriptions (unsubscribe pattern)
  onTaskUpdate: (callback: (task: Task) => void) => {
    const handler = (_event: IpcRendererEvent, task: Task) => callback(task)
    ipcRenderer.on('task:updated', handler)
    return () => ipcRenderer.removeListener('task:updated', handler)
  },

  // Mode operations
  startGenesis: () => ipcRenderer.invoke('mode:genesis'),
  startEvolution: (projectId: string) => ipcRenderer.invoke('mode:evolution', projectId)
})

// Bad: Never do this
// contextBridge.exposeInMainWorld('electron', { ipcRenderer })
```

### Pattern 2: Zustand Store with TypeScript
**What:** Type-safe store with actions and selectors
**When to use:** All Zustand stores
**Example:**
```typescript
// stores/projectStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Project {
  id: string
  name: string
  mode: 'genesis' | 'evolution'
  createdAt: string
}

interface ProjectState {
  // State
  currentProject: Project | null
  projects: Project[]
  mode: 'genesis' | 'evolution' | null

  // Actions
  setProject: (project: Project) => void
  setMode: (mode: 'genesis' | 'evolution') => void
  addProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      projects: [],
      mode: null,

      setProject: (project) => set({ currentProject: project }),
      setMode: (mode) => set({ mode }),
      addProject: (project) => set({ projects: [...get().projects, project] }),
      clearProject: () => set({ currentProject: null, mode: null })
    }),
    {
      name: 'nexus-project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        // Don't persist currentProject - reload from backend
      })
    }
  )
)

// Selectors (memoized via shallow)
export const useCurrentProject = () => useProjectStore((s) => s.currentProject)
export const useMode = () => useProjectStore((s) => s.mode)
```

### Pattern 3: React Router v7 with Lazy Loading
**What:** Type-safe routing with code splitting
**When to use:** SPA routing
**Example:**
```typescript
// App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ThemeProvider } from '@/components/theme-provider'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ModeSelectorPage />  // Two bold cards: Genesis/Evolution
      },
      {
        path: 'genesis',
        lazy: () => import('./pages/InterviewPage')
      },
      {
        path: 'evolution',
        lazy: () => import('./pages/KanbanPage')
      },
      {
        path: 'dashboard',
        lazy: () => import('./pages/DashboardPage')
      }
    ]
  }
])

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="nexus-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
```

### Pattern 4: electron-vite Configuration
**What:** Separate configs for main, preload, renderer
**When to use:** Project setup
**Example:**
```typescript
// electron.vite.config.ts
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/main.ts')
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    }
  }
})
```

### Anti-Patterns to Avoid
- **Exposing raw ipcRenderer:** Security vulnerability — expose specific methods only
- **Storing sensitive data in localStorage:** Zustand persist is for UI state, not credentials
- **Direct Node.js access in renderer:** Always go through IPC bridge
- **Global stores without TypeScript interfaces:** Leads to runtime errors
- **Inline IPC handlers without validation:** Validate all IPC message arguments

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IPC type safety | Custom type generation | @electron-toolkit/preload + TypeScript | Handles serialization edge cases |
| Component library | Custom components | shadcn/ui | Accessibility, dark mode, tested |
| State management | Custom Context | Zustand | useSyncExternalStore for React 19 |
| Theme switching | CSS class toggling | shadcn ThemeProvider | Handles system preference, persistence |
| Form validation | Custom validation | React Hook Form + Zod | Type inference, performance |
| Route code-splitting | Manual dynamic imports | React Router lazy() | Handles loading states, errors |
| Class name merging | String concatenation | clsx + tailwind-merge | Conflict resolution |

**Key insight:** The Electron + React ecosystem has mature solutions for common problems. electron-vite and @electron-toolkit handle the Electron-specific complexity. shadcn/ui provides accessible, themed components. Zustand handles React 19 concurrent rendering. Fighting these leads to security vulnerabilities (IPC) and accessibility issues (components).

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Exposing Full ipcRenderer
**What goes wrong:** Security vulnerability — malicious scripts can send arbitrary IPC messages
**Why it happens:** Seems convenient to expose entire module
**How to avoid:** Wrap each IPC call in a specific method via contextBridge
**Warning signs:** `contextBridge.exposeInMainWorld('electron', { ipcRenderer })`

### Pitfall 2: IPC Callback Leaking Event Object
**What goes wrong:** Renderer gets access to ipcRenderer via event.sender
**Why it happens:** Passing callback directly to ipcRenderer.on
**How to avoid:** Destructure only the data: `(callback) => ipcRenderer.on('event', (_e, data) => callback(data))`
**Warning signs:** `onEvent: (callback) => ipcRenderer.on('event', callback)` — BAD

### Pitfall 3: Not Validating IPC Sender
**What goes wrong:** Privilege escalation — iframes/child windows can send IPC
**Why it happens:** Assuming only main renderer sends messages
**How to avoid:** Check `event.sender.getURL()` in main process handlers
**Warning signs:** No origin validation in ipcMain.handle

### Pitfall 4: Zustand Store in Server Components
**What goes wrong:** Hydration mismatch, state not available on server
**Why it happens:** Treating Zustand like server-safe state
**How to avoid:** Keep Zustand stores in client components only (not an issue for Electron)
**Warning signs:** N/A for Electron (no SSR)

### Pitfall 5: Vite Base Path Not Relative
**What goes wrong:** Assets fail to load in production Electron build
**Why it happens:** Default base path is `/` which doesn't work with `file://`
**How to avoid:** Set `base: './'` in vite.config.ts for renderer
**Warning signs:** Blank screen in production, 404 errors for assets

### Pitfall 6: Memory Leaks from IPC Listeners
**What goes wrong:** Event listeners accumulate, memory grows
**Why it happens:** Not removing listeners on component unmount
**How to avoid:** Return cleanup function from IPC subscription, use in useEffect cleanup
**Warning signs:** Growing memory usage, duplicate event handling

</common_pitfalls>

<code_examples>
## Code Examples

### Electron Main Process Setup
```typescript
// src/main/main.ts
// Source: electron-vite official guide
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc/handlers'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,  // Required for security
      nodeIntegration: false,  // Required for security
      sandbox: true            // Additional security layer
    }
  })

  // Load from Vite dev server or production build
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### IPC Handler with Validation
```typescript
// src/main/ipc/handlers.ts
// Source: Electron security best practices
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { NexusCoordinator } from '@/orchestration/NexusCoordinator'

const ALLOWED_ORIGINS = ['http://localhost:5173', 'file://']

function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL()
  return ALLOWED_ORIGINS.some(origin => url.startsWith(origin))
}

export function registerIpcHandlers() {
  // Mode operations
  ipcMain.handle('mode:genesis', async (event) => {
    if (!validateSender(event)) throw new Error('Unauthorized')
    return NexusCoordinator.getInstance().startGenesis()
  })

  ipcMain.handle('mode:evolution', async (event, projectId: string) => {
    if (!validateSender(event)) throw new Error('Unauthorized')
    if (typeof projectId !== 'string') throw new Error('Invalid projectId')
    return NexusCoordinator.getInstance().startEvolution(projectId)
  })

  // Task operations
  ipcMain.handle('tasks:list', async (event) => {
    if (!validateSender(event)) throw new Error('Unauthorized')
    return NexusCoordinator.getInstance().getTasks()
  })
}
```

### shadcn/ui Dark Theme Setup
```typescript
// src/renderer/src/components/theme-provider.tsx
// Source: shadcn/ui Vite dark mode guide
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'nexus-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    }
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

### UIBackendBridge Pattern
```typescript
// src/bridges/UIBackendBridge.ts
// Pattern: Connect UI stores to backend orchestration
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAgentStore } from '@/stores/agentStore'

class UIBackendBridge {
  private static instance: UIBackendBridge
  private unsubscribers: (() => void)[] = []

  static getInstance(): UIBackendBridge {
    if (!UIBackendBridge.instance) {
      UIBackendBridge.instance = new UIBackendBridge()
    }
    return UIBackendBridge.instance
  }

  async initialize(): Promise<void> {
    // Subscribe to backend events via IPC
    const unsubTask = window.nexusAPI.onTaskUpdate((task) => {
      useTaskStore.getState().updateTask(task.id, task)
    })

    const unsubAgent = window.nexusAPI.onAgentStatus((status) => {
      useAgentStore.getState().setAgentStatus(status)
    })

    this.unsubscribers.push(unsubTask, unsubAgent)
  }

  async startGenesis(): Promise<void> {
    useProjectStore.getState().setMode('genesis')
    await window.nexusAPI.startGenesis()
  }

  async startEvolution(projectId: string): Promise<void> {
    useProjectStore.getState().setMode('evolution')
    await window.nexusAPI.startEvolution(projectId)
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }
}

export const uiBackendBridge = UIBackendBridge.getInstance()
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Electron + webpack | electron-vite | 2023 | Much faster HMR, simpler config |
| Redux | Zustand v5 | 2024 | Less boilerplate, better React 19 compat |
| React Router v6 | React Router v7 | 2024 | Type-safe loaders, better lazy loading |
| Manual dark mode | shadcn ThemeProvider | 2024 | System preference detection, persistence |
| file:// protocol | Custom protocol | 2024 | Better security, avoids XSS issues |

**New tools/patterns to consider:**
- **React 19 `use()` hook:** Read promises in render — can simplify async data patterns
- **React 19 `useOptimistic`:** Optimistic UI updates without manual state management
- **Zustand v5 `useSyncExternalStore`:** Better concurrent rendering compatibility

**Deprecated/outdated:**
- **nodeIntegration: true:** Security risk — always use contextBridge
- **Remote module:** Deprecated — use IPC instead
- **electron-builder with webpack:** electron-vite is faster and simpler
- **Class components:** Function components with hooks are standard

</sota_updates>

<open_questions>
## Open Questions

1. **React 19 Server Components in Electron**
   - What we know: Electron doesn't have SSR, React 19 client components work fine
   - What's unclear: Whether future Electron versions might support RSC patterns
   - Recommendation: Use client components only, ignore RSC for now

2. **electron-vite vs Electron Forge**
   - What we know: electron-vite is simpler, Forge is more mature
   - What's unclear: Long-term maintenance of electron-vite
   - Recommendation: Use electron-vite for new projects — active development, better DX

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- /websites/electronjs - IPC patterns, contextBridge security, preload scripts
- /pmndrs/zustand - Store patterns, persist middleware, TypeScript usage
- /websites/ui_shadcn - Vite dark mode setup, components.json configuration
- /remix-run/react-router - v7 createBrowserRouter, lazy loading, loaders
- /websites/electron-vite - Configuration, HMR, project structure

### Secondary (MEDIUM confidence)
- [Electron Security Docs](https://www.electronjs.org/docs/latest/tutorial/security) - Verified IPC best practices
- [Zustand GitHub](https://github.com/pmndrs/zustand) - React 19 compatibility confirmed
- [electron-vite Guide](https://electron-vite.org/guide/) - Setup patterns verified

### Tertiary (LOW confidence - needs validation)
- WebSearch articles on electron-vite + React 19 — patterns verified against official docs

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Electron 28+ with React 19 + Vite
- Ecosystem: electron-vite, Zustand v5, React Router v7, shadcn/ui
- Patterns: IPC security, store design, routing, theming
- Pitfalls: IPC exposure, memory leaks, base path

**Confidence breakdown:**
- Standard stack: HIGH - verified with Context7, actively maintained
- Architecture: HIGH - from official examples and guides
- Pitfalls: HIGH - documented in Electron security docs
- Code examples: HIGH - from Context7/official sources

**Research date:** 2026-01-15
**Valid until:** 2026-02-15 (30 days - stable ecosystem)

</metadata>

---

*Phase: 05-ui-foundation*
*Research completed: 2026-01-15*
*Ready for planning: yes*
