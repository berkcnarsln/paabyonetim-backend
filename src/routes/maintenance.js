const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, status } = req.query;
    let sql = `SELECT m.*, u.name as created_by_name FROM maintenance_schedules m
               LEFT JOIN users u ON m.created_by = u.id WHERE m.building_id = $1`;
    const params = [building_id];
    if (status) { params.push(status); sql += ` AND m.status = $${params.length}`; }
    sql += ' ORDER BY m.scheduled_date ASC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, title, description, category, scheduled_date, notes } = req.body;
    const { rows } = await db.query(
      `INSERT INTO maintenance_schedules (building_id, title, description, category, scheduled_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [building_id, title, description, category || 'genel', scheduled_date, notes, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { title, description, category, scheduled_date, completed_date, status, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE maintenance_schedules SET
        title = COALESCE($1,title), description = COALESCE($2,description),
        category = COALESCE($3,category), scheduled_date = COALESCE($4,scheduled_date),
        completed_date = $5, status = COALESCE($6,status), notes = COALESCE($7,notes),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, category, scheduled_date, completed_date || null, status, notes, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM maintenance_schedules WHERE id = $1', [req.params.id]);
    res.json({ message: 'Silindi' });
  } catch (err) { next(err); }
});

module.exports = router;
