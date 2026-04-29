require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const tenantMiddleware = require('./middleware/tenant');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server or same-origin
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
    // Allow any *.paabyonetim.com subdomain + exact matches
    const isAllowed =
      allowed.includes(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)?paabyonetim\.com$/.test(origin) ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin);
    callback(isAllowed ? null : new Error('CORS not allowed'), isAllowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Çok fazla istek gönderildi, lütfen bekleyin' },
}));

app.use('/api/', tenantMiddleware);

// Public: tenant bilgisi (auth gerektirmez)
app.get('/api/tenant', (req, res) => {
  if (!req.tenant) return res.status(404).json({ error: 'Tenant bulunamadı' });
  res.json({ id: req.tenant.id, name: req.tenant.name, subdomain: req.tenant.subdomain });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/apartments', require('./routes/apartments'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/repairs', require('./routes/repairs'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/push-tokens', require('./routes/push-tokens'));
app.use('/api/reports', require('./routes/reports'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'PaaBYonetim API' }));

app.use((req, res) => res.status(404).json({ error: 'Endpoint bulunamadı' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PaaBYonetim API ${PORT} portunda çalışıyor`);
});

module.exports = app;
