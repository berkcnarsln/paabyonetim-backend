const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { building_id } = req.query;
    const { rows } = await db.query(
      `SELECT s.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM survey_votes sv WHERE sv.survey_id = s.id) as total_votes,
        (SELECT COUNT(*) FROM survey_options so WHERE so.survey_id = s.id) as options_count
       FROM surveys s LEFT JOIN users u ON s.created_by = u.id
       WHERE s.building_id = $1 ORDER BY s.created_at DESC`,
      [building_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows: [survey] } = await db.query('SELECT * FROM surveys WHERE id = $1', [req.params.id]);
    if (!survey) return res.status(404).json({ error: 'Anket bulunamadı' });

    const { rows: options } = await db.query(
      `SELECT so.*, COUNT(sv.id) as vote_count
       FROM survey_options so LEFT JOIN survey_votes sv ON sv.option_id = so.id
       WHERE so.survey_id = $1 GROUP BY so.id ORDER BY so.display_order`,
      [req.params.id]
    );

    const { rows: [myVote] } = await db.query(
      'SELECT option_id FROM survey_votes WHERE survey_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ ...survey, options, my_vote: myVote?.option_id || null });
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, title, description, options, ends_at } = req.body;
    if (!title || !options?.length) return res.status(400).json({ error: 'Başlık ve seçenekler gerekli' });

    const { rows: [survey] } = await db.query(
      `INSERT INTO surveys (building_id, title, description, ends_at, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [building_id, title, description, ends_at || null, req.user.id]
    );

    for (let i = 0; i < options.length; i++) {
      await db.query(
        'INSERT INTO survey_options (survey_id, option_text, display_order) VALUES ($1,$2,$3)',
        [survey.id, options[i], i]
      );
    }

    res.status(201).json(survey);
  } catch (err) { next(err); }
});

router.post('/:id/vote', authenticate, async (req, res, next) => {
  try {
    const { option_id } = req.body;
    const { rows: [survey] } = await db.query('SELECT * FROM surveys WHERE id = $1', [req.params.id]);
    if (!survey || survey.status !== 'aktif') return res.status(400).json({ error: 'Anket aktif değil' });

    const existing = await db.query('SELECT id FROM survey_votes WHERE survey_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length) return res.status(400).json({ error: 'Bu ankete zaten oy kullandınız' });

    await db.query(
      'INSERT INTO survey_votes (survey_id, option_id, user_id, apartment_id) VALUES ($1,$2,$3,$4)',
      [req.params.id, option_id, req.user.id, req.user.apartment_id || null]
    );
    res.json({ message: 'Oyunuz kaydedildi' });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, title, description, ends_at } = req.body;
    const { rows } = await db.query(
      `UPDATE surveys SET status = COALESCE($1,status), title = COALESCE($2,title),
       description = COALESCE($3,description), ends_at = COALESCE($4,ends_at)
       WHERE id = $5 RETURNING *`,
      [status, title, description, ends_at, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM surveys WHERE id = $1', [req.params.id]);
    res.json({ message: 'Silindi' });
  } catch (err) { next(err); }
});

module.exports = router;
