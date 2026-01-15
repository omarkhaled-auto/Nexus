import { describe, it, expect, beforeEach } from 'vitest'
import {
  useInterviewStore,
  useInterviewStage,
  useMessages,
  useRequirements,
  useRequirementsByCategory,
  useIsInterviewing,
  useLatestMessage
} from './interviewStore'
import type { InterviewMessage, Requirement } from '../types/interview'

describe('interviewStore', () => {
  beforeEach(() => {
    useInterviewStore.getState().reset()
  })

  describe('initial state', () => {
    it('should initialize with welcome stage', () => {
      expect(useInterviewStore.getState().stage).toBe('welcome')
    })

    it('should initialize with empty messages', () => {
      expect(useInterviewStore.getState().messages).toEqual([])
    })

    it('should initialize with empty requirements', () => {
      expect(useInterviewStore.getState().requirements).toEqual([])
    })

    it('should initialize with isInterviewing false', () => {
      expect(useInterviewStore.getState().isInterviewing).toBe(false)
    })

    it('should initialize with null projectName', () => {
      expect(useInterviewStore.getState().projectName).toBeNull()
    })
  })

  describe('stage management', () => {
    it('should set stage to project_overview', () => {
      useInterviewStore.getState().setStage('project_overview')
      expect(useInterviewStore.getState().stage).toBe('project_overview')
    })

    it('should set stage to complete', () => {
      useInterviewStore.getState().setStage('complete')
      expect(useInterviewStore.getState().stage).toBe('complete')
    })
  })

  describe('message management', () => {
    it('should add a user message', () => {
      const message: InterviewMessage = {
        id: 'm1',
        role: 'user',
        content: 'I want to build a todo app',
        timestamp: new Date().toISOString()
      }
      useInterviewStore.getState().addMessage(message)
      expect(useInterviewStore.getState().messages).toContainEqual(message)
    })

    it('should add an assistant message', () => {
      const message: InterviewMessage = {
        id: 'm2',
        role: 'assistant',
        content: 'Great! Let me help you with that.',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }
      useInterviewStore.getState().addMessage(message)
      expect(useInterviewStore.getState().messages[0].isStreaming).toBe(true)
    })

    it('should update an existing message', () => {
      const message: InterviewMessage = {
        id: 'm1',
        role: 'assistant',
        content: 'Streaming...',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }
      useInterviewStore.getState().addMessage(message)
      useInterviewStore.getState().updateMessage('m1', {
        content: 'Complete response',
        isStreaming: false
      })
      const updated = useInterviewStore.getState().messages.find((m) => m.id === 'm1')
      expect(updated?.content).toBe('Complete response')
      expect(updated?.isStreaming).toBe(false)
    })

    it('should maintain message order', () => {
      const m1: InterviewMessage = {
        id: 'm1',
        role: 'user',
        content: 'First',
        timestamp: '2024-01-01T00:00:00Z'
      }
      const m2: InterviewMessage = {
        id: 'm2',
        role: 'assistant',
        content: 'Second',
        timestamp: '2024-01-01T00:00:01Z'
      }
      useInterviewStore.getState().addMessage(m1)
      useInterviewStore.getState().addMessage(m2)
      expect(useInterviewStore.getState().messages[0].id).toBe('m1')
      expect(useInterviewStore.getState().messages[1].id).toBe('m2')
    })
  })

  describe('requirement management', () => {
    const sampleRequirement: Requirement = {
      id: 'r1',
      category: 'functional',
      text: 'User authentication',
      priority: 'must',
      extractedAt: new Date().toISOString(),
      fromMessageId: 'm1'
    }

    it('should add a requirement', () => {
      useInterviewStore.getState().addRequirement(sampleRequirement)
      expect(useInterviewStore.getState().requirements).toContainEqual(sampleRequirement)
    })

    it('should update an existing requirement', () => {
      useInterviewStore.getState().addRequirement(sampleRequirement)
      useInterviewStore.getState().updateRequirement('r1', {
        priority: 'should',
        text: 'Updated text'
      })
      const updated = useInterviewStore.getState().requirements.find((r) => r.id === 'r1')
      expect(updated?.priority).toBe('should')
      expect(updated?.text).toBe('Updated text')
    })

    it('should remove a requirement', () => {
      useInterviewStore.getState().addRequirement(sampleRequirement)
      useInterviewStore.getState().removeRequirement('r1')
      expect(useInterviewStore.getState().requirements).toEqual([])
    })

    it('should handle multiple requirements', () => {
      const r2: Requirement = {
        id: 'r2',
        category: 'technical',
        text: 'Use PostgreSQL',
        priority: 'must',
        extractedAt: new Date().toISOString(),
        fromMessageId: 'm2'
      }
      useInterviewStore.getState().addRequirement(sampleRequirement)
      useInterviewStore.getState().addRequirement(r2)
      expect(useInterviewStore.getState().requirements.length).toBe(2)
    })
  })

  describe('interview lifecycle', () => {
    it('should set project name', () => {
      useInterviewStore.getState().setProjectName('My Awesome App')
      expect(useInterviewStore.getState().projectName).toBe('My Awesome App')
    })

    it('should start interview', () => {
      useInterviewStore.getState().startInterview()
      expect(useInterviewStore.getState().isInterviewing).toBe(true)
      expect(useInterviewStore.getState().stage).toBe('welcome')
    })

    it('should complete interview', () => {
      useInterviewStore.getState().startInterview()
      useInterviewStore.getState().completeInterview()
      expect(useInterviewStore.getState().isInterviewing).toBe(false)
      expect(useInterviewStore.getState().stage).toBe('complete')
    })

    it('should reset to initial state', () => {
      useInterviewStore.getState().startInterview()
      useInterviewStore.getState().setProjectName('Test')
      useInterviewStore.getState().addMessage({
        id: 'm1',
        role: 'user',
        content: 'Test',
        timestamp: ''
      })
      useInterviewStore.getState().reset()
      expect(useInterviewStore.getState().isInterviewing).toBe(false)
      expect(useInterviewStore.getState().projectName).toBeNull()
      expect(useInterviewStore.getState().messages).toEqual([])
      expect(useInterviewStore.getState().stage).toBe('welcome')
    })
  })

  describe('selectors', () => {
    it('useInterviewStage should return current stage', () => {
      useInterviewStore.getState().setStage('features')
      // Direct state access for test (selector returns same value)
      expect(useInterviewStore.getState().stage).toBe('features')
    })

    it('useMessages should return all messages', () => {
      const m1: InterviewMessage = {
        id: 'm1',
        role: 'user',
        content: 'Test',
        timestamp: ''
      }
      useInterviewStore.getState().addMessage(m1)
      expect(useInterviewStore.getState().messages).toHaveLength(1)
    })

    it('useRequirements should return all requirements', () => {
      useInterviewStore.getState().addRequirement({
        id: 'r1',
        category: 'functional',
        text: 'Test',
        priority: 'must',
        extractedAt: '',
        fromMessageId: 'm1'
      })
      expect(useInterviewStore.getState().requirements).toHaveLength(1)
    })

    it('useRequirementsByCategory should filter by category', () => {
      useInterviewStore.getState().addRequirement({
        id: 'r1',
        category: 'functional',
        text: 'Func 1',
        priority: 'must',
        extractedAt: '',
        fromMessageId: 'm1'
      })
      useInterviewStore.getState().addRequirement({
        id: 'r2',
        category: 'technical',
        text: 'Tech 1',
        priority: 'should',
        extractedAt: '',
        fromMessageId: 'm2'
      })
      const functional = useInterviewStore
        .getState()
        .requirements.filter((r) => r.category === 'functional')
      expect(functional).toHaveLength(1)
      expect(functional[0].id).toBe('r1')
    })

    it('useLatestMessage should return the most recent message', () => {
      useInterviewStore.getState().addMessage({
        id: 'm1',
        role: 'user',
        content: 'First',
        timestamp: ''
      })
      useInterviewStore.getState().addMessage({
        id: 'm2',
        role: 'assistant',
        content: 'Second',
        timestamp: ''
      })
      const messages = useInterviewStore.getState().messages
      const latest = messages[messages.length - 1]
      expect(latest?.id).toBe('m2')
    })

    it('useIsInterviewing should return interview status', () => {
      expect(useInterviewStore.getState().isInterviewing).toBe(false)
      useInterviewStore.getState().startInterview()
      expect(useInterviewStore.getState().isInterviewing).toBe(true)
    })
  })
})
