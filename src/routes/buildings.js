const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM buildings ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM buildings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Bina bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, address, city, blocks_count } = req.body;
    if (!name) return res.status(400).json({ error: 'Bina adı gerekli' });

    const { rows } = await db.query(
      'INSERT INTO buildings (name, address, city, blocks_count) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, address, city, blocks_count || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, address, city, blocks_count } = req.body;
    const { rows } = await db.query(
      `UPDATE buildings SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        blocks_count = COALESCE($4, blocks_count)
       WHERE id = $5 RETURNING *`,
      [name, address, city, blocks_count, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bina bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Aktif tenant'ın feature'larını güncelle (sadece kendi binası için admin)
router.put('/me/features', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!req.tenant) return res.status(400).json({ error: 'Tenant gerekli' });
    if (req.user.building_id !== req.tenant.id) {
      return res.status(403).json({ error: 'Sadece kendi binanızı güncelleyebilirsiniz' });
    }
    const { features } = req.body;
    if (!features || typeof features !== 'object') {
      return res.status(400).json({ error: 'features objesi gerekli' });
    }
    const { rows } = await db.query(
      'UPDATE buildings SET features = features || $1::jsonb WHERE id = $2 RETURNING id, name, subdomain, plan, features, settings',
      [JSON.stringify(features), req.tenant.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM buildings WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Bina bulunamadı' });
    res.json({ message: 'Bina silindi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
