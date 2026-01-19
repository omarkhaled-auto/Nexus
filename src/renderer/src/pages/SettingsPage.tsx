/**
 * SettingsPage - User settings configuration interface
 * Phase 12-02: Settings UI with tabbed layout
 *
 * Provides tabbed sections for:
 * - LLM: API keys, default provider, fallback settings
 * - Agents: Parallelism, timeouts, retry behavior
 * - Checkpoints: Auto-checkpoint settings
 * - UI: Theme, sidebar, notifications
 * - Projects: Default values for new projects
 */

import { useState, useEffect, type ReactElement } from 'react'
import { Eye, EyeOff, Key, Bot, Save, RotateCcw, Sun, Moon, Monitor, Settings2, FolderCog } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { AnimatedPage } from '@renderer/components/AnimatedPage'
import {
  useSettingsStore,
  useSettings,
  useSettingsLoading,
  useSettingsDirty,
  useHasApiKey
} from '@renderer/stores'
import type { NexusSettingsPublic, LLMProvider } from '../../../shared/types/settings'

// ============================================
// Tab Configuration
// ============================================

type TabId = 'llm' | 'agents' | 'checkpoints' | 'ui' | 'project'

interface TabConfig {
  id: TabId
  label: string
  icon: ReactElement
  description: string
}

const tabs: TabConfig[] = [
  { id: 'llm', label: 'LLM', icon: <Key className="w-4 h-4" />, description: 'API keys and provider settings' },
  { id: 'agents', label: 'Agents', icon: <Bot className="w-4 h-4" />, description: 'Agent execution behavior' },
  { id: 'checkpoints', label: 'Checkpoints', icon: <Save className="w-4 h-4" />, description: 'Auto-checkpoint settings' },
  { id: 'ui', label: 'UI', icon: <Settings2 className="w-4 h-4" />, description: 'Interface preferences' },
  { id: 'project', label: 'Projects', icon: <FolderCog className="w-4 h-4" />, description: 'Default project settings' }
]

// ============================================
// Input Components (inline since no shadcn input)
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

function Input({ className, label, description, id, ...props }: InputProps): ReactElement {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <input
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  description?: string
  options: { value: string; label: string }[]
}

function Select({ className, label, description, id, options, ...props }: SelectProps): ReactElement {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <select
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

function Checkbox({ className, label, description, id, ...props }: CheckboxProps): ReactElement {
  return (
    <div className="flex items-start space-x-3">
      <input
        type="checkbox"
        id={id}
        className={cn(
          'h-4 w-4 rounded border border-input bg-background',
          'focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// API Key Input Component
// ============================================

interface ApiKeyInputProps {
  provider: LLMProvider
  label: string
}

function ApiKeyInput({ provider, label }: ApiKeyInputProps): ReactElement {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasKey = useHasApiKey(provider)
  const { setApiKey, clearApiKey } = useSettingsStore()

  const handleSave = async (): Promise<void> => {
    if (!value.trim()) return
    setSaving(true)
    try {
      const success = await setApiKey(provider, value.trim())
      if (success) {
        setValue('')
        setShow(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async (): Promise<void> => {
    setSaving(true)
    try {
      await clearApiKey(provider)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e): void => { setValue(e.target.value) }}
            placeholder={hasKey ? 'API key is set' : 'Enter API key'}
            disabled={saving}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              hasKey && !value && 'placeholder:text-green-500'
            )}
          />
          <button
            type="button"
            onClick={(): void => { setShow(!show) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {value && (
          <Button onClick={(): void => { void handleSave() }} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
        {hasKey && !value && (
          <Button onClick={(): void => { void handleClear() }} disabled={saving} variant="destructive" size="sm">
            Clear
          </Button>
        )}
      </div>
      {hasKey && (
        <p className="text-xs text-green-600 dark:text-green-400">
          API key is securely stored
        </p>
      )}
    </div>
  )
}

// ============================================
// Tab Content Components
// ============================================

interface SettingsTabProps {
  settings: NexusSettingsPublic
  updateSetting: SettingsState['updateSetting']
}

type SettingsState = ReturnType<typeof useSettingsStore.getState>

function LLMSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure API keys for LLM providers. Keys are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApiKeyInput provider="claude" label="Claude API Key (Anthropic)" />
          <ApiKeyInput provider="gemini" label="Gemini API Key (Google)" />
          <ApiKeyInput provider="openai" label="OpenAI API Key" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Settings</CardTitle>
          <CardDescription>
            Configure default provider and fallback behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            id="default-provider"
            label="Default Provider"
            description="Primary LLM provider to use"
            value={settings.llm.defaultProvider}
            onChange={(e): void => { updateSetting('llm', 'defaultProvider', e.target.value as LLMProvider) }}
            options={[
              { value: 'claude', label: 'Claude (Anthropic)' },
              { value: 'gemini', label: 'Gemini (Google)' },
              { value: 'openai', label: 'OpenAI' }
            ]}
          />

          <Input
            id="default-model"
            label="Default Model"
            description="Model identifier to use (e.g., claude-sonnet-4-5-20250929)"
            value={settings.llm.defaultModel}
            onChange={(e): void => { updateSetting('llm', 'defaultModel', e.target.value) }}
          />

          <Checkbox
            id="fallback-enabled"
            label="Enable Fallback"
            description="Automatically try other providers if the primary fails"
            checked={settings.llm.fallbackEnabled}
            onChange={(e): void => { updateSetting('llm', 'fallbackEnabled', e.target.checked) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function AgentSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parallelism</CardTitle>
          <CardDescription>
            Control how many agents can run simultaneously.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="max-parallel"
            type="number"
            min={1}
            max={10}
            label="Max Parallel Agents"
            description="Maximum number of agents that can execute concurrently (1-10)"
            value={settings.agents.maxParallelAgents}
            onChange={(e): void => { updateSetting('agents', 'maxParallelAgents', parseInt(e.target.value) || 1) }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeouts & Retries</CardTitle>
          <CardDescription>
            Configure task execution limits and retry behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="task-timeout"
            type="number"
            min={1}
            max={60}
            label="Task Timeout (minutes)"
            description="Maximum time a single task can run before timing out"
            value={settings.agents.taskTimeoutMinutes}
            onChange={(e): void => { updateSetting('agents', 'taskTimeoutMinutes', parseInt(e.target.value) || 5) }}
          />

          <Input
            id="max-retries"
            type="number"
            min={0}
            max={10}
            label="Max Retries"
            description="Number of times to retry a failed task"
            value={settings.agents.maxRetries}
            onChange={(e): void => { updateSetting('agents', 'maxRetries', parseInt(e.target.value) || 0) }}
          />

          <Checkbox
            id="auto-retry"
            label="Auto Retry on Failure"
            description="Automatically retry tasks when they fail"
            checked={settings.agents.autoRetryEnabled}
            onChange={(e): void => { updateSetting('agents', 'autoRetryEnabled', e.target.checked) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function CheckpointSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Automatic Checkpoints</CardTitle>
          <CardDescription>
            Configure automatic checkpoint creation and retention.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            id="auto-checkpoint"
            label="Enable Auto-Checkpoint"
            description="Automatically create checkpoints at regular intervals"
            checked={settings.checkpoints.autoCheckpointEnabled}
            onChange={(e): void => { updateSetting('checkpoints', 'autoCheckpointEnabled', e.target.checked) }}
          />

          <Input
            id="checkpoint-interval"
            type="number"
            min={1}
            max={120}
            label="Checkpoint Interval (minutes)"
            description="How often to create automatic checkpoints"
            value={settings.checkpoints.autoCheckpointIntervalMinutes}
            onChange={(e): void => { updateSetting('checkpoints', 'autoCheckpointIntervalMinutes', parseInt(e.target.value) || 15) }}
            disabled={!settings.checkpoints.autoCheckpointEnabled}
          />

          <Input
            id="max-checkpoints"
            type="number"
            min={1}
            max={100}
            label="Max Checkpoints to Keep"
            description="Older checkpoints will be automatically deleted"
            value={settings.checkpoints.maxCheckpointsToKeep}
            onChange={(e): void => { updateSetting('checkpoints', 'maxCheckpointsToKeep', parseInt(e.target.value) || 10) }}
          />

          <Checkbox
            id="checkpoint-on-feature"
            label="Checkpoint on Feature Complete"
            description="Automatically create a checkpoint when a feature is marked complete"
            checked={settings.checkpoints.checkpointOnFeatureComplete}
            onChange={(e): void => { updateSetting('checkpoints', 'checkpointOnFeatureComplete', e.target.checked) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function UISettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose your preferred color scheme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'light' as const, label: 'Light', icon: <Sun className="w-5 h-5" /> },
              { value: 'dark' as const, label: 'Dark', icon: <Moon className="w-5 h-5" /> },
              { value: 'system' as const, label: 'System', icon: <Monitor className="w-5 h-5" /> }
            ].map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={(): void => { updateSetting('ui', 'theme', theme.value) }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  settings.ui.theme === theme.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {theme.icon}
                <span className="text-sm font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout</CardTitle>
          <CardDescription>
            Customize the interface layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="sidebar-width"
            type="number"
            min={200}
            max={400}
            step={10}
            label="Sidebar Width (px)"
            description="Width of the sidebar in pixels"
            value={settings.ui.sidebarWidth}
            onChange={(e): void => { updateSetting('ui', 'sidebarWidth', parseInt(e.target.value) || 256) }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Configure notification behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            id="show-notifications"
            label="Show Notifications"
            description="Display toast notifications for events"
            checked={settings.ui.showNotifications}
            onChange={(e): void => { updateSetting('ui', 'showNotifications', e.target.checked) }}
          />

          <Input
            id="notification-duration"
            type="number"
            min={1000}
            max={30000}
            step={500}
            label="Notification Duration (ms)"
            description="How long notifications stay visible"
            value={settings.ui.notificationDuration}
            onChange={(e): void => { updateSetting('ui', 'notificationDuration', parseInt(e.target.value) || 5000) }}
            disabled={!settings.ui.showNotifications}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ProjectSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Defaults</CardTitle>
          <CardDescription>
            Default values used when creating new projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="default-language"
            label="Default Language"
            description="Primary programming language for new projects"
            value={settings.project.defaultLanguage}
            onChange={(e): void => { updateSetting('project', 'defaultLanguage', e.target.value) }}
            placeholder="e.g., TypeScript, Python, Go"
          />

          <Input
            id="default-test-framework"
            label="Default Test Framework"
            description="Testing framework to use by default"
            value={settings.project.defaultTestFramework}
            onChange={(e): void => { updateSetting('project', 'defaultTestFramework', e.target.value) }}
            placeholder="e.g., Jest, Vitest, Pytest"
          />

          <Input
            id="output-directory"
            label="Output Directory"
            description="Default directory for generated project files"
            value={settings.project.outputDirectory}
            onChange={(e): void => { updateSetting('project', 'outputDirectory', e.target.value) }}
            placeholder="e.g., ~/projects"
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// Main Settings Page Component
// ============================================

export default function SettingsPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('llm')
  const settings = useSettings()
  const isLoading = useSettingsLoading()
  const isDirty = useSettingsDirty()
  const { loadSettings, updateSetting, saveSettings, discardChanges, resetToDefaults } = useSettingsStore()

  // Load settings on mount
  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const handleSave = async (): Promise<void> => {
    await saveSettings()
  }

  const handleReset = async (): Promise<void> => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      await resetToDefaults()
    }
  }

  // Loading state
  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <AnimatedPage className="flex flex-col h-full">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Vertical tabs */}
        <nav className="w-56 border-r border-border p-4 space-y-1 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(): void => { setActiveTab(tab.id) }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}

          {/* Reset button at bottom */}
          <div className="pt-4 mt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(): void => { void handleReset() }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </nav>

        {/* Right: Content panel */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Tab header */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold">{tabs.find((t) => t.id === activeTab)?.label}</h3>
            <p className="text-sm text-muted-foreground">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>

          {/* Tab content */}
          {activeTab === 'llm' && <LLMSettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'agents' && <AgentSettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'checkpoints' && <CheckpointSettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'ui' && <UISettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'project' && <ProjectSettings settings={settings} updateSetting={updateSetting} />}
        </main>
      </div>

      {/* Footer with Save/Cancel */}
      <footer className="flex justify-end gap-2 p-4 border-t border-border bg-background">
        <Button variant="outline" onClick={(): void => { discardChanges() }} disabled={!isDirty}>
          Cancel
        </Button>
        <Button onClick={(): void => { void handleSave() }} disabled={!isDirty}>
          Save Changes
        </Button>
      </footer>
    </AnimatedPage>
  )
}
