ALTER TABLE buildings ADD COLUMN IF NOT EXISTS subdomain VARCHAR(50) UNIQUE;
UPDATE buildings SET subdomain = 'test' WHERE id = 1 AND subdomain IS NULL;
