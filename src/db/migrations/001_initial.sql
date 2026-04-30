-- PaaBYonetim Veritabanı Şeması

CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  blocks_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apartments (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  block VARCHAR(10),
  unit_number VARCHAR(20) NOT NULL,
  floor INTEGER,
  type VARCHAR(20),
  owner_name VARCHAR(255),
  owner_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'boş',
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'resident',
  building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
  apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  period VARCHAR(7) NOT NULL,
  status VARCHAR(20) DEFAULT 'bekliyor',
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'bekliyor',
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  period VARCHAR(7) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Güncelleme tarihi otomatik trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['buildings','apartments','users','payments','announcements','repairs','expenses']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated ON %s;
      CREATE TRIGGER trg_%s_updated
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- Varsayılan admin kullanıcısı (şifre: Admin1234!)
-- Idempotent: aynı isimde bina varsa eklemez (UNIQUE constraint yerine WHERE NOT EXISTS)
INSERT INTO buildings (name, address, city)
SELECT 'PaaBYonetim Merkez', 'Merkez Mah. No:1', 'İstanbul'
WHERE NOT EXISTS (
  SELECT 1 FROM buildings WHERE name = 'PaaBYonetim Merkez'
);

INSERT INTO users (email, password_hash, name, role, building_id)
SELECT
  'admin@paabyonetim.com',
  '$2a$10$rqJ3b8QzEMH1vvB9pDnmVePl5eK0v/qW/S7N9YRhvKTW9MHlEkVdK',
  'Sistem Yöneticisi',
  'admin',
  (SELECT id FROM buildings WHERE name = 'PaaBYonetim Merkez' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@paabyonetim.com'
);
