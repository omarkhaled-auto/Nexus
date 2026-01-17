CREATE TABLE IF NOT EXISTS code_chunks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    file TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding BLOB,
    symbols TEXT,
    chunk_type TEXT NOT NULL,
    language TEXT NOT NULL,
    complexity INTEGER,
    hash TEXT NOT NULL,
    indexed_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS code_chunks_file_idx ON code_chunks(file);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS code_chunks_project_idx ON code_chunks(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS code_chunks_hash_idx ON code_chunks(hash);
