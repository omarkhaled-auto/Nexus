# Phase 12: Polish & Deploy - Research

**Researched:** 2026-01-16
**Domain:** Electron desktop app polish (settings, animations, secure storage, packaging)
**Confidence:** HIGH

<research_summary>
## Summary

Phase 12 is primarily commodity development — settings pages, toast notifications, keyboard shortcuts, and animations are well-established patterns. The one niche area is **secure credential storage in Electron**, which requires platform-specific handling.

Key finding: Electron's built-in `safeStorage` API handles secure encryption using OS-level crypto (Keychain on macOS, DPAPI on Windows, libsecret on Linux). This is the correct approach — don't hand-roll encryption or store keys in plain text JSON.

The existing codebase already has:
- Dark/light theme CSS variables configured (Tailwind v4 + shadcn)
- Basic toast system in uiStore (needs sonner upgrade)
- Zustand store patterns established
- electron-builder.yml configured for Win/Mac/Linux

**Primary recommendation:** Use `safeStorage` for API keys, `electron-store` for non-sensitive settings, `sonner` for toasts, `react-hotkeys-hook` for keyboard shortcuts, and `framer-motion` (Motion) for animations.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Must Have)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron (safeStorage) | Built-in | Secure API key storage | Uses OS crypto (Keychain/DPAPI), not plain text |
| electron-store | ^8.2.0 | Settings persistence | JSON file with schema validation, works in main process |
| sonner | ^1.7.0 | Toast notifications | Opinionated, beautiful, easy setup with Toaster |
| react-hotkeys-hook | ^4.5.0 | Keyboard shortcuts | Declarative API, scopes for conflict prevention |
| framer-motion | ^11.15.0 | Animations | Industry standard, AnimatePresence for exit animations |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.10 | State management | Settings store in renderer |
| tailwindcss | 4.1.18 | Styling | Already has dark theme vars |
| shadcn/ui | - | Components | Already installed |
| electron-builder | - | Packaging | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| safeStorage | keytar | keytar requires native module compilation, safeStorage is built-in |
| electron-store | conf | electron-store has better Electron integration |
| sonner | react-hot-toast | sonner has better defaults and design |
| framer-motion | GSAP | framer-motion better for React declarative patterns |

**Installation:**
```bash
pnpm add electron-store sonner react-hotkeys-hook framer-motion
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── services/
│   │   └── settingsService.ts    # electron-store + safeStorage
│   └── ipc/
│       └── settingsHandlers.ts   # IPC handlers for settings
├── renderer/
│   ├── pages/
│   │   └── SettingsPage.tsx      # Tabbed settings UI
│   ├── stores/
│   │   └── settingsStore.ts      # Zustand store (syncs with main)
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts
│   └── components/
│       └── ui/
│           └── Toaster.tsx       # sonner Toaster wrapper
```

### Pattern 1: Main Process Settings with Secure Storage
**What:** All settings in main process, API keys encrypted via safeStorage
**When to use:** Any sensitive data (API keys, tokens)
**Example:**
```typescript
// src/main/services/settingsService.ts
import Store from 'electron-store'
import { safeStorage } from 'electron'

const store = new Store<SettingsSchema>({
  schema: settingsSchema,
  defaults: defaultSettings
})

export function setApiKey(provider: string, key: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available')
  }
  const encrypted = safeStorage.encryptString(key)
  store.set(`llm.${provider}ApiKey`, encrypted.toString('base64'))
}

export function getApiKey(provider: string): string | null {
  const encrypted = store.get(`llm.${provider}ApiKey`)
  if (!encrypted) return null
  const buffer = Buffer.from(encrypted, 'base64')
  return safeStorage.decryptString(buffer)
}
```

### Pattern 2: IPC Bridge for Settings
**What:** Renderer requests settings via IPC, main responds
**When to use:** Settings page reads/writes
**Example:**
```typescript
// src/main/ipc/settingsHandlers.ts
ipcMain.handle('settings:get', () => settingsService.getAllSettings())
ipcMain.handle('settings:set', (_, key, value) => settingsService.set(key, value))
ipcMain.handle('settings:setApiKey', (_, provider, key) =>
  settingsService.setApiKey(provider, key)
)

// src/renderer/stores/settingsStore.ts
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: null,
  loadSettings: async () => {
    const settings = await window.api.settings.get()
    set({ settings })
  },
  updateSetting: async (key, value) => {
    await window.api.settings.set(key, value)
    set((state) => ({ settings: { ...state.settings, [key]: value } }))
  }
}))
```

### Pattern 3: AnimatePresence for Page Transitions
**What:** Wrap routes in AnimatePresence for enter/exit animations
**When to use:** Page navigation, modal open/close
**Example:**
```tsx
// Source: Motion docs
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          {/* routes */}
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
```

### Pattern 4: Sonner Toast Setup
**What:** Single Toaster component, global toast() calls
**When to use:** User feedback throughout app
**Example:**
```tsx
// src/renderer/App.tsx
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </>
  )
}

// Anywhere in app:
import { toast } from 'sonner'

toast.success('Settings saved')
toast.error('API call failed')
toast.warning('Approaching token limit')
toast.loading('Processing...')
```

### Pattern 5: Keyboard Shortcuts with Scopes
**What:** Declarative hotkeys that don't conflict
**When to use:** Global shortcuts (Cmd+K, Cmd+S, etc.)
**Example:**
```typescript
// src/renderer/hooks/useKeyboardShortcuts.ts
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router'

export function useGlobalShortcuts() {
  const navigate = useNavigate()

  useHotkeys('mod+,', () => navigate('/settings'), {
    preventDefault: true
  })
  useHotkeys('mod+k', () => openCommandPalette(), {
    preventDefault: true
  })
  useHotkeys('mod+s', () => createCheckpoint(), {
    preventDefault: true
  })
  useHotkeys('?', () => showShortcutsModal())
}
```

### Anti-Patterns to Avoid
- **Storing API keys in electron-store without encryption:** Use safeStorage
- **Storing API keys in localStorage:** Renderer has no secure storage, use main process
- **Manual keydown listeners:** Use react-hotkeys-hook for proper cleanup and conflict handling
- **Creating custom toast system:** Use sonner, already polished
- **Animating everything:** Focus on meaningful transitions (page, modal), not every hover
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key encryption | Custom crypto | `safeStorage` | OS-level protection, proper key management |
| Settings persistence | Manual JSON file | `electron-store` | Schema validation, defaults, atomic writes |
| Toast notifications | Custom toast component | `sonner` | Accessibility, stacking, animations already done |
| Keyboard shortcuts | Manual keydown handlers | `react-hotkeys-hook` | Cleanup, scopes, modifier keys, conflict prevention |
| Page transitions | Manual CSS transitions | `framer-motion` AnimatePresence | Enter/exit coordination, interruption handling |
| Theme detection | Manual media query | `prefers-color-scheme` + class toggle | Browser handles system preference |

**Key insight:** Phase 12 is about polish, not invention. Every hour spent building custom toasts/animations/shortcuts is an hour not spent on the actual user experience. Use battle-tested libraries.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: API Keys in Plain Text
**What goes wrong:** Keys visible in settings file, logs, or developer tools
**Why it happens:** Using electron-store directly for secrets without encryption
**How to avoid:** Always use `safeStorage.encryptString()` before storing, `decryptString()` when reading
**Warning signs:** Can see API key in `%APPDATA%/nexus/config.json`

### Pitfall 2: Settings Not Persisting After Restart
**What goes wrong:** User configures settings, they reset on app restart
**Why it happens:** Only updating Zustand store, not calling main process
**How to avoid:** Settings flow: UI → Zustand → IPC → electron-store → file system
**Warning signs:** Settings work until app closes

### Pitfall 3: Theme Flash on Load
**What goes wrong:** App loads light then flashes dark
**Why it happens:** React hydration before theme class applied
**How to avoid:** Apply theme class to `<html>` in preload or main process, before renderer loads
**Warning signs:** Brief white flash when opening app in dark mode

### Pitfall 4: Keyboard Shortcuts Fire in Inputs
**What goes wrong:** Cmd+S saves page instead of typing "s" in text field
**Why it happens:** Not checking active element
**How to avoid:** react-hotkeys-hook ignores inputs by default, or use `enableOnFormTags: false`
**Warning signs:** Can't type certain letters in form fields

### Pitfall 5: Animations Cause Layout Shift
**What goes wrong:** Content jumps around during page transitions
**Why it happens:** Exiting element still takes space, or entering element not positioned
**How to avoid:** Use `position: absolute` for AnimatePresence children, or `mode="wait"`
**Warning signs:** Visible jumping during navigation

### Pitfall 6: Build Works, Package Fails
**What goes wrong:** `npm run build` succeeds but `npm run package` fails
**Why it happens:** Missing native dependencies, wrong paths, unsigned code on macOS
**How to avoid:** Test package on each platform, check electron-builder output carefully
**Warning signs:** Works in dev, fails in production build
</common_pitfalls>

<code_examples>
## Code Examples

### Secure API Key Storage (Main Process)
```typescript
// Source: Electron docs - safeStorage API
import { safeStorage } from 'electron'
import Store from 'electron-store'

interface SettingsSchema {
  llm: {
    claudeApiKeyEncrypted?: string
    geminiApiKeyEncrypted?: string
    defaultProvider: 'claude' | 'gemini' | 'openai'
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
  }
}

const store = new Store<SettingsSchema>()

export function setApiKey(provider: string, plainKey: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('Encryption not available on this platform')
    return false
  }

  const encrypted = safeStorage.encryptString(plainKey)
  store.set(`llm.${provider}ApiKeyEncrypted`, encrypted.toString('base64'))
  return true
}

export function getApiKey(provider: string): string | null {
  const encryptedBase64 = store.get(`llm.${provider}ApiKeyEncrypted`)
  if (!encryptedBase64) return null

  try {
    const encrypted = Buffer.from(encryptedBase64, 'base64')
    return safeStorage.decryptString(encrypted)
  } catch {
    return null
  }
}
```

### Sonner Toast Integration
```tsx
// Source: sonner docs
import { Toaster, toast } from 'sonner'

// In App.tsx - add Toaster component
<Toaster
  position="bottom-right"
  richColors
  closeButton
  toastOptions={{
    duration: 4000,
  }}
/>

// Usage anywhere:
toast.success('Checkpoint created')
toast.error('API call failed - retrying...')
toast.warning('Approaching token limit')
toast.info('Agent assigned to task')

// With promise (auto loading → success/error)
toast.promise(saveSettings(), {
  loading: 'Saving settings...',
  success: 'Settings saved',
  error: 'Failed to save settings'
})
```

### Keyboard Shortcuts Hook
```typescript
// Source: react-hotkeys-hook docs
import { useHotkeys } from 'react-hotkeys-hook'

export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const { setShowSettings, setShowShortcuts, setShowCommandPalette } = useUIStore()

  // Open settings
  useHotkeys('mod+,', (e) => {
    e.preventDefault()
    navigate('/settings')
  })

  // Save / Create checkpoint
  useHotkeys('mod+s', (e) => {
    e.preventDefault()
    toast.promise(createCheckpoint(), {
      loading: 'Creating checkpoint...',
      success: 'Checkpoint created',
      error: 'Failed to create checkpoint'
    })
  })

  // Command palette
  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    setShowCommandPalette(true)
  })

  // Show shortcuts help
  useHotkeys('?', () => setShowShortcuts(true), {
    enableOnFormTags: false
  })

  // Close modals
  useHotkeys('escape', () => {
    setShowSettings(false)
    setShowShortcuts(false)
    setShowCommandPalette(false)
  })
}
```

### Theme Toggle with System Detection
```typescript
// Theme detection and toggle
type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme): void {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

// Listen for system changes when theme is 'system'
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (currentTheme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches)
    }
  })
```

### Page Transition Animation
```tsx
// Source: Motion docs
import { AnimatePresence, motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| keytar for secrets | safeStorage (built-in) | Electron 15+ | No native module needed |
| framer-motion package | motion (same lib, new name) | 2024 | Import from 'framer-motion' still works |
| react-toastify | sonner | 2023 | Better defaults, simpler API |
| react-hotkeys | react-hotkeys-hook | 2022 | Hooks-based, better cleanup |
| electron-store v7 | electron-store v8 | 2023 | ESM support, TypeScript improvements |

**New tools/patterns to consider:**
- **Motion (framer-motion v11):** Same API, but package renamed. Still import from 'framer-motion'
- **sonner:** Has `toast.promise()` for loading → success/error flows

**Deprecated/outdated:**
- **keytar:** Still works but unnecessary when safeStorage exists
- **react-hot-toast:** Fine but sonner has better UX defaults
- **Manual localStorage for Electron:** Use electron-store in main process
</sota_updates>

<open_questions>
## Open Questions

1. **Command Palette Implementation**
   - What we know: Need Cmd+K to open, fuzzy search actions
   - What's unclear: Build custom or use existing library (cmdk)
   - Recommendation: Consider https://cmdk.paco.me/ — shadcn-compatible command palette

2. **Offline Detection**
   - What we know: Want to show offline indicator
   - What's unclear: How to gracefully degrade when LLM APIs unreachable
   - Recommendation: Use `navigator.onLine` for basic detection, but real test is API ping
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- /websites/electronjs - safeStorage API documentation
- /sindresorhus/electron-store - Settings persistence patterns
- /websites/sonner_emilkowal_ski - Toast notification setup
- /websites/motion-dev-docs - AnimatePresence, transitions, variants
- /electron-userland/electron-builder - Packaging configuration

### Secondary (MEDIUM confidence)
- [react-hotkeys-hook GitHub](https://github.com/JohannesKlauss/react-hotkeys-hook) - Keyboard shortcuts patterns
- [React Hotkeys Hook Docs](https://react-hotkeys-hook.vercel.app/docs/api/use-hotkeys) - API reference

### Tertiary (LOW confidence - needs validation)
- None - all key patterns verified with official sources
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Electron (safeStorage), React polish
- Ecosystem: electron-store, sonner, react-hotkeys-hook, framer-motion
- Patterns: Secure storage, IPC settings bridge, toast notifications, keyboard shortcuts
- Pitfalls: Plain text secrets, theme flash, animation layout shift

**Confidence breakdown:**
- Standard stack: HIGH - all libraries verified with Context7/official docs
- Architecture: HIGH - patterns from official documentation
- Pitfalls: HIGH - known Electron patterns, documented issues
- Code examples: HIGH - from Context7/official sources

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable ecosystem)
</metadata>

---

*Phase: 12-polish*
*Research completed: 2026-01-16*
*Ready for planning: yes*
