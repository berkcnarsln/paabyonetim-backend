ALTER TABLE buildings ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'pro';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

UPDATE buildings SET plan = 'pro' WHERE plan IS NULL;

UPDATE buildings SET features = jsonb_build_object(
  'maintenance', true,
  'documents',   true,
  'surveys',     true,
  'reservations',true,
  'visitors',    true,
  'staff',       true,
  'messaging',   true
) WHERE features = '{}'::jsonb OR features IS NULL;
