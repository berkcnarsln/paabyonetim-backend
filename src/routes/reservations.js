const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Ortak alanlar
router.get('/areas', authenticate, async (req, res, next) => {
  try {
    const { building_id } = req.query;
    const { rows } = await db.query(
      'SELECT * FROM common_areas WHERE building_id = $1 AND is_active = true ORDER BY name',
      [building_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/areas', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, name, description, capacity } = req.body;
    const { rows } = await db.query(
      'INSERT INTO common_areas (building_id, name, description, capacity) VALUES ($1,$2,$3,$4) RETURNING *',
      [building_id, name, description, capacity]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/areas/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, capacity, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE common_areas SET name=COALESCE($1,name), description=COALESCE($2,description),
       capacity=COALESCE($3,capacity), is_active=COALESCE($4,is_active) WHERE id=$5 RETURNING *`,
      [name, description, capacity, is_active, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/areas/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await db.query('UPDATE common_areas SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Silindi' });
  } catch (err) { next(err); }
});

// Rezervasyonlar
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, date, common_area_id, user_id } = req.query;
    let sql = `SELECT r.*, ca.name as area_name, u.name as user_name, a.unit_number
               FROM reservations r
               JOIN common_areas ca ON r.common_area_id = ca.id
               JOIN users u ON r.user_id = u.id
               LEFT JOIN apartments a ON r.apartment_id = a.id
               WHERE r.building_id = $1`;
    const params = [building_id];
    if (date) { params.push(date); sql += ` AND r.date = $${params.length}`; }
    if (common_area_id) { params.push(common_area_id); sql += ` AND r.common_area_id = $${params.length}`; }
    if (user_id) { params.push(user_id); sql += ` AND r.user_id = $${params.length}`; }
    sql += ' ORDER BY r.date DESC, r.start_time ASC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { common_area_id, building_id, date, start_time, end_time, purpose } = req.body;

    // Çakışma kontrolü
    const conflict = await db.query(
      `SELECT id FROM reservations WHERE common_area_id = $1 AND date = $2 AND status != 'iptal'
       AND NOT (end_time <= $3 OR start_time >= $4)`,
      [common_area_id, date, start_time, end_time]
    );
    if (conflict.rows.length) return res.status(400).json({ error: 'Bu saatte başka bir rezervasyon var' });

    const { rows } = await db.query(
      `INSERT INTO reservations (common_area_id, building_id, user_id, apartment_id, date, start_time, end_time, purpose)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [common_area_id, building_id, req.user.id, req.user.apartment_id || null, date, start_time, end_time, purpose]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await db.query('UPDATE reservations SET status = $1 WHERE id = $2', ['iptal', req.params.id]);
    res.json({ message: 'İptal edildi' });
  } catch (err) { next(err); }
});

module.exports = router;
