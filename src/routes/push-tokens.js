const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'Token gerekli' });
    await db.query(
      'INSERT INTO push_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (user_id, token) DO NOTHING',
      [req.user.id, token, platform || 'unknown']
    );
    res.json({ message: 'Token kaydedildi' });
  } catch (err) { next(err); }
});

router.delete('/', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body;
    await db.query('DELETE FROM push_tokens WHERE user_id = $1 AND token = $2', [req.user.id, token]);
    res.json({ message: 'Token silindi' });
  } catch (err) { next(err); }
});

module.exports = router;
