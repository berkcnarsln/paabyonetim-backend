const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendPushToBuilding } = require('../utils/push');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id } = req.query;
    const isAdmin = req.user.role === 'admin';
    let sql;
    let params;

    if (isAdmin) {
      // Admin: tüm mesajları görür
      sql = `SELECT m.*, u.name as sender_name, u.role as sender_role,
                    r.name as recipient_name, a.unit_number
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             LEFT JOIN users r ON m.recipient_id = r.id
             LEFT JOIN apartments a ON m.apartment_id = a.id
             WHERE m.building_id = $1 AND m.parent_id IS NULL
             ORDER BY m.created_at DESC`;
      params = [building_id];
    } else {
      // Sakin: kendi mesajlarını görür
      sql = `SELECT m.*, u.name as sender_name, r.name as recipient_name, a.unit_number
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             LEFT JOIN users r ON m.recipient_id = r.id
             LEFT JOIN apartments a ON m.apartment_id = a.id
             WHERE m.building_id = $1 AND m.parent_id IS NULL
             AND (m.sender_id = $2 OR m.recipient_id = $2)
             ORDER BY m.created_at DESC`;
      params = [building_id, req.user.id];
    }

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id/replies', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.name as sender_name FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.parent_id = $1 ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { building_id, recipient_id, subject, body, parent_id } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Mesaj içeriği gerekli' });

    const { rows } = await db.query(
      `INSERT INTO messages (building_id, sender_id, recipient_id, apartment_id, subject, body, parent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [building_id, req.user.id, recipient_id || null, req.user.apartment_id || null, subject, body, parent_id || null]
    );

    // Push notification: mesaj alana bildir
    if (recipient_id) {
      await sendPushToBuilding(building_id, `📩 Yeni mesaj: ${subject || 'Mesaj'}`, body.substring(0, 100), [recipient_id]);
    } else if (req.user.role !== 'admin') {
      // Sakin mesaj attıysa admini bildir
      await sendPushToBuilding(building_id, `📩 Yeni sakin mesajı`, `${req.user.name}: ${body.substring(0, 80)}`, null, true);
    }

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    await db.query('UPDATE messages SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Okundu olarak işaretlendi' });
  } catch (err) { next(err); }
});

router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const { building_id } = req.query;
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE building_id = $1 AND recipient_id = $2 AND is_read = false',
      [building_id, req.user.id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) { next(err); }
});

module.exports = router;
