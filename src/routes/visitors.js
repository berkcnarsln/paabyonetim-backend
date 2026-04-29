const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, date, status, apartment_id } = req.query;
    let sql = `SELECT v.*, a.unit_number, u.name as resident_name
               FROM visitors v
               LEFT JOIN apartments a ON v.apartment_id = a.id
               LEFT JOIN users u ON v.resident_id = u.id
               WHERE v.building_id = $1`;
    const params = [building_id];
    if (date) { params.push(date); sql += ` AND v.visit_date = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND v.status = $${params.length}`; }
    if (apartment_id) { params.push(apartment_id); sql += ` AND v.apartment_id = $${params.length}`; }
    sql += ' ORDER BY v.visit_date DESC, v.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, apartment_id, visitor_name, visitor_phone, vehicle_plate, expected_arrival, notes } = req.body;
    const visit_date = req.body.visit_date || new Date().toISOString().slice(0, 10);
    const { rows } = await db.query(
      `INSERT INTO visitors (building_id, apartment_id, resident_id, visitor_name, visitor_phone, vehicle_plate, visit_date, expected_arrival, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [building_id, apartment_id || req.user.apartment_id || null, req.user.id, visitor_name, visitor_phone, vehicle_plate, visit_date, expected_arrival || null, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { status, actual_arrival, actual_departure, notes } = req.body;
    const now = new Date();
    const arrivalVal = status === 'iceride' ? (actual_arrival || now) : actual_arrival;
    const departureVal = status === 'ayrildi' ? (actual_departure || now) : actual_departure;

    const { rows } = await db.query(
      `UPDATE visitors SET status=COALESCE($1,status), actual_arrival=COALESCE($2,actual_arrival),
       actual_departure=COALESCE($3,actual_departure), notes=COALESCE($4,notes) WHERE id=$5 RETURNING *`,
      [status, arrivalVal || null, departureVal || null, notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM visitors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Silindi' });
  } catch (err) { next(err); }
});

module.exports = router;
