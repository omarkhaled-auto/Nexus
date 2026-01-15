import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from './taskStore'

describe('taskStore', () => {
  beforeEach(() => {
    useTaskStore.getState().reset()
  })

  describe('initial state', () => {
    it('should initialize with empty tasks array', () => {
      expect(useTaskStore.getState().tasks).toEqual([])
    })

    it('should initialize with null selectedTaskId', () => {
      expect(useTaskStore.getState().selectedTaskId).toBeNull()
    })
  })

  describe('task operations', () => {
    it('should set tasks array', () => {
      const tasks = [
        { id: 't1', name: 'Task 1', status: 'pending' as const },
        { id: 't2', name: 'Task 2', status: 'completed' as const }
      ]
      useTaskStore.getState().setTasks(tasks)
      expect(useTaskStore.getState().tasks).toEqual(tasks)
    })

    it('should add single task', () => {
      const task = { id: 't1', name: 'Task 1', status: 'pending' as const }
      useTaskStore.getState().addTask(task)
      expect(useTaskStore.getState().tasks).toContainEqual(task)
    })

    it('should update task by id', () => {
      const task = { id: 't1', name: 'Task 1', status: 'pending' as const }
      useTaskStore.getState().addTask(task)
      useTaskStore.getState().updateTask('t1', { status: 'completed' })
      expect(useTaskStore.getState().tasks[0].status).toBe('completed')
    })

    it('should remove task by id', () => {
      const task = { id: 't1', name: 'Task 1', status: 'pending' as const }
      useTaskStore.getState().addTask(task)
      useTaskStore.getState().removeTask('t1')
      expect(useTaskStore.getState().tasks).toEqual([])
    })

    it('should select task', () => {
      useTaskStore.getState().selectTask('t1')
      expect(useTaskStore.getState().selectedTaskId).toBe('t1')
    })

    it('should get task by id', () => {
      const task = { id: 't1', name: 'Task 1', status: 'pending' as const }
      useTaskStore.getState().addTask(task)
      expect(useTaskStore.getState().getTask('t1')).toEqual(task)
    })
  })
})
