const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, apartment_id, priority } = req.query;
    let sql = `
      SELECT a.*, u.name as created_by_name,
             ap.unit_number as target_unit, ap.block as target_block
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN apartments ap ON a.apartment_id = ap.id
      WHERE a.deleted_at IS NULL
    `;
    const params = [];

    if (building_id) { params.push(building_id); sql += ` AND a.building_id = $${params.length}`; }

    if (apartment_id && apartment_id !== 'null' && apartment_id !== 'undefined') {
      params.push(apartment_id);
      sql += ` AND (a.apartment_id IS NULL OR a.apartment_id = $${params.length})`;
    } else if (!apartment_id) {
      // admin sorgusu — hepsini getir
    }

    if (priority) { params.push(priority); sql += ` AND a.priority = $${params.length}`; }

    sql += ' ORDER BY a.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Duyuru bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, title, content, priority, apartment_id } = req.body;
    if (!building_id || !title || !content) {
      return res.status(400).json({ error: 'Bina, başlık ve içerik gerekli' });
    }

    const { rows } = await db.query(
      `INSERT INTO announcements (building_id, apartment_id, title, content, priority, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [building_id, apartment_id || null, title, content, priority || 'normal', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { title, content, priority } = req.body;
    const { rows } = await db.query(
      `UPDATE announcements SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        priority = COALESCE($3, priority)
       WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [title, content, priority, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Duyuru bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE announcements SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Duyuru bulunamadı' });
    res.json({ message: 'Duyuru silindi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
