# Nexus Database Schema

**Database Technology:** SQLite with better-sqlite3
**ORM:** Drizzle ORM
**Features:** WAL mode, Foreign key enforcement, Automatic migrations

---

## Overview

Nexus uses a SQLite database for persistence with Drizzle ORM for type-safe queries. The database supports:
- WAL (Write-Ahead Logging) mode for better concurrency
- Foreign key constraints with cascade deletes
- Transaction support
- Health monitoring and migrations

---

## Database Client

**Location:** `src/persistence/database/DatabaseClient.ts`

### Client Options
```typescript
interface DatabaseClientOptions {
  path: string;           // Database file path or ':memory:' for in-memory
  migrationsDir?: string; // Path to migrations folder
  debug?: boolean;        // Enable query logging
}
```

### Health Status
```typescript
interface DatabaseHealthStatus {
  healthy: boolean;
  walMode: boolean;
  foreignKeys: boolean;
  tables: string[];
}
```

### Key Methods
- `create(options)` - Create and initialize a DatabaseClient
- `createInMemory(migrationsDir?)` - Create in-memory database (for testing)
- `db` - Get Drizzle database instance for queries
- `raw` - Get raw better-sqlite3 instance (use with caution)
- `migrate(migrationsDir)` - Run database migrations
- `tables()` - Get list of all tables
- `health()` - Check database health status
- `ping()` - Simple health check
- `transaction(fn)` - Execute operations within a transaction
- `close()` - Close database connection

---

## Tables

### 1. projects

**Purpose:** Core project metadata and configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique project identifier |
| name | TEXT | NOT NULL | Project display name |
| description | TEXT | | Project description |
| mode | TEXT | NOT NULL | 'genesis' \| 'evolution' |
| status | TEXT | NOT NULL | ProjectStatus enum value |
| root_path | TEXT | NOT NULL | Filesystem path to project |
| repository_url | TEXT | | Git repository URL |
| settings | TEXT | | JSON: ProjectSettings object |
| created_at | INTEGER | NOT NULL | Unix timestamp |
| updated_at | INTEGER | NOT NULL | Unix timestamp |
| completed_at | INTEGER | | Unix timestamp when completed |

**Indexes:** None (uses PRIMARY KEY)

**Relations:**
- One-to-Many: features, tasks, checkpoints, requirements, metrics, sessions, episodes, continuePoints

**UI Use Cases:**
- Dashboard: Project listing, status overview
- Project page: Full project details
- Navigation: Project selector

---

### 2. features

**Purpose:** High-level features extracted from requirements.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique feature identifier |
| project_id | TEXT | NOT NULL, FK | | References projects.id |
| name | TEXT | NOT NULL | | Feature name |
| description | TEXT | | | Feature description |
| priority | TEXT | NOT NULL | 'should' | 'must' \| 'should' \| 'could' \| 'wont' (MoSCoW) |
| status | TEXT | NOT NULL | 'backlog' | Feature status |
| complexity | TEXT | NOT NULL | 'simple' | 'simple' \| 'complex' |
| estimated_tasks | INTEGER | | 0 | Estimated number of tasks |
| completed_tasks | INTEGER | | 0 | Number of completed tasks |
| created_at | INTEGER | NOT NULL | | Unix timestamp |
| updated_at | INTEGER | NOT NULL | | Unix timestamp |

**Indexes:**
- `features_project_idx` ON (project_id)

**Relations:**
- Belongs to: projects
- One-to-Many: subFeatures, tasks

**UI Use Cases:**
- Kanban board: Feature columns or grouping
- Progress tracking: Feature completion percentage
- Planning: Feature prioritization

---

### 3. sub_features

**Purpose:** Sub-components of features for finer granularity.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique sub-feature identifier |
| feature_id | TEXT | NOT NULL, FK | | References features.id |
| name | TEXT | NOT NULL | | Sub-feature name |
| description | TEXT | | | Sub-feature description |
| status | TEXT | NOT NULL | 'backlog' | Sub-feature status |
| created_at | INTEGER | NOT NULL | | Unix timestamp |

**Indexes:**
- `sub_features_feature_idx` ON (feature_id)

**Relations:**
- Belongs to: features
- One-to-Many: tasks

**UI Use Cases:**
- Task breakdown: Sub-feature grouping
- Progress tracking: Granular completion status

---

### 4. tasks

**Purpose:** Individual work items assigned to agents.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique task identifier |
| project_id | TEXT | NOT NULL, FK | | References projects.id |
| feature_id | TEXT | FK | | References features.id |
| sub_feature_id | TEXT | FK | | References sub_features.id |
| name | TEXT | NOT NULL | | Task name |
| description | TEXT | | | Detailed task description |
| type | TEXT | NOT NULL | 'auto' | 'auto' \| 'checkpoint' \| 'tdd' |
| status | TEXT | NOT NULL | 'pending' | Task status |
| size | TEXT | NOT NULL | 'small' | 'atomic' \| 'small' |
| priority | INTEGER | NOT NULL | 5 | Sort priority (1 = highest) |
| tags | TEXT | | | JSON array for categorization |
| notes | TEXT | | | JSON array of implementation notes |
| assigned_agent | TEXT | | | Agent ID currently working |
| worktree_path | TEXT | | | Git worktree path |
| branch_name | TEXT | | | Git branch name |
| depends_on | TEXT | | | JSON array of task IDs |
| blocked_by | TEXT | | | Task ID blocking this one |
| qa_iterations | INTEGER | | 0 | Current QA iteration count |
| max_iterations | INTEGER | | 50 | Maximum QA iterations before escalation |
| estimated_minutes | INTEGER | | 15 | Time estimate |
| actual_minutes | INTEGER | | | Actual time taken |
| started_at | INTEGER | | | Unix timestamp when started |
| completed_at | INTEGER | | | Unix timestamp when completed |
| created_at | INTEGER | NOT NULL | | Unix timestamp |
| updated_at | INTEGER | NOT NULL | | Unix timestamp |

**Indexes:**
- `tasks_project_idx` ON (project_id)
- `tasks_feature_idx` ON (feature_id)
- `tasks_status_idx` ON (status)

**Relations:**
- Belongs to: projects, features, subFeatures

**UI Use Cases:**
- Kanban board: Task cards in status columns
- Agent assignment: Show which agent is working
- Progress tracking: QA iterations, time estimates
- Dependencies: Visualize task dependencies

---

### 5. agents

**Purpose:** AI agent instances and their configurations.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique agent identifier |
| type | TEXT | NOT NULL | | 'planner' \| 'coder' \| 'tester' \| 'reviewer' \| 'merger' |
| status | TEXT | NOT NULL | 'idle' | Agent status |
| model_provider | TEXT | NOT NULL | 'anthropic' | 'anthropic' \| 'google' \| 'openai' |
| model_name | TEXT | NOT NULL | 'claude-sonnet-4' | LLM model identifier |
| temperature | REAL | NOT NULL | 0.3 | Model temperature |
| max_tokens | INTEGER | NOT NULL | 8000 | Max tokens per request |
| system_prompt | TEXT | | | Path to prompt file or content |
| tools | TEXT | | | JSON array of tool names |
| current_task_id | TEXT | | | Currently assigned task |
| worktree_path | TEXT | | | Current worktree path |
| branch_name | TEXT | | | Current branch name |
| tokens_used | INTEGER | | 0 | Total tokens consumed |
| tasks_completed | INTEGER | | 0 | Count of completed tasks |
| tasks_failed | INTEGER | | 0 | Count of failed tasks |
| spawned_at | INTEGER | NOT NULL | | Unix timestamp when created |
| last_activity_at | INTEGER | NOT NULL | | Unix timestamp of last activity |
| terminated_at | INTEGER | | | Unix timestamp when terminated |
| termination_reason | TEXT | | | Why agent was terminated |

**Indexes:** None (uses PRIMARY KEY)

**Relations:** None (standalone)

**UI Use Cases:**
- Agent pool: Show all agents and their status
- Agent details: Configuration, current task, metrics
- Real-time monitoring: Live status updates
- Cost tracking: Token usage per agent

---

### 6. checkpoints

**Purpose:** Project state snapshots for recovery and rollback.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique checkpoint identifier |
| project_id | TEXT | NOT NULL, FK | References projects.id |
| name | TEXT | | Checkpoint display name |
| reason | TEXT | | Why checkpoint was created |
| state | TEXT | | JSON blob of full project state |
| git_commit | TEXT | | Associated git commit hash |
| created_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `checkpoints_project_idx` ON (project_id)

**Relations:**
- Belongs to: projects

**UI Use Cases:**
- Checkpoint timeline: Visual history of checkpoints
- Restore functionality: Load previous state
- Git integration: Show commit associations

---

### 7. requirements

**Purpose:** Extracted requirements from interview sessions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique requirement identifier |
| project_id | TEXT | NOT NULL, FK | | References projects.id |
| category | TEXT | NOT NULL | | Requirement category |
| description | TEXT | NOT NULL | | Full requirement description |
| priority | TEXT | NOT NULL | 'medium' | Requirement priority |
| source | TEXT | | | Where requirement came from |
| user_stories | TEXT | | | JSON array of user stories |
| acceptance_criteria | TEXT | | | JSON array of criteria |
| linked_features | TEXT | | | JSON array of feature IDs |
| validated | INTEGER | | 0 | Boolean: user validated |
| confidence | REAL | | 1.0 | AI confidence (0-1) |
| tags | TEXT | | | JSON array for filtering |
| created_at | INTEGER | NOT NULL | | Unix timestamp |

**Indexes:**
- `requirements_project_idx` ON (project_id)

**Relations:**
- Belongs to: projects

**UI Use Cases:**
- Interview page: Extracted requirements panel
- Requirements list: Full requirements view
- Feature linking: Connect requirements to features
- Validation: User can validate extracted requirements

---

### 8. metrics

**Purpose:** Performance and usage metrics tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique metric identifier |
| project_id | TEXT | NOT NULL, FK | References projects.id |
| agent_id | TEXT | | Associated agent ID |
| task_id | TEXT | | Associated task ID |
| type | TEXT | NOT NULL | 'token_usage' \| 'task_duration' \| 'qa_iterations' |
| value | REAL | NOT NULL | Metric value |
| metadata | TEXT | | JSON additional data |
| timestamp | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `metrics_project_idx` ON (project_id)

**Relations:**
- Belongs to: projects

**UI Use Cases:**
- Dashboard: Usage statistics
- Cost tracking: Token consumption over time
- Performance analysis: Task duration charts
- Reports: Project metrics summary

---

### 9. sessions

**Purpose:** Interview and interaction history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique session identifier |
| project_id | TEXT | NOT NULL, FK | | References projects.id |
| type | TEXT | NOT NULL | | 'interview' \| 'planning' \| 'execution' |
| status | TEXT | NOT NULL | 'active' | Session status |
| data | TEXT | | | JSON blob of session data |
| started_at | INTEGER | NOT NULL | | Unix timestamp |
| ended_at | INTEGER | | | Unix timestamp |

**Indexes:**
- `sessions_project_idx` ON (project_id)

**Relations:**
- Belongs to: projects

**UI Use Cases:**
- Interview page: Load/resume interview sessions
- Session history: View past sessions
- Planning page: Load planning sessions

---

### 10. episodes

**Purpose:** Episodic memory for AI learning and context.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique episode identifier |
| project_id | TEXT | NOT NULL, FK | | References projects.id |
| type | TEXT | NOT NULL | | 'code_generation' \| 'error_fix' \| 'review_feedback' \| 'decision' \| 'research' |
| content | TEXT | NOT NULL | | Full episode content |
| summary | TEXT | | | Short summary for display |
| embedding | TEXT | | | JSON array of floats (1536 dim) |
| context | TEXT | | | JSON metadata |
| task_id | TEXT | | | Associated task |
| agent_id | TEXT | | | Associated agent |
| importance | REAL | | 1.0 | Priority for pruning |
| access_count | INTEGER | | 0 | Times accessed |
| last_accessed_at | INTEGER | | | Last access timestamp |
| created_at | INTEGER | NOT NULL | | Unix timestamp |

**Indexes:**
- `episodes_project_idx` ON (project_id)
- `episodes_type_idx` ON (type)

**Relations:**
- Belongs to: projects

**UI Use Cases:**
- Memory view: Show learned patterns
- Context search: Find relevant episodes
- Debugging: See what AI learned

---

### 11. continue_points

**Purpose:** Save points for resuming interrupted work.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | | Unique continue point identifier |
| project_id | TEXT | NOT NULL, FK | | References projects.id |
| task_id | TEXT | NOT NULL | | Task being worked on |
| last_action | TEXT | NOT NULL | | Last action taken |
| file | TEXT | | | Current file being edited |
| line | INTEGER | | | Current line number |
| function_name | TEXT | | | Current function |
| next_steps | TEXT | | | JSON array of next steps |
| agent_id | TEXT | | | Agent that was working |
| iteration_count | INTEGER | NOT NULL | 0 | QA iteration when saved |
| saved_at | INTEGER | NOT NULL | | Unix timestamp |

**Indexes:**
- `continue_points_project_idx` ON (project_id)
- `continue_points_task_idx` ON (task_id)

**Relations:**
- Belongs to: projects

**UI Use Cases:**
- Resume work: Continue from where left off
- Work history: See what was being worked on
- Crash recovery: Restore state after failure

---

### 12. code_chunks

**Purpose:** Semantic code search with vector embeddings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique chunk identifier |
| project_id | TEXT | NOT NULL | Project ID (no FK) |
| file | TEXT | NOT NULL | File path |
| start_line | INTEGER | NOT NULL | Starting line number |
| end_line | INTEGER | NOT NULL | Ending line number |
| content | TEXT | NOT NULL | Code content |
| embedding | BLOB | | Binary Float32Array |
| symbols | TEXT | | JSON array of symbol names |
| chunk_type | TEXT | NOT NULL | Type of code chunk |
| language | TEXT | NOT NULL | Programming language |
| complexity | INTEGER | | Code complexity score |
| hash | TEXT | NOT NULL | Content hash for dedup |
| indexed_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `code_chunks_file_idx` ON (file)
- `code_chunks_project_idx` ON (project_id)
- `code_chunks_hash_idx` ON (hash)

**Relations:** None (standalone for performance)

**UI Use Cases:**
- Code search: Semantic code search results
- Memory view: Repository map visualization
- Symbol lookup: Find symbols across codebase

---

## Entity Relationship Diagram

```
projects
    │
    ├──< features
    │       │
    │       └──< sub_features
    │               │
    │               └──< tasks
    │                   (also linked to features)
    │
    ├──< tasks (direct)
    │
    ├──< checkpoints
    │
    ├──< requirements
    │
    ├──< metrics
    │
    ├──< sessions
    │
    ├──< episodes
    │
    └──< continue_points

agents (standalone)

code_chunks (standalone, for performance)
```

---

## Type Exports

The schema exports both table definitions and TypeScript types:

```typescript
// Table types (for queries)
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;
export type SubFeature = typeof subFeatures.$inferSelect;
export type NewSubFeature = typeof subFeatures.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;
export type Requirement = typeof requirements.$inferSelect;
export type NewRequirement = typeof requirements.$inferInsert;
export type Metric = typeof metrics.$inferSelect;
export type NewMetric = typeof metrics.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;
export type ContinuePointRecord = typeof continuePoints.$inferSelect;
export type NewContinuePointRecord = typeof continuePoints.$inferInsert;
export type CodeChunkRecord = typeof codeChunks.$inferSelect;
export type NewCodeChunkRecord = typeof codeChunks.$inferInsert;
```

---

## Migrations History

| Migration | Description |
|-----------|-------------|
| 0000_premium_mariko_yashida | Initial schema: projects, features, sub_features, tasks, agents, checkpoints |
| 0001_quiet_black_panther | Requirements, metrics, sessions tables |
| 0002_hotfix_metadata_fields | Episodes table for episodic memory |
| 0003_hard_may_parker | Performance indexes for all tables |
| 0004_continue_points | Continue points table for resuming work |
| 0005_code_chunks | Code chunks table for semantic search |

---

## UI Integration Points

### Dashboard Page
- `projects`: List all projects with status
- `tasks`: Count tasks by status
- `metrics`: Aggregate usage statistics
- `agents`: Show agent pool status

### Interview Page
- `sessions`: Load/save interview sessions
- `requirements`: Display extracted requirements
- `projects`: Create/update project

### Tasks/Kanban Page
- `tasks`: All task data for columns
- `features`: Feature grouping
- `agents`: Show agent assignments

### Agents Page
- `agents`: Full agent configuration and status
- `tasks`: Current task assignments
- `metrics`: Token usage per agent

### Execution Page
- `tasks`: Current task status
- `checkpoints`: Available checkpoints
- `continue_points`: Resume points

### Settings Page
- `projects`: Project-specific settings
- `agents`: Agent model configurations

### Memory Page (Optional)
- `episodes`: Episodic memory entries
- `code_chunks`: Code memory and search
- `continue_points`: Resume points

---

## Status Values

### Project Status
```typescript
type ProjectStatus =
  | 'created'
  | 'planning'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed';
```

### Task Status
```typescript
type TaskStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'failed'
  | 'blocked';
```

### Agent Status
```typescript
type AgentStatus =
  | 'idle'
  | 'assigned'
  | 'working'
  | 'paused'
  | 'error'
  | 'terminated';
```

### Session Status
```typescript
type SessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';
```
