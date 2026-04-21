const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, apartment_id, reported_by, status } = req.query;
    let sql = `
      SELECT r.*, a.unit_number, a.block,
             u1.name as reported_by_name,
             u2.name as assigned_to_name
      FROM repairs r
      LEFT JOIN apartments a ON r.apartment_id = a.id
      LEFT JOIN users u1 ON r.reported_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      WHERE 1=1
    `;
    const params = [];

    if (building_id) { params.push(building_id); sql += ` AND r.building_id = $${params.length}`; }
    if (apartment_id) { params.push(apartment_id); sql += ` AND r.apartment_id = $${params.length}`; }
    if (reported_by) { params.push(reported_by); sql += ` AND r.reported_by = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND r.status = $${params.length}`; }

    sql += ' ORDER BY r.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, a.unit_number, a.block,
              u1.name as reported_by_name,
              u2.name as assigned_to_name
       FROM repairs r
       LEFT JOIN apartments a ON r.apartment_id = a.id
       LEFT JOIN users u1 ON r.reported_by = u1.id
       LEFT JOIN users u2 ON r.assigned_to = u2.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Arıza bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, apartment_id, title, description } = req.body;
    if (!building_id || !title) {
      return res.status(400).json({ error: 'Bina ve konu gerekli' });
    }

    const { rows } = await db.query(
      `INSERT INTO repairs (building_id, apartment_id, title, description, reported_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [building_id, apartment_id, title, description, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { title, description, status, assigned_to } = req.body;
    const completed_at = status === 'tamamlandı' ? 'NOW()' : null;

    const { rows } = await db.query(
      `UPDATE repairs SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        assigned_to = COALESCE($4, assigned_to),
        completed_at = CASE WHEN $3 = 'tamamlandı' THEN NOW() ELSE completed_at END
       WHERE id = $5 RETURNING *`,
      [title, description, status, assigned_to, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Arıza bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM repairs WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Arıza bulunamadı' });
    res.json({ message: 'Arıza kaydı silindi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
