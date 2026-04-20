const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, apartment_id, period, status } = req.query;
    let sql = `
      SELECT p.*, a.unit_number, a.block, a.owner_name, b.name as building_name
      FROM payments p
      JOIN apartments a ON p.apartment_id = a.id
      JOIN buildings b ON a.building_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (building_id) { params.push(building_id); sql += ` AND b.id = $${params.length}`; }
    if (apartment_id) { params.push(apartment_id); sql += ` AND p.apartment_id = $${params.length}`; }
    if (period) { params.push(period); sql += ` AND p.period = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND p.status = $${params.length}`; }

    sql += ' ORDER BY p.period DESC, a.block, a.unit_number';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, a.unit_number, a.block, a.owner_name
       FROM payments p
       JOIN apartments a ON p.apartment_id = a.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ödeme bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { apartment_id, amount, period, status, due_date, paid_date, notes } = req.body;
    if (!apartment_id || !amount || !period) {
      return res.status(400).json({ error: 'Daire, tutar ve dönem gerekli' });
    }

    const { rows } = await db.query(
      `INSERT INTO payments (apartment_id, amount, period, status, due_date, paid_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [apartment_id, amount, period, status || 'bekliyor', due_date, paid_date, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-generate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, period, due_date } = req.body;
    if (!building_id || !period) {
      return res.status(400).json({ error: 'Bina ve dönem gerekli' });
    }

    const { rows: apartments } = await db.query(
      'SELECT id, monthly_fee FROM apartments WHERE building_id = $1 AND status = $2',
      [building_id, 'dolu']
    );

    const created = [];
    for (const apt of apartments) {
      const exists = await db.query(
        'SELECT id FROM payments WHERE apartment_id = $1 AND period = $2',
        [apt.id, period]
      );
      if (exists.rows.length === 0) {
        const { rows } = await db.query(
          `INSERT INTO payments (apartment_id, amount, period, due_date)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [apt.id, apt.monthly_fee, period, due_date]
        );
        created.push(rows[0]);
      }
    }
    res.status(201).json({ created: created.length, payments: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { amount, status, due_date, paid_date, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE payments SET
        amount = COALESCE($1, amount),
        status = COALESCE($2, status),
        due_date = COALESCE($3, due_date),
        paid_date = COALESCE($4, paid_date),
        notes = COALESCE($5, notes)
       WHERE id = $6 RETURNING *`,
      [amount, status, due_date, paid_date, notes, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ödeme bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM payments WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Ödeme bulunamadı' });
    res.json({ message: 'Ödeme silindi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
