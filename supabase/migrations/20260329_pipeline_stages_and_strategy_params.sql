-- Migration: Pipeline Stages + Strategy Params
-- Date: 2026-03-29
-- Run this in Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add pipeline_stage column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'inbox';

-- 2. Migrate existing curated values to pipeline stages
-- fav → shortlist, ni/blk → archived, everything else → inbox
UPDATE properties SET pipeline_stage = CASE
  WHEN curated = 'fav' THEN 'shortlist'
  WHEN curated IN ('ni', 'blk') THEN 'archived'
  ELSE 'inbox'
END
WHERE pipeline_stage IS NULL OR pipeline_stage = 'inbox';

-- 3. Add check constraint for valid stage values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_pipeline_stage_check'
  ) THEN
    ALTER TABLE properties ADD CONSTRAINT properties_pipeline_stage_check
      CHECK (pipeline_stage IN ('inbox','shortlist','diligence','offer','contract','closed','archived'));
  END IF;
END $$;

-- 4. Index for efficient stage-based queries
CREATE INDEX IF NOT EXISTS idx_properties_pipeline_stage
  ON properties(user_id, pipeline_stage);

-- 5. Add strategy_params JSONB column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS strategy_params jsonb DEFAULT '{}';

-- 6. Enable RLS on pipeline_stage (already covered by existing row-level policies
-- since RLS is on the whole row, but verify the column is accessible)

-- 7. Verification queries (run these to confirm migration worked)
-- SELECT pipeline_stage, count(*) FROM properties GROUP BY pipeline_stage;
-- SELECT id, name, strategy_params FROM projects LIMIT 5;
