-- ============================================================
-- Task Tracker Schema
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

-- Task types (configurable labels + colors per user)
CREATE TABLE IF NOT EXISTS task_types (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  task_type_id UUID REFERENCES task_types(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'bank'
                 CHECK (status IN ('bank','monday','tuesday','wednesday',
                                   'thursday','friday','saturday','sunday',
                                   'done','archived')),
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS task_types_user_idx   ON task_types(user_id);

-- ── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks      ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own task types
CREATE POLICY "task_types: owner full access"
  ON task_types
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only read/write their own tasks
CREATE POLICY "tasks: owner full access"
  ON tasks
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
