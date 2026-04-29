const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, status } = req.query;
    let sql = 'SELECT * FROM staff WHERE building_id = $1';
    const params = [building_id];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    sql += ' ORDER BY name';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, name, role, phone, email, start_date, salary, notes } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'İsim ve görev zorunlu' });
    const { rows } = await db.query(
      `INSERT INTO staff (building_id, name, role, phone, email, start_date, salary, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [building_id, name, role, phone, email, start_date || null, salary || null, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, role, phone, email, start_date, salary, status, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE staff SET name=COALESCE($1,name), role=COALESCE($2,role), phone=COALESCE($3,phone),
       email=COALESCE($4,email), start_date=COALESCE($5,start_date), salary=COALESCE($6,salary),
       status=COALESCE($7,status), notes=COALESCE($8,notes), updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, role, phone, email, start_date, salary, status, notes, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Personel bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await db.query('UPDATE staff SET status = $1 WHERE id = $2', ['pasif', req.params.id]);
    res.json({ message: 'Personel pasif yapıldı' });
  } catch (err) { next(err); }
});

module.exports = router;
