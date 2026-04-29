const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id } = req.query;
    const isAdmin = req.user.role === 'admin';
    let sql = `SELECT d.id, d.title, d.description, d.category, d.file_name, d.file_type,
                      d.file_size, d.is_public, d.created_at, u.name as uploaded_by_name
               FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id
               WHERE d.building_id = $1`;
    if (!isAdmin) sql += ' AND d.is_public = true';
    sql += ' ORDER BY d.created_at DESC';
    const { rows } = await db.query(sql, [building_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Belge bulunamadı' });
    const doc = rows[0];
    if (!doc.is_public && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Erişim izniniz yok' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, title, description, category, file_name, file_data, file_type, file_size, is_public } = req.body;
    if (!title || !file_data) return res.status(400).json({ error: 'Başlık ve dosya gerekli' });
    const { rows } = await db.query(
      `INSERT INTO documents (building_id, title, description, category, file_name, file_data, file_type, file_size, is_public, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, title, description, category, file_name, file_type, file_size, is_public, created_at`,
      [building_id, title, description, category || 'diger', file_name, file_data, file_type, file_size, is_public !== false, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Silindi' });
  } catch (err) { next(err); }
});

module.exports = router;
