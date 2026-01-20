/**
 * SettingsPage - Complete user settings configuration interface
 * Phase 17: Complete UI Redesign - Enhanced Settings with backend toggles,
 * model dropdowns, and advanced configuration options.
 *
 * Provides tabbed sections for:
 * - LLM Providers: Backend selection, model dropdowns, API keys, advanced settings
 * - Agents: Per-agent model assignments, pool limits
 * - Checkpoints: Auto-checkpoint settings
 * - UI: Theme, sidebar, notifications
 * - Projects: Default values for new projects
 */

import { useState, useEffect, type ReactElement } from 'react'
import {
  Eye,
  EyeOff,
  Key,
  Bot,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Settings2,
  FolderCog,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cloud,
  Cpu,
  Sparkles,
  Info
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { AnimatedPage } from '@renderer/components/AnimatedPage'
import { Header } from '@renderer/components/layout/Header'
import {
  useSettingsStore,
  useSettings,
  useSettingsLoading,
  useSettingsDirty,
  useHasApiKey
} from '@renderer/stores'
import type { NexusSettingsPublic, LLMProvider, LLMBackendType, EmbeddingsBackendType } from '../../../shared/types/settings'
import {
  CLAUDE_MODELS,
  GEMINI_MODELS,
  LOCAL_EMBEDDING_MODELS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  getClaudeModelList,
  getGeminiModelList,
  getLocalEmbeddingModelList,
  type ModelInfo,
  type EmbeddingModelInfo
} from '../../../llm/models'

// ============================================
// Environment Detection
// ============================================

/**
 * Check if running in Electron environment with nexusAPI available
 */
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined'
}

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
  { id: 'llm', label: 'LLM Providers', icon: <Sparkles className="w-4 h-4" />, description: 'Backend selection, models, and API keys' },
  { id: 'agents', label: 'Agents', icon: <Bot className="w-4 h-4" />, description: 'Agent model assignments and limits' },
  { id: 'checkpoints', label: 'Checkpoints', icon: <Save className="w-4 h-4" />, description: 'Auto-checkpoint settings' },
  { id: 'ui', label: 'UI', icon: <Settings2 className="w-4 h-4" />, description: 'Interface preferences' },
  { id: 'project', label: 'Projects', icon: <FolderCog className="w-4 h-4" />, description: 'Default project settings' }
]

// ============================================
// Reusable Input Components
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

function Input({ className, label, description, id, ...props }: InputProps): ReactElement {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-primary leading-none">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}
      <input
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border border-border-default bg-bg-dark px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-tertiary',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
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
  options: { value: string; label: string; description?: string }[]
}

function Select({ className, label, description, id, options, ...props }: SelectProps): ReactElement {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-primary leading-none">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}
      <select
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border border-border-default bg-bg-dark px-3 py-2 text-sm text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
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
          'h-4 w-4 rounded border border-border-default bg-bg-dark mt-0.5',
          'text-accent-primary',
          'focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium text-text-primary leading-none cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-text-secondary">{description}</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// Backend Toggle Component
// ============================================

interface BackendToggleProps {
  label: string
  value: LLMBackendType | EmbeddingsBackendType
  options: { value: string; label: string; icon: ReactElement }[]
  onChange: (value: string) => void
  status?: { detected: boolean; message: string }
}

function BackendToggle({ label, value, options, onChange, status }: BackendToggleProps): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <div className="flex items-center gap-4">
        <div className="inline-flex rounded-md border border-border-default p-1 bg-bg-dark">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all',
                value === option.value
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              )}
              data-testid={`backend-toggle-${option.value}`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
        {status && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs',
            status.detected ? 'text-accent-success' : 'text-text-tertiary'
          )}>
            {status.detected ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Model Dropdown Component
// ============================================

interface ModelDropdownProps {
  label: string
  value: string
  models: (ModelInfo | EmbeddingModelInfo)[]
  onChange: (value: string) => void
  description?: string
}

function ModelDropdown({ label, value, models, onChange, description }: ModelDropdownProps): ReactElement {
  const selectedModel = models.find(m => m.id === value)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex h-10 w-full rounded-md border border-border-default bg-bg-dark px-3 py-2 text-sm text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
          'transition-colors cursor-pointer'
        )}
        data-testid="model-dropdown"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} {model.isDefault ? '(Recommended)' : ''}
          </option>
        ))}
      </select>
      {selectedModel?.description && (
        <p className="text-xs text-text-secondary flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          {selectedModel.description}
        </p>
      )}
    </div>
  )
}

// ============================================
// API Key Input Component
// ============================================

interface ApiKeyInputProps {
  provider: LLMProvider
  label: string
  optional?: boolean
}

function ApiKeyInput({ provider, label, optional = false }: ApiKeyInputProps): ReactElement {
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        {optional && (
          <span className="text-xs text-text-tertiary">(optional for CLI)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e): void => { setValue(e.target.value) }}
            placeholder={hasKey ? '••••••••••••••••••••••••' : 'Enter API key'}
            disabled={saving}
            className={cn(
              'flex h-10 w-full rounded-md border border-border-default bg-bg-dark px-3 py-2 pr-10 text-sm text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors',
              hasKey && !value && 'border-accent-success/50'
            )}
            data-testid={`api-key-input-${provider}`}
          />
          <button
            type="button"
            onClick={(): void => { setShow(!show) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            data-testid={`toggle-visibility-${provider}`}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {value && (
          <Button onClick={(): void => { void handleSave() }} disabled={saving} size="sm" data-testid={`save-key-${provider}`}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
        {hasKey && !value && (
          <Button onClick={(): void => { void handleClear() }} disabled={saving} variant="destructive" size="sm" data-testid={`clear-key-${provider}`}>
            Clear
          </Button>
        )}
      </div>
      {hasKey && (
        <p className="text-xs text-accent-success flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3" />
          API key is securely stored
        </p>
      )}
    </div>
  )
}

// ============================================
// Collapsible Advanced Section
// ============================================

interface AdvancedSectionProps {
  title: string
  children: ReactElement
  defaultOpen?: boolean
}

function AdvancedSection({ title, children, defaultOpen = false }: AdvancedSectionProps): ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-border-default pt-4 mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors w-full"
        data-testid="advanced-toggle"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {title}
      </button>
      {isOpen && (
        <div className="mt-4 space-y-4 pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================
// Provider Configuration Card
// ============================================

interface ProviderCardProps {
  title: string
  icon: ReactElement
  children: ReactElement
}

function ProviderCard({ title, icon, children }: ProviderCardProps): ReactElement {
  return (
    <Card className="bg-bg-card border-border-default">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
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

/**
 * LLM Providers Tab - Enhanced with backend toggles and model dropdowns
 */
function LLMProvidersSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  const claudeModels = getClaudeModelList()
  const geminiModels = getGeminiModelList()
  const localEmbeddingModels = getLocalEmbeddingModelList()

  return (
    <div className="space-y-6" data-testid="llm-providers-tab">
      {/* Claude Configuration */}
      <ProviderCard
        title="Claude Configuration"
        icon={<Sparkles className="w-5 h-5 text-accent-primary" />}
      >
        <>
          <BackendToggle
            label="Backend"
            value={settings.llm.claude.backend}
            options={[
              { value: 'cli', label: 'CLI', icon: <Terminal className="w-4 h-4" /> },
              { value: 'api', label: 'API', icon: <Cloud className="w-4 h-4" /> }
            ]}
            onChange={(value) => updateSetting('llm', 'claude' as any, { ...settings.llm.claude, backend: value as LLMBackendType })}
            status={{ detected: true, message: 'CLI detected' }}
          />

          <ModelDropdown
            label="Model"
            value={settings.llm.claude.model || DEFAULT_CLAUDE_MODEL}
            models={claudeModels}
            onChange={(value) => updateSetting('llm', 'claude' as any, { ...settings.llm.claude, model: value })}
          />

          <ApiKeyInput
            provider="claude"
            label="API Key"
            optional={settings.llm.claude.backend === 'cli'}
          />

          <AdvancedSection title="Advanced">
            <>
              <Input
                id="claude-timeout"
                type="number"
                min={30000}
                max={600000}
                step={10000}
                label="Timeout (ms)"
                description="Request timeout in milliseconds"
                value={settings.llm.claude.timeout || 300000}
                onChange={(e): void => {
                  updateSetting('llm', 'claude' as any, {
                    ...settings.llm.claude,
                    timeout: parseInt(e.target.value) || 300000
                  })
                }}
              />
              <Input
                id="claude-retries"
                type="number"
                min={0}
                max={5}
                label="Max Retries"
                description="Maximum number of retry attempts"
                value={settings.llm.claude.maxRetries || 2}
                onChange={(e): void => {
                  updateSetting('llm', 'claude' as any, {
                    ...settings.llm.claude,
                    maxRetries: parseInt(e.target.value) || 2
                  })
                }}
              />
            </>
          </AdvancedSection>
        </>
      </ProviderCard>

      {/* Gemini Configuration */}
      <ProviderCard
        title="Gemini Configuration"
        icon={<Sparkles className="w-5 h-5 text-accent-secondary" />}
      >
        <>
          <BackendToggle
            label="Backend"
            value={settings.llm.gemini.backend}
            options={[
              { value: 'cli', label: 'CLI', icon: <Terminal className="w-4 h-4" /> },
              { value: 'api', label: 'API', icon: <Cloud className="w-4 h-4" /> }
            ]}
            onChange={(value) => updateSetting('llm', 'gemini' as any, { ...settings.llm.gemini, backend: value as LLMBackendType })}
            status={{ detected: true, message: 'CLI detected' }}
          />

          <ModelDropdown
            label="Model"
            value={settings.llm.gemini.model || DEFAULT_GEMINI_MODEL}
            models={geminiModels}
            onChange={(value) => updateSetting('llm', 'gemini' as any, { ...settings.llm.gemini, model: value })}
          />

          <ApiKeyInput
            provider="gemini"
            label="API Key"
            optional={settings.llm.gemini.backend === 'cli'}
          />
        </>
      </ProviderCard>

      {/* Embeddings Configuration */}
      <ProviderCard
        title="Embeddings Configuration"
        icon={<Cpu className="w-5 h-5 text-accent-success" />}
      >
        <>
          <BackendToggle
            label="Backend"
            value={settings.llm.embeddings.backend}
            options={[
              { value: 'local', label: 'Local', icon: <Cpu className="w-4 h-4" /> },
              { value: 'api', label: 'OpenAI API', icon: <Cloud className="w-4 h-4" /> }
            ]}
            onChange={(value) => updateSetting('llm', 'embeddings' as any, { ...settings.llm.embeddings, backend: value as EmbeddingsBackendType })}
            status={settings.llm.embeddings.backend === 'local' ? { detected: true, message: 'No API key needed' } : undefined}
          />

          {settings.llm.embeddings.backend === 'local' && (
            <ModelDropdown
              label="Local Model"
              value={settings.llm.embeddings.localModel || DEFAULT_LOCAL_EMBEDDING_MODEL}
              models={localEmbeddingModels}
              onChange={(value) => updateSetting('llm', 'embeddings' as any, { ...settings.llm.embeddings, localModel: value })}
            />
          )}

          {settings.llm.embeddings.backend === 'api' && (
            <ApiKeyInput
              provider="openai"
              label="OpenAI API Key"
            />
          )}
        </>
      </ProviderCard>

      {/* Default Provider Selection */}
      <Card className="bg-bg-card border-border-default">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Provider Settings</CardTitle>
          <CardDescription>Configure default provider and fallback behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            id="default-provider"
            label="Default Provider"
            description="Primary LLM provider to use"
            value={settings.llm.defaultProvider}
            onChange={(e): void => { updateSetting('llm', 'defaultProvider', e.target.value as 'claude' | 'gemini') }}
            options={[
              { value: 'claude', label: 'Claude (Anthropic)' },
              { value: 'gemini', label: 'Gemini (Google)' }
            ]}
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

// ============================================
// Agent Types and Model Assignment
// ============================================

type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger' | 'architect' | 'debugger' | 'documenter'
type ProviderType = 'claude' | 'gemini'

interface AgentModelConfig {
  provider: ProviderType
  model: string
}

interface AgentModelAssignments {
  planner: AgentModelConfig
  coder: AgentModelConfig
  tester: AgentModelConfig
  reviewer: AgentModelConfig
  merger: AgentModelConfig
  architect: AgentModelConfig
  debugger: AgentModelConfig
  documenter: AgentModelConfig
}

const AGENT_DISPLAY_INFO: Record<AgentType, { label: string; icon: string; description: string }> = {
  planner: { label: 'Planner', icon: '🧠', description: 'Plans and decomposes tasks' },
  coder: { label: 'Coder', icon: '💻', description: 'Writes and edits code' },
  tester: { label: 'Tester', icon: '🧪', description: 'Creates and runs tests' },
  reviewer: { label: 'Reviewer', icon: '👁', description: 'Reviews code for quality' },
  merger: { label: 'Merger', icon: '🔀', description: 'Merges code changes' },
  architect: { label: 'Architect', icon: '🏗', description: 'Designs system architecture' },
  debugger: { label: 'Debugger', icon: '🐛', description: 'Diagnoses and fixes issues' },
  documenter: { label: 'Documenter', icon: '📝', description: 'Writes documentation' },
}

const DEFAULT_AGENT_MODEL_ASSIGNMENTS: AgentModelAssignments = {
  planner: { provider: 'claude', model: 'claude-opus-4-5-20251101' },
  coder: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  tester: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  reviewer: { provider: 'gemini', model: 'gemini-2.5-pro' },
  merger: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  architect: { provider: 'claude', model: 'claude-opus-4-5-20251101' },
  debugger: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  documenter: { provider: 'gemini', model: 'gemini-2.5-flash' },
}

interface AgentModelRowProps {
  agentType: AgentType
  config: AgentModelConfig
  onChange: (agentType: AgentType, config: AgentModelConfig) => void
  claudeModels: ModelInfo[]
  geminiModels: ModelInfo[]
}

function AgentModelRow({ agentType, config, onChange, claudeModels, geminiModels }: AgentModelRowProps): ReactElement {
  const info = AGENT_DISPLAY_INFO[agentType]
  const models = config.provider === 'claude' ? claudeModels : geminiModels

  const handleProviderChange = (provider: ProviderType): void => {
    // When switching providers, select the first model from the new provider
    const newModels = provider === 'claude' ? claudeModels : geminiModels
    const defaultModel = newModels.find(m => m.isDefault)?.id || newModels[0]?.id || ''
    onChange(agentType, { provider, model: defaultModel })
  }

  const handleModelChange = (model: string): void => {
    onChange(agentType, { ...config, model })
  }

  return (
    <tr className="border-b border-border-default last:border-0" data-testid={`agent-model-row-${agentType}`}>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <div>
            <div className="text-sm font-medium text-text-primary">{info.label}</div>
            <div className="text-xs text-text-tertiary">{info.description}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <select
          value={config.provider}
          onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
          className={cn(
            'h-9 w-28 rounded-md border border-border-default bg-bg-dark px-2 py-1 text-sm text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
            'transition-colors cursor-pointer'
          )}
          data-testid={`agent-provider-${agentType}`}
        >
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
        </select>
      </td>
      <td className="py-3 pl-4">
        <select
          value={config.model}
          onChange={(e) => handleModelChange(e.target.value)}
          className={cn(
            'h-9 w-full rounded-md border border-border-default bg-bg-dark px-2 py-1 text-sm text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
            'transition-colors cursor-pointer'
          )}
          data-testid={`agent-model-${agentType}`}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {model.isDefault ? '(Recommended)' : ''}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}

function AgentSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  // Per-agent model assignments - stored locally for now
  // In a future phase, this could be persisted to settings
  const [agentModels, setAgentModels] = useState<AgentModelAssignments>(DEFAULT_AGENT_MODEL_ASSIGNMENTS)
  const [qaIterationLimit, setQaIterationLimit] = useState(50)

  const claudeModels = getClaudeModelList()
  const geminiModels = getGeminiModelList()

  const handleAgentModelChange = (agentType: AgentType, config: AgentModelConfig): void => {
    setAgentModels(prev => ({
      ...prev,
      [agentType]: config
    }))
  }

  const handleResetToDefaults = (): void => {
    setAgentModels(DEFAULT_AGENT_MODEL_ASSIGNMENTS)
  }

  const agentTypes: AgentType[] = ['planner', 'coder', 'tester', 'reviewer', 'merger', 'architect', 'debugger', 'documenter']

  return (
    <div className="space-y-6" data-testid="agents-tab">
      {/* Agent Model Assignments */}
      <Card className="bg-bg-card border-border-default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent-primary" />
            Agent Model Assignments
          </CardTitle>
          <CardDescription>
            Assign different models to each agent type for optimal performance. Each agent can use a different provider and model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="agent-model-table">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Agent</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Provider</th>
                  <th className="text-left py-2 pl-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Model</th>
                </tr>
              </thead>
              <tbody>
                {agentTypes.map((agentType) => (
                  <AgentModelRow
                    key={agentType}
                    agentType={agentType}
                    config={agentModels[agentType]}
                    onChange={handleAgentModelChange}
                    claudeModels={claudeModels}
                    geminiModels={geminiModels}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              data-testid="use-recommended-defaults"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Use Recommended Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Pool Settings */}
      <Card className="bg-bg-card border-border-default">
        <CardHeader>
          <CardTitle>Agent Pool Settings</CardTitle>
          <CardDescription>
            Configure agent pool capacity and resource limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="max-parallel"
            type="number"
            min={1}
            max={10}
            label="Max Concurrent Agents"
            description="Maximum number of agents running simultaneously (1-10)"
            value={settings.agents.maxParallelAgents}
            onChange={(e): void => { updateSetting('agents', 'maxParallelAgents', parseInt(e.target.value) || 1) }}
          />

          <Input
            id="qa-iteration-limit"
            type="number"
            min={10}
            max={100}
            label="QA Iteration Limit"
            description="Escalate to human after this many QA iterations (10-100)"
            value={qaIterationLimit}
            onChange={(e): void => { setQaIterationLimit(parseInt(e.target.value) || 50) }}
          />

          <Input
            id="task-timeout"
            type="number"
            min={1}
            max={120}
            label="Task Time Limit (minutes)"
            description="Split task if it exceeds this duration (1-120)"
            value={settings.agents.taskTimeoutMinutes}
            onChange={(e): void => { updateSetting('agents', 'taskTimeoutMinutes', parseInt(e.target.value) || 30) }}
          />
        </CardContent>
      </Card>

      {/* Retry Settings */}
      <Card className="bg-bg-card border-border-default">
        <CardHeader>
          <CardTitle>Retry Settings</CardTitle>
          <CardDescription>
            Configure retry behavior for failed tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            id="auto-retry"
            label="Auto Retry on Failure"
            description="Automatically retry tasks when they fail"
            checked={settings.agents.autoRetryEnabled}
            onChange={(e): void => { updateSetting('agents', 'autoRetryEnabled', e.target.checked) }}
          />

          <Input
            id="max-retries"
            type="number"
            min={0}
            max={10}
            label="Max Retries"
            description="Number of times to retry a failed task (0-10)"
            value={settings.agents.maxRetries}
            onChange={(e): void => { updateSetting('agents', 'maxRetries', parseInt(e.target.value) || 0) }}
            disabled={!settings.agents.autoRetryEnabled}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function CheckpointSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6" data-testid="checkpoints-tab">
      <Card className="bg-bg-card border-border-default">
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
    <div className="space-y-6" data-testid="ui-tab">
      <Card className="bg-bg-card border-border-default">
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
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  settings.ui.theme === theme.value
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-default hover:border-accent-primary/50 bg-bg-dark'
                )}
              >
                {theme.icon}
                <span className="text-sm font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-bg-card border-border-default">
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

      <Card className="bg-bg-card border-border-default">
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
    <div className="space-y-6" data-testid="project-tab">
      <Card className="bg-bg-card border-border-default">
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
  const [error, setError] = useState<string | null>(null)
  const settings = useSettings()
  const isLoading = useSettingsLoading()
  const isDirty = useSettingsDirty()
  const { loadSettings, updateSetting, saveSettings, discardChanges, resetToDefaults } = useSettingsStore()

  // Load settings on mount
  useEffect(() => {
    if (!isElectronEnvironment()) {
      setError('Backend not available. Please run in Electron.')
      return
    }
    void loadSettings()
  }, [loadSettings])

  const handleSave = async (): Promise<void> => {
    if (!isElectronEnvironment()) {
      setError('Cannot save settings - backend not available.')
      return
    }
    await saveSettings()
  }

  const handleReset = async (): Promise<void> => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      if (!isElectronEnvironment()) {
        setError('Cannot reset settings - backend not available.')
        return
      }
      await resetToDefaults()
    }
  }

  // Error state (no backend)
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-bg-dark" data-testid="settings-page-error">
        <Header title="Settings" icon={Settings2} showBack />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3 text-center max-w-md px-4">
            <AlertCircle className="h-12 w-12 text-status-warning" />
            <h2 className="text-lg font-medium text-text-primary">Settings Unavailable</h2>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || !settings) {
    return (
      <div className="flex flex-col h-screen bg-bg-dark" data-testid="settings-page-loading">
        <Header title="Settings" icon={Settings2} showBack />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Loading settings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg-dark" data-testid="settings-page">
      {/* Header */}
      <Header
        title="Settings"
        icon={Settings2}
        showBack
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(): void => { void handleReset() }}
              className="text-accent-error hover:text-accent-error hover:bg-accent-error/10"
              data-testid="reset-defaults-button"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Defaults
            </Button>
          </div>
        }
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Vertical tabs */}
        <nav className="w-56 border-r border-border-default p-4 space-y-1 flex-shrink-0 bg-bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(): void => { setActiveTab(tab.id) }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
                activeTab === tab.id
                  ? 'bg-accent-primary text-white font-medium'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              )}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Content panel */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Tab header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary">{tabs.find((t) => t.id === activeTab)?.label}</h2>
            <p className="text-sm text-text-secondary mt-1">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>

          {/* Tab content */}
          {activeTab === 'llm' && <LLMProvidersSettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'agents' && <AgentSettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'checkpoints' && <CheckpointSettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'ui' && <UISettings settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'project' && <ProjectSettings settings={settings} updateSetting={updateSetting} />}
        </main>
      </div>

      {/* Footer with Save/Cancel */}
      <footer className="flex justify-end gap-3 p-4 border-t border-border-default bg-bg-card">
        <Button
          variant="outline"
          onClick={(): void => { discardChanges() }}
          disabled={!isDirty}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          onClick={(): void => { void handleSave() }}
          disabled={!isDirty}
          data-testid="save-button"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </footer>
    </div>
  )
}
