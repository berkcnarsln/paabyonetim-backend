const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, period, category } = req.query;
    let sql = `
      SELECT e.*, b.name as building_name, u.name as created_by_name
      FROM expenses e
      JOIN buildings b ON e.building_id = b.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (building_id) { params.push(building_id); sql += ` AND e.building_id = $${params.length}`; }
    if (period) { params.push(period); sql += ` AND e.period = $${params.length}`; }
    if (category) { params.push(category); sql += ` AND e.category = $${params.length}`; }

    sql += ' ORDER BY e.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { building_id, period } = req.query;
    if (!building_id) return res.status(400).json({ error: 'Bina gerekli' });

    let sql = `
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE building_id = $1
    `;
    const params = [building_id];

    if (period) { params.push(period); sql += ` AND period = $${params.length}`; }
    sql += ' GROUP BY category ORDER BY total DESC';

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, b.name as building_name
       FROM expenses e
       JOIN buildings b ON e.building_id = b.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Gider bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, category, amount, description, period } = req.body;
    if (!building_id || !category || !amount || !period) {
      return res.status(400).json({ error: 'Bina, kategori, tutar ve dönem gerekli' });
    }

    const { rows } = await db.query(
      `INSERT INTO expenses (building_id, category, amount, description, period, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [building_id, category, amount, description, period, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { category, amount, description, period } = req.body;
    const { rows } = await db.query(
      `UPDATE expenses SET
        category = COALESCE($1, category),
        amount = COALESCE($2, amount),
        description = COALESCE($3, description),
        period = COALESCE($4, period)
       WHERE id = $5 RETURNING *`,
      [category, amount, description, period, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Gider bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Gider bulunamadı' });
    res.json({ message: 'Gider silindi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
