function errorHandler(err, req, res, next) {
  console.error(err.stack);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Bu kayıt zaten mevcut' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'İlişkili kayıt bulunamadı' });
  }

  const status = err.status || 500;
  const message = err.message || 'Sunucu hatası';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
