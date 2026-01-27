/**
 * SettingsPage - Complete user settings configuration interface
 *
 * Design: Linear/Raycast-inspired with vertical navigation, glassmorphism cards,
 * and smooth toggle animations.
 *
 * Provides tabbed sections for:
 * - LLM Providers: Backend selection, model dropdowns, API keys, advanced settings
 * - Agents: Per-agent model assignments, pool limits
 * - Checkpoints: Auto-checkpoint settings
 * - UI: Theme, sidebar, notifications
 * - Projects: Default values for new projects
 */

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import {
  Eye,
  EyeOff,
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
  Info,
  Zap,
  Shield,
  Palette,
  Loader2,
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { CheckpointList } from '@renderer/components/checkpoints/CheckpointList'
import { Header } from '@renderer/components/layout/Header'
import {
  useSettingsStore,
  useSettings,
  useSettingsLoading,
  useSettingsDirty,
  useHasApiKey
} from '@renderer/stores'
import type { NexusSettingsPublic, LLMProvider, LLMBackendType, EmbeddingsBackendType, AgentType, AgentProviderType, AgentModelConfig, AgentModelAssignments } from '../../../shared/types/settings'
import { DEFAULT_AGENT_MODEL_ASSIGNMENTS } from '../../../shared/types/settings'
import {
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

const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined'
}

// ============================================
// Input Validation Helpers
// ============================================

const clampValue = (value: string, min: number, max: number, defaultVal: number): number => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.max(min, Math.min(max, parsed));
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
  { id: 'llm', label: 'LLM Providers', icon: <Sparkles className="w-5 h-5" />, description: 'Backend selection, models, and API keys' },
  { id: 'agents', label: 'Agents', icon: <Bot className="w-5 h-5" />, description: 'Agent model assignments and limits' },
  { id: 'checkpoints', label: 'Checkpoints', icon: <Shield className="w-5 h-5" />, description: 'Auto-checkpoint settings' },
  { id: 'ui', label: 'Interface', icon: <Palette className="w-5 h-5" />, description: 'Theme and layout preferences' },
  { id: 'project', label: 'Projects', icon: <FolderCog className="w-5 h-5" />, description: 'Default project settings' }
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
        <label htmlFor={id} className="text-sm font-medium text-[#F0F6FC] leading-none">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-[#8B949E]">{description}</p>
      )}
      <input
        id={id}
        className={cn(
          'flex h-11 w-full rounded-xl border border-[#30363D] bg-[#0D1117] px-4 py-2 text-sm text-[#F0F6FC]',
          'placeholder:text-[#6E7681]',
          'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
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
        <label htmlFor={id} className="text-sm font-medium text-[#F0F6FC] leading-none">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-[#8B949E]">{description}</p>
      )}
      <select
        id={id}
        className={cn(
          'flex h-11 w-full rounded-xl border border-[#30363D] bg-[#0D1117] px-4 py-2 text-sm text-[#F0F6FC]',
          'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200 cursor-pointer',
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
          'h-5 w-5 rounded-md border border-[#30363D] bg-[#0D1117] mt-0.5',
          'text-[#7C3AED]',
          'focus:ring-2 focus:ring-[#7C3AED]/50 focus:ring-offset-2 focus:ring-offset-[#0D1117]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          className
        )}
        {...props}
      />
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium text-[#F0F6FC] leading-none cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[#8B949E]">{description}</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// Toggle Switch Component
// ============================================

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => { if (!disabled) onChange(!checked); }}
      disabled={disabled}
      className={cn(
        'relative w-12 h-7 rounded-full transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:ring-offset-2 focus:ring-offset-[#0D1117]',
        checked ? 'bg-[#7C3AED]' : 'bg-[#30363D]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg',
          'transition-transform duration-300 ease-out',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
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
    <div className="space-y-3">
      <label className="text-sm font-medium text-[#F0F6FC]">{label}</label>
      <div className="flex items-center gap-4">
        <div className="inline-flex rounded-xl border border-[#30363D] p-1 bg-[#0D1117]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                value === option.value
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-lg shadow-[#7C3AED]/25'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]'
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
            status.detected ? 'text-[#10B981]' : 'text-[#6E7681]'
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

function ModelDropdown({ label, value, models, onChange, description: _description }: ModelDropdownProps): ReactElement {
  const selectedModel = models.find(m => m.id === value)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#F0F6FC]">{label}</label>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className={cn(
          'flex h-11 w-full rounded-xl border border-[#30363D] bg-[#0D1117] px-4 py-2 text-sm text-[#F0F6FC]',
          'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
          'transition-all duration-200 cursor-pointer'
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
        <p className="text-xs text-[#8B949E] flex items-center gap-1.5">
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
        <label className="text-sm font-medium text-[#F0F6FC]">{label}</label>
        {optional && (
          <span className="text-xs text-[#6E7681]">(optional for CLI)</span>
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
              'flex h-11 w-full rounded-xl border bg-[#0D1117] px-4 py-2 pr-12 text-sm text-[#F0F6FC]',
              'placeholder:text-[#6E7681]',
              'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-all duration-200',
              hasKey && !value ? 'border-[#10B981]/50' : 'border-[#30363D]'
            )}
            data-testid={`api-key-input-${provider}`}
          />
          <button
            type="button"
            onClick={(): void => { setShow(!show) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7681] hover:text-[#F0F6FC] transition-colors p-1 rounded-md hover:bg-[#21262D]"
            data-testid={`toggle-visibility-${provider}`}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {value && (
          <Button
            onClick={(): void => { void handleSave() }}
            disabled={saving}
            size="sm"
            className="h-11 px-4 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:shadow-lg hover:shadow-[#7C3AED]/25"
            data-testid={`save-key-${provider}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        )}
        {hasKey && !value && (
          <Button
            onClick={(): void => { void handleClear() }}
            disabled={saving}
            variant="destructive"
            size="sm"
            className="h-11 px-4"
            data-testid={`clear-key-${provider}`}
          >
            Clear
          </Button>
        )}
      </div>
      {hasKey && (
        <p className="text-xs text-[#10B981] flex items-center gap-1.5">
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
    <div className="border-t border-[#30363D]/50 pt-4 mt-4">
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); }}
        className="flex items-center gap-2 text-sm font-medium text-[#8B949E] hover:text-[#F0F6FC] transition-colors w-full"
        data-testid="advanced-toggle"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {title}
      </button>
      {isOpen && (
        <div className="mt-4 space-y-4 pl-6 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================
// Settings Card Component
// ============================================

interface SettingsCardProps {
  title: string
  description?: string
  icon?: ReactElement
  children: ReactElement
}

function SettingsCard({ title, description, icon, children }: SettingsCardProps): ReactElement {
  return (
    <div className="rounded-2xl bg-[#161B22]/80 backdrop-blur-sm border border-[#30363D] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#30363D]/50">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-[#7C3AED]/10">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-[#F0F6FC]">{title}</h3>
            {description && (
              <p className="text-sm text-[#8B949E] mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">
        {children}
      </div>
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
type LLMSettingsConfig = NexusSettingsPublic['llm']
type AgentSettingsConfig = NexusSettingsPublic['agents']

function LLMProvidersSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  const claudeModels = getClaudeModelList()
  const geminiModels = getGeminiModelList()
  const localEmbeddingModels = getLocalEmbeddingModelList()
  const updateLLMSetting = <K extends keyof LLMSettingsConfig>(key: K, value: LLMSettingsConfig[K]): void => {
    updateSetting('llm', key, value)
  }

  const [claudeCliStatus, setClaudeCliStatus] = useState<{ detected: boolean; message: string }>({ detected: false, message: 'Checking...' })
  const [geminiCliStatus, setGeminiCliStatus] = useState<{ detected: boolean; message: string }>({ detected: false, message: 'Checking...' })

  useEffect(() => {
    const nexusAPI = isElectronEnvironment() ? window.nexusAPI : null
    if (!nexusAPI) {
      setClaudeCliStatus({ detected: false, message: 'Backend not available' })
      setGeminiCliStatus({ detected: false, message: 'Backend not available' })
      return
    }

    nexusAPI.settings.checkCliAvailability('claude')
      .then(setClaudeCliStatus)
      .catch((err: unknown) => {
        console.error('Failed to check Claude CLI:', err)
        setClaudeCliStatus({ detected: false, message: 'Check failed' })
      })

    nexusAPI.settings.checkCliAvailability('gemini')
      .then(setGeminiCliStatus)
      .catch((err: unknown) => {
        console.error('Failed to check Gemini CLI:', err)
        setGeminiCliStatus({ detected: false, message: 'Check failed' })
      })
  }, [])

  return (
    <div className="space-y-6" data-testid="llm-providers-tab">
      <SettingsCard
        title="Claude Configuration"
        description="Configure Claude AI provider settings"
        icon={<Sparkles className="w-5 h-5 text-[#7C3AED]" />}
      >
        <>
          <BackendToggle
            label="Backend"
            value={settings.llm.claude.backend}
            options={[
              { value: 'cli', label: 'CLI', icon: <Terminal className="w-4 h-4" /> },
              { value: 'api', label: 'API', icon: <Cloud className="w-4 h-4" /> }
            ]}
            onChange={(value) => { updateLLMSetting('claude', { ...settings.llm.claude, backend: value as LLMBackendType }); }}
            status={claudeCliStatus}
          />

          <ModelDropdown
            label="Model"
            value={settings.llm.claude.model || DEFAULT_CLAUDE_MODEL}
            models={claudeModels}
            onChange={(value) => { updateLLMSetting('claude', { ...settings.llm.claude, model: value }); }}
          />

          <ApiKeyInput
            provider="claude"
            label="API Key"
            optional={settings.llm.claude.backend === 'cli'}
          />

          <AdvancedSection title="Advanced Settings">
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
                  const clamped = clampValue(e.target.value, 30000, 600000, 300000);
                  updateLLMSetting('claude', {
                    ...settings.llm.claude,
                    timeout: clamped
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
                  const clamped = clampValue(e.target.value, 0, 5, 2);
                  updateLLMSetting('claude', {
                    ...settings.llm.claude,
                    maxRetries: clamped
                  })
                }}
              />
            </>
          </AdvancedSection>
        </>
      </SettingsCard>

      <SettingsCard
        title="Gemini Configuration"
        description="Configure Google Gemini provider settings"
        icon={<Zap className="w-5 h-5 text-[#6366F1]" />}
      >
        <>
          <BackendToggle
            label="Backend"
            value={settings.llm.gemini.backend}
            options={[
              { value: 'cli', label: 'CLI', icon: <Terminal className="w-4 h-4" /> },
              { value: 'api', label: 'API', icon: <Cloud className="w-4 h-4" /> }
            ]}
            onChange={(value) => { updateLLMSetting('gemini', { ...settings.llm.gemini, backend: value as LLMBackendType }); }}
            status={geminiCliStatus}
          />

          <ModelDropdown
            label="Model"
            value={settings.llm.gemini.model || DEFAULT_GEMINI_MODEL}
            models={geminiModels}
            onChange={(value) => { updateLLMSetting('gemini', { ...settings.llm.gemini, model: value }); }}
          />

          <ApiKeyInput
            provider="gemini"
            label="API Key"
            optional={settings.llm.gemini.backend === 'cli'}
          />
        </>
      </SettingsCard>

      <SettingsCard
        title="Embeddings Configuration"
        description="Configure text embedding settings"
        icon={<Cpu className="w-5 h-5 text-[#10B981]" />}
      >
        <>
          <BackendToggle
            label="Backend"
            value={settings.llm.embeddings.backend}
            options={[
              { value: 'local', label: 'Local', icon: <Cpu className="w-4 h-4" /> },
              { value: 'api', label: 'OpenAI API', icon: <Cloud className="w-4 h-4" /> }
            ]}
            onChange={(value) => { updateLLMSetting('embeddings', { ...settings.llm.embeddings, backend: value as EmbeddingsBackendType }); }}
            status={settings.llm.embeddings.backend === 'local' ? { detected: true, message: 'No API key needed' } : undefined}
          />

          {settings.llm.embeddings.backend === 'local' && (
            <ModelDropdown
              label="Local Model"
              value={settings.llm.embeddings.localModel || DEFAULT_LOCAL_EMBEDDING_MODEL}
              models={localEmbeddingModels}
              onChange={(value) => { updateLLMSetting('embeddings', { ...settings.llm.embeddings, localModel: value }); }}
            />
          )}

          {settings.llm.embeddings.backend === 'api' && (
            <ApiKeyInput
              provider="openai"
              label="OpenAI API Key"
            />
          )}
        </>
      </SettingsCard>

      <SettingsCard
        title="Provider Settings"
        description="Configure default provider and fallback behavior"
      >
        <>
          <Select
            id="default-provider"
            label="Default Provider"
            description="Primary LLM provider to use"
            value={settings.llm.defaultProvider}
            onChange={(e): void => { updateLLMSetting('defaultProvider', e.target.value as 'claude' | 'gemini') }}
            options={[
              { value: 'claude', label: 'Claude (Anthropic)' },
              { value: 'gemini', label: 'Gemini (Google)' }
            ]}
          />

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-[#F0F6FC]">Enable Fallback</div>
              <div className="text-xs text-[#8B949E]">Automatically try other providers if the primary fails</div>
            </div>
            <ToggleSwitch
              checked={settings.llm.fallbackEnabled}
              onChange={(checked) => { updateLLMSetting('fallbackEnabled', checked) }}
            />
          </div>
        </>
      </SettingsCard>
    </div>
  )
}

// Agent types display info
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

  const handleProviderChange = (provider: AgentProviderType): void => {
    const newModels = provider === 'claude' ? claudeModels : geminiModels
    const defaultModel = newModels.find(m => m.isDefault)?.id || newModels[0]?.id || ''
    onChange(agentType, { provider, model: defaultModel })
  }

  const handleModelChange = (model: string): void => {
    onChange(agentType, { ...config, model })
  }

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl bg-[#0D1117] border border-[#30363D]/50 hover:border-[#30363D] transition-colors"
      data-testid={`agent-model-row-${agentType}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl">{info.icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#F0F6FC]">{info.label}</div>
          <div className="text-xs text-[#6E7681] truncate">{info.description}</div>
        </div>
      </div>
      <select
        value={config.provider}
        onChange={(e) => { handleProviderChange(e.target.value as AgentProviderType); }}
        className={cn(
          'h-10 w-28 rounded-lg border border-[#30363D] bg-[#161B22] px-3 text-sm text-[#F0F6FC]',
          'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
          'transition-all cursor-pointer'
        )}
        data-testid={`agent-provider-${agentType}`}
      >
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
      </select>
      <select
        value={config.model}
        onChange={(e) => { handleModelChange(e.target.value); }}
        className={cn(
          'h-10 w-48 rounded-lg border border-[#30363D] bg-[#161B22] px-3 text-sm text-[#F0F6FC]',
          'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
          'transition-all cursor-pointer'
        )}
        data-testid={`agent-model-${agentType}`}
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function AgentSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  const agentModels = settings.agents.agentModels
  const updateAgentSetting = <K extends keyof AgentSettingsConfig>(key: K, value: AgentSettingsConfig[K]): void => {
    updateSetting('agents', key, value)
  }

  const claudeModels = getClaudeModelList()
  const geminiModels = getGeminiModelList()

  const handleAgentModelChange = (agentType: AgentType, config: AgentModelConfig): void => {
    const newAgentModels: AgentModelAssignments = {
      ...agentModels,
      [agentType]: config
    }
    updateAgentSetting('agentModels', newAgentModels)
  }

  const handleResetToDefaults = (): void => {
    updateAgentSetting('agentModels', DEFAULT_AGENT_MODEL_ASSIGNMENTS)
  }

  const agentTypes: AgentType[] = ['planner', 'coder', 'tester', 'reviewer', 'merger', 'architect', 'debugger', 'documenter']

  return (
    <div className="space-y-6" data-testid="agents-tab">
      <SettingsCard
        title="Agent Model Assignments"
        description="Assign different models to each agent type for optimal performance"
        icon={<Bot className="w-5 h-5 text-[#7C3AED]" />}
      >
        <>
          <div className="space-y-3">
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
          </div>
          <div className="pt-4 border-t border-[#30363D]/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
              data-testid="use-recommended-defaults"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Use Recommended Defaults
            </Button>
          </div>
        </>
      </SettingsCard>

      <SettingsCard
        title="Agent Pool Settings"
        description="Configure agent pool capacity and resource limits"
      >
        <>
          <Input
            id="max-parallel"
            type="number"
            min={1}
            max={10}
            label="Max Concurrent Agents"
            description="Maximum number of agents running simultaneously (1-10)"
            value={settings.agents.maxParallelAgents}
            onChange={(e): void => {
              updateSetting('agents', 'maxParallelAgents', clampValue(e.target.value, 1, 10, 3))
            }}
          />

          <Input
            id="qa-iteration-limit"
            type="number"
            min={10}
            max={100}
            label="QA Iteration Limit"
            description="Escalate to human after this many QA iterations (10-100)"
            value={settings.agents.qaIterationLimit || 50}
            onChange={(e): void => {
              updateAgentSetting('qaIterationLimit', clampValue(e.target.value, 10, 100, 50))
            }}
          />

          <Input
            id="task-timeout"
            type="number"
            min={1}
            max={120}
            label="Task Time Limit (minutes)"
            description="Split task if it exceeds this duration (1-120)"
            value={settings.agents.taskTimeoutMinutes}
            onChange={(e): void => {
              updateSetting('agents', 'taskTimeoutMinutes', clampValue(e.target.value, 1, 120, 30))
            }}
          />
        </>
      </SettingsCard>

      <SettingsCard
        title="Retry Settings"
        description="Configure retry behavior for failed tasks"
      >
        <>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-[#F0F6FC]">Auto Retry on Failure</div>
              <div className="text-xs text-[#8B949E]">Automatically retry tasks when they fail</div>
            </div>
            <ToggleSwitch
              checked={settings.agents.autoRetryEnabled}
              onChange={(checked) => { updateSetting('agents', 'autoRetryEnabled', checked) }}
            />
          </div>

          <Input
            id="max-retries"
            type="number"
            min={0}
            max={10}
            label="Max Retries"
            description="Number of times to retry a failed task (0-10)"
            value={settings.agents.maxRetries}
            onChange={(e): void => {
              updateSetting('agents', 'maxRetries', clampValue(e.target.value, 0, 10, 3))
            }}
            disabled={!settings.agents.autoRetryEnabled}
          />
        </>
      </SettingsCard>
    </div>
  )
}

interface ProjectInfo {
  id: string;
  name: string;
}

function CheckpointSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setLoadingProjects(false);
      return;
    }
    try {
      const projectList = await window.nexusAPI.getProjects() as ProjectInfo[];
      setProjects(projectList);
      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="space-y-6" data-testid="checkpoints-tab">
      <SettingsCard
        title="Automatic Checkpoints"
        description="Configure automatic checkpoint creation and retention"
        icon={<Shield className="w-5 h-5 text-[#10B981]" />}
      >
        <>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-[#F0F6FC]">Enable Auto-Checkpoint</div>
              <div className="text-xs text-[#8B949E]">Automatically create checkpoints at regular intervals</div>
            </div>
            <ToggleSwitch
              checked={settings.checkpoints.autoCheckpointEnabled}
              onChange={(checked) => { updateSetting('checkpoints', 'autoCheckpointEnabled', checked) }}
            />
          </div>

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

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-[#F0F6FC]">Checkpoint on Feature Complete</div>
              <div className="text-xs text-[#8B949E]">Automatically create a checkpoint when a feature is marked complete</div>
            </div>
            <ToggleSwitch
              checked={settings.checkpoints.checkpointOnFeatureComplete}
              onChange={(checked) => { updateSetting('checkpoints', 'checkpointOnFeatureComplete', checked) }}
            />
          </div>
        </>
      </SettingsCard>

      <SettingsCard
        title="Project Checkpoints"
        description="View, restore, and manage checkpoints for your projects"
      >
        <>
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-[#8B949E]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-[#8B949E]">
              No projects found. Create a project to manage checkpoints.
            </p>
          ) : (
            <>
              <Select
                id="checkpoint-project-selector"
                label="Select Project"
                description="Choose a project to view its checkpoints"
                value={selectedProjectId}
                onChange={(e) => { setSelectedProjectId(e.target.value); }}
                options={projects.map(p => ({ value: p.id, label: p.name || p.id }))}
              />

              {selectedProjectId && (
                <div className="mt-4 pt-4 border-t border-[#30363D]/50">
                  <CheckpointList projectId={selectedProjectId} />
                </div>
              )}
            </>
          )}
        </>
      </SettingsCard>
    </div>
  )
}

function UISettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6" data-testid="ui-tab">
      <SettingsCard
        title="Theme"
        description="Choose your preferred color scheme"
        icon={<Palette className="w-5 h-5 text-[#7C3AED]" />}
      >
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'light' as const, label: 'Light', icon: <Sun className="w-6 h-6" /> },
            { value: 'dark' as const, label: 'Dark', icon: <Moon className="w-6 h-6" /> },
            { value: 'system' as const, label: 'System', icon: <Monitor className="w-6 h-6" /> }
          ].map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={(): void => { updateSetting('ui', 'theme', theme.value) }}
              className={cn(
                'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                settings.ui.theme === theme.value
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#F0F6FC]'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#7C3AED]/50 hover:text-[#F0F6FC]'
              )}
            >
              {theme.icon}
              <span className="text-sm font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Layout"
        description="Customize the interface layout"
      >
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
      </SettingsCard>

      <SettingsCard
        title="Notifications"
        description="Configure notification behavior"
      >
        <>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-[#F0F6FC]">Show Notifications</div>
              <div className="text-xs text-[#8B949E]">Display toast notifications for events</div>
            </div>
            <ToggleSwitch
              checked={settings.ui.showNotifications}
              onChange={(checked) => { updateSetting('ui', 'showNotifications', checked) }}
            />
          </div>

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
        </>
      </SettingsCard>
    </div>
  )
}

function ProjectSettings({ settings, updateSetting }: SettingsTabProps): ReactElement {
  return (
    <div className="space-y-6" data-testid="project-tab">
      <SettingsCard
        title="Project Defaults"
        description="Default values used when creating new projects"
        icon={<FolderCog className="w-5 h-5 text-[#7C3AED]" />}
      >
        <>
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
        </>
      </SettingsCard>
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

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-[#0D1117]" data-testid="settings-page-error">
        <Header title="Settings" icon={Settings2} showBack />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-[#F0F6FC]">Settings Unavailable</h2>
            <p className="text-sm text-[#8B949E]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col h-screen bg-[#0D1117]" data-testid="settings-page-loading">
        <Header title="Settings" icon={Settings2} showBack />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-[#7C3AED] animate-spin" />
            <span className="text-sm text-[#8B949E]">Loading settings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] relative overflow-hidden" data-testid="settings-page">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-10 pointer-events-none" />

      {/* Header */}
      <Header
        title="Settings"
        icon={Settings2}
        showBack
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={(): void => { void handleReset() }}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            data-testid="reset-defaults-button"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Defaults
          </Button>
        }
      />

      {/* Main content area */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Left: Vertical navigation */}
        <nav className="w-64 border-r border-[#30363D]/50 p-4 space-y-1 flex-shrink-0 bg-[#161B22]/50 backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(): void => { setActiveTab(tab.id) }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#7C3AED]/20 to-[#6366F1]/10 text-[#F0F6FC] border-l-2 border-[#7C3AED]'
                  : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#F0F6FC]'
              )}
              data-testid={`tab-${tab.id}`}
            >
              <span className={cn(
                activeTab === tab.id ? 'text-[#7C3AED]' : ''
              )}>
                {tab.icon}
              </span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Content panel */}
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {/* Tab header */}
          <div className="mb-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-[#F0F6FC]">{tabs.find((t) => t.id === activeTab)?.label}</h2>
            <p className="text-sm text-[#8B949E] mt-1">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>

          {/* Tab content */}
          <div className="max-w-3xl">
            {activeTab === 'llm' && <LLMProvidersSettings settings={settings} updateSetting={updateSetting} />}
            {activeTab === 'agents' && <AgentSettings settings={settings} updateSetting={updateSetting} />}
            {activeTab === 'checkpoints' && <CheckpointSettings settings={settings} updateSetting={updateSetting} />}
            {activeTab === 'ui' && <UISettings settings={settings} updateSetting={updateSetting} />}
            {activeTab === 'project' && <ProjectSettings settings={settings} updateSetting={updateSetting} />}
          </div>
        </main>
      </div>

      {/* Footer with Save/Cancel */}
      <footer className="relative z-10 flex justify-end gap-3 p-4 border-t border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-xl">
        <Button
          variant="outline"
          onClick={(): void => { discardChanges() }}
          disabled={!isDirty}
          className="border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] disabled:opacity-50"
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          onClick={(): void => { void handleSave() }}
          disabled={!isDirty}
          className="bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white hover:shadow-lg hover:shadow-[#7C3AED]/25 disabled:opacity-50"
          data-testid="save-button"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </footer>
    </div>
  )
}
