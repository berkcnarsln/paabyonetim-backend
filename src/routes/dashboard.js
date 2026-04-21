const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/admin', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id } = req.query;
    if (!building_id) return res.status(400).json({ error: 'Bina gerekli' });

    const period = new Date().toISOString().slice(0, 7);

    const [apartments, payments, repairs, expenses, announcements] = await Promise.all([
      db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=$1) as occupied FROM apartments WHERE building_id=$2', ['dolu', building_id]),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE p.status='ödendi') as paid,
        COUNT(*) FILTER (WHERE p.status='bekliyor') as pending,
        COUNT(*) FILTER (WHERE p.status='gecikmiş') as overdue,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status='ödendi'), 0) as collected
        FROM payments p JOIN apartments a ON p.apartment_id=a.id
        WHERE a.building_id=$1 AND p.period=$2`, [building_id, period]),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='bekliyor') as pending,
        COUNT(*) FILTER (WHERE status='inceleniyor') as in_progress,
        COUNT(*) FILTER (WHERE status='tamamlandı') as completed
        FROM repairs WHERE building_id=$1`, [building_id]),
      db.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE building_id=$1 AND period=$2', [building_id, period]),
      db.query('SELECT id, title, priority, created_at, apartment_id FROM announcements WHERE building_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10', [building_id]),
    ]);

    res.json({
      period,
      apartments: apartments.rows[0],
      payments: payments.rows[0],
      repairs: repairs.rows[0],
      expenses: { total: expenses.rows[0].total },
      recent_announcements: announcements.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/resident', authenticate, async (req, res, next) => {
  try {
    const apartment_id = req.user.apartment_id;
    if (!apartment_id) return res.status(400).json({ error: 'Daire bilgisi bulunamadı' });

    const period = new Date().toISOString().slice(0, 7);

    const [apartment, payments, repairs, announcements] = await Promise.all([
      db.query(`SELECT a.*, b.name as building_name FROM apartments a JOIN buildings b ON a.building_id=b.id WHERE a.id=$1`, [apartment_id]),
      db.query('SELECT * FROM payments WHERE apartment_id=$1 ORDER BY period DESC LIMIT 6', [apartment_id]),
      db.query('SELECT * FROM repairs WHERE apartment_id=$1 ORDER BY created_at DESC LIMIT 5', [apartment_id]),
      db.query(`SELECT id, title, priority, created_at FROM announcements
        WHERE building_id=(SELECT building_id FROM apartments WHERE id=$1)
        AND deleted_at IS NULL
        AND (apartment_id IS NULL OR apartment_id = $1)
        ORDER BY created_at DESC LIMIT 5`, [apartment_id]),
    ]);

    const currentPayment = await db.query(
      'SELECT * FROM payments WHERE apartment_id=$1 AND period=$2',
      [apartment_id, period]
    );

    res.json({
      apartment: apartment.rows[0],
      current_payment: currentPayment.rows[0] || null,
      payment_history: payments.rows,
      repairs: repairs.rows,
      announcements: announcements.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
