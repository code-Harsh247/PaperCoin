-- Stops rest as status='open' until their trigger price trades; this flag
-- records the trigger having happened, so a restart doesn't re-arm a stop
-- that already converted.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS triggered BOOLEAN NOT NULL DEFAULT FALSE;
