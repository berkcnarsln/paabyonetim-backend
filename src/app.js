require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Çok fazla istek gönderildi, lütfen bekleyin' },
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/apartments', require('./routes/apartments'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/repairs', require('./routes/repairs'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'PaaBYonetim API' }));

app.use((req, res) => res.status(404).json({ error: 'Endpoint bulunamadı' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PaaBYonetim API ${PORT} portunda çalışıyor`);
});

module.exports = app;
