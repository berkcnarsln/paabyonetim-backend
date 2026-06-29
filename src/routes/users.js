const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, role } = req.query;
    let sql = `
      SELECT u.id, u.email, u.name, u.phone, u.role, u.building_id, u.apartment_id,
             u.is_active, u.created_at, b.name as building_name, a.unit_number
      FROM users u
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN apartments a ON u.apartment_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (building_id) { params.push(building_id); sql += ` AND u.building_id = $${params.length}`; }
    if (role) { params.push(role); sql += ` AND u.role = $${params.length}`; }

    sql += ' ORDER BY u.name';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.building_id, u.apartment_id,
              u.is_active, u.created_at
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { email, password, name, phone, role, building_id, apartment_id } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'E-posta, şifre ve isim gerekli' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, name, phone, role, building_id, apartment_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, email, name, phone, role, building_id, apartment_id, created_at`,
      [email.toLowerCase(), hash, name, phone, role || 'resident', building_id, apartment_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, phone, role, building_id, apartment_id, is_active, password } = req.body;

    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    }

    const { rows } = await db.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        role = COALESCE($3, role),
        building_id = COALESCE($4, building_id),
        apartment_id = COALESCE($5, apartment_id),
        is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING id, email, name, phone, role, building_id, apartment_id, is_active`,
      [name, phone, role, building_id, apartment_id, is_active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows: targets } = await db.query(
      'SELECT id, email, name, building_id FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!targets[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (req.user.building_id !== targets[0].building_id) {
      return res.status(403).json({ error: 'Bu kullanıcıyı yönetme yetkiniz yok' });
    }

    const newPassword = generatePassword(10);
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, targets[0].id]);

    res.json({
      message: 'Şifre sıfırlandı',
      user: { id: targets[0].id, email: targets[0].email, name: targets[0].name },
      new_password: newPassword,
    });
  } catch (err) {
    next(err);
  }
});

function generatePassword(len = 10) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }
    const { rows } = await db.query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ message: 'Kullanıcı devre dışı bırakıldı' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
