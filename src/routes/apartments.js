const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, status } = req.query;
    let sql = `
      SELECT a.*, b.name as building_name
      FROM apartments a
      JOIN buildings b ON a.building_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (building_id) {
      params.push(building_id);
      sql += ` AND a.building_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ' ORDER BY a.block, a.unit_number';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, b.name as building_name
       FROM apartments a
       JOIN buildings b ON a.building_id = b.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Daire bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, block, unit_number, floor, type, owner_name, owner_phone, status, monthly_fee } = req.body;
    if (!building_id || !unit_number) {
      return res.status(400).json({ error: 'Bina ve daire no gerekli' });
    }

    const { rows } = await db.query(
      `INSERT INTO apartments (building_id, block, unit_number, floor, type, owner_name, owner_phone, status, monthly_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [building_id, block, unit_number, floor, type, owner_name, owner_phone, status || 'boş', monthly_fee || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { block, unit_number, floor, type, owner_name, owner_phone, status, monthly_fee } = req.body;
    const { rows } = await db.query(
      `UPDATE apartments SET
        block = COALESCE($1, block),
        unit_number = COALESCE($2, unit_number),
        floor = COALESCE($3, floor),
        type = COALESCE($4, type),
        owner_name = COALESCE($5, owner_name),
        owner_phone = COALESCE($6, owner_phone),
        status = COALESCE($7, status),
        monthly_fee = COALESCE($8, monthly_fee)
       WHERE id = $9 RETURNING *`,
      [block, unit_number, floor, type, owner_name, owner_phone, status, monthly_fee, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Daire bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM apartments WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Daire bulunamadı' });
    res.json({ message: 'Daire silindi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
