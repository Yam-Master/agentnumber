ALTER TABLE numbers ADD COLUMN IF NOT EXISTS voice_mode text NOT NULL DEFAULT 'anthropic';
ALTER TABLE numbers ADD COLUMN IF NOT EXISTS gateway_url text;
ALTER TABLE numbers ADD COLUMN IF NOT EXISTS gateway_token_encrypted text;
ALTER TABLE numbers ADD COLUMN IF NOT EXISTS gateway_agent_id text;
ALTER TABLE numbers ADD COLUMN IF NOT EXISTS gateway_session_key text;

ALTER TABLE numbers ADD CONSTRAINT chk_gateway_config
  CHECK (voice_mode != 'gateway' OR (gateway_url IS NOT NULL AND gateway_token_encrypted IS NOT NULL AND gateway_agent_id IS NOT NULL));

UPDATE numbers SET voice_mode = 'webhook' WHERE webhook_url IS NOT NULL AND voice_mode = 'anthropic';
