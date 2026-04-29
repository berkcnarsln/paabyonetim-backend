-- Bakım Takvimi
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'genel',
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status VARCHAR(20) DEFAULT 'planlandı',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Belge Yönetimi
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'diger',
  file_name VARCHAR(255),
  file_data TEXT,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anket
CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'aktif',
  created_by INTEGER REFERENCES users(id),
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_options (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS survey_votes (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES survey_options(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apartment_id INTEGER REFERENCES apartments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(survey_id, user_id)
);

-- Ortak Alan & Rezervasyon
CREATE TABLE IF NOT EXISTS common_areas (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  common_area_id INTEGER NOT NULL REFERENCES common_areas(id) ON DELETE CASCADE,
  building_id INTEGER NOT NULL REFERENCES buildings(id),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apartment_id INTEGER REFERENCES apartments(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT,
  status VARCHAR(20) DEFAULT 'bekliyor',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ziyaretçi Takibi
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  apartment_id INTEGER REFERENCES apartments(id),
  resident_id INTEGER REFERENCES users(id),
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(20),
  vehicle_plate VARCHAR(20),
  visit_date DATE NOT NULL,
  expected_arrival TIME,
  actual_arrival TIMESTAMP,
  actual_departure TIMESTAMP,
  status VARCHAR(20) DEFAULT 'bekleniyor',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Personel
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  start_date DATE,
  salary DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'aktif',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mesajlaşma
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER REFERENCES users(id),
  apartment_id INTEGER REFERENCES apartments(id),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_id INTEGER REFERENCES messages(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Push Token
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  platform VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Mevcut repairs tablosuna fotoğraf desteği
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS photo_data TEXT;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS photo_type VARCHAR(100);
