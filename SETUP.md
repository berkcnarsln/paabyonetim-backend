# PaaBYonetim Backend — Kurulum Rehberi

## 1. GitHub Repo Oluştur

```bash
git init
git add .
git commit -m "initial: PaaBYonetim backend"
git remote add origin https://github.com/KULLANICI_ADIN/paabyonetim-backend.git
git push -u origin main
```

## 2. GitHub Secrets Ekle

Repo → Settings → Secrets → Actions → New repository secret:

| Secret | Değer |
|--------|-------|
| `SERVER_HOST` | `8.229.228.187` |
| `SERVER_USER` | `ubuntu` (veya sunucu kullanıcı adın) |
| `SERVER_SSH_KEY` | SSH private key (`cat ~/.ssh/id_rsa`) |

## 3. Sunucuya İlk Kurulum (tek seferlik)

```bash
# Sunucuya SSH ile bağlan
ssh ubuntu@8.229.228.187

# Projeyi çek
mkdir -p /opt/paabyonetim
cd /opt/paabyonetim
git clone https://github.com/KULLANICI_ADIN/paabyonetim-backend.git .

# .env dosyasını oluştur
cp .env.example .env
nano .env  # şifreleri doldur

# Başlat (SSL olmadan ilk çalıştırma)
docker compose up -d db api

# SSL sertifikası al (domain DNS'i önce sunucuya yönlendir)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d api.paabyonetim.com \
  --email admin@paabyonetim.com --agree-tos

# Nginx'i başlat
docker compose up -d nginx
```

## 4. DNS Ayarları

Domainin DNS yönetim panelinde:

| Tip | İsim | Değer |
|-----|------|-------|
| A | `api` | `8.229.228.187` |
| A | `@` | `8.229.228.187` |
| A | `www` | `8.229.228.187` |

## 5. API Endpointleri

Base URL: `https://api.paabyonetim.com`

### Auth
- `POST /api/auth/login` — Giriş
- `GET /api/auth/me` — Profil
- `PUT /api/auth/change-password` — Şifre değiştir

### Yönetim (Admin)
- `GET/POST /api/buildings`
- `GET/POST /api/apartments`
- `GET/POST /api/payments`
- `POST /api/payments/bulk-generate` — Toplu aidat oluştur
- `GET/POST /api/announcements`
- `GET/POST /api/repairs`
- `GET/POST /api/expenses`
- `GET /api/expenses/summary`
- `GET/POST /api/users`

### Dashboard
- `GET /api/dashboard/admin?building_id=1`
- `GET /api/dashboard/resident`

### Varsayılan Admin Hesabı
- E-posta: `admin@paabyonetim.com`
- Şifre: `Admin1234!`
- **İlk girişten sonra şifreyi değiştirin!**
