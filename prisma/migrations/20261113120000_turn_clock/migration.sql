-- Add a persisted elapsed-time clock to every existing room state.
UPDATE "Room"
SET state = jsonb_set(
  state,
  '{clock}',
  jsonb_build_object(
    'activeSince', CASE
      WHEN state->>'status' = 'active' THEN to_jsonb(CURRENT_TIMESTAMP::text)
      ELSE 'null'::jsonb
    END,
    'turnElapsedMs', 0,
    'totalsByParticipant', '{}'::jsonb
  ),
  true
)
WHERE state->'clock' IS NULL;
