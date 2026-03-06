-- Fix CASCADE → SET NULL on calls.agent_id foreign key
-- When an agent is deleted, preserve call history (set agent_id to null instead of deleting calls)

ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_agent_id_fkey;
ALTER TABLE calls ADD CONSTRAINT calls_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;
