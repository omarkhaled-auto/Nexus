-- Migration: Add project_states table for state persistence
-- Phase 2 Workflow Fix: StateManager database persistence

CREATE TABLE IF NOT EXISTS project_states (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'initializing',
  mode TEXT NOT NULL,
  state_data TEXT,
  current_feature_index INTEGER DEFAULT 0,
  current_task_index INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for fast lookup by project_id
CREATE INDEX IF NOT EXISTS idx_project_states_project_id ON project_states(project_id);
